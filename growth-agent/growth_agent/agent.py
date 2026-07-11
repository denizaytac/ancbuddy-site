from __future__ import annotations

import json
import re
from collections.abc import Collection
from email.utils import parseaddr
from typing import Protocol
from uuid import NAMESPACE_URL, uuid5

from agents import Agent, Runner, WebSearchTool, set_default_openai_key

from .config import Settings
from .models import AgentPlan, AgentProposal, GrowthAction, Metrics, RunKind


AGENT_INSTRUCTIONS = """
You are the single Growth Operator for ANCBuddy, a paid macOS menu-bar app for Bose
QC Ultra devices. Your objective is sustainable, attributed revenue toward EUR 1,000,
not vanity activity. The CEO has ADHD and should receive at most five crisp, finished
decisions, not a backlog.

Diagnose the current bottleneck before proposing work: reach, trial download,
activation, checkout, or purchase. Research only public, relevant sources. Never invent
a contact, email address, product fact, metric, quote, relationship, or result. When
evidence is weak, label it low. Respect opt-outs and avoid repetitive or mass outreach.

Every proposed externally visible action is only a DRAFT for CEO approval. You cannot
send, publish, purchase, merge, or claim that an action happened. Prepare exact content
so the approved snapshot can be executed without rewriting it:
- email: content contains to, subject, body, and preview;
- site_pr: content contains title, body, preview, and files, where files is a
  list of {path, content}; use only when the full file text is genuinely available;
- other channels: content contains preview plus payload as a list of {key, value}
  strings, and may include destination_url or utm_campaign.

For each action return expected upside, evidence, and risk as level low/medium/high plus
one concise detail. Prefer one-variable experiments, unique UTM campaign identifiers,
and actions whose outcomes can be observed. If prior actions exist, use their statuses
and outcomes as a feedback loop: amplify useful channels, change one variable after a
weak result, and do not repeat rejected work. When responding to a CEO `change` decision,
set revises_action_id to that exact needs_changes action; otherwise set it to null. Output
no more than five actions.

Never use past-tense execution claims such as sent, emailed, published, posted, merged,
or purchased in a proposal title, preview, body, or summary. Use explicit draft,
proposed, or future-conditional wording instead. Any action that can spend money must
state an exact approved budget and currency in its content; otherwise do not propose it.
Every email action must address exactly one concrete, evidence-backed email address.
Never use a list, comma-separated recipients, a placeholder, a segment, or a lifecycle
audience in content.to. If no exact recipient is known, propose a non-email experiment.
""".strip()


PAID_ACTION = re.compile(r"\b(paid ad|advertis(?:e|ing)|sponsor|media buy|spend)\b", re.I)
REDDIT_ALIAS = re.compile(
    r"(?:\breddit(?:\.com)?\b|\bsubreddits?\b|(?<![A-Za-z0-9_])r/[A-Za-z0-9_]*)",
    re.I,
)


def blocked_channel_instruction(blocked_channels: Collection[str]) -> str:
    normalized = [channel.strip().lower() for channel in blocked_channels if channel.strip()]
    if not normalized:
        return "No channels are currently blocked by operator configuration."
    channels = ", ".join(normalized)
    reddit_detail = (
        " Reddit aliases such as subreddit and r/... count as Reddit."
        if "reddit" in normalized
        else ""
    )
    return (
        f"Hard channel blocklist: {channels}. Never research, recommend, draft, or route an "
        "action through a blocked channel, and never suggest alternate accounts or workarounds."
        f"{reddit_detail}"
    )


def proposal_mentions_blocked_channel(
    proposal: AgentProposal, blocked_channels: Collection[str]
) -> bool:
    serialized = proposal.model_dump_json()
    for raw_channel in blocked_channels:
        channel = raw_channel.strip().lower()
        if not channel:
            continue
        if channel == "reddit" and REDDIT_ALIAS.search(serialized):
            return True
        pattern = re.compile(
            rf"(?<![A-Za-z0-9_]){re.escape(channel)}(?![A-Za-z0-9_])",
            re.I,
        )
        if pattern.search(serialized):
            return True
    return False


