from __future__ import annotations

import pytest

from growth_agent.models import AgentProposal, DecisionRequest, GrowthAction
from growth_agent.service import ExecutionService
from growth_agent.store import ConflictError, InMemoryGrowthStore, content_hash


def action() -> GrowthAction:
    return GrowthAction.model_validate(
        {
            "type": "email",
            "title": "Review request",
            "channel": "email",
            "expected_upside": {"level": "medium", "detail": "Relevant review"},
            "evidence": {"level": "high", "detail": "Public contact page"},
            "risk": {"level": "low", "detail": "One recipient"},
            "content": {
                "to": "person@example.com",
                "subject": "Review copy",
                "body": "Would you like a review copy?",
            },
        }
    )


@pytest.mark.asyncio
async def test_approval_snapshot_and_claim_are_exact():
    store = InMemoryGrowthStore()
    created = (await store.create_actions([action()]))[0]
    approved, snapshot = await store.decide_action(
        created.id, DecisionRequest(decision="approve", expected_version=1)
    )
    assert snapshot is not None
    assert snapshot.content_hash == content_hash(approved.content)
    with pytest.raises(ConflictError):
        await store.claim_approved_action(created.id, 2, "0" * 64)
    assert approved.version == 2
    claimed, exact = await store.claim_approved_action(created.id, 2, snapshot.content_hash)
    assert claimed.status == "executing"
    assert exact.approved_content["subject"] == "Review copy"


@pytest.mark.asyncio
async def test_tampering_after_approval_blocks_execution():
    store = InMemoryGrowthStore()
    created = (await store.create_actions([action()]))[0]
    _, snapshot = await store.decide_action(
        created.id, DecisionRequest(decision="approve", expected_version=1)
    )
    assert snapshot
    store._actions[created.id].content.subject = "Changed after approval"  # simulate DB tamper
    with pytest.raises(ConflictError, match="no longer matches"):
        await store.claim_approved_action(created.id, 2, snapshot.content_hash)


@pytest.mark.asyncio
async def test_change_increments_version_and_requires_new_approval():
    store = InMemoryGrowthStore()
    created = (await store.create_actions([action()]))[0]
    changed, snapshot = await store.decide_action(
        created.id,
        DecisionRequest(decision="change", expected_version=1, feedback="Shorter subject"),
    )
    assert snapshot is None
    assert changed.version == 2
    assert changed.status == "needs_changes"
    with pytest.raises(ConflictError):
        await store.decide_action(
            created.id, DecisionRequest(decision="approve", expected_version=1)
        )
    proposal = AgentProposal(
        revises_action_id=created.id,
        type="email",
        title="Shorter review request",
        channel="email",
        expected_upside=changed.expected_upside,
        evidence=changed.evidence,
        risk=changed.risk,
        content={
            "to": "person@example.com",
            "subject": "Quick review?",
            "body": "Would a review copy help?",
        },
    )
    revised = await store.revise_action(created.id, proposal)
    assert revised.version == 3
    assert revised.status == "awaiting_approval"


@pytest.mark.asyncio
async def test_simulation_never_claims_or_calls_adapter(settings):
    store = InMemoryGrowthStore()
    created = (await store.create_actions([action()]))[0]
    approved, snapshot = await store.decide_action(
        created.id, DecisionRequest(decision="approve", expected_version=1)
    )
    assert snapshot
    service = ExecutionService(settings, store)
    await service.execute(created.id, approved.version, snapshot.content_hash)
    assert (await store.get_action(created.id)).status == "approved"
    assert (await store.list_activity())[0].event_type == "simulation_blocked"


@pytest.mark.asyncio
async def test_live_mode_without_smtp_marks_integration_required(settings):
    live = settings.model_copy(update={"execution_mode": "live"})
    store = InMemoryGrowthStore()
    created = (await store.create_actions([action()]))[0]
    approved, snapshot = await store.decide_action(
        created.id, DecisionRequest(decision="approve", expected_version=1)
    )
    assert snapshot
    await ExecutionService(live, store).execute(created.id, approved.version, snapshot.content_hash)
    assert (await store.get_action(created.id)).status == "integration_required"
