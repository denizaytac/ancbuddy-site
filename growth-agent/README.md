# ANCBuddy Growth Agent

A small FastAPI service that turns ANCBuddy funnel data into a maximum of five CEO decisions. It
uses one OpenAI Agents SDK agent for analysis and public research. External actions are handled by
deterministic adapters only after an exact-version approval.

Architecture: [agent interactions](docs/agent-interactions.png) · [approval sequence](docs/agent-sequence.png) · [runtime prompt](docs/prompt.md)

## Safety model

`EXECUTION_MODE=simulation` is the default. In that mode an approval is recorded, but the executor
does not claim the action and never calls SMTP, GitHub, or a webhook. Switch to `live` only after the
two-week simulation review.

In live mode the executor atomically claims an action only when all of these still match the approval
snapshot: action ID, version, status, canonical SHA-256 content hash, and full content JSON. Adapters
consume the approved snapshot, not mutable current text. A changed action requires a new approval.

`BLOCKED_CHANNELS=reddit` adds an operator-controlled hard block before proposals are persisted.
The same blocklist is included in the agent prompt, but enforcement does not rely on the model:
proposal fields are scanned deterministically. The Reddit block also rejects `subreddit` and `r/...`
aliases. Configure multiple channels as a comma-separated list, for example
`BLOCKED_CHANNELS=reddit,linkedin`.

- Email uses SMTP only when `SMTP_HOST` and `SMTP_FROM` are configured.
- Website changes create a draft GitHub PR only when the GitHub integration is configured.
- Other channels use the generic signed webhook when configured; otherwise the action becomes
  `integration_required` for manual completion.
- No provider secret, customer email, or raw Supabase row is returned by `/health` or the dashboard.

## Local setup

```bash
cd growth-agent
cp .env.example .env.local
uv sync --all-groups
uv run python main.py
```

`Settings` also reads the ignored repo-root `../.env.local`, followed by local `.env` and
`.env.local`; later files win. Do not commit any of them. The local server listens on `PORT` and
exposes `GET /health`. Production must use an Argon2 `CEO_PASSWORD_HASH`, a unique
`SESSION_SECRET`, `COOKIE_SECURE=true`, and the Supabase store.

The frontend origin is the exact `CEO_ORIGIN`; credentialed CORS never uses `*`. Login accepts
`POST /api/auth/login {"token":"..."}` and sets a host-only, HttpOnly, SameSite=Strict cookie.
The token may be the CEO password or `CEO_API_TOKEN`. API clients can alternatively send the CEO
token as `Authorization: Bearer ...`.

## API

- `GET /health` — public readiness; reports store, agent readiness, and execution mode.
- `POST /api/auth/login` — creates the CEO cookie.
- `POST /api/auth/logout` and `GET /api/auth/me` — session lifecycle.
- `GET /api/dashboard` — goal, metrics, approval inbox, and compact activity summary.
- `POST /api/runs/daily|weekly|manual` — queues a serialized analysis and returns `202`. Send a
  stable `Idempotency-Key`; duplicates return the existing run with `200` and do not run twice.
- `POST /api/actions/{id}/decisions` — body contains `decision` (`approve`, `reject`, `change`),
  `expected_version`, and optional `feedback`. A stale version returns `409`.

`SCHEDULER_API_TOKEN` is accepted only on run endpoints. It cannot read the dashboard or approve an
action. Internal scheduling is optional; Monday weekly analysis replaces that day's daily run. Run
one service worker so queued model work is serialized. Queued/running work is recovered after a
restart, and proposal IDs are deterministic per run slot so recovery cannot duplicate CEO cards.
Outbound actions are never retried automatically; an uncertain partial provider failure remains a
manual reconciliation task, which prevents accidental duplicate email or publishing.

## Persistence and metrics

`STORE_BACKEND=memory` is intended for tests/local previews. `supabase` reads existing
`site_events`, `trial_signups`, and `lemon_orders`, and persists growth actions, approval snapshots,
runs, outcomes, and audit events through Supabase REST with the service-role key. Revenue values are
treated as minor currency units and displayed in major units. `GOAL_EARNED_BASELINE` is added to
measured revenue; set it to zero if historical Lemon orders already contain the initial earnings.

## Verification

```bash
uv run pytest
uv run python evals/run_local.py  # makes real model/web-search calls
```

Unit tests do not call OpenAI or any external action adapter. The eval harness calls the real planner
and writes its ignored report to `evals/results/latest.json`.

## VPS service

The production unit template is `deploy/ancbuddy-growth-agent.service`. It runs one sandboxed
replica as the dedicated `ancbuddy-growth` user and binds only to the VPS Docker bridge on port
3015, where the existing Caddy container can reach it. Runtime secrets belong in the root-owned
`/etc/ancbuddy-growth-agent.env`, never in this repository.
