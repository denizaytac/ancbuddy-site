# Growth Agent database

Migration `20260710090000_create_growth_agent_schema.sql` adds durable agent state, a five-item CEO approval inbox, append-only decision/outcome history, and privacy-safe funnel reporting.

## Access and lifecycle

- Only the Supabase `service_role` can access growth tables, views, and RPCs. Browser roles have no grants or RLS policies.
- `growth_actions` follows `idea → researched → drafted → awaiting_approval → approved/rejected/needs_changes → executed → observed → evaluated`.
- `growth_approvals`, `growth_outcome_events`, and `growth_audit_log` are append-only. Each decision stores the exact reviewed JSON and its canonical SHA-256 hash.
- `growth_settings.max_pending_actions` defaults to `5`. A serialized trigger prevents concurrent inserts from overflowing the CEO inbox.
- `growth_settings.simulation_mode` starts enabled and external execution starts disabled.
- Changes to `type`, `title`, `channel`, `expected_upside`, `evidence`, `risk`, or `content` must increment the action version exactly once. Execution-only status/timestamp updates keep the version unchanged.
- An unavailable channel adapter ends at `integration_required`; approved adapters may claim an action as `executing` only while its exact content approval is still valid.

## Approval RPC

Call `decide_growth_action(p_action_id, p_expected_version, p_decision, p_feedback, p_edited_content)` only from the server with the service-role key.

- `approve` snapshots the current content, records an expiring approval, and locks `approved_content_hash` to the reviewed hash.
- `reject` records the reviewed snapshot and closes the action.
- `change` requires feedback or replacement JSON, records the reviewed version, moves the action to `needs_changes`, and increments its version. The revised action must be submitted and approved again.
- Stale `p_expected_version` values fail with `growth_action_version_conflict`; no partial decision is stored.

The RPC returns `action_id`, resulting `status` and `version`, `approval_id`, `decision`, resulting `content_hash`, resulting `content`, and `decided_at`.

Import outcome events with `INSERT ... ON CONFLICT (source, external_event_id) DO NOTHING`; outcome rows cannot be updated or deleted later.

## Attribution and dashboard

Use each action's `attribution_key` as its exact `utm_campaign`. Existing `site_events`, `trial_signups`, and `lemon_orders` then feed:

- `growth_funnel_daily_v`: daily privacy-safe funnel totals.
- `growth_campaign_attribution_v`: results by UTM source, medium, and campaign.
- `growth_action_attribution_v`: UTM results plus explicit outcome events by action.
- `get_growth_dashboard(p_since, p_until)`: a privacy-safe JSON summary for a window up to 366 days.

Revenue reporting uses Lemon Squeezy `amount_usd` in minor USD units; it only falls back to `amount_total` when the order currency is explicitly USD. Names, emails, contact addresses, user agents, and raw webhook data are never exposed by the reporting views/RPC.

`growth_settings.revenue_baseline_minor` is intentionally `0`; set it only for historical revenue not represented in `lemon_orders`, and keep its units aligned with `goal_currency`.
