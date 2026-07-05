# ANCBuddy Attribution Setup

Purpose: deploy first-party site attribution and Lemon Squeezy purchase attribution without committing secrets.

## Remote Supabase Setup

Project ref: `wryaxqkfpphtzbskfjgi`

Required local-only values:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `LEMON_API_KEY`
- `LEMON_WEBHOOK_SECRET`
- `LEMON_EMAIL_HASH_SALT`

Recommended local file: `supabase/.env.local` (gitignored).

```sh
SUPABASE_ACCESS_TOKEN=
SUPABASE_DB_PASSWORD=
LEMON_API_KEY=
LEMON_STORE_ID=
LEMON_WEBHOOK_SECRET=
LEMON_EMAIL_HASH_SALT=
```

Deploy commands from `ancbuddy-site/`:

```sh
set -a
. supabase/.env.local
set +a

npx supabase link --project-ref wryaxqkfpphtzbskfjgi --password "$SUPABASE_DB_PASSWORD"
npx supabase db push --linked --password "$SUPABASE_DB_PASSWORD"
npx supabase secrets set --project-ref wryaxqkfpphtzbskfjgi \
  LEMON_WEBHOOK_SECRET="$LEMON_WEBHOOK_SECRET" \
  LEMON_EMAIL_HASH_SALT="$LEMON_EMAIL_HASH_SALT"
npx supabase functions deploy lemon-order-webhook --project-ref wryaxqkfpphtzbskfjgi --no-verify-jwt --use-api
node scripts/create-lemon-webhook.mjs
```

## Lemon Squeezy Webhook

Webhook URL:

```text
https://wryaxqkfpphtzbskfjgi.supabase.co/functions/v1/lemon-order-webhook
```

Configure in Lemon Squeezy with `node scripts/create-lemon-webhook.mjs`, or manually:

- Event: `order_created`
- Signing secret: same value as `LEMON_WEBHOOK_SECRET`; Lemon Squeezy requires 40 characters or fewer.
- Do not include extra events until needed.

## Verification

- Anonymous browser insert works for `site_events` and `trial_signups`.
- Anonymous browser reads/updates/deletes fail for `site_events`, `trial_signups`, and `lemon_orders`.
- Checkout links include `checkout[custom][session_id]`, `utm_source`, `utm_medium`, `utm_campaign`, `referrer_host`, `landing_path`, and `current_path`.
- A bad Lemon `X-Signature` returns `401`.
- A valid Lemon `order_created` inserts or updates one `lemon_orders` row per Lemon order id.
