from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4

from pydantic import AliasChoices, BaseModel, Field, SecretStr, field_validator


RunKind = Literal["daily", "weekly", "manual"]
Decision = Literal["approve", "reject", "change"]
ActionType = Literal["email", "social", "listing", "site_pr", "video", "partnership"]
ActionStatus = Literal[
    "idea",
    "researched",
    "drafted",
    "awaiting_approval",
    "approved",
    "rejected",
    "needs_changes",
    "executing",
    "executed",
    "observed",
    "evaluated",
    "expired",
    "failed",
    "integration_required",
]
ExecutionJobStatus = Literal[
    "queued", "running", "succeeded", "failed", "unknown", "cancelled"
]
IntegrationMode = Literal["disabled", "canary", "live", "paused"]
IntegrationStatus = Literal["unconfigured", "validating", "ready", "invalid", "error"]


def utc_now() -> datetime:
    return datetime.now(UTC)


class Goal(BaseModel):
    target: float
    earned: float
    currency: str


class Metrics(BaseModel):
    trial_downloads: int = 0
    replies: int = 0
    revenue: float = 0


class Signal(BaseModel):
    level: Literal["low", "medium", "high"]
    detail: str


class ContentFile(BaseModel):
    path: str
    content: str


class PayloadField(BaseModel):
    key: str
    value: str


class ActionContent(BaseModel):
    model_config = {"extra": "forbid"}

    to: str | None = None
    title: str | None = None
    subject: str | None = None
    body: str | None = None
    preview: str | None = None
    reply_to: str | None = None
    url: str | None = None
    destination_url: str | None = None
    utm_campaign: str | None = None
    budget_minor: int | None = Field(default=None, ge=0)
    budget_currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    files: list[ContentFile] | None = None
    payload: list[PayloadField] | None = None


class GrowthAction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    idempotency_key: str | None = None
    run_id: str | None = None
    version: int = Field(default=1, ge=1)
    type: ActionType
    title: str
    channel: str
    status: ActionStatus = "awaiting_approval"
    expected_upside: Signal
    evidence: Signal
    risk: Signal
    content: ActionContent
    content_hash: str = ""
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    execution: ExecutionJobSummary | None = None
    gmail_compose_url: str | None = None
    approval_ready: bool = True
    approval_blocker: str | None = None


class ExecutionJobSummary(BaseModel):
    id: str
    status: ExecutionJobStatus
    provider: str
    attempts: int = 0
    external_id: str | None = None
    external_url: str | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime


class ExecutionJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    action_id: str
    approval_id: str | None = None
    action_version: int = Field(ge=1)
    content_hash: str
    content_snapshot: dict[str, Any] = Field(default_factory=dict)
    provider: str
    status: ExecutionJobStatus = "queued"
    attempts: int = Field(default=0, ge=0)
    max_attempts: int = Field(default=3, ge=1)
    available_at: datetime = Field(default_factory=utc_now)
    authorization_expires_at: datetime | None = None
    lease_owner: str | None = None
    lease_token: str | None = None
    lease_expires_at: datetime | None = None
    last_heartbeat_at: datetime | None = None
    external_id: str | None = None
    external_url: str | None = None
    error: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    started_at: datetime | None = None
    completed_at: datetime | None = None

    def summary(self) -> ExecutionJobSummary:
        return ExecutionJobSummary.model_validate(
            self.model_dump(
                include={
                    "id",
                    "status",
                    "provider",
                    "attempts",
                    "external_id",
                    "external_url",
                    "error",
                    "created_at",
                    "updated_at",
                }
            )
        )


class ActivityItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    action_id: str | None = None
    event_type: str
    details: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)


class ActivitySummary(BaseModel):
    last_analysis: datetime | None = None
    next_run: datetime | None = None
    agent_note: str | None = None


class Dashboard(BaseModel):
    goal: Goal
    metrics: Metrics
    actions: list[GrowthAction]
    activity: ActivitySummary


class LoginRequest(BaseModel):
    password: SecretStr = Field(
        min_length=1,
        max_length=512,
        validation_alias=AliasChoices("password", "token"),
    )


class RunRequest(BaseModel):
    focus: str | None = Field(default=None, max_length=1000)
    trigger: str | None = Field(default=None, max_length=100)


class GrowthRun(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    kind: RunKind
    status: Literal[
        "queued", "running", "awaiting_approval", "completed", "failed", "cancelled"
    ] = "queued"
    idempotency_key: str
    focus: str | None = None
    trigger: str = "api"
    summary: str | None = None
    metrics_snapshot: Metrics | None = None
    error: str | None = None
    started_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None


class DecisionRequest(BaseModel):
    decision: Decision
    expected_version: int = Field(ge=1)
    feedback: str | None = Field(default=None, max_length=5000)
    content: dict[str, Any] | None = None

    @field_validator("feedback")
    @classmethod
    def trim_feedback(cls, value: str | None) -> str | None:
        return value.strip() if value else None

    def validate_semantics(self) -> None:
        if self.decision == "change" and not (self.feedback or self.content):
            raise ValueError("A change decision requires feedback or replacement content")
        if self.decision != "change" and self.content is not None:
            raise ValueError("Replacement content is only valid for a change decision")


class ApprovalSnapshot(BaseModel):
    action_id: str
    action_version: int
    content_hash: str
    approved_content: dict[str, Any]
    approved_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime | None = None


class ExecutionResult(BaseModel):
    status: Literal["executed", "integration_required", "failed", "unknown"]
    provider: str
    external_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class IntegrationRecord(BaseModel):
    provider: str
    credential_ciphertext: str | None = None
    credential_nonce: str | None = None
    credential_key_version: int = 1
    configuration: dict[str, Any] = Field(default_factory=dict)
    mode: IntegrationMode = "disabled"
    status: IntegrationStatus = "unconfigured"
    canary_limit: int = Field(default=1, ge=0)
    reserved_count: int = Field(default=0, ge=0)
    succeeded_count: int = Field(default=0, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)
    last_validated_at: datetime | None = None
    last_error: str | None = None
    paused_at: datetime | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class IntegrationView(BaseModel):
    provider: str
    configured: bool
    repository: str | None = None
    mode: IntegrationMode
    status: IntegrationStatus
    succeeded_count: int = 0
    last_tested_at: datetime | None = None
    last_error: str | None = None


class GitHubIntegrationUpdate(BaseModel):
    token: SecretStr


class EnableIntegrationRequest(BaseModel):
    mode: Literal["canary", "live"] = "canary"


class ManualOutcomeRequest(BaseModel):
    event_type: Literal["sent", "reply", "positive", "negative"]
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("note")
    @classmethod
    def trim_note(cls, value: str | None) -> str | None:
        return value.strip() if value else None


class AgentProposal(BaseModel):
    revises_action_id: str | None = None
    type: ActionType
    title: str
    channel: str
    expected_upside: Signal
    evidence: Signal
    risk: Signal
    content: ActionContent

    @field_validator("content")
    @classmethod
    def require_complete_budget(cls, value: ActionContent) -> ActionContent:
        if (value.budget_minor is None) != (value.budget_currency is None):
            raise ValueError("Budget amount and currency must be provided together")
        return value


class AgentPlan(BaseModel):
    summary: str
    actions: list[AgentProposal] = Field(max_length=5)
