-- Lemon Squeezy order attribution for ANCBuddy distribution tests.
-- Orders are written only by the signed Supabase Edge Function webhook.
-- Browser roles get no read/write access to purchase data.

create table if not exists public.lemon_orders (
  id uuid primary key default gen_random_uuid(),
  lemon_order_id text not null,
  lemon_identifier text,
  lemon_order_number text,
  lemon_store_id text,
  lemon_customer_id text,
  customer_email_hash text,
  amount_total integer,
  amount_usd integer,
  currency text,
  status text,
  refunded boolean,
  lemon_created_at timestamptz,
  event_name text not null default 'order_created' check (event_name = 'order_created'),
  conversion_path text not null default 'unknown' check (
    conversion_path in ('direct', 'trial_led', 'unknown')
  ),
  trial_signup_id uuid references public.trial_signups(id) on delete set null,
  session_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer_host text,
  landing_path text,
  current_path text,
  custom_data jsonb not null default '{}'::jsonb,
  raw_event jsonb not null,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lemon_orders_lemon_order_id_unique unique (lemon_order_id)
);

alter table public.lemon_orders enable row level security;

revoke all on table public.lemon_orders from public, anon, authenticated;
grant select, insert, update, delete on table public.lemon_orders to service_role;

create index if not exists lemon_orders_received_at_idx
  on public.lemon_orders (received_at desc);

create index if not exists lemon_orders_lemon_created_at_idx
  on public.lemon_orders (lemon_created_at desc);

create index if not exists lemon_orders_session_id_idx
  on public.lemon_orders (session_id);

create index if not exists lemon_orders_utm_source_idx
  on public.lemon_orders (utm_source);

create index if not exists lemon_orders_conversion_path_idx
  on public.lemon_orders (conversion_path);
