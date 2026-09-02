# ANCBuddy Secret Inventory and Rotation

This file documents locations and procedures only. It must never contain a
secret value, partial key, fingerprint, signed URL, or screenshot of a secret.

## Source of Truth

| Secret | Runtime location | Recovery location | Used by |
|---|---|---|---|
| `LEMON_API_KEY` | Supabase Edge Function Secrets | Apple Passwords (`api.lemonsqueezy.com`, account label `ANCBuddy reporting-sync`) | `lemon-commerce-sync` |
| `LEMON_WEBHOOK_SECRET` | Supabase Edge Function Secrets | Apple Passwords, if a human recovery copy is required | `lemon-order-webhook` |
| `LEMON_EMAIL_HASH_SALT` | Supabase Edge Function Secrets | Apple Passwords, if a human recovery copy is required | Webhook and reconciliation email HMAC |
| `ancbuddy_lemon_sync_token` | Supabase Vault | None; rotate in-database | Supabase Cron → reconciliation authentication |
| `ancbuddy_lemon_sync_url` | Supabase Vault | Reproducible from the project ref and function slug | Supabase Cron target |

The Lemon API key was installed for reporting on **25 August 2026**. Lemon API
keys expire after one year, so rotate it no later than **25 July 2027** to leave
a one-month safety margin.

## Cross-Computer Access

1. Sign in to the Codex client with access to the ANCBuddy Supabase project.
2. Use the Supabase connector to query `commerce_dashboard_summary_v` and
   `commerce_dashboard_monthly_v`.
3. Check `lemon_sync_state` before publishing figures.
4. If Apple Passwords is needed for recovery, sign in to the same Apple Account
   and retrieve the item directly there. Never paste the value into the ANCBuddy
   folder or a Codex conversation.

No Codex client needs direct access to the Lemon API key for routine reporting.

## Lemon API Key Rotation

1. Create a new **Live** API key in Lemon Squeezy.
2. Replace the Apple Passwords item with the new value and keep its label/date
   current.
3. Replace `LEMON_API_KEY` in Supabase Edge Function Secrets.
4. Trigger one reconciliation through the Vault-backed Cron request or wait for
   the next daily run.
5. Verify `lemon_sync_state.last_status = 'success'`, a recent
   `last_completed_at`, and current counts in `commerce_dashboard_summary_v`.
6. Revoke the previous Lemon key only after that verification succeeds.

## Incident Procedure

If a secret is pasted into a file, terminal transcript, screenshot, issue, or
chat, treat it as compromised: revoke/rotate it immediately, remove the exposed
copy, and verify the next reconciliation. Deleting the exposed text is not a
substitute for rotation.

If the daily sync fails, inspect only `lemon_sync_state.last_error_code` and the
Edge Function status logs first. Do not log Lemon response bodies or customer
records while debugging.
