from __future__ import annotations

import asyncio
import base64
import json
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from argon2 import PasswordHasher
import growth_agent.service as service_module
from growth_agent.adapters.github import (
    GitHubClient,
    GitHubContentError,
    GitHubPRAdapter,
    GitHubTokenError,
    validate_approved_files,
)
from growth_agent.approval import ApprovalService, gmail_compose_url
from growth_agent.config import Settings
from growth_agent.credentials import CredentialCipher
from growth_agent.models import (
    AgentPlan,
    ApprovalSnapshot,
    DecisionRequest,
    ExecutionResult,
    GitHubIntegrationUpdate,
    GrowthAction,
    GrowthRun,
    IntegrationRecord,
    LoginRequest,
    ManualOutcomeRequest,
)
from growth_agent.security import AuthService
from growth_agent.service import ExecutionService, RunCoordinator
from growth_agent.store import ConflictError, InMemoryGrowthStore, StoreError


KEY = "u0ZOX1hLFaL3Ir6mV-puL5DrADvVlg5-ZQ-yJX6p_YM"


def website_action(path: str = "docs/growth/product-hunt/tagline.txt") -> GrowthAction:
    return GrowthAction.model_validate(
        {
            "type": "site_pr",
            "title": "Product Hunt launch copy",
            "channel": "website",
            "expected_upside": {"level": "medium", "detail": "Launch asset"},
            "evidence": {"level": "high", "detail": "Approved campaign plan"},
            "risk": {"level": "low", "detail": "Draft PR only"},
            "content": {
                "title": "Add Product Hunt launch copy",
                "body": "CEO-reviewed launch copy.",
                "files": [{"path": path, "content": "Quiet when you need it."}],
            },
        }
    )


def email_action() -> GrowthAction:
    return GrowthAction.model_validate(
        {
            "type": "email",
            "title": "Personal review request",
            "channel": "email",
            "expected_upside": {"level": "medium", "detail": "Relevant coverage"},
            "evidence": {"level": "high", "detail": "Public editorial contact"},
            "risk": {"level": "low", "detail": "One recipient"},
            "content": {
                "to": "reviewer@example.com",
                "subject": "ANCBuddy review copy",
                "body": "Would a review copy be useful?",
            },
        }
    )


def live_settings() -> Settings:
    return Settings(
        app_env="test",
        execution_mode="live",
        integration_encryption_key=KEY,
        github_repository="denizaytac/ancbuddy-site",
    )


async def configure_github(store: InMemoryGrowthStore, *, mode: str = "canary") -> None:
    ciphertext, nonce = CredentialCipher(KEY).encrypt(
        "github", "github_pat_test-secret-that-never-leaves-the-store"
    )
    await store.save_integration(
        IntegrationRecord(
            provider="github",
            status="ready",
            mode=mode,  # type: ignore[arg-type]
            credential_ciphertext=ciphertext,
            credential_nonce=nonce,
            configuration={"repository": "denizaytac/ancbuddy-site"},
        )
    )


def test_aes_gcm_round_trip_and_ciphertext_has_no_plaintext():
    cipher = CredentialCipher(KEY)
    secret = "github_pat_super-secret-value"
    ciphertext, nonce = cipher.encrypt("github", secret)
    assert secret not in ciphertext
    assert secret not in nonce
    assert cipher.decrypt("github", ciphertext, nonce) == secret
    with pytest.raises(Exception):
        cipher.decrypt("other-provider", ciphertext, nonce)


def test_pat_model_repr_is_redacted():
    payload = GitHubIntegrationUpdate(token="github_pat_a-long-enough-secret-token")
    assert "long-enough" not in repr(payload)


def test_login_request_repr_redacts_password():
    payload = LoginRequest(password="a-permanent-password")
    assert "permanent-password" not in repr(payload)


