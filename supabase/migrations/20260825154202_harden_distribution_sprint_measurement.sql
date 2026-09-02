-- Keep QA/test purchases out of every production growth metric, codify the
-- already-live voluntary purchase-source response table, and add small-sample
-- daily/touch-model views for the 14-day distribution sprint.

create table if not exists public.purchase_source_responses (
  id uuid primary key default gen_random_uuid(),
  lemon_order_id text not null references public.lemon_orders(lemon_order_id)
    on delete cascade,
  lemon_identifier text not null,
  source text not null check (
    source in (
      'google',
      'chatgpt_ai',
      'github',
      'reddit_forum',
      'listing',
      'recommendation',
      'social_video',
      'other',
      'unknown'
    )
  ),
  detail text check (detail is null or char_length(detail) <= 160),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_source_responses_order_unique unique (lemon_order_id),
  constraint purchase_source_responses_identifier_unique unique (lemon_identifier)
);

alter table public.purchase_source_responses enable row level security;
revoke all on table public.purchase_source_responses from public, anon, authenticated;
grant select, insert, update, delete on table public.purchase_source_responses
  to service_role;

drop policy if exists "service role manages purchase source responses"
  on public.purchase_source_responses;
create policy "service role manages purchase source responses"
  on public.purchase_source_responses
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.purchase_source_responses is
  'Voluntary fixed-choice purchase-source answers. Stores no name, email, IP address, license key, or free-form profile.';
comment on column public.purchase_source_responses.lemon_identifier is
  'Unpredictable Lemon order UUID supplied as a post-purchase bearer token; never copied into site-event metadata.';

alter table public.site_events
  drop constraint if exists site_events_event_name_check;
alter table public.site_events
  add constraint site_events_event_name_check check (
    event_name in (
      'page_view',
      'trial_open',
      'trial_start',
      'download_click',
      'checkout_click',
      'purchase_feedback_shown',
      'purchase_feedback_submitted',
      'purchase_feedback_skipped'
    )
  );

create or replace view public.growth_funnel_daily_v
with (security_invoker = true)
as
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
    and test_mode is not true
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

