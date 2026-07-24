-- First-party developer/test marker. Existing rows remain NULL (unknown) and
-- continue to count; only explicitly marked TRUE rows are excluded.

alter table public.site_events
  add column is_internal boolean;
alter table public.site_events
  alter column is_internal set default false;

alter table public.trial_signups
  add column is_internal boolean;
alter table public.trial_signups
  alter column is_internal set default false;

alter table public.lemon_orders
  add column is_internal boolean;
alter table public.lemon_orders
  alter column is_internal set default false;

comment on column public.site_events.is_internal is
  'Explicit first-party browser-profile marker. TRUE is excluded from cleaned metrics; historical NULL remains included.';
comment on column public.trial_signups.is_internal is
  'Copied from the explicit first-party browser-profile marker; no identity or fingerprint data.';
comment on column public.lemon_orders.is_internal is
  'Copied from signed checkout custom data by the Lemon Squeezy webhook.';

drop policy if exists "anon can insert site events" on public.site_events;
create policy "anon can insert site events"
  on public.site_events
  for insert
  to anon
  with check (is_internal is not null);

drop policy if exists "anon can insert trial signups" on public.trial_signups;
create policy "anon can insert trial signups"
  on public.trial_signups
  for insert
  to anon
  with check (is_internal is not null);

create or replace view public.growth_funnel_daily_v as
with funnel_rows as (
  select
    created_at,
    coalesce(nullif(utm_source, ''), 'unattributed') as utm_source,
    coalesce(nullif(utm_medium, ''), 'unattributed') as utm_medium,
    coalesce(nullif(utm_campaign, ''), 'unattributed') as utm_campaign,
    session_id,
    (event_name = 'page_view')::integer as page_views,
    (event_name = 'trial_open')::integer as trial_open_events,
    (event_name = 'trial_start')::integer as trial_start_events,
    (event_name = 'download_click')::integer as download_clicks,
    (event_name = 'checkout_click')::integer as checkout_clicks,
    0::integer as trial_signups,
    0::integer as orders,
    0::integer as refunded_orders,
    0::bigint as gross_revenue_usd_minor,
    0::bigint as net_revenue_usd_minor
  from public.site_events
  where is_internal is not true

  union all

  select
    created_at,
    coalesce(nullif(utm_source, ''), 'unattributed'),
    coalesce(nullif(utm_medium, ''), 'unattributed'),
    coalesce(nullif(utm_campaign, ''), 'unattributed'),
    session_id,
    0, 0, 0, 0, 0,
    1,
    0,
    0,
    0::bigint,
    0::bigint
  from public.trial_signups
  where is_internal is not true

  union all

  select
    coalesce(lemon_created_at, received_at),
    coalesce(nullif(utm_source, ''), 'unattributed'),
    coalesce(nullif(utm_medium, ''), 'unattributed'),
    coalesce(nullif(utm_campaign, ''), 'unattributed'),
    session_id,
    0, 0, 0, 0, 0,
    0,
    1,
    coalesce(refunded, false)::integer,
    coalesce(
      amount_usd,
      case when upper(currency) = 'USD' then amount_total else null end,
      0
    )::bigint,
    case
      when coalesce(refunded, false) then 0::bigint
      else coalesce(
        amount_usd,
        case when upper(currency) = 'USD' then amount_total else null end,
        0
      )::bigint
    end
  from public.lemon_orders
  where is_internal is not true
)
select
  (created_at at time zone 'UTC')::date as day,
  utm_source,
  utm_medium,
  utm_campaign,
  count(distinct session_id) filter (where session_id is not null) as unique_sessions,
  sum(page_views)::bigint as page_views,
  sum(trial_open_events)::bigint as trial_open_events,
  sum(trial_start_events)::bigint as trial_start_events,
  sum(download_clicks)::bigint as download_clicks,
  sum(checkout_clicks)::bigint as checkout_clicks,
  sum(trial_signups)::bigint as trial_signups,
  sum(orders)::bigint as orders,
  sum(refunded_orders)::bigint as refunded_orders,
  sum(gross_revenue_usd_minor)::bigint as gross_revenue_usd_minor,
  sum(net_revenue_usd_minor)::bigint as net_revenue_usd_minor
from funnel_rows
group by 1, 2, 3, 4;