def test_permanent_password_hash_works_without_temporary_api_token():
    settings = Settings(
        app_env="test",
        ceo_password_hash=PasswordHasher().hash("a-permanent-password"),
        ceo_api_token=None,
    )
    auth = AuthService(settings)
    assert auth.verify_password("a-permanent-password") is True
    assert auth.verify_password("temporary-code") is False


@pytest.mark.parametrize(
    "path",
    [
        "site-src/src/.env.production",
        "site-src/src/nested/.git/config",
        "site-src/src/.github/workflows/deploy.yml",
        ".github/workflows/deploy.yml",
        "growth-agent/main.py",
        "supabase/migrations/evil.sql",
        "docs/growth/../secret.txt",
        "docs/growth/bad\nname.txt",
    ],
)
def test_github_path_policy_denies_sensitive_paths(path):
    with pytest.raises(GitHubContentError):
        validate_approved_files([{"path": path, "content": "no"}])


def test_github_path_policy_allows_only_narrow_roots_and_limits_payload():
    assert validate_approved_files(
        [{"path": "docs/growth/product-hunt/tagline.txt", "content": "yes"}]
    )
    with pytest.raises(GitHubContentError, match="at most 10"):
        validate_approved_files(
            [{"path": f"docs/growth/{index}.txt", "content": "x"} for index in range(11)]
        )
    with pytest.raises(GitHubContentError, match="1 MB"):
        validate_approved_files(
            [{"path": "docs/growth/large.txt", "content": "x" * (1024 * 1024 + 1)}]
        )


@pytest.mark.asyncio
async def test_token_validation_requires_repository_push_permission():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/repos/denizaytac/ancbuddy-site"):
            return httpx.Response(
                200,
                json={
                    "id": 1,
                    "full_name": "denizaytac/ancbuddy-site",
                    "default_branch": "main",
                    "permissions": {"pull": True, "push": False},
                },
            )
        raise AssertionError(request.url)

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        github = GitHubClient(
            "github_pat_read-only", "denizaytac/ancbuddy-site", client=client
        )
        async with github:
            with pytest.raises(GitHubTokenError, match="Contents"):
                await github.validate_token("denizaytac/ancbuddy-site")


@pytest.mark.asyncio
async def test_github_adapter_reconciles_existing_draft_pr_without_writes():
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        assert request.method == "GET"
        assert request.url.path.endswith("/pulls")
        assert "v7" in str(request.url)
        return httpx.Response(
            200,
            json=[
                {
                    "number": 42,
                    "html_url": "https://github.com/denizaytac/ancbuddy-site/pull/42",
                    "draft": True,
                }
            ],
        )

    action = website_action()
    approval = ApprovalSnapshot(
        action_id=action.id,
        action_version=7,
        content_hash="a" * 64,
        approved_content=action.content.model_dump(exclude_none=True),
    )
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await GitHubPRAdapter(
            live_settings(),
            "github_pat_secret",
            "denizaytac/ancbuddy-site",
            client=client,
        ).execute(action, approval)
    assert result.status == "executed"
    assert result.external_id == "42"
    assert result.details["reconciled"] is True
    assert len(seen) == 1


@pytest.mark.asyncio
async def test_github_retryable_http_failure_is_reconciled_later():
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"message": "temporary"})

    action = website_action()
    approval = ApprovalSnapshot(
        action_id=action.id,
        action_version=1,
        content_hash="a" * 64,
        approved_content=action.content.model_dump(exclude_none=True),
    )
    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        result = await GitHubPRAdapter(
            live_settings(),
            "github_pat_secret",
            "denizaytac/ancbuddy-site",
            client=client,
        ).execute(action, approval)

    assert result.status == "unknown"
    assert result.details["status_code"] == 503