create or replace view public.distribution_sprint_daily_v
with (security_invoker = true)
as
with eligible_orders as (
  select
    *,
    coalesce(lemon_created_at, received_at) as ordered_at,
    status in ('paid', 'partial_refund', 'refunded') as is_purchase,
    status in ('paid', 'partial_refund')
      and coalesce(refunded, false) is not true as is_net_purchase,
    coalesce(refunded, false)
      or status in ('partial_refund', 'refunded')
      or coalesce(refunded_amount_usd, refunded_amount, 0) > 0 as has_refund,
    attribution_version = 2
      and visitor_id is not null
      and session_id is not null
      and first_landing_path is not null
      and first_seen_at is not null
      and last_landing_path is not null
      and last_seen_at is not null as has_complete_attribution
  from public.lemon_orders
  where is_internal is not true
    and test_mode is not true
),
event_daily as (
  select
    (created_at at time zone 'UTC')::date as day,
    count(*) filter (where event_name = 'page_view')::bigint as page_views,
    count(distinct session_id) filter (
      where event_name = 'page_view' and session_id is not null
    )::bigint as sessions,
    count(distinct session_id) filter (
      where event_name = 'page_view'
        and session_id is not null
        and attribution_version = 2
        and visitor_id is not null
        and first_landing_path is not null
        and first_seen_at is not null
        and last_landing_path is not null
        and last_seen_at is not null
    )::bigint as attributed_sessions,
    count(*) filter (where event_name = 'trial_open')::bigint as trial_opens,
    count(*) filter (where event_name = 'download_click')::bigint as downloads,
    count(*) filter (where event_name = 'checkout_click')::bigint as checkouts
  from public.site_events
  where is_internal is not true
  group by 1
),
trial_daily as (
  select
    (trial.created_at at time zone 'UTC')::date as day,
    count(*)::bigint as trial_signups,
    count(*) filter (
      where trial.attribution_version = 2
        and trial.visitor_id is not null
        and trial.session_id is not null
        and trial.first_landing_path is not null
        and trial.first_seen_at is not null
        and trial.last_landing_path is not null
        and trial.last_seen_at is not null
    )::bigint as attributed_trial_signups,
    count(distinct orders.trial_signup_id) filter (
      where orders.is_net_purchase
    )::bigint as converted_trials
  from public.trial_signups trial
  left join eligible_orders orders on orders.trial_signup_id = trial.id
  where trial.is_internal is not true
  group by 1
),
order_daily as (
  select
    (ordered_at at time zone 'UTC')::date as day,
    count(*) filter (where is_purchase)::bigint as purchases,
    count(*) filter (where is_net_purchase)::bigint as net_purchases,
    count(*) filter (where has_refund)::bigint as refunds,
    count(*) filter (
      where is_purchase and has_complete_attribution
    )::bigint as attributed_purchases
  from eligible_orders
  group by 1
),
days as (
  select day from event_daily
  union
  select day from trial_daily
  union
  select day from order_daily
)
select
  days.day,
  coalesce(events.sessions, 0)::bigint as sessions,
  coalesce(events.page_views, 0)::bigint as page_views,
  coalesce(events.trial_opens, 0)::bigint as trial_opens,
  coalesce(trials.trial_signups, 0)::bigint as trial_signups,
  coalesce(events.downloads, 0)::bigint as downloads,
  coalesce(events.checkouts, 0)::bigint as checkouts,
  coalesce(orders.purchases, 0)::bigint as purchases,
  coalesce(orders.net_purchases, 0)::bigint as net_purchases,
  coalesce(orders.refunds, 0)::bigint as refunds,
  coalesce(trials.converted_trials, 0)::bigint as converted_trials,
  case when coalesce(events.sessions, 0) = 0 then null else round(
    100.0 * coalesce(trials.trial_signups, 0) / events.sessions,
    2
  ) end as session_to_trial_pct,
  case when coalesce(events.sessions, 0) = 0 then null else round(
    100.0 * coalesce(events.checkouts, 0) / events.sessions,
    2
  ) end as session_to_checkout_pct,
  case when coalesce(events.sessions, 0) = 0 then null else round(
    100.0 * coalesce(orders.net_purchases, 0) / events.sessions,
    2
  ) end as session_to_purchase_pct,
  case when coalesce(trials.trial_signups, 0) = 0 then null else round(
    100.0 * coalesce(trials.converted_trials, 0) / trials.trial_signups,
    2
  ) end as trial_to_purchase_pct,
  coalesce(events.attributed_sessions, 0)::bigint as attributed_sessions,
  coalesce(trials.attributed_trial_signups, 0)::bigint
    as attributed_trial_signups,
  coalesce(orders.attributed_purchases, 0)::bigint as attributed_purchases,
  case when coalesce(events.sessions, 0) = 0 then null else round(
    100.0 * coalesce(events.attributed_sessions, 0) / events.sessions,
    2
  ) end as session_attribution_quality_pct,
  case when coalesce(orders.purchases, 0) = 0 then null else round(
    100.0 * coalesce(orders.attributed_purchases, 0) / orders.purchases,
    2
  ) end as order_attribution_quality_pct,
  case
    when coalesce(events.sessions, 0) + coalesce(orders.purchases, 0) = 0
      then null
    else round(
      100.0 * (
        coalesce(events.attributed_sessions, 0) +
        coalesce(orders.attributed_purchases, 0)
      ) / (
        coalesce(events.sessions, 0) + coalesce(orders.purchases, 0)
      ),
      2
    )
  end as combined_attribution_quality_pct
from days
left join event_daily events using (day)
left join trial_daily trials using (day)
left join order_daily orders using (day)
order by days.day;

