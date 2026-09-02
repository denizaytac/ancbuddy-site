-- Separate Lemon checkout volume (including sales tax) from ANCBuddy revenue.
-- Lemon is Merchant of Record, so tax collected from buyers is not merchant
-- revenue. The store aggregate is retained as an independent reconciliation.

alter table public.lemon_orders
  add column if not exists tax_amount integer not null default 0,
  add column if not exists tax_amount_usd integer not null default 0;

alter table public.lemon_customer_snapshot
  add column if not exists store_total_sales integer not null default 0
    check (store_total_sales >= 0),
  add column if not exists store_total_revenue_usd_minor bigint not null default 0
    check (store_total_revenue_usd_minor >= 0),
  add column if not exists store_thirty_day_sales integer not null default 0
    check (store_thirty_day_sales >= 0),
  add column if not exists store_thirty_day_revenue_usd_minor bigint not null default 0
    check (store_thirty_day_revenue_usd_minor >= 0);

comment on column public.lemon_orders.amount_usd is
  'Buyer checkout total in USD minor units, including any sales tax collected by Lemon Squeezy.';
comment on column public.lemon_orders.tax_amount_usd is
  'Sales tax or VAT collected by Lemon Squeezy in USD minor units.';
comment on column public.lemon_customer_snapshot.store_total_revenue_usd_minor is
  'Authoritative all-time Lemon store revenue in USD minor units, excluding tax collected as Merchant of Record.';

create or replace view public.commerce_dashboard_summary_v
with (security_invoker = true)
as
with eligible_order_amounts as (
  select
    lemon_order_id,
    customer_email_hash,
    conversion_path,
    coalesce(lemon_created_at, received_at) as ordered_at,
    greatest(
      coalesce(
        amount_usd,
        case when upper(currency) = 'USD' then amount_total end,
        0
      ),
      0
    )::bigint as checkout_usd_minor,
    greatest(
      coalesce(
        tax_amount_usd,
        case when upper(currency) = 'USD' then tax_amount end,
        0
      ),
      0
    )::bigint as tax_usd_minor,
    greatest(
      coalesce(
        refunded_amount_usd,
        case when upper(currency) = 'USD' then refunded_amount end,
        0
      ),
      0
    )::bigint as refunded_checkout_usd_minor,
    status,
    refunded
  from public.lemon_orders
  where is_internal is not true
    and test_mode is not true
),
eligible_orders as (
  select
    *,
    greatest(checkout_usd_minor - tax_usd_minor, 0)::bigint
      as gross_usd_minor
  from eligible_order_amounts
),
completed_orders as (
  select
    *,
    case
      when checkout_usd_minor <= 0 then 0::bigint
      else least(
        gross_usd_minor,
        round(
          refunded_checkout_usd_minor::numeric * gross_usd_minor::numeric /
          checkout_usd_minor::numeric
        )::bigint
      )
    end as refunded_revenue_usd_minor
  from eligible_orders
  where status in ('paid', 'partial_refund', 'refunded')
),
order_totals as (
  select
    (select count(*) from eligible_orders)::bigint as total_order_rows,
    count(*)::bigint as completed_orders,
    count(*) filter (where gross_usd_minor > 0)::bigint as gross_revenue_orders,
    count(*) filter (
      where gross_usd_minor - refunded_revenue_usd_minor > 0
    )::bigint as net_revenue_orders,
    count(*) filter (where status = 'partial_refund')::bigint
      as partially_refunded_orders,
    count(*) filter (
      where coalesce(refunded, false) or status = 'refunded'
    )::bigint as fully_refunded_orders,
    count(*) filter (where conversion_path = 'direct')::bigint as direct_orders,
    count(*) filter (where conversion_path = 'trial_led')::bigint
      as trial_led_orders,
    count(*) filter (where conversion_path = 'unknown')::bigint
      as unknown_attribution_orders,
    count(distinct customer_email_hash) filter (
      where gross_usd_minor - refunded_revenue_usd_minor > 0
    )::bigint as unique_paying_customers,
    coalesce(sum(gross_usd_minor), 0)::bigint as gross_revenue_usd_minor,
    coalesce(sum(refunded_revenue_usd_minor), 0)::bigint
      as refunded_revenue_usd_minor,
    coalesce(sum(greatest(
      gross_usd_minor - refunded_revenue_usd_minor,
      0
    )), 0)::bigint as net_revenue_usd_minor,
    case
      when count(*) filter (
        where gross_usd_minor - refunded_revenue_usd_minor > 0
      ) = 0 then 0::bigint
      else round(
        sum(greatest(
          gross_usd_minor - refunded_revenue_usd_minor,
          0
        )) filter (
          where gross_usd_minor - refunded_revenue_usd_minor > 0
        )::numeric /
        count(*) filter (
          where gross_usd_minor - refunded_revenue_usd_minor > 0
        )
      )::bigint
    end as average_net_order_value_usd_minor,
    min(ordered_at) as first_order_at,
    max(ordered_at) as latest_order_at,
    coalesce(sum(checkout_usd_minor), 0)::bigint as checkout_volume_usd_minor,
    coalesce(sum(tax_usd_minor), 0)::bigint as tax_collected_usd_minor
  from completed_orders
),
trial_totals as (
  select count(*)::bigint as trial_signups
  from public.trial_signups
  where is_internal is not true
)
select
  orders.total_order_rows,
  orders.completed_orders,
  orders.gross_revenue_orders,
  orders.net_revenue_orders,
  orders.partially_refunded_orders,
  orders.fully_refunded_orders,
  orders.direct_orders,
  orders.trial_led_orders,
  orders.unknown_attribution_orders,
  orders.unique_paying_customers,
  orders.gross_revenue_usd_minor,
  orders.refunded_revenue_usd_minor,
  orders.net_revenue_usd_minor,
  orders.average_net_order_value_usd_minor,
  orders.first_order_at,
  orders.latest_order_at,
  trials.trial_signups,
  coalesce(customers.total_customers, 0)::bigint as lemon_customer_rows,
  coalesce(customers.subscribed_customers, 0)::bigint as subscribed_customers,
  coalesce(customers.revenue_customers, 0)::bigint as revenue_customers,
  customers.synced_at as customer_snapshot_at,
  sync.last_completed_at as commerce_synced_at,
  sync.last_status as commerce_sync_status,
  sync.last_error_code as commerce_sync_error_code,
  orders.checkout_volume_usd_minor,
  orders.tax_collected_usd_minor,
  customers.store_total_sales::bigint as lemon_store_total_sales,
  customers.store_total_revenue_usd_minor
    as lemon_store_total_revenue_usd_minor,
  customers.store_thirty_day_sales::bigint as lemon_store_thirty_day_sales,
  customers.store_thirty_day_revenue_usd_minor
    as lemon_store_thirty_day_revenue_usd_minor,
  case
    when customers.store_total_revenue_usd_minor is null then null
    else orders.gross_revenue_usd_minor -
      customers.store_total_revenue_usd_minor
  end as revenue_reconciliation_delta_usd_minor
