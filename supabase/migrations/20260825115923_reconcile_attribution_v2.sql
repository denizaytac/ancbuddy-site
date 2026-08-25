-- Reconcile the checked-in schema with the privacy-light attribution v2
-- contract already used by the production webhook and RLS policies.
-- This migration is deliberately idempotent because production received the
-- additive columns and policies before the change was represented in Git.

alter table public.site_events
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
  add column if not exists last_seen_at timestamptz;

create index if not exists site_events_visitor_id_created_at_idx
  on public.site_events (visitor_id, created_at desc)
  where visitor_id is not null;

create index if not exists trial_signups_visitor_id_created_at_idx
  on public.trial_signups (visitor_id, created_at desc)
  where visitor_id is not null;

create index if not exists lemon_orders_visitor_id_created_at_idx
  on public.lemon_orders (visitor_id, lemon_created_at desc)
  where visitor_id is not null;

alter table public.site_events enable row level security;
alter table public.trial_signups enable row level security;

revoke all on table public.site_events from public, anon, authenticated;
revoke all on table public.trial_signups from public, anon, authenticated;
grant insert on table public.site_events to anon;
grant insert on table public.trial_signups to anon;
grant select, insert, update, delete on table public.site_events to service_role;
grant select, insert, update, delete on table public.trial_signups to service_role;

drop policy if exists "anon can insert site events" on public.site_events;
drop policy if exists "consented browsers can insert bounded site events" on public.site_events;
create policy "consented browsers can insert bounded site events"
  on public.site_events
  for insert
  to anon
  with check (
    visitor_id is not null
    and attribution_version = 2
    and char_length(coalesce(session_id, '')) between 1 and 80
    and char_length(coalesce(utm_source, '')) <= 160
    and char_length(coalesce(utm_medium, '')) <= 160
    and char_length(coalesce(utm_campaign, '')) <= 160
    and char_length(coalesce(utm_content, '')) <= 160
    and char_length(coalesce(referrer_host, '')) <= 255
    and char_length(coalesce(landing_path, '')) <= 1000
    and char_length(coalesce(current_path, '')) <= 1000
    and char_length(coalesce(first_utm_source, '')) <= 160
    and char_length(coalesce(first_utm_medium, '')) <= 160
    and char_length(coalesce(first_utm_campaign, '')) <= 160
    and char_length(coalesce(first_utm_content, '')) <= 160
    and char_length(coalesce(first_referrer_host, '')) <= 255
    and char_length(coalesce(first_landing_path, '')) <= 1000
    and char_length(coalesce(last_utm_source, '')) <= 160
    and char_length(coalesce(last_utm_medium, '')) <= 160
    and char_length(coalesce(last_utm_campaign, '')) <= 160
    and char_length(coalesce(last_utm_content, '')) <= 160
    and char_length(coalesce(last_referrer_host, '')) <= 255
    and char_length(coalesce(last_landing_path, '')) <= 1000
    and char_length(coalesce(user_agent, '')) <= 600
    and octet_length(metadata::text) <= 4096
  );

drop policy if exists "anon can insert trial signups" on public.trial_signups;
drop policy if exists "browsers can insert bounded trial signups" on public.trial_signups;
create policy "browsers can insert bounded trial signups"
  on public.trial_signups
  for insert
  to anon
  with check (
    char_length(btrim(name)) between 1 and 160
    and char_length(btrim(email)) between 3 and 320
    and char_length(coalesce(session_id, '')) <= 80
    and (visitor_id is null or attribution_version = 2)
    and char_length(coalesce(utm_source, '')) <= 160
    and char_length(coalesce(utm_medium, '')) <= 160
    and char_length(coalesce(utm_campaign, '')) <= 160
    and char_length(coalesce(utm_content, '')) <= 160
    and char_length(coalesce(referrer_host, '')) <= 255
    and char_length(coalesce(landing_path, '')) <= 1000
    and char_length(coalesce(current_path, '')) <= 1000
    and char_length(coalesce(first_utm_source, '')) <= 160
    and char_length(coalesce(first_utm_medium, '')) <= 160
    and char_length(coalesce(first_utm_campaign, '')) <= 160
    and char_length(coalesce(first_utm_content, '')) <= 160
    and char_length(coalesce(first_referrer_host, '')) <= 255
    and char_length(coalesce(first_landing_path, '')) <= 1000
    and char_length(coalesce(last_utm_source, '')) <= 160
    and char_length(coalesce(last_utm_medium, '')) <= 160
    and char_length(coalesce(last_utm_campaign, '')) <= 160
    and char_length(coalesce(last_utm_content, '')) <= 160
    and char_length(coalesce(last_referrer_host, '')) <= 255
    and char_length(coalesce(last_landing_path, '')) <= 1000
    and char_length(coalesce(user_agent, '')) <= 600
  );

comment on column public.site_events.visitor_id is
  'Random pseudonymous browser-session identifier used to join first-party funnel events.';
comment on column public.site_events.attribution_version is
  'Website attribution payload contract version. Anonymous site events require version 2.';