create or replace view public.distribution_sprint_touch_v
with (security_invoker = true)
as
with eligible_orders as (
  select *
  from public.lemon_orders
  where is_internal is not true
    and test_mode is not true
    and status in ('paid', 'partial_refund')
    and coalesce(refunded, false) is not true
),
session_first as (
  select distinct on (session_id)
    session_id,
    created_at,
    first_utm_source,
    first_utm_medium,
    first_utm_campaign,
    first_utm_content
  from public.site_events
  where is_internal is not true
    and event_name = 'page_view'
    and session_id is not null
  order by session_id, created_at asc
),
session_last as (
  select distinct on (session_id)
    session_id,
    created_at,
    last_utm_source,
    last_utm_medium,
    last_utm_campaign,
    last_utm_content
  from public.site_events
  where is_internal is not true
    and event_name = 'page_view'
    and session_id is not null
  order by session_id, created_at desc
),
touch_rows as (
  select
    (created_at at time zone 'UTC')::date as day,
    'first_touch'::text as touch_model,
    coalesce(nullif(first_utm_source, ''), 'direct_or_unknown') as source,
    nullif(first_utm_medium, '') as medium,
    nullif(first_utm_campaign, '') as campaign,
    nullif(first_utm_content, '') as content,
    1::integer as sessions,
    0::integer as trial_signups,
    0::integer as purchases
  from session_first

  union all

  select
    (created_at at time zone 'UTC')::date,
    'last_touch',
    coalesce(nullif(last_utm_source, ''), 'direct_or_unknown'),
    nullif(last_utm_medium, ''),
    nullif(last_utm_campaign, ''),
    nullif(last_utm_content, ''),
    1, 0, 0
  from session_last

  union all

  select
    (created_at at time zone 'UTC')::date,
    'first_touch',
    coalesce(nullif(first_utm_source, ''), 'direct_or_unknown'),
    nullif(first_utm_medium, ''),
    nullif(first_utm_campaign, ''),
    nullif(first_utm_content, ''),
    0, 1, 0
  from public.trial_signups
  where is_internal is not true

  union all

  select
    (created_at at time zone 'UTC')::date,
    'last_touch',
    coalesce(nullif(last_utm_source, ''), 'direct_or_unknown'),
    nullif(last_utm_medium, ''),
    nullif(last_utm_campaign, ''),
    nullif(last_utm_content, ''),
    0, 1, 0
  from public.trial_signups
  where is_internal is not true

  union all

  select
    (coalesce(lemon_created_at, received_at) at time zone 'UTC')::date,
    'first_touch',
    coalesce(nullif(first_utm_source, ''), 'direct_or_unknown'),
    nullif(first_utm_medium, ''),
    nullif(first_utm_campaign, ''),
    nullif(first_utm_content, ''),
    0, 0, 1
  from eligible_orders

  union all

  select
    (coalesce(lemon_created_at, received_at) at time zone 'UTC')::date,
    'last_touch',
    coalesce(nullif(last_utm_source, ''), 'direct_or_unknown'),
    nullif(last_utm_medium, ''),
    nullif(last_utm_campaign, ''),
    nullif(last_utm_content, ''),
    0, 0, 1
  from eligible_orders

  union all

  select
    (coalesce(orders.lemon_created_at, orders.received_at) at time zone 'UTC')::date,
    'self_reported',
    responses.source,
    null::text,
    null::text,
    null::text,
    0, 0, 1
  from public.purchase_source_responses responses
  join eligible_orders orders on orders.lemon_order_id = responses.lemon_order_id
)
select
  day,
  touch_model,
  source,
  medium,
  campaign,
  content,
  sum(sessions)::bigint as sessions,
  sum(trial_signups)::bigint as trial_signups,
  sum(purchases)::bigint as purchases
from touch_rows
group by day, touch_model, source, medium, campaign, content
order by day, touch_model, source, medium, campaign, content;

revoke all on public.distribution_sprint_daily_v
  from public, anon, authenticated;
revoke all on public.distribution_sprint_touch_v
  from public, anon, authenticated;
grant select on public.distribution_sprint_daily_v to service_role;
grant select on public.distribution_sprint_touch_v to service_role;
