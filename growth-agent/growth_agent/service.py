from __future__ import annotations

import asyncio
import socket
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from .adapters.github import GitHubPRAdapter
from .agent import Planner, proposals_to_actions
from .approval import ApprovalService
from .config import Settings
from .integrations import IntegrationService
from .models import (
    ActivitySummary,
    Dashboard,
    Goal,
    GrowthRun,
    RunKind,
    RunRequest,
    utc_now,
)
from .store import ConflictError, GrowthStore


class ExecutionService:
    def __init__(self, settings: Settings, store: GrowthStore):
        self.settings = settings
        self.store = store
        self.integrations = IntegrationService(settings, store)
        self.worker_id = f"{socket.gethostname()}:{uuid4()}"
        self._wake = asyncio.Event()
        self._stopping = asyncio.Event()
        self._last_error_type: str | None = None

    async def execute(self, action_id: str, expected_version: int, expected_hash: str) -> None:
        """Legacy-safe shim: never scans or executes an approval without a durable job."""
        if self.settings.execution_mode != "live":
            await self.store.append_activity(
                "simulation_blocked",
                {
                    "version": expected_version,
                    "content_hash": expected_hash,
                    "reason": "EXECUTION_MODE is simulation",
                },
                action_id,
            )
            return
        await self.store.append_activity(
            "execution_blocked",
            {"reason": "A durable execution job is required"},
            action_id,
        )

    def wake(self) -> None:
        self._wake.set()

    async def stop(self) -> None:
        self._stopping.set()
        self._wake.set()

    async def run(self) -> None:
        while not self._stopping.is_set():
            processed = False
            try:
                if self.settings.execution_mode == "live":
                    processed = await self.process_next()
                self._last_error_type = None
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                # A transient database/provider read must never kill the worker
                # while the API process keeps reporting healthy.
                self._last_error_type = type(exc).__name__
            if processed:
                continue
            self._wake.clear()
            try:
                await asyncio.wait_for(
                    self._wake.wait(), timeout=self.settings.execution_worker_poll_seconds
                )
            except TimeoutError:
                pass

    @property
    def last_error_type(self) -> str | None:
        return self._last_error_type

    async def process_next(self) -> bool:
        job = await self.store.claim_execution_job(
            self.worker_id, self.settings.execution_job_lease_seconds
        )
        if not job:
            return False
        try:
            action, approval, integration = await asyncio.gather(
                self.store.get_action(job.action_id),
                self.store.approval_for_job(job),
                self.store.get_integration(job.provider),
            )
            if not integration or integration.status != "ready" or integration.mode not in {
                "canary",
                "live",
            }:
                await self.store.complete_execution_job(
                    job,
                    "failed",
                    error="GitHub integration is not enabled",
                    details={"reason": "integration_required"},
                )
                return True
            token = self.integrations.decrypt(integration)
            adapter = GitHubPRAdapter(
                self.settings,
                token,
                str(integration.configuration.get("repository") or ""),
            )
            heartbeat = asyncio.create_task(self._heartbeat(job))
            try:
                result = await adapter.execute(action, approval)
            finally:
                heartbeat.cancel()
                await asyncio.gather(heartbeat, return_exceptions=True)
            external_url = result.details.get("url")
            if result.status == "executed":
                await self.store.complete_execution_job(
                    job,
                    "succeeded",
                    external_id=result.external_id,
                    external_url=str(external_url) if external_url else None,
                    details=result.details,
                )
            elif result.status == "unknown" and job.attempts < job.max_attempts:
                await self.store.retry_execution_job(job, "GitHub response was ambiguous")
            else:
                final_status = "unknown" if result.status == "unknown" else "failed"
                await self.store.complete_execution_job(
                    job,
                    final_status,
                    external_id=result.external_id,
                    external_url=str(external_url) if external_url else None,
                    error=str(result.details.get("reason") or result.status),
                    details=result.details,
                )
        except Exception as exc:  # never put exception text or credentials into durable logs
            safe_error = f"Execution failed: {type(exc).__name__}"
            if job.attempts < job.max_attempts:
                try:
                    await self.store.retry_execution_job(job, safe_error)
                except ConflictError:
                    pass
            else:
                try:
                    await self.store.complete_execution_job(
                        job, "unknown", error=safe_error
                    )
                except ConflictError:
                    pass
        return True

    async def _heartbeat(self, job) -> None:
        interval = max(10, min(60, self.settings.execution_job_lease_seconds // 3))
        while True:
            await asyncio.sleep(interval)
            await self.store.heartbeat_execution_job(
                job, self.settings.execution_job_lease_seconds
            )


class RunCoordinator:
    def __init__(self, settings: Settings, store: GrowthStore, planner: Planner):
        self.settings = settings
        self.store = store
        self.planner = planner
        self._run_lock = asyncio.Lock()
        self._tasks: set[asyncio.Task] = set()
        self.approvals = ApprovalService(settings, store)

    async def enqueue(
        self, kind: RunKind, request: RunRequest, idempotency_key: str
    ) -> tuple[GrowthRun, bool]:
        run = GrowthRun(
            kind=kind,
            idempotency_key=idempotency_key,
            focus=request.focus,
            trigger=request.trigger or "api",
        )
        return await self.store.create_run(run)

    async def execute(self, run: GrowthRun) -> None:
        async with self._run_lock:
            run.status = "running"
            await self.store.update_run(run)
            try:
                metrics, actions, feedback, previous_run = await asyncio.gather(
                    self.store.metrics(),
                    self.store.list_actions(limit=30),
                    self.store.feedback_context(limit=30),
                    self.store.latest_completed_run(),
                )
                plan = await self.planner.plan(
                    run.kind,
                    metrics,
                    previous_run.metrics_snapshot if previous_run else None,
                    actions,
                    feedback,
                    run.focus,
                )
                pending = sum(action.status == "awaiting_approval" for action in actions)
                capacity = min(5 if run.kind == "weekly" else 3, max(0, 5 - pending))
                proposals = plan.actions[:capacity]
                known_revisions = {
                    action.id for action in actions if action.status == "needs_changes"
                }
                revisions = [
                    proposal
                    for proposal in proposals
                    if proposal.revises_action_id in known_revisions
                ]
                revised = []
                for proposal in revisions:
                    try:
                        revised.append(
                            await self.store.revise_action(
                                proposal.revises_action_id or "", proposal
                            )
                        )
                    except ConflictError:
                        continue
                new_proposals = [
                    proposal for proposal in proposals if proposal.revises_action_id is None
                ]
                day_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
                remaining_email_drafts = max(
                    0, 3 - await self.store.count_email_actions_since(day_start)
                )
                rate_limited_proposals = []
                for proposal in new_proposals:
                    is_email = proposal.type == "email"
                    if is_email:
                        if remaining_email_drafts == 0:
                            continue
                        remaining_email_drafts -= 1
                    rate_limited_proposals.append(proposal)
                created = await self.store.create_actions(
                    proposals_to_actions(
                        plan,
                        run.kind,
                        run.id,
                        available_slots=max(0, capacity - len(revised)),
                        proposals=rate_limited_proposals,
                    )
                )
                run.status = "completed"
                run.summary = plan.summary
                run.metrics_snapshot = metrics
                run.completed_at = utc_now()
                await self.store.append_activity(
                    "analysis_completed",
                    {
                        "run_id": run.id,
                        "kind": run.kind,
                        "actions_created": len(created),
                        "actions_revised": len(revised),
                    },
                )
            except Exception as exc:
                run.status = "failed"
                run.error = f"{type(exc).__name__}: {str(exc)[:300]}"
                run.completed_at = utc_now()
                await self.store.append_activity(
                    "analysis_failed",
                    {"run_id": run.id, "kind": run.kind, "error_type": type(exc).__name__},
                )
            await self.store.update_run(run)

    async def recover(self) -> None:
        for run in await self.store.recoverable_runs():
            self.start(run)

    def start(self, run: GrowthRun) -> None:
        task = asyncio.create_task(self.execute(run))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def shutdown(self) -> None:
        if self._tasks:
            await asyncio.gather(*tuple(self._tasks), return_exceptions=True)

    async def dashboard(self) -> Dashboard:
        metrics, actions, latest = await asyncio.gather(
            self.store.metrics(), self.store.list_actions(), self.store.latest_run()
        )
        actions = await asyncio.gather(*(self.approvals.annotate(action) for action in actions))
        note = latest.summary if latest and latest.summary else None
        if self.settings.execution_mode == "simulation":
            prefix = "Simulation aktiv: keine externe Aktion wird ausgeführt."
            note = f"{prefix} {note}" if note else prefix
        return Dashboard(
            goal=Goal(
                target=self.settings.goal_target,
                earned=self.settings.goal_earned_baseline + metrics.revenue,
                currency=self.settings.goal_currency,
            ),
            metrics=metrics,
            actions=actions,
            activity=ActivitySummary(
                last_analysis=latest.completed_at if latest else None,
                next_run=self.next_run_at(),
                agent_note=note,
            ),
        )

    def next_run_at(self):
        now = utc_now()
        daily = now.replace(
            hour=self.settings.daily_run_hour_utc,
            minute=self.settings.daily_run_minute_utc,
            second=0,
            microsecond=0,
        )
        if daily <= now:
            daily += timedelta(days=1)
        while daily.weekday() == self.settings.daily_excluded_weekday:
            daily += timedelta(days=1)
        weekly = now.replace(
            hour=self.settings.weekly_run_hour_utc,
            minute=self.settings.weekly_run_minute_utc,
            second=0,
            microsecond=0,
        )
        weekly += timedelta(
            days=(self.settings.weekly_run_weekday - weekly.weekday()) % 7
        )
        if weekly <= now:
            weekly += timedelta(days=7)
        return min(daily, weekly)


class InternalScheduler:
    def __init__(self, settings: Settings, coordinator: RunCoordinator):
        self.settings = settings
        self.coordinator = coordinator
        self._stopping = asyncio.Event()

    async def run(self) -> None:
        while not self._stopping.is_set():
            await self.tick()
            try:
                await asyncio.wait_for(self._stopping.wait(), timeout=60)
            except TimeoutError:
                pass

    async def stop(self) -> None:
        self._stopping.set()

    async def tick(self) -> None:
        now = utc_now()
        kind: RunKind | None = None
        if (
            now.weekday() == self.settings.weekly_run_weekday
            and now.hour == self.settings.weekly_run_hour_utc
            and now.minute == self.settings.weekly_run_minute_utc
        ):
            kind = "weekly"
        elif (
            now.weekday() != self.settings.daily_excluded_weekday
            and now.hour == self.settings.daily_run_hour_utc
            and now.minute == self.settings.daily_run_minute_utc
        ):
            kind = "daily"
        if kind is None:
            return
        key = f"internal:{kind}:{now.date().isoformat()}"
        run, created = await self.coordinator.enqueue(
            kind, RunRequest(trigger="internal_scheduler"), key
        )
        if created:
            self.coordinator.start(run)
