-- ANCBuddy 14-day Reddit/community sprint report.
-- Planned window is 2026-08-27 through 2026-09-09 (end is exclusive).
-- Change the two dates once the first approved post fixes Day 1.

-- 1) Daily experiment cohort. QA/internal/test-mode orders are impossible to count.
with params as (
  select
    date '2026-08-27' as start_day,
    date '2026-09-10' as end_day,
    'qc_ultra_mac_reddit_14d_2026w35'::text as campaign
),
days as (
  select generate_series(start_day, end_day - 1, interval '1 day')::date as day
  from params
),
session_rows as (
  select
    events.session_id,
    min(events.created_at) as session_started_at,
    count(*) filter (where events.event_name = 'page_view')::bigint as page_views,
    count(*) filter (where events.event_name = 'trial_open')::bigint as trial_opens,
    count(*) filter (where events.event_name = 'download_click')::bigint as downloads,
    count(*) filter (where events.event_name = 'checkout_click')::bigint as checkouts,
    coalesce(
      bool_and(
        events.attribution_version = 2
        and events.visitor_id is not null
        and events.session_id is not null
        and events.first_landing_path is not null
        and events.first_seen_at is not null
        and events.last_landing_path is not null
        and events.last_seen_at is not null
      ) filter (where events.event_name = 'page_view'),
      false
    ) as has_complete_attribution
  from public.site_events events
  cross join params
  where events.is_internal is not true
    and events.session_id is not null
    and events.created_at >= params.start_day
    and events.created_at < params.end_day
    and params.campaign in (
      events.utm_campaign,
      events.first_utm_campaign,
      events.last_utm_campaign
    )
  group by events.session_id
  having count(*) filter (where events.event_name = 'page_view') > 0
),
session_daily as (
  select
    (session_started_at at time zone 'UTC')::date as day,
    count(*)::bigint as sessions,
    sum(page_views)::bigint as page_views,
    sum(trial_opens)::bigint as trial_opens,
    sum(downloads)::bigint as downloads,
    sum(checkouts)::bigint as checkouts,
    count(*) filter (where has_complete_attribution)::bigint as attributed_sessions
  from session_rows
  group by 1
),
eligible_trials as (
  select trials.*
  from public.trial_signups trials
  cross join params
  where trials.is_internal is not true
    and trials.created_at >= params.start_day
    and trials.created_at < params.end_day
    and params.campaign in (
      trials.utm_campaign,
      trials.first_utm_campaign,
      trials.last_utm_campaign
    )
),
eligible_orders as (
  select
    orders.*,
    coalesce(orders.lemon_created_at, orders.received_at) as ordered_at,
    coalesce(orders.refunded, false)
      or orders.status in ('partial_refund', 'refunded')
      or coalesce(orders.refunded_amount_usd, orders.refunded_amount, 0) > 0
      as has_refund,
    orders.attribution_version = 2
      and orders.visitor_id is not null
      and orders.session_id is not null
      and orders.first_landing_path is not null
      and orders.first_seen_at is not null
      and orders.last_landing_path is not null
      and orders.last_seen_at is not null as has_complete_attribution
  from public.lemon_orders orders
  cross join params
  where orders.is_internal is not true
    and orders.test_mode is not true
    and coalesce(orders.lemon_created_at, orders.received_at) >= params.start_day
    and coalesce(orders.lemon_created_at, orders.received_at) < params.end_day
    and params.campaign in (
      orders.utm_campaign,
      orders.first_utm_campaign,
      orders.last_utm_campaign
    )
),
trial_daily as (
  select
    (trials.created_at at time zone 'UTC')::date as day,
    count(*)::bigint as trial_signups,
    count(distinct trials.id) filter (
      where exists (
        select 1 from eligible_orders orders
        where orders.trial_signup_id = trials.id
          and orders.status in ('paid', 'partial_refund')
          and orders.has_refund is not true
      )
    )::bigint as converted_trials
  from eligible_trials trials
  group by 1
),
order_daily as (
  select
    (ordered_at at time zone 'UTC')::date as day,
    count(*) filter (
      where status in ('paid', 'partial_refund', 'refunded')
    )::bigint as purchases,
    count(*) filter (
      where status in ('paid', 'partial_refund') and has_refund is not true
    )::bigint as net_purchases,
    count(*) filter (where has_refund)::bigint as refunds,
    count(*) filter (
      where status in ('paid', 'partial_refund', 'refunded')
        and has_complete_attribution
    )::bigint as attributed_purchases
  from eligible_orders
  group by 1
),
daily as (
  select
    days.day,
    coalesce(s.sessions, 0)::bigint as sessions,
    coalesce(s.page_views, 0)::bigint as page_views,
    coalesce(s.trial_opens, 0)::bigint as trial_opens,
    coalesce(t.trial_signups, 0)::bigint as trial_signups,
    coalesce(s.downloads, 0)::bigint as downloads,
    coalesce(s.checkouts, 0)::bigint as checkouts,
    coalesce(o.purchases, 0)::bigint as purchases,
    coalesce(o.net_purchases, 0)::bigint as net_purchases,
    coalesce(o.refunds, 0)::bigint as refunds,
    coalesce(t.converted_trials, 0)::bigint as converted_trials,
    coalesce(s.attributed_sessions, 0)::bigint as attributed_sessions,
    coalesce(o.attributed_purchases, 0)::bigint as attributed_purchases
  from days
  left join session_daily s using (day)
  left join trial_daily t using (day)
  left join order_daily o using (day)
)
select
  *,
  round(100.0 * trial_signups / nullif(sessions, 0), 2)
    as session_to_trial_pct,
  round(100.0 * checkouts / nullif(sessions, 0), 2)
    as session_to_checkout_pct,
  round(100.0 * net_purchases / nullif(sessions, 0), 2)
    as session_to_purchase_pct,
  round(100.0 * converted_trials / nullif(trial_signups, 0), 2)
    as trial_to_purchase_pct,
  round(
    100.0 * (attributed_sessions + attributed_purchases)
      / nullif(sessions + purchases, 0),
    2
  ) as attribution_quality_pct,
  (sessions + purchases)::bigint as attribution_quality_n
