# ANCBuddy Growth Agent

A small FastAPI service that turns ANCBuddy funnel data into a maximum of five CEO decisions. It
uses one OpenAI Agents SDK agent for analysis and public research. Website draft PRs are handled by
a durable deterministic worker only after an exact-version approval. Email remains manual.

Architecture: [agent interactions](docs/agent-interactions.png) · [approval sequence](docs/agent-sequence.png) · [runtime prompt](docs/prompt.md)

## Safety model

`EXECUTION_MODE=simulation` is the default. In that mode a website action cannot be approved and no
execution job is created. Email drafts can still be approved because approval only freezes their
text. The CEO opens the exact draft in Gmail and presses Send manually.

In live mode, website approval and durable job creation are one Supabase transaction. The worker
claims only queued jobs, with an expiring lease, and never scans old approvals. It verifies action
ID, version, canonical SHA-256 content hash, and full content JSON. Retries reconcile a deterministic
branch and existing pull request, so a lost HTTP response cannot create a duplicate PR.

`BLOCKED_CHANNELS=reddit` adds an operator-controlled hard block before proposals are persisted.
The same blocklist is included in the agent prompt, but enforcement does not rely on the model:
proposal fields are scanned deterministically. The Reddit block also rejects `subreddit` and `r/...`
aliases. Configure multiple channels as a comma-separated list, for example
`BLOCKED_CHANNELS=reddit,linkedin`.

- Email produces one individual Gmail compose link; sending and outcomes stay with the CEO.
- Website changes create one draft GitHub PR. There is no merge or publish endpoint.
- GitHub credentials are supplied in the CEO inbox, validated against only
  `denizaytac/ancbuddy-site`, and encrypted with AES-256-GCM before storage.
- The first website execution can run in one-shot canary mode, which pauses itself after success.
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
`POST /api/auth/login {"password":"..."}` and sets a host-only, HttpOnly, SameSite=Strict cookie.
For zero-downtime upgrades, the API still accepts the former `token` JSON key as an alias. The
password may also match an optional `CEO_API_TOKEN`. A temporary token can be bounded with
`CEO_API_TOKEN_EXPIRES_AT`; both login and bearer use stop at that time, and its session is capped to
the same expiry. API clients can alternatively send the token as `Authorization: Bearer ...`.

## API

- `GET /health` — public readiness; reports store, agent readiness, and execution mode.
- `POST /api/auth/login` — creates the CEO cookie.
- `POST /api/auth/logout` and `GET /api/auth/me` — session lifecycle.
- `GET /api/dashboard` — goal, metrics, approval inbox, and compact activity summary.
- `POST /api/runs/daily|weekly|manual` — queues a serialized analysis and returns `202`. Send a
  stable `Idempotency-Key`; duplicates return the existing run with `200` and do not run twice.
- `POST /api/actions/{id}/decisions` — body contains `decision` (`approve`, `reject`, `change`),
  `expected_version`, and optional `feedback`. A stale version returns `409`.
- `GET|PUT|DELETE /api/integrations/github` — inspect, validate/store, or remove the encrypted PAT.
- `POST /api/integrations/github/enable` — explicitly enable `canary` or `live` mode.
- `GET /api/executions/{job_id}` — current durable execution state and external draft-PR link.
- `POST /api/actions/{id}/manual-outcomes` — record `sent`, `reply`, `positive`, or `negative` for
  an approved email draft.

`SCHEDULER_API_TOKEN` is accepted only on run endpoints. It cannot read the dashboard or approve an
action. Internal scheduling is optional; Monday weekly analysis replaces that day's daily run. Run
one service worker so queued model work is serialized. Queued/running work is recovered after a
restart, and proposal IDs are deterministic per run slot so recovery cannot duplicate CEO cards.
Only draft-PR jobs are retried. Their branch name is deterministic and GitHub is reconciled before
every write. Email is never sent by the service.

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
