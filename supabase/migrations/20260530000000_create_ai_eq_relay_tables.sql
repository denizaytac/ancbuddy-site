-- Private tables used by the AI Auto-EQ Supabase Edge Function.
-- The browser/app never reads or writes these tables directly; the function
-- uses the service-role key and stores only hashed track/license identifiers.

create table if not exists public.ai_eq_cache (
  track_hash text primary key,
  profile jsonb not null,
  model text not null,
  prompt_version text not null,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_eq_installations (
  installation_id text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.ai_eq_usage_events (
  id uuid primary key default gen_random_uuid(),
  installation_id text not null,
  license_hash text,
  tier text not null check (tier in ('trial', 'paid', 'dev')),
  track_hash text not null,
  model text not null,
  prompt_version text not null,
  cache_hit boolean not null,
  status text not null check (status in ('ok', 'blocked', 'error')),
  block_reason text not null default 'none',
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

alter table public.ai_eq_cache enable row level security;
alter table public.ai_eq_installations enable row level security;
alter table public.ai_eq_usage_events enable row level security;

create index if not exists ai_eq_usage_events_install_month_idx
  on public.ai_eq_usage_events (installation_id, created_at desc)
  where cache_hit = false and status = 'ok';

create index if not exists ai_eq_usage_events_license_month_idx
  on public.ai_eq_usage_events (license_hash, created_at desc)
  where cache_hit = false and status = 'ok' and license_hash is not null;

create index if not exists ai_eq_usage_events_global_month_idx
  on public.ai_eq_usage_events (created_at desc)
  where cache_hit = false and status = 'ok';

create index if not exists ai_eq_usage_events_block_reason_idx
  on public.ai_eq_usage_events (block_reason, created_at desc)
  where status <> 'ok';