from daily
order by day;

-- 2) First touch and last touch remain separate. Self-report is not substituted
-- for either model.
select
  day,
  touch_model,
  source,
  medium,
  campaign,
  content,
  sessions,
  trial_signups,
  purchases
from public.distribution_sprint_touch_v
where day >= date '2026-08-27'
  and day < date '2026-09-10'
  and (
    campaign = 'qc_ultra_mac_reddit_14d_2026w35'
    or touch_model = 'self_reported'
  )
order by day, touch_model, source, content;

-- 3) Self-reported source only for experiment-attributed production orders.
select
  responses.source as self_reported_source,
  count(*)::bigint as purchases,
  min(coalesce(orders.lemon_created_at, orders.received_at)) as first_order_at,
  max(coalesce(orders.lemon_created_at, orders.received_at)) as last_order_at
from public.purchase_source_responses responses
join public.lemon_orders orders
  on orders.lemon_order_id = responses.lemon_order_id
where orders.is_internal is not true
  and orders.test_mode is not true
  and orders.status in ('paid', 'partial_refund')
  and coalesce(orders.refunded, false) is not true
  and coalesce(orders.lemon_created_at, orders.received_at) >= date '2026-08-27'
  and coalesce(orders.lemon_created_at, orders.received_at) < date '2026-09-10'
  and 'qc_ultra_mac_reddit_14d_2026w35' in (
    orders.utm_campaign,
    orders.first_utm_campaign,
    orders.last_utm_campaign
  )
group by responses.source
order by purchases desc, responses.source;

-- 4) Overall production health for the same dates. This view already excludes
-- is_internal=true and test_mode=true orders.
select *
from public.distribution_sprint_daily_v
where day >= date '2026-08-27'
  and day < date '2026-09-10'
order by day;
