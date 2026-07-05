-- First-party attribution for ANCBuddy distribution tests.
-- This keeps measurement privacy-light: campaign/referrer/session fields only,
-- no third-party analytics script, and browser access remains insert-only.

alter table public.trial_signups
  add column if not exists email_normalized text generated always as (lower(btrim(email))) stored,
  add column if not exists session_id text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists referrer_host text,
  add column if not exists landing_path text,
  add column if not exists current_path text;

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (
    event_name in (
      'page_view',
      'trial_open',
      'trial_start',
      'download_click',
      'checkout_click'
    )
  ),
  session_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer_host text,
  landing_path text,
  current_path text,
  metadata jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.site_events enable row level security;

revoke all on table public.trial_signups from public, anon, authenticated;
revoke all on table public.site_events from public, anon, authenticated;

grant insert on table public.trial_signups to anon;
grant insert on table public.site_events to anon;
grant select, insert, update, delete on table public.trial_signups to service_role;
grant select, insert, update, delete on table public.site_events to service_role;

drop policy if exists "anon can insert site events" on public.site_events;
create policy "anon can insert site events"
  on public.site_events
  for insert
  to anon
  with check (true);

drop policy if exists "anon can insert trial signups" on public.trial_signups;
create policy "anon can insert trial signups"
  on public.trial_signups
  for insert
  to anon
  with check (true);

create index if not exists trial_signups_email_normalized_created_at_idx
  on public.trial_signups (email_normalized, created_at desc);

create index if not exists trial_signups_session_id_idx
  on public.trial_signups (session_id);

create index if not exists site_events_created_at_idx
  on public.site_events (created_at desc);

create index if not exists site_events_event_name_created_at_idx
  on public.site_events (event_name, created_at desc);

create index if not exists site_events_session_id_idx
  on public.site_events (session_id);
