from __future__ import annotations

import asyncio
import hashlib
import json
from abc import ABC, abstractmethod
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import httpx

from .config import Settings
from .models import (
    ActionContent,
    ActivityItem,
    AgentProposal,
    ApprovalSnapshot,
    DecisionRequest,
    ExecutionJob,
    GrowthAction,
    GrowthRun,
    IntegrationRecord,
    ManualOutcomeRequest,
    Metrics,
    utc_now,
)


class StoreError(RuntimeError):
    pass


class NotFoundError(StoreError):
    pass


class ConflictError(StoreError):
    pass


def content_hash(content: ActionContent | dict[str, Any]) -> str:
    value = content.model_dump(exclude_none=True) if isinstance(content, ActionContent) else content
    canonical = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class GrowthStore(ABC):
    name: str

    @abstractmethod
    async def healthy(self) -> bool: ...

    @abstractmethod
    async def metrics(self) -> Metrics: ...

    @abstractmethod
    async def list_actions(self, limit: int = 25) -> list[GrowthAction]: ...

    @abstractmethod
    async def get_action(self, action_id: str) -> GrowthAction: ...

    @abstractmethod
    async def create_actions(self, actions: list[GrowthAction]) -> list[GrowthAction]: ...

    @abstractmethod
    async def revise_action(self, action_id: str, proposal: AgentProposal) -> GrowthAction: ...

    @abstractmethod
    async def decide_action(
        self, action_id: str, request: DecisionRequest, enqueue_provider: str | None = None
    ) -> tuple[GrowthAction, ApprovalSnapshot | None]: ...

    @abstractmethod
    async def claim_approved_action(
        self, action_id: str, expected_version: int, expected_hash: str
    ) -> tuple[GrowthAction, ApprovalSnapshot]: ...

    @abstractmethod
    async def finish_execution(
        self, action_id: str, status: str, details: dict[str, Any]
    ) -> GrowthAction: ...

    @abstractmethod
    async def append_activity(
        self, event_type: str, details: dict[str, Any], action_id: str | None = None
    ) -> ActivityItem: ...

    @abstractmethod
    async def list_activity(self, limit: int = 30) -> list[ActivityItem]: ...

    @abstractmethod
    async def feedback_context(self, limit: int = 30) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def create_run(self, run: GrowthRun) -> tuple[GrowthRun, bool]: ...

    @abstractmethod
    async def update_run(self, run: GrowthRun) -> GrowthRun: ...

    @abstractmethod
    async def latest_run(self) -> GrowthRun | None: ...

    @abstractmethod
    async def latest_completed_run(self) -> GrowthRun | None: ...

    @abstractmethod
    async def recoverable_runs(self) -> list[GrowthRun]: ...

    @abstractmethod
    async def get_integration(self, provider: str) -> IntegrationRecord | None: ...

    @abstractmethod
    async def save_integration(self, integration: IntegrationRecord) -> IntegrationRecord: ...

    @abstractmethod
    async def delete_integration(self, provider: str) -> None: ...

    @abstractmethod
    async def enable_integration(self, provider: str, mode: str) -> IntegrationRecord: ...

    @abstractmethod
    async def get_execution_job(self, job_id: str) -> ExecutionJob: ...

    @abstractmethod
    async def claim_execution_job(
        self, worker_id: str, lease_seconds: int
    ) -> ExecutionJob | None: ...

    @abstractmethod
    async def approval_for_job(self, job: ExecutionJob) -> ApprovalSnapshot: ...

    @abstractmethod
    async def heartbeat_execution_job(
        self, job: ExecutionJob, lease_seconds: int
    ) -> ExecutionJob: ...

    @abstractmethod
    async def complete_execution_job(
        self,
        job: ExecutionJob,
        status: str,
        *,
        external_id: str | None = None,
        external_url: str | None = None,
        error: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> ExecutionJob: ...

    @abstractmethod
    async def retry_execution_job(self, job: ExecutionJob, error: str) -> ExecutionJob: ...

    @abstractmethod
    async def record_manual_outcome(
        self, action_id: str, outcome: ManualOutcomeRequest
    ) -> GrowthAction: ...

    @abstractmethod
    async def count_email_actions_since(self, since: datetime) -> int: ...

    async def close(self) -> None:
        return None


class InMemoryGrowthStore(GrowthStore):
    name = "memory"

    def __init__(self, metrics: Metrics | None = None):
        self._metrics = metrics or Metrics()
        self._actions: dict[str, GrowthAction] = {}
        self._approvals: dict[str, ApprovalSnapshot] = {}
        self._action_keys: dict[str, str] = {}
        self._activity: list[ActivityItem] = []
        self._runs: dict[str, GrowthRun] = {}
        self._run_keys: dict[str, str] = {}
        self._jobs: dict[str, ExecutionJob] = {}
        self._job_keys: dict[tuple[str, int], str] = {}
        self._integrations: dict[str, IntegrationRecord] = {}
        self._outcomes: list[dict[str, Any]] = []
        self._lock = asyncio.Lock()

    async def healthy(self) -> bool:
        return True

    async def metrics(self) -> Metrics:
        return self._metrics.model_copy(deep=True)

    def set_metrics(self, metrics: Metrics) -> None:
        self._metrics = metrics.model_copy(deep=True)

    async def list_actions(self, limit: int = 25) -> list[GrowthAction]:
        values = sorted(self._actions.values(), key=lambda action: action.created_at, reverse=True)
        result = []
        for item in values[:limit]:
            action = item.model_copy(deep=True)
            jobs = [job for job in self._jobs.values() if job.action_id == action.id]
            if jobs:
                action.execution = max(jobs, key=lambda job: job.created_at).summary()
            result.append(action)
        return result

    async def get_action(self, action_id: str) -> GrowthAction:
        try:
            action = self._actions[action_id].model_copy(deep=True)
            jobs = [job for job in self._jobs.values() if job.action_id == action.id]
            if jobs:
                action.execution = max(jobs, key=lambda job: job.created_at).summary()
            return action
        except KeyError as exc:
            raise NotFoundError("Action not found") from exc

    async def create_actions(self, actions: list[GrowthAction]) -> list[GrowthAction]:
        async with self._lock:
            result: list[GrowthAction] = []
            for action in actions:
                if action.idempotency_key and action.idempotency_key in self._action_keys:
                    result.append(
                        self._actions[self._action_keys[action.idempotency_key]].model_copy(deep=True)
                    )
                    continue
                stored = action.model_copy(deep=True)
                stored.content_hash = content_hash(stored.content)
                stored.status = "awaiting_approval"
                stored.updated_at = utc_now()
                self._actions[stored.id] = stored
                if stored.idempotency_key:
                    self._action_keys[stored.idempotency_key] = stored.id
                result.append(stored.model_copy(deep=True))
            return result

    async def revise_action(self, action_id: str, proposal: AgentProposal) -> GrowthAction:
        async with self._lock:
            action = self._actions.get(action_id)
            if not action:
                raise NotFoundError("Action not found")
            if action.status != "needs_changes":
                raise ConflictError("Only a needs_changes action can be revised")
            action.type = proposal.type
            action.title = proposal.title
            action.channel = proposal.channel
            action.expected_upside = proposal.expected_upside
            action.evidence = proposal.evidence
            action.risk = proposal.risk
            action.content = proposal.content
            action.content_hash = content_hash(action.content)
            action.version += 1
            action.status = "awaiting_approval"
            action.updated_at = utc_now()
            return action.model_copy(deep=True)

    async def decide_action(
        self, action_id: str, request: DecisionRequest, enqueue_provider: str | None = None
    ) -> tuple[GrowthAction, ApprovalSnapshot | None]:
        request.validate_semantics()
        async with self._lock:
            action = self._actions.get(action_id)
            if not action:
                raise NotFoundError("Action not found")
            if action.version != request.expected_version:
                raise ConflictError("Action changed; refresh before deciding")
            if action.status != "awaiting_approval":
                raise ConflictError(f"Action cannot be decided from status {action.status}")

            approval: ApprovalSnapshot | None = None
            if request.decision == "approve":
                integration = None
                if enqueue_provider:
                    integration = self._integrations.get(enqueue_provider)
                    if not integration or integration.status != "ready" or integration.mode not in {
                        "canary",
                        "live",
                    }:
                        raise ConflictError("GitHub integration is not enabled")
                    if (
                        integration.mode == "canary"
                        and integration.reserved_count >= integration.canary_limit
                    ):
                        raise ConflictError("GitHub canary already has its one reserved job")
                action.content_hash = content_hash(action.content)
                approval = ApprovalSnapshot(
                    action_id=action.id,
                    action_version=action.version,
                    content_hash=action.content_hash,
                    approved_content=action.content.model_dump(exclude_none=True),
                )
                self._approvals[action.id] = approval
                if enqueue_provider:
                    key = (action.id, approval.action_version)
                    if key not in self._job_keys:
                        job = ExecutionJob(
                            action_id=action.id,
                            action_version=approval.action_version,
                            content_hash=approval.content_hash,
                            content_snapshot=approval.approved_content,
                            provider=enqueue_provider,
                        )
                        self._jobs[job.id] = job
                        self._job_keys[key] = job.id
                        if integration and integration.mode == "canary":
                            integration.reserved_count += 1
                action.version += 1
                action.status = "approved"
            elif request.decision == "reject":
                action.version += 1
                action.status = "rejected"
            else:
                if request.content is not None:
                    action.content = ActionContent.model_validate(request.content)
                action.version += 1
                action.content_hash = content_hash(action.content)
                action.status = "needs_changes"
                self._approvals.pop(action.id, None)
            action.updated_at = utc_now()
            self._actions[action.id] = action
            self._activity.append(
                ActivityItem(
                    action_id=action.id,
                    event_type=f"action_{request.decision}d",
                    details={"version": action.version, "feedback": request.feedback},
                )
            )
            return action.model_copy(deep=True), approval.model_copy(deep=True) if approval else None

    async def get_integration(self, provider: str) -> IntegrationRecord | None:
        item = self._integrations.get(provider)
        return item.model_copy(deep=True) if item else None

    async def save_integration(self, integration: IntegrationRecord) -> IntegrationRecord:
        async with self._lock:
            existing = self._integrations.get(integration.provider)
            if existing:
                if any(
                    job.provider == integration.provider
                    and job.status in {"queued", "running"}
                    for job in self._jobs.values()
                ):
                    raise ConflictError("Wait for the active execution before replacing the token")
                integration.created_at = existing.created_at
                integration.mode = existing.mode
                integration.canary_limit = existing.canary_limit
                integration.reserved_count = existing.reserved_count
                integration.succeeded_count = existing.succeeded_count
                integration.paused_at = existing.paused_at
            integration.updated_at = utc_now()
            self._integrations[integration.provider] = integration.model_copy(deep=True)
            return integration.model_copy(deep=True)

    async def delete_integration(self, provider: str) -> None:
        async with self._lock:
            if any(
                job.provider == provider and job.status == "running"
                for job in self._jobs.values()
            ):
                raise ConflictError("Wait for the running execution before removing GitHub")
            now = utc_now()
            for job in self._jobs.values():
                if job.provider != provider or job.status != "queued":
                    continue
                job.status = "cancelled"
                job.error = "integration_removed_before_execution"
                job.completed_at = now
                job.updated_at = now
                action = self._actions.get(job.action_id)
                if action and action.status == "approved":
                    action.status = "expired"
                    action.updated_at = now
            self._integrations.pop(provider, None)

    async def enable_integration(self, provider: str, mode: str) -> IntegrationRecord:
        async with self._lock:
            integration = self._integrations.get(provider)
            if not integration or not (
                integration.credential_ciphertext and integration.credential_nonce
            ):
                raise ConflictError("GitHub integration is not configured")
            if integration.status != "ready":
                raise ConflictError("GitHub integration has not passed validation")
            active = any(
                job.provider == provider and job.status in {"queued", "running"}
                for job in self._jobs.values()
            )
            if mode == "canary" and integration.mode == "canary":
                return integration.model_copy(deep=True)
            if mode == "canary" and (integration.reserved_count > 0 or active):
                raise ConflictError("GitHub canary already has a reserved execution")
            if mode == "live" and integration.reserved_count > integration.succeeded_count:
                raise ConflictError("Finish the one-PR canary before enabling ongoing drafts")
            integration.mode = mode  # type: ignore[assignment]
            if mode == "canary":
                integration.canary_limit = 1
            integration.updated_at = utc_now()
            return integration.model_copy(deep=True)

    async def get_execution_job(self, job_id: str) -> ExecutionJob:
        try:
            return self._jobs[job_id].model_copy(deep=True)
        except KeyError as exc:
            raise NotFoundError("Execution job not found") from exc

    async def claim_execution_job(
        self, worker_id: str, lease_seconds: int
    ) -> ExecutionJob | None:
        async with self._lock:
            now = utc_now()
            candidates = sorted(self._jobs.values(), key=lambda item: item.created_at)
            for job in candidates:
                recoverable = job.status == "queued" or (
                    job.status == "running"
                    and job.lease_expires_at is not None
                    and job.lease_expires_at <= now
                )
                if not recoverable:
                    continue
                action = self._actions.get(job.action_id)
                approval = self._approvals.get(job.action_id)
                if not action or not approval or not (
                    action.status in {"approved", "executing"}
                    and action.version == job.action_version + 1
                    and approval.action_version == job.action_version
                    and approval.content_hash == job.content_hash == action.content_hash
                    and approval.approved_content == action.content.model_dump(exclude_none=True)
                ):
                    job.status = "failed"
                    job.error = "Approved content no longer matches the execution job"
                    job.completed_at = now
                    job.updated_at = now
                    continue
                job.status = "running"
                job.lease_owner = worker_id
                job.lease_token = str(uuid4())
                job.attempts += 1
                job.started_at = job.started_at or now
                job.lease_expires_at = now + timedelta(seconds=lease_seconds)
                job.updated_at = now
                action.status = "executing"
                action.updated_at = now
                return job.model_copy(deep=True)
            return None

    async def approval_for_job(self, job: ExecutionJob) -> ApprovalSnapshot:
        approval = self._approvals.get(job.action_id)
        if not approval or approval.action_version != job.action_version:
            raise ConflictError("Approval snapshot for execution job was not found")
        return approval.model_copy(deep=True)

    async def heartbeat_execution_job(
        self, job: ExecutionJob, lease_seconds: int
    ) -> ExecutionJob:
        async with self._lock:
            stored = self._jobs.get(job.id)
            if not stored or stored.status != "running" or not (
                stored.lease_owner == job.lease_owner and stored.lease_token == job.lease_token
            ):
                raise ConflictError("Execution job lease is no longer owned by this worker")
            now = utc_now()
            stored.lease_expires_at = now + timedelta(seconds=lease_seconds)
            stored.last_heartbeat_at = now
            stored.updated_at = now
            return stored.model_copy(deep=True)

    async def complete_execution_job(
        self,
        job: ExecutionJob,
        status: str,
        *,
        external_id: str | None = None,
        external_url: str | None = None,
        error: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> ExecutionJob:
        async with self._lock:
            stored = self._jobs.get(job.id)
            action = self._actions.get(job.action_id)
            if not stored or stored.status != "running" or not (
                stored.lease_owner == job.lease_owner and stored.lease_token == job.lease_token
            ):
                raise ConflictError("Execution job lease is no longer owned by this worker")
            now = utc_now()
            stored.status = status  # type: ignore[assignment]
            stored.external_id = external_id
            stored.external_url = external_url
            stored.error = error
            stored.completed_at = now
            stored.lease_expires_at = None
            stored.updated_at = now
            if action:
                if status == "succeeded":
                    action.status = "executed"
                elif status in {"failed", "unknown"}:
                    action.status = "failed"
                action.updated_at = now
            integration = self._integrations.get(stored.provider)
            if status == "succeeded" and integration:
                integration.succeeded_count += 1
                if (
                    integration.mode == "canary"
                    and integration.succeeded_count >= integration.canary_limit
                ):
                    integration.mode = "paused"
                integration.updated_at = now
            elif status in {"failed", "unknown"} and integration:
                integration.mode = "paused"
                integration.status = "error"
                integration.paused_at = now
                integration.last_error = error or "Execution could not be confirmed"
                integration.updated_at = now
            self._activity.append(
                ActivityItem(
                    action_id=stored.action_id,
                    event_type=f"execution_{status}",
                    details={
                        "job_id": stored.id,
                        "provider": stored.provider,
                        "external_id": external_id,
                        "external_url": external_url,
                        **(details or {}),
                    },
                )
            )
            return stored.model_copy(deep=True)

    async def retry_execution_job(self, job: ExecutionJob, error: str) -> ExecutionJob:
        async with self._lock:
            stored = self._jobs.get(job.id)
            if not stored or stored.status != "running" or not (
                stored.lease_owner == job.lease_owner and stored.lease_token == job.lease_token
            ):
                raise ConflictError("Execution job lease is no longer owned by this worker")
            stored.status = "queued"
            stored.lease_owner = None
            stored.lease_token = None
            stored.lease_expires_at = None
            stored.error = error
            stored.updated_at = utc_now()
            return stored.model_copy(deep=True)

    async def record_manual_outcome(
        self, action_id: str, outcome: ManualOutcomeRequest
    ) -> GrowthAction:
        async with self._lock:
            action = self._actions.get(action_id)
            if not action:
                raise NotFoundError("Action not found")
            if action.type != "email":
                raise ConflictError("Manual email outcomes are only valid for email drafts")
            if action.status not in {"approved", "executed", "observed", "evaluated"}:
                raise ConflictError("Approve the email draft before recording an outcome")
            now = utc_now()
            self._outcomes.append(
                {
                    "action_id": action_id,
                    "event_type": outcome.event_type,
                    "note": outcome.note,
                    "occurred_at": now,
                }
            )
            if outcome.event_type == "sent":
                action.status = "executed"
            elif outcome.event_type == "reply":
                action.status = "observed"
            else:
                action.status = "evaluated"
            action.updated_at = now
            self._activity.append(
                ActivityItem(
                    action_id=action_id,
                    event_type=f"manual_{outcome.event_type}",
                    details={"note": outcome.note},
                )
            )
            return action.model_copy(deep=True)

    async def count_email_actions_since(self, since: datetime) -> int:
        return sum(
            1
            for action in self._actions.values()
            if action.type == "email"
            and action.created_at >= since
        )

    async def claim_approved_action(
        self, action_id: str, expected_version: int, expected_hash: str
    ) -> tuple[GrowthAction, ApprovalSnapshot]:
        async with self._lock:
            action = self._actions.get(action_id)
            approval = self._approvals.get(action_id)
            if not action or not approval:
                raise ConflictError("No approval snapshot exists")
            current_hash = content_hash(action.content)
            if not (
                action.status == "approved"
                and action.version == expected_version == approval.action_version + 1
                and current_hash == expected_hash == action.content_hash == approval.content_hash
                and action.content.model_dump(exclude_none=True) == approval.approved_content
            ):
                raise ConflictError("Approved content no longer matches the current action")
            action.status = "executing"
            action.updated_at = utc_now()
            return action.model_copy(deep=True), approval.model_copy(deep=True)

    async def finish_execution(
        self, action_id: str, status: str, details: dict[str, Any]
    ) -> GrowthAction:
        async with self._lock:
            action = self._actions.get(action_id)
            if not action:
                raise NotFoundError("Action not found")
            action.status = status  # type: ignore[assignment]
            action.updated_at = utc_now()
            self._activity.append(
                ActivityItem(action_id=action.id, event_type=f"execution_{status}", details=details)
            )
            return action.model_copy(deep=True)

    async def append_activity(
        self, event_type: str, details: dict[str, Any], action_id: str | None = None
    ) -> ActivityItem:
        item = ActivityItem(action_id=action_id, event_type=event_type, details=details)
        async with self._lock:
            self._activity.append(item)
        return item.model_copy(deep=True)

    async def list_activity(self, limit: int = 30) -> list[ActivityItem]:
        return [item.model_copy(deep=True) for item in reversed(self._activity[-limit:])]

    async def feedback_context(self, limit: int = 30) -> list[dict[str, Any]]:
        decisions = [
            {
                "action_id": item.action_id,
                "kind": "ceo_decision",
                "decision": item.event_type.removeprefix("action_").removesuffix("d"),
                "feedback": item.details.get("feedback"),
                "occurred_at": item.created_at.isoformat(),
            }
            for item in reversed(self._activity[-limit:])
            if item.event_type in {"action_approved", "action_rejected", "action_changed"}
        ]
        outcomes = [
            {
                "action_id": item["action_id"],
                "kind": "manual_outcome",
                "outcome": item["event_type"],
                "feedback": item.get("note"),
                "occurred_at": item["occurred_at"].isoformat(),
            }
            for item in reversed(self._outcomes[-limit:])
        ]
        return sorted(
            [*decisions, *outcomes],
            key=lambda item: item["occurred_at"],
            reverse=True,
        )[:limit]

    async def create_run(self, run: GrowthRun) -> tuple[GrowthRun, bool]:
        async with self._lock:
            if existing_id := self._run_keys.get(run.idempotency_key):
                return self._runs[existing_id].model_copy(deep=True), False
            self._runs[run.id] = run.model_copy(deep=True)
            self._run_keys[run.idempotency_key] = run.id
            return run.model_copy(deep=True), True

    async def update_run(self, run: GrowthRun) -> GrowthRun:
        async with self._lock:
            if run.id not in self._runs:
                raise NotFoundError("Run not found")
            self._runs[run.id] = run.model_copy(deep=True)
            return run.model_copy(deep=True)

    async def latest_run(self) -> GrowthRun | None:
        if not self._runs:
            return None
        return max(self._runs.values(), key=lambda run: run.started_at).model_copy(deep=True)

    async def latest_completed_run(self) -> GrowthRun | None:
        completed = [run for run in self._runs.values() if run.status == "completed"]
        if not completed:
            return None
        return max(completed, key=lambda run: run.completed_at or run.started_at).model_copy(
            deep=True
        )

    async def recoverable_runs(self) -> list[GrowthRun]:
        return [
            run.model_copy(deep=True)
            for run in sorted(self._runs.values(), key=lambda item: item.started_at)
            if run.status in {"queued", "running"}
        ]


class SupabaseGrowthStore(GrowthStore):
    name = "supabase"

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise ValueError("Supabase settings are missing")
        self.base_url = settings.supabase_url.rstrip("/") + "/rest/v1"
        self.client = client or httpx.AsyncClient(timeout=20)
        self._owns_client = client is None
        self.headers = {
            "apikey": settings.supabase_service_role_key,
            "authorization": f"Bearer {settings.supabase_service_role_key}",
            "content-type": "application/json",
        }

    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()

    async def healthy(self) -> bool:
        try:
            await self._request(
                "GET", "growth_settings", params={"select": "id", "limit": "1"}
            )
            return True
        except (StoreError, httpx.HTTPError):
            return False

    async def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        headers = {**self.headers, **kwargs.pop("headers", {})}
        response = await self.client.request(method, f"{self.base_url}/{path}", headers=headers, **kwargs)
        if response.status_code == 404:
            raise NotFoundError("Supabase resource not found")
        if response.status_code in {409, 412}:
            raise ConflictError("Supabase optimistic update conflict")
        if response.is_error:
            try:
                error = response.json()
            except ValueError:
                error = {}
            code = str(error.get("code", ""))
            message = str(error.get("message", ""))
            if code == "P0002" or "not_found" in message:
                raise NotFoundError("Action not found")
            if code in {"22023", "40001", "54000", "55000"} or any(
                marker in message for marker in ("version_conflict", "not_awaiting_approval")
            ):
                raise ConflictError("Action changed or is no longer awaiting approval")
            raise StoreError(f"Supabase request failed ({response.status_code})")
        return response

    @staticmethod
    def _action(row: dict[str, Any]) -> GrowthAction:
        return GrowthAction.model_validate(row)

    @staticmethod
    def _job(row: dict[str, Any]) -> ExecutionJob:
        return ExecutionJob.model_validate(row)

    @staticmethod
    def _integration(row: dict[str, Any]) -> IntegrationRecord:
        value = dict(row)
        value["reserved_count"] = value.pop("canary_reserved_count", 0)
        value["succeeded_count"] = value.pop("canary_succeeded_count", 0)
        return IntegrationRecord.model_validate(value)

    async def _attach_executions(self, actions: list[GrowthAction]) -> list[GrowthAction]:
        if not actions:
            return actions
        action_ids = ",".join(action.id for action in actions)
        response = await self._request(
            "GET",
            "growth_execution_jobs",
            params={
                "select": "*",
                "action_id": f"in.({action_ids})",
                "order": "created_at.desc",
            },
        )
        jobs_by_action: dict[str, ExecutionJob] = {}
        for row in response.json():
            job = self._job(row)
            jobs_by_action.setdefault(job.action_id, job)
        for action in actions:
            if job := jobs_by_action.get(action.id):
                action.execution = job.summary()
        return actions

    async def metrics(self) -> Metrics:
        downloads, outcome_response = await asyncio.gather(
            self._count("site_events", {"event_name": "eq.download_click"}),
            self._request(
                "GET",
                "growth_outcome_events",
                params={
                    "select": "id,action_id,event_type",
                    "event_type": "in.(reply,positive_reply,negative_reply)",
                    "limit": "10000",
                },
            ),
        )
        reply_keys = {
            str(row.get("action_id") or row.get("id"))
            for row in outcome_response.json()
        }
        response = await self._request(
            "GET",
            "lemon_orders",
            params={
                "select": "amount_total,amount_usd,currency,status,refunded",
                "refunded": "not.is.true",
                "limit": "10000",
            },
        )
        revenue_cents = 0
        for order in response.json():
            if str(order.get("status", "")).lower() in {"refunded", "cancelled", "failed"}:
                continue
            revenue_cents += int(order.get("amount_total") or order.get("amount_usd") or 0)
        return Metrics(
            trial_downloads=downloads,
            replies=len(reply_keys),
            revenue=revenue_cents / 100,
        )

    async def _count(
        self, table: str, filters: dict[str, str], missing_ok: bool = False
    ) -> int:
        try:
            response = await self._request(
                "GET",
                table,
                params={"select": "id", **filters, "limit": "1"},
                headers={"Prefer": "count=exact", "Range": "0-0"},
            )
        except (NotFoundError, StoreError):
            if missing_ok:
                return 0
            raise
        content_range = response.headers.get("content-range", "*/0")
        return int(content_range.rsplit("/", 1)[-1])

    async def list_actions(self, limit: int = 25) -> list[GrowthAction]:
        response = await self._request(
            "GET",
            "growth_actions",
            params={"select": "*", "order": "created_at.desc", "limit": str(limit)},
        )
        return await self._attach_executions([self._action(row) for row in response.json()])

    async def get_action(self, action_id: str) -> GrowthAction:
        response = await self._request(
            "GET", "growth_actions", params={"select": "*", "id": f"eq.{action_id}", "limit": "1"}
        )
        rows = response.json()
        if not rows:
            raise NotFoundError("Action not found")
        return self._action(rows[0])

    async def create_actions(self, actions: list[GrowthAction]) -> list[GrowthAction]:
        if not actions:
            return []
        rows = []
        for action in actions:
            row = action.model_dump(mode="json", exclude={"content_hash"})
            row["content"] = action.content.model_dump(exclude_none=True)
            rows.append(row)
        response = await self._request(
            "POST",
            "growth_actions",
            json=rows,
            params={"on_conflict": "idempotency_key"},
            headers={"Prefer": "resolution=ignore-duplicates,return=representation"},
        )
        return [self._action(row) for row in response.json()]

    async def revise_action(self, action_id: str, proposal: AgentProposal) -> GrowthAction:
        current = await self.get_action(action_id)
        if current.status != "needs_changes":
            raise ConflictError("Only a needs_changes action can be revised")
        response = await self._request(
            "PATCH",
            "growth_actions",
            params={
                "id": f"eq.{action_id}",
                "version": f"eq.{current.version}",
                "status": "eq.needs_changes",
            },
            json={
                "version": current.version + 1,
                "status": "awaiting_approval",
                "type": proposal.type,
                "title": proposal.title,
                "channel": proposal.channel,
                "expected_upside": proposal.expected_upside.model_dump(),
                "evidence": proposal.evidence.model_dump(),
                "risk": proposal.risk.model_dump(),
                "content": proposal.content.model_dump(exclude_none=True),
            },
            headers={"Prefer": "return=representation"},
        )
        rows = response.json()
        if len(rows) != 1:
            raise ConflictError("Action changed while the revision was being saved")
        return self._action(rows[0])

    async def decide_action(
        self, action_id: str, request: DecisionRequest, enqueue_provider: str | None = None
    ) -> tuple[GrowthAction, ApprovalSnapshot | None]:
        request.validate_semantics()
        rpc = "rpc/decide_growth_action_v2" if enqueue_provider else "rpc/decide_growth_action"
        payload = {
            "p_action_id": action_id,
            "p_expected_version": request.expected_version,
            "p_decision": request.decision,
            "p_feedback": request.feedback,
            "p_edited_content": request.content,
        }
        if enqueue_provider:
            payload["p_enqueue_provider"] = enqueue_provider
        response = await self._request(
            "POST",
            rpc,
            json=payload,
        )
        rows = response.json()
        result = rows[0] if isinstance(rows, list) and rows else rows
        if not result:
            raise ConflictError("Decision was not applied")
        action = await self.get_action(action_id)
        approval = None
        if request.decision == "approve":
            approval = await self._approval(action_id)
        return action, approval

    async def _approval(self, action_id: str) -> ApprovalSnapshot:
        response = await self._request(
            "GET",
            "growth_approvals",
            params={
                "select": "action_id,action_version,content_hash,content_snapshot,decided_at,expires_at",
                "action_id": f"eq.{action_id}",
                "decision": "eq.approve",
                "order": "decided_at.desc",
                "limit": "1",
            },
        )
        rows = response.json()
        if not rows:
            raise ConflictError("No approval snapshot exists")
        row = rows[0]
        row["approved_at"] = row.pop("decided_at")
        row["approved_content"] = row.pop("content_snapshot")
        return ApprovalSnapshot.model_validate(row)

    async def claim_approved_action(
        self, action_id: str, expected_version: int, expected_hash: str
    ) -> tuple[GrowthAction, ApprovalSnapshot]:
        action, approval = await asyncio.gather(self.get_action(action_id), self._approval(action_id))
        if not (
            action.status == "approved"
            and action.version == expected_version == approval.action_version + 1
            and expected_hash == action.content_hash == approval.content_hash
            and action.content.model_dump(exclude_none=True) == approval.approved_content
            and (approval.expires_at is None or approval.expires_at > datetime.now(UTC))
        ):
            raise ConflictError("Approved content no longer matches the current action")
        response = await self._request(
            "PATCH",
            "growth_actions",
            params={
                "id": f"eq.{action_id}",
                "version": f"eq.{expected_version}",
                "status": "eq.approved",
                "content_hash": f"eq.{expected_hash}",
                "approval_expires_at": f"gt.{datetime.now(UTC).isoformat()}",
            },
            json={"status": "executing", "updated_at": utc_now().isoformat()},
            headers={"Prefer": "return=representation"},
        )
        rows = response.json()
        if len(rows) != 1:
            raise ConflictError("Action was already claimed or changed")
        return self._action(rows[0]), approval

    async def finish_execution(
        self, action_id: str, status: str, details: dict[str, Any]
    ) -> GrowthAction:
        response = await self._request(
            "PATCH",
            "growth_actions",
            params={"id": f"eq.{action_id}", "status": "eq.executing"},
            json={"status": status, "updated_at": utc_now().isoformat()},
            headers={"Prefer": "return=representation"},
        )
        rows = response.json()
        if len(rows) != 1:
            raise ConflictError("Executing action was not found")
        await self.append_activity(f"execution_{status}", details, action_id)
        return self._action(rows[0])

    async def append_activity(
        self, event_type: str, details: dict[str, Any], action_id: str | None = None
    ) -> ActivityItem:
        response = await self._request(
            "POST",
            "growth_audit_log",
            json={"action_id": action_id, "event_type": event_type, "details": details},
            headers={"Prefer": "return=representation"},
        )
        return ActivityItem.model_validate(response.json()[0])

    async def list_activity(self, limit: int = 30) -> list[ActivityItem]:
        response = await self._request(
            "GET",
            "growth_audit_log",
            params={"select": "id,action_id,event_type,details,created_at", "order": "created_at.desc", "limit": str(limit)},
        )
        return [ActivityItem.model_validate(row) for row in response.json()]

    async def feedback_context(self, limit: int = 30) -> list[dict[str, Any]]:
        approvals_response, outcomes_response = await asyncio.gather(
            self._request(
                "GET",
                "growth_approvals",
                params={
                    "select": "action_id,decision,feedback,decided_at",
                    "order": "decided_at.desc",
                    "limit": str(limit),
                },
            ),
            self._request(
                "GET",
                "growth_outcome_events",
                params={
                    "select": "action_id,event_type,metadata,occurred_at",
                    "order": "occurred_at.desc",
                    "limit": str(limit),
                },
            ),
        )
        context = [
            {
                "action_id": row.get("action_id"),
                "kind": "ceo_decision",
                "decision": row.get("decision"),
                "feedback": row.get("feedback"),
                "occurred_at": row.get("decided_at"),
            }
            for row in approvals_response.json()
        ]
        context.extend(
            {
                "action_id": row.get("action_id"),
                "kind": "outcome",
                "outcome": row.get("event_type"),
                "feedback": (row.get("metadata") or {}).get("note"),
                "occurred_at": row.get("occurred_at"),
            }
            for row in outcomes_response.json()
        )
        return sorted(
            context,
            key=lambda item: str(item.get("occurred_at") or ""),
            reverse=True,
        )[:limit]

    async def create_run(self, run: GrowthRun) -> tuple[GrowthRun, bool]:
        response = await self._request(
            "GET",
            "growth_runs",
            params={"select": "*", "idempotency_key": f"eq.{run.idempotency_key}", "limit": "1"},
        )
        if response.json():
            return self._run(response.json()[0]), False
        try:
            response = await self._request(
                "POST",
                "growth_runs",
                json=self._run_payload(run),
                headers={"Prefer": "return=representation"},
            )
            return self._run(response.json()[0]), True
        except ConflictError:
            response = await self._request(
                "GET",
                "growth_runs",
                params={"select": "*", "idempotency_key": f"eq.{run.idempotency_key}", "limit": "1"},
            )
            return self._run(response.json()[0]), False

    async def update_run(self, run: GrowthRun) -> GrowthRun:
        response = await self._request(
            "PATCH",
            "growth_runs",
            params={"id": f"eq.{run.id}"},
            json=self._run_payload(run),
            headers={"Prefer": "return=representation"},
        )
        rows = response.json()
        if not rows:
            raise NotFoundError("Run not found")
        return self._run(rows[0])

    async def latest_run(self) -> GrowthRun | None:
        response = await self._request(
            "GET",
            "growth_runs",
            params={"select": "*", "order": "started_at.desc", "limit": "1"},
        )
        return self._run(response.json()[0]) if response.json() else None

    async def latest_completed_run(self) -> GrowthRun | None:
        response = await self._request(
            "GET",
            "growth_runs",
            params={
                "select": "*",
                "status": "eq.completed",
                "order": "completed_at.desc",
                "limit": "1",
            },
        )
        return self._run(response.json()[0]) if response.json() else None

    async def recoverable_runs(self) -> list[GrowthRun]:
        response = await self._request(
            "GET",
            "growth_runs",
            params={
                "select": "*",
                "status": "in.(queued,running)",
                "order": "started_at.asc",
                "limit": "20",
            },
        )
        return [self._run(row) for row in response.json()]

    async def get_integration(self, provider: str) -> IntegrationRecord | None:
        response = await self._request(
            "GET",
            "growth_integrations",
            params={"select": "*", "provider": f"eq.{provider}", "limit": "1"},
        )
        rows = response.json()
        return self._integration(rows[0]) if rows else None

    async def save_integration(self, integration: IntegrationRecord) -> IntegrationRecord:
        existing = await self.get_integration(integration.provider)
        if existing:
            integration.canary_limit = existing.canary_limit
            integration.reserved_count = existing.reserved_count
            integration.succeeded_count = existing.succeeded_count
        await self._request(
            "POST",
            "rpc/save_growth_integration",
            json={
                "p_provider": integration.provider,
                "p_status": integration.status,
                "p_credential_ciphertext": integration.credential_ciphertext,
                "p_credential_nonce": integration.credential_nonce,
                "p_credential_key_version": integration.credential_key_version,
                "p_configuration": integration.configuration,
                "p_metadata": integration.metadata,
                "p_last_validated_at": (
                    integration.last_validated_at.isoformat()
                    if integration.last_validated_at
                    else None
                ),
                "p_last_error": integration.last_error,
            },
        )
        saved = await self.get_integration(integration.provider)
        if not saved:
            raise StoreError("Saved integration could not be read back")
        return saved

    async def delete_integration(self, provider: str) -> None:
        await self._request(
            "POST",
            "rpc/remove_growth_integration",
            json={"p_provider": provider},
        )

    async def enable_integration(self, provider: str, mode: str) -> IntegrationRecord:
        await self._request(
            "POST",
            "rpc/enable_growth_integration",
            json={"p_provider": provider, "p_mode": mode},
        )
        integration = await self.get_integration(provider)
        if not integration:
            raise NotFoundError("Integration not found")
        return integration

    async def get_execution_job(self, job_id: str) -> ExecutionJob:
        response = await self._request(
            "GET",
            "growth_execution_jobs",
            params={"select": "*", "id": f"eq.{job_id}", "limit": "1"},
        )
        rows = response.json()
        if not rows:
            raise NotFoundError("Execution job not found")
        return self._job(rows[0])

    async def claim_execution_job(
        self, worker_id: str, lease_seconds: int
    ) -> ExecutionJob | None:
        response = await self._request(
            "POST",
            "rpc/claim_growth_execution_job",
            json={"p_worker_id": worker_id, "p_lease_seconds": lease_seconds},
        )
        rows = response.json()
        if not rows:
            return None
        return self._job(rows[0])

    async def approval_for_job(self, job: ExecutionJob) -> ApprovalSnapshot:
        filters = {
            "select": "action_id,action_version,content_hash,content_snapshot,decided_at,expires_at",
            "action_id": f"eq.{job.action_id}",
            "action_version": f"eq.{job.action_version}",
            "decision": "eq.approve",
            "limit": "1",
        }
        if job.approval_id:
            filters["id"] = f"eq.{job.approval_id}"
        response = await self._request("GET", "growth_approvals", params=filters)
        rows = response.json()
        if not rows:
            raise ConflictError("Approval snapshot for execution job was not found")
        row = rows[0]
        row["approved_at"] = row.pop("decided_at")
        row["approved_content"] = row.pop("content_snapshot")
        return ApprovalSnapshot.model_validate(row)

    async def heartbeat_execution_job(
        self, job: ExecutionJob, lease_seconds: int
    ) -> ExecutionJob:
        response = await self._request(
            "POST",
            "rpc/heartbeat_growth_execution_job",
            json={
                "p_job_id": job.id,
                "p_worker_id": job.lease_owner,
                "p_lease_token": job.lease_token,
                "p_lease_seconds": lease_seconds,
            },
        )
        rows = response.json()
        if not rows:
            raise ConflictError("Execution job lease is no longer owned by this worker")
        return self._job(rows[0])

    async def complete_execution_job(
        self,
        job: ExecutionJob,
        status: str,
        *,
        external_id: str | None = None,
        external_url: str | None = None,
        error: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> ExecutionJob:
        response = await self._request(
            "POST",
            "rpc/complete_growth_execution_job",
            json={
                "p_job_id": job.id,
                "p_worker_id": job.lease_owner,
                "p_lease_token": job.lease_token,
                "p_status": status,
                "p_external_id": external_id,
                "p_external_url": external_url,
                "p_error": error,
                "p_details": details or {},
            },
        )
        rows = response.json()
        if not rows:
            raise ConflictError("Execution job lease is no longer owned by this worker")
        return self._job(rows[0])

    async def retry_execution_job(self, job: ExecutionJob, error: str) -> ExecutionJob:
        response = await self._request(
            "POST",
            "rpc/retry_growth_execution_job",
            json={
                "p_job_id": job.id,
                "p_worker_id": job.lease_owner,
                "p_lease_token": job.lease_token,
                "p_error": error,
                "p_retry_delay_seconds": 1,
                "p_details": {},
            },
        )
        rows = response.json()
        if not rows:
            raise ConflictError("Execution job lease is no longer owned by this worker")
        return self._job(rows[0])

    async def record_manual_outcome(
        self, action_id: str, outcome: ManualOutcomeRequest
    ) -> GrowthAction:
        await self._request(
            "POST",
            "rpc/record_growth_manual_outcome",
            json={
                "p_action_id": action_id,
                "p_event_type": outcome.event_type,
                "p_note": outcome.note,
                "p_idempotency_key": None,
            },
        )
        return await self.get_action(action_id)

    async def count_email_actions_since(self, since: datetime) -> int:
        return await self._count(
            "growth_actions",
            {"type": "eq.email", "created_at": f"gte.{since.isoformat()}"},
        )

    @staticmethod
    def _run(row: dict[str, Any]) -> GrowthRun:
        value = dict(row)
        if isinstance(value.get("summary"), dict):
            summary = value["summary"]
            value["summary"] = summary.get("text")
            value["metrics_snapshot"] = summary.get("metrics")
        return GrowthRun.model_validate(value)

    @staticmethod
    def _run_payload(run: GrowthRun) -> dict[str, Any]:
        payload = run.model_dump(mode="json", exclude_none=True, exclude={"metrics_snapshot"})
        if run.summary is not None or run.metrics_snapshot is not None:
            payload["summary"] = {
                "text": run.summary,
                "metrics": run.metrics_snapshot.model_dump() if run.metrics_snapshot else None,
            }
        return payload


def build_store(settings: Settings) -> GrowthStore:
    if settings.store_backend == "supabase":
        return SupabaseGrowthStore(settings)
    return InMemoryGrowthStore()
