from growth_agent.agent import proposal_is_safe
from growth_agent.models import ActionContent, AgentProposal, Signal


def proposal(**content) -> AgentProposal:
    signal = Signal(level="low", detail="Test evidence")
    return AgentProposal(
        type="email",
        title="Reviewer pitch",
        channel="email",
        expected_upside=signal,
        evidence=signal,
        risk=signal,
        content=ActionContent(subject="Hello", body="Draft", preview="Draft", **content),
    )


def test_policy_accepts_one_exact_email_recipient():
    assert proposal_is_safe(proposal(to="editor@example.com"))


def test_policy_rejects_bulk_or_placeholder_email_recipient():
    assert not proposal_is_safe(proposal(to="one@example.com,two@example.com"))
    assert not proposal_is_safe(proposal(to="{trial_user_email}"))
    assert not proposal_is_safe(proposal(to="all trial users"))


def test_policy_requires_budget_for_paid_action():
    paid = proposal(to="editor@example.com").model_copy(
        update={"type": "social", "title": "Run paid ad test"}
    )
    assert not proposal_is_safe(paid)
    paid.content = paid.content.model_copy(
        update={"budget_minor": 2500, "budget_currency": "EUR"}
    )
    assert proposal_is_safe(paid)
