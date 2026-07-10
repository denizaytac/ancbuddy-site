from __future__ import annotations

from datetime import UTC, datetime, timedelta

import httpx
import pytest

from growth_agent.config import Settings
from growth_agent.models import DecisionRequest, GrowthRun
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
