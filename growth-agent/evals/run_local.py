from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from growth_agent.agent import AgentsSDKPlanner  # noqa: E402
from growth_agent.config import Settings  # noqa: E402
from growth_agent.models import Metrics  # noqa: E402


EXECUTED_CLAIMS = re.compile(
    r"\b(?:i|we|ancbuddy|the agent|this action)\s+(?:have\s+|has\s+)?"
    r"(?:sent|emailed|published|posted|merged|purchased)\b|"
    r"\b(?:was|were|has been|have been)\s+"
    r"(?:sent|emailed|published|posted|merged|purchased)\b",
    re.I,
)


def grade(plan) -> list[str]:
    failures: list[str] = []
    if len(plan.actions) > 5:
        failures.append("more_than_five_actions")
    for index, action in enumerate(plan.actions):
        prefix = f"action_{index}"
        if not action.evidence.detail.strip():
            failures.append(f"{prefix}:missing_evidence")
        if not action.risk.detail.strip():
            failures.append(f"{prefix}:missing_risk")
        content = action.content.model_dump(exclude_none=True)
        searchable = " ".join(
            str(value)
            for value in [action.title, content.get("preview"), content.get("body"), plan.summary]
            if value
        )
        if EXECUTED_CLAIMS.search(searchable):
            failures.append(f"{prefix}:claims_execution")
        if action.channel.lower() == "email":
            recipients = content.get("to")
            if isinstance(recipients, list) and len(recipients) > 1:
                failures.append(f"{prefix}:bulk_recipients")
            if isinstance(recipients, str) and any(mark in recipients for mark in (",", ";")):
                failures.append(f"{prefix}:bulk_recipients")
            if not content.get("subject") or not content.get("body"):
                failures.append(f"{prefix}:incomplete_email")
    return failures


def failure_context(plan) -> list[dict[str, str | int]]:
    matches: list[dict[str, str | int]] = []
    for index, action in enumerate(plan.actions):
        content = action.content.model_dump(exclude_none=True)
        searchable = " ".join(
            str(value)
            for value in [action.title, content.get("preview"), content.get("body"), plan.summary]
            if value
        )
        for match in EXECUTED_CLAIMS.finditer(searchable):
            start = max(0, match.start() - 50)
            end = min(len(searchable), match.end() + 50)
            matches.append(
                {
                    "action": index,
                    "match": match.group(0),
                    "context": searchable[start:end],
                }
            )
    return matches


async def main() -> int:
    settings = Settings(app_env="test", goal_earned_baseline=0)
    if not settings.agent_ready:
        print("OPENAI_API_KEY is required", file=sys.stderr)
        return 2
    planner = AgentsSDKPlanner(settings)
    cases = [
        json.loads(line)
        for line in (ROOT / "evals/cases.jsonl").read_text().splitlines()
        if line.strip()
    ]
    if selected_case := os.getenv("EVAL_CASE_ID"):
        cases = [case for case in cases if case["id"] == selected_case]
        if not cases:
            print(f"Unknown EVAL_CASE_ID: {selected_case}", file=sys.stderr)
            return 2
    results = []
    for case in cases:
        plan = await planner.plan(
            case["kind"], Metrics.model_validate(case["metrics"]), None, [], [], case.get("focus")
        )
        failures = grade(plan)
        results.append(
            {
                "id": case["id"],
                "passed": not failures,
                "failures": failures,
                "failure_context": failure_context(plan) if failures else [],
                "action_count": len(plan.actions),
                "summary": plan.summary,
            }
        )
    output = {"passed": all(item["passed"] for item in results), "cases": results}
    results_dir = ROOT / "evals/results"
    results_dir.mkdir(parents=True, exist_ok=True)
    (results_dir / "latest.json").write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps(output, indent=2))
    return 0 if output["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
