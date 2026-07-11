from __future__ import annotations

import asyncio
import hashlib
import json
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from typing import Any

import httpx

from .config import Settings
from .models import (
    ActionContent,
    ActivityItem,
    AgentProposal,
    ApprovalSnapshot,
    DecisionRequest,
    GrowthAction,
    GrowthRun,
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
        self, action_id: str, request: DecisionRequest
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
        self._lock = asyncio.Lock()

    async def healthy(self) -> bool:
        return True

    async def metrics(self) -> Metrics:
        return self._metrics.model_copy(deep=True)

    def set_metrics(self, metrics: Metrics) -> None:
        self._metrics = metrics.model_copy(deep=True)

    async def list_actions(self, limit: int = 25) -> list[GrowthAction]:
        values = sorted(self._actions.values(), key=lambda action: action.created_at, reverse=True)
        return [item.model_copy(deep=True) for item in values[:limit]]

    async def get_action(self, action_id: str) -> GrowthAction:
        try:
            return self._actions[action_id].model_copy(deep=True)
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
        self, action_id: str, request: DecisionRequest
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
                action.content_hash = content_hash(action.content)
                approval = ApprovalSnapshot(
                    action_id=action.id,
                    action_version=action.version,
                    content_hash=action.content_hash,
                    approved_content=action.content.model_dump(exclude_none=True),
                )
                self._approvals[action.id] = approval
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
        return [
            {
                "action_id": item.action_id,
                "decision": item.event_type.removeprefix("action_").removesuffix("d"),
                "feedback": item.details.get("feedback"),
                "decided_at": item.created_at.isoformat(),
            }
            for item in reversed(self._activity[-limit:])
            if item.event_type in {"action_approved", "action_rejected", "action_changed"}
        ]

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
            if code in {"40001", "55000"} or any(
                marker in message for marker in ("version_conflict", "not_awaiting_approval")
            ):
                raise ConflictError("Action changed or is no longer awaiting approval")
            raise StoreError(f"Supabase request failed ({response.status_code})")
        return response

    @staticmethod
    def _action(row: dict[str, Any]) -> GrowthAction:
        return GrowthAction.model_validate(row)

    async def metrics(self) -> Metrics:
        downloads, replies = await asyncio.gather(
            self._count("site_events", {"event_name": "eq.download_click"}),
            self._count("growth_outcome_events", {"event_type": "eq.reply"}, missing_ok=True),
        )
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
        return Metrics(trial_downloads=downloads, replies=replies, revenue=revenue_cents / 100)

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
        return [self._action(row) for row in response.json()]

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
        self, action_id: str, request: DecisionRequest
    ) -> tuple[GrowthAction, ApprovalSnapshot | None]:
        request.validate_semantics()
        response = await self._request(
            "POST",
            "rpc/decide_growth_action",
            json={
                "p_action_id": action_id,
                "p_expected_version": request.expected_version,
                "p_decision": request.decision,
                "p_feedback": request.feedback,
                "p_edited_content": request.content,
            },
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
        response = await self._request(
            "GET",
            "growth_approvals",
            params={
                "select": "action_id,decision,feedback,decided_at",
                "order": "decided_at.desc",
                "limit": str(limit),
            },
        )
        return response.json()

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