from order_totals orders
cross join trial_totals trials
left join public.lemon_customer_snapshot customers on customers.singleton
left join public.lemon_sync_state sync on sync.singleton;

create or replace view public.commerce_dashboard_monthly_v
with (security_invoker = true)
as
with eligible_order_amounts as (
  select
    date_trunc(
      'month',
      coalesce(lemon_created_at, received_at) at time zone 'UTC'
    )::date as month,
    conversion_path,
    greatest(coalesce(amount_usd, 0), 0)::bigint as checkout_usd_minor,
    greatest(coalesce(tax_amount_usd, 0), 0)::bigint as tax_usd_minor,
    greatest(coalesce(refunded_amount_usd, 0), 0)::bigint
      as refunded_checkout_usd_minor,
    status
  from public.lemon_orders
  where is_internal is not true
    and test_mode is not true
    and status in ('paid', 'partial_refund', 'refunded')
),
eligible_orders as (
  select
    *,
    greatest(checkout_usd_minor - tax_usd_minor, 0)::bigint
      as gross_usd_minor
  from eligible_order_amounts
),
orders_with_refunds as (
  select
    *,
    case
      when checkout_usd_minor <= 0 then 0::bigint
      else least(
        gross_usd_minor,
        round(
          refunded_checkout_usd_minor::numeric * gross_usd_minor::numeric /
          checkout_usd_minor::numeric
        )::bigint
      )
    end as refunded_revenue_usd_minor
  from eligible_orders
)
select
  month,
  count(*)::bigint as completed_orders,
  count(*) filter (
    where greatest(gross_usd_minor - refunded_revenue_usd_minor, 0) > 0
  )::bigint as net_revenue_orders,
  count(*) filter (where conversion_path = 'direct')::bigint as direct_orders,
  count(*) filter (where conversion_path = 'trial_led')::bigint
    as trial_led_orders,
  coalesce(sum(gross_usd_minor), 0)::bigint as gross_revenue_usd_minor,
  coalesce(sum(refunded_revenue_usd_minor), 0)::bigint
    as refunded_revenue_usd_minor,
  coalesce(sum(greatest(
    gross_usd_minor - refunded_revenue_usd_minor,
    0
  )), 0)::bigint as net_revenue_usd_minor,
  coalesce(sum(checkout_usd_minor), 0)::bigint as checkout_volume_usd_minor,
  coalesce(sum(tax_usd_minor), 0)::bigint as tax_collected_usd_minor
from orders_with_refunds
group by month
order by month;

revoke all on public.commerce_dashboard_summary_v from public, anon, authenticated;
revoke all on public.commerce_dashboard_monthly_v from public, anon, authenticated;
grant select on public.commerce_dashboard_summary_v to service_role;
grant select on public.commerce_dashboard_monthly_v to service_role;
