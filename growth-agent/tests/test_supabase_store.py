from __future__ import annotations

from datetime import UTC, datetime, timedelta

import httpx
import pytest

from growth_agent.config import Settings
from growth_agent.models import DecisionRequest, GrowthRun, IntegrationRecord
from growth_agent.store import SupabaseGrowthStore


def action_row(action_id: str) -> dict:
    now = datetime.now(UTC).isoformat()
    return {
        "id": action_id,
        "version": 2,
        "type": "email",
        "title": "One review request",
        "channel": "email",
        "status": "approved",
        "expected_upside": {"level": "medium", "detail": "Relevant audience"},
        "evidence": {"level": "high", "detail": "Public contact"},
        "risk": {"level": "low", "detail": "One recipient"},
        "content": {"to": "reviewer@example.com", "subject": "Review", "body": "Hello"},
        "content_hash": "database-hash",
        "created_at": now,
        "updated_at": now,
    }


@pytest.mark.asyncio
async def test_supabase_decision_uses_rpc_contract_and_snapshot_columns():
    seen_rpc = {}
    action_id = "11111111-1111-4111-8111-111111111111"

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/rpc/decide_growth_action"):
            seen_rpc.update(__import__("json").loads(request.content))
            return httpx.Response(
                200,
                json=[
                    {
                        "action_id": action_id,
                        "status": "approved",
                        "version": 2,
                        "approval_id": "22222222-2222-4222-8222-222222222222",
                        "decision": "approve",
                        "content_hash": "database-hash",
                        "content": action_row(action_id)["content"],
                        "decided_at": datetime.now(UTC).isoformat(),
                    }
                ],
            )
        if request.url.path.endswith("/growth_actions"):
            return httpx.Response(200, json=[action_row(action_id)])
        if request.url.path.endswith("/growth_approvals"):
            return httpx.Response(
                200,
                json=[
                    {
                        "action_id": action_id,
                        "action_version": 1,
                        "content_hash": "database-hash",
                        "content_snapshot": action_row(action_id)["content"],
                        "decided_at": datetime.now(UTC).isoformat(),
                        "expires_at": (datetime.now(UTC) + timedelta(hours=1)).isoformat(),
                    }
                ],
            )
        raise AssertionError(request.url)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    settings = Settings(
        app_env="test",
        openai_api_key="",
        store_backend="supabase",
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-role-key",
    )
    store = SupabaseGrowthStore(settings, client=client)
    action, approval = await store.decide_action(
        action_id, DecisionRequest(decision="approve", expected_version=1)
    )
    assert seen_rpc == {
        "p_action_id": action_id,
        "p_expected_version": 1,
        "p_decision": "approve",
        "p_feedback": None,
        "p_edited_content": None,
    }
    assert action.version == 2
    assert approval and approval.action_version == 1
    assert approval.approved_content["subject"] == "Review"
    await client.aclose()


@pytest.mark.asyncio
async def test_supabase_run_summary_is_stored_as_json_object():
    posted = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            return httpx.Response(200, json=[])
        posted.update(__import__("json").loads(request.content))
        return httpx.Response(201, json=[{**posted, "summary": {}}])

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    settings = Settings(
        app_env="test",
        openai_api_key="",
        store_backend="supabase",
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-role-key",
    )
    store = SupabaseGrowthStore(settings, client=client)
    run = GrowthRun(kind="daily", idempotency_key="once")
    created, was_created = await store.create_run(run)
    assert was_created is True
    assert "summary" not in posted
    assert created.id == run.id
    await client.aclose()


@pytest.mark.asyncio
async def test_supabase_integration_removal_uses_guarded_rpc():
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["method"] = request.method
        seen["path"] = request.url.path
        seen["payload"] = __import__("json").loads(request.content)
        return httpx.Response(200, json=[])

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    settings = Settings(
        app_env="test",
        openai_api_key="",
        store_backend="supabase",
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-role-key",
    )
    store = SupabaseGrowthStore(settings, client=client)

    await store.delete_integration("github")

    assert seen == {
        "method": "POST",
        "path": "/rest/v1/rpc/remove_growth_integration",
        "payload": {"p_provider": "github"},
    }
    await client.aclose()


@pytest.mark.asyncio
async def test_supabase_token_replacement_preserves_canary_counters():
    posted: dict[str, object] = {}
    calls: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append((request.method, request.url.path))
        if request.method == "GET":
            return httpx.Response(
                200,
                json=[
                    {
                        "provider": "github",
                        "status": "ready",
                        "mode": "paused",
                        "credential_ciphertext": (
                            "new-ciphertext" if posted else "old-ciphertext"
                        ),
                        "credential_nonce": "new-nonce" if posted else "old-nonce",
                        "credential_key_version": 1,
                        "configuration": {"repository": "denizaytac/ancbuddy-site"},
                        "metadata": {},
                        "canary_limit": 1,
                        "canary_reserved_count": 1,
                        "canary_succeeded_count": 1,
                    }
                ],
            )
        posted.update(__import__("json").loads(request.content))
        return httpx.Response(
            200,
            json=[
                {
                    "provider": "github",
                    "status": "ready",
                    "mode": "paused",
                    "credentials_configured": True,
                }
            ],
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    store = SupabaseGrowthStore(
        Settings(
            app_env="test",
            store_backend="supabase",
            supabase_url="https://example.supabase.co",
            supabase_service_role_key="test-role-key",
        ),
        client=client,
    )
    saved = await store.save_integration(
        IntegrationRecord(
            provider="github",
            status="ready",
            mode="disabled",
            credential_ciphertext="new-ciphertext",
            credential_nonce="new-nonce",
            configuration={"repository": "denizaytac/ancbuddy-site"},
        )
    )
    assert calls == [
        ("GET", "/rest/v1/growth_integrations"),
        ("POST", "/rest/v1/rpc/save_growth_integration"),
        ("GET", "/rest/v1/growth_integrations"),
    ]
    assert posted == {
        "p_provider": "github",
        "p_status": "ready",
        "p_credential_ciphertext": "new-ciphertext",
        "p_credential_nonce": "new-nonce",
        "p_credential_key_version": 1,
        "p_configuration": {"repository": "denizaytac/ancbuddy-site"},
        "p_metadata": {},
        "p_last_validated_at": None,
        "p_last_error": None,
    }
    assert saved.reserved_count == 1
    assert saved.succeeded_count == 1
    await client.aclose()