@pytest.mark.asyncio
async def test_approve_enqueues_one_job_and_canary_auto_pauses(monkeypatch):
    class FakeAdapter:
        def __init__(self, *_args, **_kwargs):
            pass

        async def execute(self, _action, _approval):
            return ExecutionResult(
                status="executed",
                provider="github",
                external_id="17",
                details={
                    "url": "https://github.com/denizaytac/ancbuddy-site/pull/17",
                    "draft": True,
                },
            )

    monkeypatch.setattr(service_module, "GitHubPRAdapter", FakeAdapter)
    store = InMemoryGrowthStore()
    await configure_github(store)
    created = (await store.create_actions([website_action()]))[0]
    approved, snapshot = await store.decide_action(
        created.id,
        DecisionRequest(decision="approve", expected_version=1),
        enqueue_provider="github",
    )
    assert snapshot
    job = approved.execution
    assert job is None  # get/list attaches the durable summary, the decision snapshot stays lean
    listed = (await store.list_actions())[0]
    assert listed.execution and listed.execution.status == "queued"

    executor = ExecutionService(live_settings(), store)
    assert await executor.process_next() is True
    completed = (await store.list_actions())[0]
    assert completed.status == "executed"
    assert completed.execution and completed.execution.status == "succeeded"
    assert completed.execution.external_id == "17"
    integration = await store.get_integration("github")
    assert integration and integration.mode == "paused"
    assert integration.succeeded_count == 1
    assert await executor.process_next() is False


@pytest.mark.asyncio
async def test_old_approval_is_never_retroactively_enqueued():
    store = InMemoryGrowthStore()
    created = (await store.create_actions([website_action()]))[0]
    approved, snapshot = await store.decide_action(
        created.id, DecisionRequest(decision="approve", expected_version=1)
    )
    assert approved.status == "approved" and snapshot
    await configure_github(store)
    assert (await store.list_actions())[0].execution is None
    assert await ExecutionService(live_settings(), store).process_next() is False


@pytest.mark.asyncio
async def test_job_retry_reclaims_deterministically(monkeypatch):
    calls = 0

    class FlakyAdapter:
        def __init__(self, *_args, **_kwargs):
            pass

        async def execute(self, _action, _approval):
            nonlocal calls
            calls += 1
            if calls == 1:
                return ExecutionResult(
                    status="unknown",
                    provider="github",
                    details={"reason": "ambiguous"},
                )
            return ExecutionResult(
                status="executed",
                provider="github",
                external_id="22",
                details={"url": "https://github.com/x/y/pull/22", "draft": True},
            )

    monkeypatch.setattr(service_module, "GitHubPRAdapter", FlakyAdapter)
    store = InMemoryGrowthStore()
    await configure_github(store)
    created = (await store.create_actions([website_action()]))[0]
    await store.decide_action(
        created.id,
        DecisionRequest(decision="approve", expected_version=1),
        enqueue_provider="github",
    )
    executor = ExecutionService(live_settings(), store)
    assert await executor.process_next()
    after_first = (await store.list_actions())[0]
    assert after_first.execution and after_first.execution.status == "queued"
    assert await executor.process_next()
    after_second = (await store.list_actions())[0]
    assert after_second.execution and after_second.execution.status == "succeeded"
    assert after_second.execution.attempts == 2


@pytest.mark.asyncio
async def test_worker_loop_survives_transient_claim_failure(monkeypatch):
    settings = live_settings().model_copy(update={"execution_worker_poll_seconds": 0.1})
    executor = ExecutionService(settings, InMemoryGrowthStore())
    calls = 0

    async def flaky_process_next():
        nonlocal calls
        calls += 1
        if calls == 1:
            raise StoreError("temporary database outage")
        await executor.stop()
        return False

    monkeypatch.setattr(executor, "process_next", flaky_process_next)
    await asyncio.wait_for(executor.run(), timeout=1)

    assert calls >= 2


