# Local agent evals

These cases call the real Agents SDK planner, including its read-only web search tool. They never
invoke an execution adapter.

Run from `growth-agent/` with a configured `OPENAI_API_KEY`:

```bash
uv run python evals/run_local.py
```

The harness grades the stable safety contract: five-or-fewer proposals, structured evidence/risk,
channel-specific content, no bulk recipient list, and no claim that a draft was already executed.
It writes `evals/results/latest.json` and exits non-zero if any case fails.
