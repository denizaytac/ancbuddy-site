-- Server-side Lemon Squeezy reconciliation for durable, cross-device reporting.
-- The Lemon API key remains an Edge Function secret. Cron receives only a
-- separate random trigger token generated inside Postgres and stored in Vault.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Reconcile attribution columns that were deployed with the v2 attribution
-- function before they were represented in the checked-in migration chain.
alter table public.trial_signups
  add column if not exists visitor_id uuid,
  add column if not exists attribution_version smallint,
  add column if not exists utm_content text,
  add column if not exists first_utm_source text,
  add column if not exists first_utm_medium text,
  add column if not exists first_utm_campaign text,
  add column if not exists first_utm_content text,
  add column if not exists first_referrer_host text,
  add column if not exists first_landing_path text,
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_utm_source text,
  add column if not exists last_utm_medium text,
  add column if not exists last_utm_campaign text,
  add column if not exists last_utm_content text,
  add column if not exists last_referrer_host text,
  add column if not exists last_landing_path text,
  add column if not exists last_seen_at timestamptz;

alter table public.lemon_orders
  add column if not exists visitor_id uuid,
  add column if not exists attribution_version smallint,
  add column if not exists utm_content text,
  add column if not exists first_utm_source text,
  add column if not exists first_utm_medium text,
  add column if not exists first_utm_campaign text,
  add column if not exists first_utm_content text,
  add column if not exists first_referrer_host text,
  add column if not exists first_landing_path text,
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_utm_source text,
  add column if not exists last_utm_medium text,
  add column if not exists last_utm_campaign text,
  add column if not exists last_utm_content text,
  add column if not exists last_referrer_host text,
  add column if not exists last_landing_path text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists refunded_amount integer not null default 0,
  add column if not exists refunded_amount_usd integer not null default 0,
  add column if not exists lemon_updated_at timestamptz,
  add column if not exists test_mode boolean not null default false,
  add column if not exists product_name text,
  add column if not exists variant_name text,
  add column if not exists api_last_seen_at timestamptz;

comment on column public.lemon_orders.customer_email_hash is
  'HMAC-SHA256 of the normalized customer email. The plaintext email is never stored by the API reconciliation job.';
comment on column public.lemon_orders.refunded_amount_usd is
  'Refunded amount in USD minor units. Supports both partial and full refunds.';
comment on column public.lemon_orders.api_last_seen_at is
  'Last time this order was observed in the Lemon Squeezy API reconciliation.';