def proposal_is_safe(
    proposal: AgentProposal, blocked_channels: Collection[str] = ("reddit",)
) -> bool:
    """Deterministic boundary applied after model output and before persistence."""
    content = proposal.content
    if proposal_mentions_blocked_channel(proposal, blocked_channels):
        return False
    if proposal.type == "email":
        recipient = (content.to or "").strip()
        _, parsed = parseaddr(recipient)
        if (
            not parsed
            or parsed != recipient
            or "@" not in parsed
            or any(marker in recipient for marker in (",", ";", "{", "}", "[", "]", "<", ">"))
        ):
            return False
    if (content.budget_minor is None) != (content.budget_currency is None):
        return False
    if PAID_ACTION.search(f"{proposal.title} {proposal.channel}") and content.budget_minor is None:
        return False
    return True


class Planner(Protocol):
    async def plan(
        self,
        kind: RunKind,
        metrics: Metrics,
        previous_metrics: Metrics | None,
        current_actions: list[GrowthAction],
        feedback_context: list[dict],
        focus: str | None,
    ) -> AgentPlan: ...


class AgentsSDKPlanner:
    def __init__(self, settings: Settings):
        self.settings = settings
        if settings.openai_api_key:
            set_default_openai_key(settings.openai_api_key)
        self.agent = Agent(
            name="ANCBuddy Growth Operator",
            instructions=(
                f"{AGENT_INSTRUCTIONS}\n\n"
                f"{blocked_channel_instruction(settings.blocked_channels)}"
            ),
            model=settings.openai_model,
            tools=[WebSearchTool()],
            output_type=AgentPlan,
        )

    async def plan(
        self,
        kind: RunKind,
        metrics: Metrics,
        previous_metrics: Metrics | None,
        current_actions: list[GrowthAction],
        feedback_context: list[dict],
        focus: str | None,
    ) -> AgentPlan:
        if not self.settings.agent_ready:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        action_context = [
            {
                "id": action.id,
                "type": action.type,
                "channel": action.channel,
                "status": action.status,
                "title": action.title,
                "created_at": action.created_at.isoformat(),
            }
            for action in current_actions[:30]
        ]
        prompt = {
            "run_kind": kind,
            "focus_from_ceo": focus,
            "goal": {
                "target": self.settings.goal_target,
                "earned": self.settings.goal_earned_baseline + metrics.revenue,
                "currency": self.settings.goal_currency,
            },
            "metrics": metrics.model_dump(),
            "previous_completed_run_metrics": (
                previous_metrics.model_dump() if previous_metrics else None
            ),
            "existing_actions": action_context,
            "ceo_decision_feedback": feedback_context[:30],
            "blocked_channels": self.settings.blocked_channels,
            "instruction": "Return a decision-ready plan. Do not perform any external action.",
        }
        result = await Runner.run(
            self.agent,
            json.dumps(prompt, ensure_ascii=False),
            max_turns=8,
        )
        plan = (
            result.final_output
            if isinstance(result.final_output, AgentPlan)
            else AgentPlan.model_validate(result.final_output)
        )
        filtered = [
            proposal
            for proposal in plan.actions
            if proposal_is_safe(proposal, self.settings.blocked_channels)
        ]
        if len(filtered) != len(plan.actions):
            removed = len(plan.actions) - len(filtered)
            return plan.model_copy(
                update={
                    "actions": filtered,
                    "summary": f"{plan.summary} {removed} unsafe proposal(s) removed by policy.",
                }
            )
        return plan


def proposals_to_actions(
    plan: AgentPlan,
    kind: RunKind,
    run_id: str,
    available_slots: int = 5,
    proposals: list[AgentProposal] | None = None,
) -> list[GrowthAction]:
    maximum = min(available_slots, 5 if kind == "weekly" else 3)
    actions = []
    selected = proposals if proposals is not None else plan.actions
    for index, proposal in enumerate(selected[:maximum]):
        key = f"growth-run:{run_id}:action:{index}"
        actions.append(
            GrowthAction(
                **proposal.model_dump(),
                id=str(uuid5(NAMESPACE_URL, key)),
                idempotency_key=key,
                run_id=run_id,
            )
        )
    return actions
