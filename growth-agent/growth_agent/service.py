from __future__ import annotations

import asyncio
from datetime import timedelta

from .adapters import AdapterFactory
from .agent import Planner, proposals_to_actions
from .config import Settings
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
        self.adapters = AdapterFactory(settings)

    async def execute(
        self, action_id: str, expected_version: int, expected_hash: str
    ) -> None:
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
        try:
            action, approval = await self.store.claim_approved_action(
                action_id, expected_version, expected_hash
            )
        except ConflictError as exc:
            await self.store.append_activity(
                "execution_blocked", {"reason": str(exc)}, action_id
            )
            return
        adapter = self.adapters.for_action(action)
        try:
            result = await adapter.execute(action, approval)
        except Exception as exc:  # adapter failures must be recorded, not crash the worker
            await self.store.finish_execution(
                action.id, "failed", {"provider": "unknown", "reason": type(exc).__name__}
            )
            return
        await self.store.finish_execution(
            action.id,
            result.status,
            result.model_dump(mode="json", exclude_none=True),
        )


class RunCoordinator:
    def __init__(self, settings: Settings, store: GrowthStore, planner: Planner):
        self.settings = settings
        self.store = store
        self.planner = planner
        self._run_lock = asyncio.Lock()
        self._tasks: set[asyncio.Task] = set()

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
                created = await self.store.create_actions(
                    proposals_to_actions(
                        plan,
                        run.kind,
                        run.id,
                        available_slots=max(0, capacity - len(revised)),
                        proposals=new_proposals,
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
            hour=self.settings.daily_run_hour_utc, minute=0, second=0, microsecond=0
        )
        if daily <= now:
            daily += timedelta(days=1)
        while daily.weekday() == self.settings.weekly_run_weekday:
            daily += timedelta(days=1)
        weekly = now.replace(
            hour=self.settings.weekly_run_hour_utc, minute=0, second=0, microsecond=0
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
        ):
            kind = "weekly"
        elif (
            now.weekday() != self.settings.weekly_run_weekday
            and now.hour == self.settings.daily_run_hour_utc
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
