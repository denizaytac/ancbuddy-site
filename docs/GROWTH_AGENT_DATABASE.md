# Growth Agent database

The Growth Agent uses two migrations:

- `20260710090000_create_growth_agent_schema.sql` creates versioned actions, immutable approvals/outcomes/audit rows, runs, settings, and attribution views.
- `20260711230000_add_durable_growth_execution.sql` adds encrypted integrations and the durable, approval-bound execution queue.

## Access and safety

- Growth tables are service-role only. `anon` and `authenticated` have no read or write grants.
- `growth_approvals`, `growth_outcome_events`, and `growth_audit_log` are append-only.
- Provider credentials reach Postgres only as AES-256-GCM ciphertext and nonce.
- Integration writes use `save_growth_integration`, `enable_growth_integration`, and `remove_growth_integration`; direct browser or service-role table mutation is not granted.
- At most five actions may await CEO approval, and at most three new email drafts may be created per UTC day.

## Approval and execution

`decide_growth_action_v2(...)` records the exact CEO decision and, for a newly approved `site_pr`, creates its execution job in the same transaction. It creates a job only when global execution is live and the GitHub integration is both ready and in `canary` or `live` mode.

The worker never scans approvals. It can process only rows in `growth_execution_jobs` and must use:

1. `claim_growth_execution_job` for an exclusive expiring lease;
2. `heartbeat_growth_execution_job` while calling GitHub;
3. `complete_growth_execution_job` for a confirmed terminal result; or
4. `retry_growth_execution_job` for an ambiguous/retryable result.

Claim verifies the action version, current and approved content hashes, full JSON snapshot, approval row, TTL, integration mode, global execution flags, and retry budget. `(action_id, action_version)` is unique. Old approvals have no job and are never backfilled or replayed.

Canary mode reserves exactly one job. Success pauses the integration automatically. A failed or unknown result also pauses the provider for review. Credential replacement is blocked while a job is queued or running. Removing an integration cancels queued work and refuses removal during a running external call.

## Manual email feedback

Email approval never creates an executor job. The CEO sends the frozen draft manually from Gmail, then calls `record_growth_manual_outcome` with `sent`, `reply`, `positive`, or `negative`.

The RPC is idempotent and maps these to immutable `email_sent`, `reply`, `positive_reply`, and `negative_reply` events. A manual send is a fresh human action and can be recorded after the original approval TTL. Subsequent feedback advances the action through `executed`, `observed`, and `evaluated` and is included in the next agent run.

## Attribution

Use each action's `attribution_key` as its exact `utm_campaign`. Existing `site_events`, `trial_signups`, and `lemon_orders` feed:

- `growth_funnel_daily_v`
- `growth_campaign_attribution_v`
- `growth_action_attribution_v`
- `get_growth_dashboard(p_since, p_until)`

The reporting views expose aggregated funnel and revenue values, not names, email addresses, user agents, credentials, or raw provider responses.
