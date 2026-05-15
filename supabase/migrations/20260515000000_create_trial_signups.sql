-- Trial signup logging for the ANCBuddy landing page.
-- Every submission of the "Try free for 14 days" dialog inserts a row here,
-- independent of whether the email-dispatch (Web3Forms) succeeded.

create table if not exists public.trial_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Row-level security: anon (the public anon key shipped in the SPA) may
-- only INSERT. No SELECT, no UPDATE, no DELETE from the browser. Reads
-- happen via the Supabase dashboard or service-role key.
alter table public.trial_signups enable row level security;

drop policy if exists "anon can insert trial signups" on public.trial_signups;
create policy "anon can insert trial signups"
  on public.trial_signups
  for insert
  to anon
  with check (true);

-- Helpful index for browsing recent signups in the dashboard.
create index if not exists trial_signups_created_at_idx
  on public.trial_signups (created_at desc);