@pytest.mark.asyncio
async def test_email_approval_has_gmail_compose_and_manual_outcomes_ignore_expiry():
    store = InMemoryGrowthStore()
    created = (await store.create_actions([email_action()]))[0]
    approved, snapshot = await store.decide_action(
        created.id, DecisionRequest(decision="approve", expected_version=1)
    )
    assert snapshot and (await store.list_actions())[0].execution is None
    store._approvals[created.id].expires_at = datetime.now(UTC) - timedelta(days=1)
    url = gmail_compose_url(approved)
    params = parse_qs(urlparse(url).query)
    assert params["to"] == ["reviewer@example.com"]
    assert params["su"] == ["ANCBuddy review copy"]
    sent = await store.record_manual_outcome(
        created.id, ManualOutcomeRequest(event_type="sent")
    )
    assert sent.status == "executed"
    replied = await store.record_manual_outcome(
        created.id, ManualOutcomeRequest(event_type="positive", note="Wants a demo")
    )
    assert replied.status == "evaluated"
    feedback = await store.feedback_context()
    assert any(
        item.get("kind") == "manual_outcome"
        and item.get("outcome") == "positive"
        and item.get("feedback") == "Wants a demo"
        for item in feedback
    )


@pytest.mark.asyncio
async def test_approval_readiness_blocks_simulation_and_bad_email():
    settings = live_settings().model_copy(update={"execution_mode": "simulation"})
    store = InMemoryGrowthStore()
    await configure_github(store)
    approval = ApprovalService(settings, store)
    assert await approval.blocker(website_action()) == "Live draft-PR execution is not enabled"
    email = email_action()
    email.content.to = "one@example.com, two@example.com"
    assert "exactly one" in str(await approval.blocker(email))


@pytest.mark.asyncio
async def test_run_coordinator_caps_new_email_drafts_at_three():
    class FiveEmailPlanner:
        async def plan(self, *_args):
            proposals = []
            for index in range(5):
                proposal = email_action().model_dump(
                    exclude={"id", "version", "status", "content_hash", "created_at", "updated_at"}
                )
                proposal["title"] = f"Email {index}"
                proposal["content"]["to"] = f"person{index}@example.com"
                proposals.append(proposal)
            return AgentPlan(summary="Five candidates", actions=proposals)

    store = InMemoryGrowthStore()
    coordinator = RunCoordinator(live_settings(), store, FiveEmailPlanner())
    run = GrowthRun(kind="daily", idempotency_key="email-cap")
    await store.create_run(run)
    await coordinator.execute(run)
    actions = await store.list_actions()
    assert len(actions) == 3
    assert all(action.type == "email" for action in actions)


def test_temporary_api_token_expiry_blocks_login_and_bearer():
    expired = Settings(
        app_env="test",
        ceo_api_token="temporary-code",
        ceo_api_token_expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    assert AuthService(expired).verify_password("temporary-code") is False


def test_temporary_api_token_caps_issued_session_expiry():
    expires_at = datetime.now(UTC) + timedelta(minutes=5)
    settings = Settings(
        app_env="test",
        ceo_api_token="temporary-code",
        ceo_api_token_expires_at=expires_at,
        session_secret="not-a-production-secret",
        session_ttl_seconds=43_200,
    )
    token = AuthService(settings).issue_session(api_token_login=True)
    encoded = token.split(".", 1)[0]
    payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
    assert payload["exp"] <= int(expires_at.timestamp())


@pytest.mark.asyncio
async def test_integrations_cannot_enable_without_encrypted_credentials():
    store = InMemoryGrowthStore()
    with pytest.raises(ConflictError, match="not configured"):
        await store.enable_integration("github", "canary")


@pytest.mark.asyncio
async def test_replacing_integration_credentials_preserves_canary_counters():
    store = InMemoryGrowthStore()
    await configure_github(store)
    configured = store._integrations["github"]
    configured.reserved_count = 1
    configured.succeeded_count = 1
    replacement = configured.model_copy(
        update={
            "credential_ciphertext": "replacement-ciphertext",
            "credential_nonce": "replacement-nonce",
            "reserved_count": 0,
            "succeeded_count": 0,
        }
    )

    saved = await store.save_integration(replacement)

    assert saved.reserved_count == 1
    assert saved.succeeded_count == 1
