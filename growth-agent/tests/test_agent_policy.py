from growth_agent.agent import proposal_is_safe, proposal_mentions_blocked_channel
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


def test_policy_rejects_every_reddit_alias_by_default():
    direct = proposal(to="editor@example.com").model_copy(update={"channel": "Reddit"})
    subreddit = proposal(to="editor@example.com")
    subreddit.content = subreddit.content.model_copy(
        update={"preview": "Prepare a draft for a relevant subreddit"}
    )
    community = proposal(to="editor@example.com").model_copy(
        update={"title": "Prepare a draft for r/bose"}
    )

    assert not proposal_is_safe(direct)
    assert not proposal_is_safe(subreddit)
    assert not proposal_is_safe(community)


def test_policy_applies_configured_channels_without_substring_false_positives():
    linkedin = proposal(to="editor@example.com").model_copy(
        update={"title": "Prepare a LinkedIn founder note"}
    )
    unrelated = proposal(to="editor@example.com").model_copy(
        update={"title": "Clarify credit card checkout copy"}
    )

    assert proposal_mentions_blocked_channel(linkedin, ["linkedin"])
    assert not proposal_is_safe(linkedin, ["linkedin"])
    assert proposal_is_safe(unrelated, ["reddit"])


def test_policy_can_be_explicitly_configured_without_a_channel_block():
    reddit = proposal(to="editor@example.com").model_copy(update={"channel": "reddit"})

    assert proposal_is_safe(reddit, [])