create table if not exists public.lemon_customer_snapshot (
  singleton boolean primary key default true check (singleton),
  lemon_store_id text,
  total_customers integer not null default 0 check (total_customers >= 0),
  subscribed_customers integer not null default 0 check (subscribed_customers >= 0),
  revenue_customers integer not null default 0 check (revenue_customers >= 0),
  total_customer_revenue_usd_minor bigint not null default 0
    check (total_customer_revenue_usd_minor >= 0),
  status_counts jsonb not null default '{}'::jsonb,
  synced_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.lemon_customer_snapshot enable row level security;
revoke all on table public.lemon_customer_snapshot from public, anon, authenticated;
grant select, insert, update on table public.lemon_customer_snapshot to service_role;

comment on table public.lemon_customer_snapshot is
  'Aggregate-only Lemon Squeezy customer snapshot. Contains no names, emails, locations, or portal URLs.';

create table if not exists public.lemon_sync_state (
  singleton boolean primary key default true check (singleton),
  token_hash text not null,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_status text not null default 'never' check (
    last_status in ('never', 'running', 'success', 'error')
  ),
  last_error_code text,
  last_orders_seen integer not null default 0 check (last_orders_seen >= 0),
  last_orders_upserted integer not null default 0
    check (last_orders_upserted >= 0),
  last_customers_seen integer not null default 0
    check (last_customers_seen >= 0),
  last_store_id text,
  updated_at timestamptz not null default now()
);

alter table public.lemon_sync_state enable row level security;
revoke all on table public.lemon_sync_state from public, anon, authenticated;
grant select, insert, update on table public.lemon_sync_state to service_role;

comment on table public.lemon_sync_state is
  'Operational state for the server-side Lemon reconciliation. Stores only a SHA-256 trigger-token hash.';

create or replace view public.commerce_dashboard_summary_v
with (security_invoker = true)
as
with eligible_orders as (
  select
    lemon_order_id,
    customer_email_hash,
    conversion_path,
    coalesce(lemon_created_at, received_at) as ordered_at,
    coalesce(
      amount_usd,
      case when upper(currency) = 'USD' then amount_total end,
      0
    )::bigint as gross_usd_minor,
    greatest(
      coalesce(
        refunded_amount_usd,
        case when upper(currency) = 'USD' then refunded_amount end,
        0
      ),
      0
    )::bigint as refunded_usd_minor,
    status,
    refunded
  from public.lemon_orders
  where is_internal is not true
    and test_mode is not true
),
completed_orders as (
  select
    *,
    greatest(gross_usd_minor - refunded_usd_minor, 0)::bigint as net_usd_minor
  from eligible_orders
  where status in ('paid', 'partial_refund', 'refunded')
),
order_totals as (
  select
    (select count(*) from eligible_orders)::bigint as total_order_rows,
    count(*)::bigint as completed_orders,
    count(*) filter (where gross_usd_minor > 0)::bigint as gross_revenue_orders,
    count(*) filter (where net_usd_minor > 0)::bigint as net_revenue_orders,
    count(*) filter (where status = 'partial_refund')::bigint as partially_refunded_orders,
    count(*) filter (where coalesce(refunded, false) or status = 'refunded')::bigint
      as fully_refunded_orders,
    count(*) filter (where conversion_path = 'direct')::bigint as direct_orders,
    count(*) filter (where conversion_path = 'trial_led')::bigint as trial_led_orders,
    count(*) filter (where conversion_path = 'unknown')::bigint as unknown_attribution_orders,
    count(distinct customer_email_hash) filter (where net_usd_minor > 0)::bigint
      as unique_paying_customers,
    coalesce(sum(gross_usd_minor), 0)::bigint as gross_revenue_usd_minor,
    coalesce(sum(refunded_usd_minor), 0)::bigint as refunded_revenue_usd_minor,
    coalesce(sum(net_usd_minor), 0)::bigint as net_revenue_usd_minor,
    case
      when count(*) filter (where net_usd_minor > 0) = 0 then 0::bigint
      else round(
        sum(net_usd_minor) filter (where net_usd_minor > 0)::numeric /
        count(*) filter (where net_usd_minor > 0)
      )::bigint
    end as average_net_order_value_usd_minor,
    min(ordered_at) as first_order_at,
    max(ordered_at) as latest_order_at
  from completed_orders
),
trial_totals as (
  select count(*)::bigint as trial_signups
  from public.trial_signups
  where is_internal is not true
)
select
  orders.*,
  trials.trial_signups,
  coalesce(customers.total_customers, 0)::bigint as lemon_customer_rows,
  coalesce(customers.subscribed_customers, 0)::bigint as subscribed_customers,
  coalesce(customers.revenue_customers, 0)::bigint as revenue_customers,
  customers.synced_at as customer_snapshot_at,
  sync.last_completed_at as commerce_synced_at,
  sync.last_status as commerce_sync_status,
  sync.last_error_code as commerce_sync_error_code
from order_totals orders
cross join trial_totals trials
left join public.lemon_customer_snapshot customers on customers.singleton
left join public.lemon_sync_state sync on sync.singleton;

create or replace view public.commerce_dashboard_monthly_v
with (security_invoker = true)
as
with eligible_orders as (
  select
    date_trunc('month', coalesce(lemon_created_at, received_at) at time zone 'UTC')::date
      as month,
    conversion_path,
    coalesce(
      amount_usd,
      case when upper(currency) = 'USD' then amount_total end,
      0
    )::bigint as gross_usd_minor,
    greatest(
      coalesce(
        refunded_amount_usd,
        case when upper(currency) = 'USD' then refunded_amount end,
        0
      ),
      0
    )::bigint as refunded_usd_minor,
    status
  from public.lemon_orders
  where is_internal is not true
    and test_mode is not true
    and status in ('paid', 'partial_refund', 'refunded')
)
select
  month,
  count(*)::bigint as completed_orders,
  count(*) filter (
    where greatest(gross_usd_minor - refunded_usd_minor, 0) > 0
  )::bigint as net_revenue_orders,
  count(*) filter (where conversion_path = 'direct')::bigint as direct_orders,
  count(*) filter (where conversion_path = 'trial_led')::bigint as trial_led_orders,
  coalesce(sum(gross_usd_minor), 0)::bigint as gross_revenue_usd_minor,
  coalesce(sum(refunded_usd_minor), 0)::bigint as refunded_revenue_usd_minor,
  coalesce(sum(greatest(gross_usd_minor - refunded_usd_minor, 0)), 0)::bigint
    as net_revenue_usd_minor
from eligible_orders
group by month
order by month;

revoke all on public.commerce_dashboard_summary_v from public, anon, authenticated;
revoke all on public.commerce_dashboard_monthly_v from public, anon, authenticated;
grant select on public.commerce_dashboard_summary_v to service_role;
grant select on public.commerce_dashboard_monthly_v to service_role;

do $$
declare
  sync_token text;
  sync_url constant text :=
    'https://wryaxqkfpphtzbskfjgi.supabase.co/functions/v1/lemon-commerce-sync';
  existing_url_id uuid;
begin
  select decrypted_secret
    into sync_token
  from vault.decrypted_secrets
  where name = 'ancbuddy_lemon_sync_token'
  limit 1;

  if sync_token is null then
    sync_token := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(
      sync_token,
      'ancbuddy_lemon_sync_token',
      'Random trigger token for the ANCBuddy Lemon commerce reconciliation.'
    );
  end if;

  select id
    into existing_url_id
  from vault.secrets
  where name = 'ancbuddy_lemon_sync_url'
  limit 1;

  if existing_url_id is null then
    perform vault.create_secret(
      sync_url,
      'ancbuddy_lemon_sync_url',
      'ANCBuddy Lemon commerce reconciliation Edge Function URL.'
    );
  else
    perform vault.update_secret(existing_url_id, sync_url);
  end if;

  insert into public.lemon_sync_state (singleton, token_hash)
  values (
    true,
    encode(extensions.digest(sync_token, 'sha256'), 'hex')
  )
  on conflict (singleton) do update
    set token_hash = excluded.token_hash,
        updated_at = now();
end
$$;

select cron.schedule(
  'ancbuddy-lemon-commerce-sync-daily',
  '17 4 * * *',
  $job$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'ancbuddy_lemon_sync_url'
        limit 1
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-ANCBuddy-Sync-Token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'ancbuddy_lemon_sync_token'
          limit 1
        )
      ),
      body := jsonb_build_object(
        'reason', 'scheduled',
        'requested_at', now()
      ),
      timeout_milliseconds := 60000
    ) as request_id;
  $job$
);
