-- Durable state, approval controls, and privacy-safe reporting for the
-- ANCBuddy Growth Agent. All operational access is service-role only.

begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.growth_content_hash(payload jsonb)
returns text
language sql
immutable
strict
security definer
set search_path = ''
as $$
  select pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(payload::text, 'UTF8'), 'sha256'),
    'hex'
  );
$$;

create table public.growth_settings (
  id boolean primary key default true check (id),
  revenue_goal_minor bigint not null default 100000 check (revenue_goal_minor >= 0),
  revenue_baseline_minor bigint not null default 0 check (revenue_baseline_minor >= 0),
  goal_currency text not null default 'EUR' check (
    goal_currency = upper(goal_currency)
    and goal_currency ~ '^[A-Z]{3}$'
  ),
  max_pending_actions integer not null default 5 check (max_pending_actions between 1 and 25),
  simulation_mode boolean not null default true,
  external_execution_enabled boolean not null default false,
  approval_ttl interval not null default interval '7 days' check (
    approval_ttl > interval '0 seconds'
    and approval_ttl <= interval '30 days'
  ),
  monthly_ai_budget_minor integer check (monthly_ai_budget_minor is null or monthly_ai_budget_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.growth_settings (id)
values (true)
on conflict (id) do nothing;

create table public.growth_contacts (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (btrim(channel) <> ''),
  display_name text,
  organization text,
  address text,
  address_normalized text generated always as (lower(btrim(address))) stored,
  status text not null default 'prospect' check (
    status in (
      'prospect',
      'ready',
      'contacted',
      'replied',
      'converted',
      'do_not_contact',
      'invalid'
    )
  ),
  source_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  last_contacted_at timestamptz,
  opt_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'do_not_contact' or opt_out_at is not null)
);

create table public.growth_experiments (
  id uuid primary key default gen_random_uuid(),
  campaign_key text not null unique check (
    btrim(campaign_key) = campaign_key
    and campaign_key ~ '^[a-z0-9][a-z0-9_-]{2,79}$'
  ),
  name text not null check (btrim(name) <> ''),
  hypothesis text not null check (btrim(hypothesis) <> ''),
  channel text not null check (btrim(channel) <> ''),
  primary_metric text not null default 'attributed_revenue',
  status text not null default 'draft' check (
    status in ('draft', 'active', 'paused', 'completed', 'cancelled')
  ),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.growth_runs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique check (btrim(idempotency_key) <> ''),
  experiment_id uuid references public.growth_experiments(id) on delete restrict,
  kind text not null check (kind in ('daily', 'weekly', 'manual')),
  status text not null default 'queued' check (
    status in (
      'queued',
      'running',
      'awaiting_approval',
      'completed',
      'failed',
      'cancelled'
    )
  ),
  focus text,
  "trigger" text,
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  error text,
  model text,
  trace_id text,
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  cost_minor integer check (cost_minor is null or cost_minor >= 0),
  cost_currency text check (
    cost_currency is null
    or (cost_currency = upper(cost_currency) and cost_currency ~ '^[A-Z]{3}$')
  ),
  config_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(config_snapshot) = 'object'),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table public.growth_actions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text unique check (idempotency_key is null or btrim(idempotency_key) <> ''),
  run_id uuid references public.growth_runs(id) on delete restrict,
  experiment_id uuid references public.growth_experiments(id) on delete restrict,
  contact_id uuid references public.growth_contacts(id) on delete restrict,
  supersedes_action_id uuid references public.growth_actions(id) on delete restrict,
  version bigint not null default 1 check (version > 0),
  type text not null check (btrim(type) <> ''),
  title text not null check (btrim(title) <> ''),
  channel text not null check (btrim(channel) <> ''),
  status text not null default 'idea' check (
    status in (
      'idea',
      'researched',
      'drafted',
      'awaiting_approval',
      'approved',
      'rejected',
      'needs_changes',
      'executing',
      'executed',
      'observed',
      'evaluated',
      'expired',
      'failed',
      'integration_required'
    )
  ),
  expected_upside jsonb not null default '{}'::jsonb check (jsonb_typeof(expected_upside) = 'object'),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  risk jsonb not null default '{}'::jsonb check (jsonb_typeof(risk) = 'object'),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  content_hash text generated always as (public.growth_content_hash(content)) stored,
  attribution_key text not null default (
    'ga_' || replace(gen_random_uuid()::text, '-', '')
  ) unique check (attribution_key ~ '^ga_[a-f0-9]{32}$'),
  priority smallint not null default 100 check (priority between 1 and 1000),
  approved_content_hash text,
  approved_at timestamptz,
  approval_expires_at timestamptz,
  scheduled_for timestamptz,
  executed_at timestamptz,
  observed_at timestamptz,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status not in ('approved', 'executing', 'executed', 'observed', 'evaluated')
    or (
      approved_content_hash is not null
      and approved_content_hash = content_hash
      and approved_at is not null
    )
  )
);

create table public.growth_approvals (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.growth_actions(id) on delete restrict,
  action_version bigint not null check (action_version > 0),
  decision text not null check (decision in ('approve', 'reject', 'change')),
  feedback text,
  content_snapshot jsonb not null check (jsonb_typeof(content_snapshot) = 'object'),
  content_hash text generated always as (public.growth_content_hash(content_snapshot)) stored,
  replacement_content jsonb check (
    replacement_content is null or jsonb_typeof(replacement_content) = 'object'
  ),
  replacement_content_hash text generated always as (
    case
      when replacement_content is null then null
      else public.growth_content_hash(replacement_content)
    end
  ) stored,
  decided_by text not null default 'ceo' check (btrim(decided_by) <> ''),
  decided_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (action_id, action_version),
  check (decision = 'change' or replacement_content is null),
  check (decision <> 'approve' or expires_at is not null)
);

create table public.growth_outcome_events (
  id uuid primary key default gen_random_uuid(),
  action_id uuid references public.growth_actions(id) on delete restrict,
  experiment_id uuid references public.growth_experiments(id) on delete restrict,
  contact_id uuid references public.growth_contacts(id) on delete restrict,
  run_id uuid references public.growth_runs(id) on delete restrict,
  event_type text not null check (btrim(event_type) <> ''),
  source text not null default 'manual' check (btrim(source) <> ''),
  external_event_id text,
  campaign_key text,
  attribution_confidence text not null default 'unknown' check (
    attribution_confidence in ('action', 'campaign', 'session', 'manual', 'unknown')
  ),
  value_minor bigint check (value_minor is null or value_minor >= 0),
  currency text check (
    currency is null
    or (currency = upper(currency) and currency ~ '^[A-Z]{3}$')
  ),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source, external_event_id)
);

create table public.growth_audit_log (
  id uuid primary key default gen_random_uuid(),
  action_id uuid references public.growth_actions(id) on delete restrict,
  run_id uuid references public.growth_runs(id) on delete restrict,
  approval_id uuid references public.growth_approvals(id) on delete restrict,
  event_type text not null check (btrim(event_type) <> ''),
  actor text not null default 'system' check (btrim(actor) <> ''),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index growth_contacts_status_updated_at_idx
  on public.growth_contacts (status, updated_at desc);

create unique index growth_contacts_channel_address_unique_idx
  on public.growth_contacts (channel, address_normalized)
  where address_normalized is not null;

create index growth_experiments_status_updated_at_idx
  on public.growth_experiments (status, updated_at desc);

create index growth_runs_experiment_id_idx
  on public.growth_runs (experiment_id)
  where experiment_id is not null;

create index growth_runs_status_started_at_idx
  on public.growth_runs (status, started_at desc nulls last);

create index growth_actions_run_id_idx
  on public.growth_actions (run_id)
  where run_id is not null;

create index growth_actions_experiment_id_idx
  on public.growth_actions (experiment_id)
  where experiment_id is not null;

create index growth_actions_contact_id_idx
  on public.growth_actions (contact_id)
  where contact_id is not null;

create index growth_actions_supersedes_action_id_idx
  on public.growth_actions (supersedes_action_id)
  where supersedes_action_id is not null;

create index growth_actions_status_priority_created_at_idx
  on public.growth_actions (status, priority, created_at);

create index growth_actions_pending_inbox_idx
  on public.growth_actions (priority, created_at)
  where status = 'awaiting_approval';

create index growth_approvals_action_id_decided_at_idx
  on public.growth_approvals (action_id, decided_at desc);

create index growth_outcome_events_action_id_occurred_at_idx
  on public.growth_outcome_events (action_id, occurred_at desc)
  where action_id is not null;

create index growth_outcome_events_experiment_id_occurred_at_idx
  on public.growth_outcome_events (experiment_id, occurred_at desc)
  where experiment_id is not null;

create index growth_outcome_events_contact_id_idx
  on public.growth_outcome_events (contact_id)
  where contact_id is not null;

create index growth_outcome_events_run_id_idx
  on public.growth_outcome_events (run_id)
  where run_id is not null;

create index growth_outcome_events_type_occurred_at_idx
  on public.growth_outcome_events (event_type, occurred_at desc);

create index growth_outcome_events_campaign_occurred_at_idx
  on public.growth_outcome_events (campaign_key, occurred_at desc)
  where campaign_key is not null;

create index growth_audit_log_action_id_created_at_idx
  on public.growth_audit_log (action_id, created_at desc)
  where action_id is not null;

create index growth_audit_log_run_id_created_at_idx
  on public.growth_audit_log (run_id, created_at desc)
  where run_id is not null;

create index growth_audit_log_approval_id_idx
  on public.growth_audit_log (approval_id)
  where approval_id is not null;

create index growth_audit_log_created_at_idx
  on public.growth_audit_log (created_at desc);

create or replace function public.growth_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger growth_settings_touch_updated_at
before update on public.growth_settings
for each row execute function public.growth_touch_updated_at();

create trigger growth_contacts_touch_updated_at
before update on public.growth_contacts
for each row execute function public.growth_touch_updated_at();

create trigger growth_experiments_touch_updated_at
before update on public.growth_experiments
for each row execute function public.growth_touch_updated_at();

create trigger growth_actions_touch_updated_at
before update on public.growth_actions
for each row execute function public.growth_touch_updated_at();

create or replace function public.growth_require_action_version_bump()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  approval_fields_changed boolean;
begin
  approval_fields_changed := row(
    new.type,
    new.title,
    new.channel,
    new.expected_upside,
    new.evidence,
    new.risk,
    new.content
  ) is distinct from row(
    old.type,
    old.title,
    old.channel,
    old.expected_upside,
    old.evidence,
    old.risk,
    old.content
  );

  if new.version not in (old.version, old.version + 1) then
    raise exception using
      errcode = '22023',
      message = 'invalid_growth_action_version_increment',
      detail = pg_catalog.format(
        'Version must remain %s or increment to %s.',
        old.version,
        old.version + 1
      );
  end if;

  if approval_fields_changed and new.version <> old.version + 1 then
    raise exception using
      errcode = '40001',
      message = 'growth_action_content_requires_version_increment',
      detail = 'Approval-relevant changes must increment version exactly once.';
  end if;

  return new;
end;
$$;

create trigger growth_actions_require_version_bump
before update on public.growth_actions
for each row execute function public.growth_require_action_version_bump();

create or replace function public.growth_validate_action_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matching_decision boolean;
begin
  if tg_op = 'INSERT' then
    if new.status in (
      'approved',
      'rejected',
      'needs_changes',
      'executing',
      'executed',
      'observed',
      'evaluated'
    ) then
      raise exception using
        errcode = '55000',
        message = 'growth_action_requires_approval_transition';
    end if;
    return new;
  end if;

  if new.status = 'approved' and old.status <> 'approved' then
    select exists (
      select 1
      from public.growth_approvals as approval
      where approval.action_id = old.id
        and approval.action_version = old.version
        and approval.decision = 'approve'
        and approval.content_hash = public.growth_content_hash(new.content)
        and approval.expires_at > now()
    )
    into matching_decision;

    if not matching_decision then
      raise exception using
        errcode = '55000',
        message = 'growth_action_missing_matching_approval';
    end if;
  elsif new.status = 'rejected' and old.status <> 'rejected' then
    select exists (
      select 1
      from public.growth_approvals as approval
      where approval.action_id = old.id
        and approval.action_version = old.version
        and approval.decision = 'reject'
        and approval.content_hash = public.growth_content_hash(old.content)
    )
    into matching_decision;

    if not matching_decision then
      raise exception using
        errcode = '55000',
        message = 'growth_action_missing_matching_rejection';
    end if;
  elsif new.status = 'needs_changes' and old.status <> 'needs_changes' then
    select exists (
      select 1
      from public.growth_approvals as approval
      where approval.action_id = old.id
        and approval.action_version = old.version
        and approval.decision = 'change'
        and approval.content_hash = public.growth_content_hash(old.content)
        and (
          approval.replacement_content_hash is null
          or approval.replacement_content_hash = public.growth_content_hash(new.content)
        )
    )
    into matching_decision;

    if not matching_decision then
      raise exception using
        errcode = '55000',
        message = 'growth_action_missing_matching_change_request';
    end if;
  elsif new.status in ('executing', 'executed', 'observed', 'evaluated') then
    select exists (
      select 1
      from public.growth_approvals as approval
      where approval.action_id = old.id
        and approval.decision = 'approve'
        and approval.content_hash = public.growth_content_hash(new.content)
        and approval.expires_at > now()
    )
    into matching_decision;

    if not matching_decision then
      raise exception using
        errcode = '55000',
        message = 'growth_action_approval_missing_or_expired';
    end if;
  end if;

  return new;
end;
$$;

create trigger growth_actions_validate_transition
before insert or update of status, content on public.growth_actions
for each row execute function public.growth_validate_action_transition();

create or replace function public.growth_enforce_pending_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending_limit integer;
  pending_count integer;
begin
  if new.status <> 'awaiting_approval'
     or (tg_op = 'UPDATE' and old.status = 'awaiting_approval') then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ancbuddy_growth_pending_actions', 0)
  );

  select max_pending_actions
  into pending_limit
  from public.growth_settings
  where id = true;

  if pending_limit is null then
    raise exception using
      errcode = '55000',
      message = 'growth_settings_missing';
  end if;

  select count(*)::integer
  into pending_count
  from public.growth_actions
  where status = 'awaiting_approval'
    and id is distinct from new.id;

  if pending_count >= pending_limit then
    raise exception using
      errcode = '54000',
      message = 'growth_pending_action_limit_exceeded',
      detail = pg_catalog.format(
        'The CEO inbox is limited to %s pending actions.',
        pending_limit
      );
  end if;

  return new;
end;
$$;

create trigger growth_actions_pending_limit
before insert or update of status on public.growth_actions
for each row execute function public.growth_enforce_pending_limit();

create or replace function public.growth_block_immutable_row_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = pg_catalog.format('%s rows are immutable', tg_table_name);
end;
$$;

create trigger growth_approvals_immutable
before update or delete on public.growth_approvals
for each row execute function public.growth_block_immutable_row_changes();

create trigger growth_outcome_events_immutable
before update or delete on public.growth_outcome_events
for each row execute function public.growth_block_immutable_row_changes();

create trigger growth_audit_log_immutable
before update or delete on public.growth_audit_log
for each row execute function public.growth_block_immutable_row_changes();

create or replace function public.growth_audit_action_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.growth_audit_log (
    action_id,
    run_id,
    event_type,
    actor,
    details
  )
  values (
    new.id,
    new.run_id,
    case when tg_op = 'INSERT' then 'action_created' else 'action_updated' end,
    'database',
    jsonb_build_object(
      'previous_status', case when tg_op = 'UPDATE' then old.status else null end,
      'status', new.status,
      'previous_version', case when tg_op = 'UPDATE' then old.version else null end,
      'version', new.version,
      'content_hash', new.content_hash
    )
  );
  return new;
end;
$$;

create trigger growth_actions_audit_change
after insert or update on public.growth_actions
for each row execute function public.growth_audit_action_change();

create or replace function public.decide_growth_action(
  p_action_id uuid,
  p_expected_version bigint,
  p_decision text,
  p_feedback text default null,
  p_edited_content jsonb default null
)
returns table (
  action_id uuid,
  status text,
  version bigint,
  approval_id uuid,
  decision text,
  content_hash text,
  content jsonb,
  decided_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_action public.growth_actions%rowtype;
  approval_record public.growth_approvals%rowtype;
  approval_lifetime interval;
  actor_name text;
begin
  if p_decision is null or p_decision not in ('approve', 'reject', 'change') then
    raise exception using
      errcode = '22023',
      message = 'invalid_growth_action_decision',
      hint = 'decision must be approve, reject, or change';
  end if;

  if p_expected_version is null or p_expected_version < 1 then
    raise exception using
      errcode = '22023',
      message = 'invalid_growth_action_expected_version';
  end if;

  if p_edited_content is not null and jsonb_typeof(p_edited_content) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'invalid_growth_action_edited_content';
  end if;

  if p_decision <> 'change' and p_edited_content is not null then
    raise exception using
      errcode = '22023',
      message = 'edited_content_requires_change_decision';
  end if;

  if p_decision = 'change'
     and p_edited_content is null
     and nullif(btrim(p_feedback), '') is null then
    raise exception using
      errcode = '22023',
      message = 'growth_action_change_requires_feedback_or_content';
  end if;

  select *
  into current_action
  from public.growth_actions
  where id = p_action_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'growth_action_not_found';
  end if;

  if current_action.version <> p_expected_version then
    raise exception using
      errcode = '40001',
      message = 'growth_action_version_conflict',
      detail = pg_catalog.format(
        'Expected version %s but current version is %s.',
        p_expected_version,
        current_action.version
      );
  end if;

  if current_action.status <> 'awaiting_approval' then
    raise exception using
      errcode = '55000',
      message = 'growth_action_not_awaiting_approval',
      detail = pg_catalog.format('Current status is %s.', current_action.status);
  end if;

  select approval_ttl
  into approval_lifetime
  from public.growth_settings
  where id = true;

  if approval_lifetime is null then
    raise exception using
      errcode = '55000',
      message = 'growth_settings_missing';
  end if;

  actor_name := coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    'ceo'
  );

  insert into public.growth_approvals (
    action_id,
    action_version,
    decision,
    feedback,
    content_snapshot,
    replacement_content,
    decided_by,
    expires_at
  )
  values (
    current_action.id,
    current_action.version,
    p_decision,
    nullif(btrim(p_feedback), ''),
    current_action.content,
    case when p_decision = 'change' then p_edited_content else null end,
    actor_name,
    case when p_decision = 'approve' then now() + approval_lifetime else null end
  )
  returning * into approval_record;

  if p_decision = 'approve' then
    update public.growth_actions as action
    set status = 'approved',
        version = action.version + 1,
        approved_content_hash = current_action.content_hash,
        approved_at = approval_record.decided_at,
        approval_expires_at = approval_record.expires_at
    where id = current_action.id
    returning * into current_action;
  elsif p_decision = 'reject' then
    update public.growth_actions as action
    set status = 'rejected',
        version = action.version + 1,
        approved_content_hash = null,
        approved_at = null,
        approval_expires_at = null
    where id = current_action.id
    returning * into current_action;
  else
    update public.growth_actions as action
    set status = 'needs_changes',
        version = action.version + 1,
        content = coalesce(p_edited_content, action.content),
        approved_content_hash = null,
        approved_at = null,
        approval_expires_at = null
    where id = current_action.id
    returning * into current_action;
  end if;

  insert into public.growth_audit_log (
    action_id,
    run_id,
    approval_id,
    event_type,
    actor,
    details
  )
  values (
    current_action.id,
    current_action.run_id,
    approval_record.id,
    'action_decided',
    actor_name,
    jsonb_build_object(
      'decision', p_decision,
      'reviewed_version', approval_record.action_version,
      'reviewed_content_hash', approval_record.content_hash,
      'resulting_version', current_action.version,
      'resulting_status', current_action.status,
      'resulting_content_hash', current_action.content_hash
    )
  );

  return query
  select
    current_action.id,
    current_action.status,
    current_action.version,
    approval_record.id,
    approval_record.decision,
    current_action.content_hash,
    current_action.content,
    approval_record.decided_at;
end;
$$;

create view public.growth_funnel_daily_v as
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

create view public.growth_campaign_attribution_v as
select
  utm_source,
  utm_medium,
  utm_campaign as campaign_key,
  min(day) as first_seen_on,
  max(day) as last_seen_on,
  sum(unique_sessions)::bigint as unique_session_days,
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
from public.growth_funnel_daily_v
group by utm_source, utm_medium, utm_campaign;

create view public.growth_action_attribution_v as
with funnel as (
  select
    campaign_key,
    min(first_seen_on) as first_seen_on,
    max(last_seen_on) as last_seen_on,
    sum(page_views)::bigint as page_views,
    sum(trial_start_events)::bigint as trial_start_events,
    sum(download_clicks)::bigint as download_clicks,
    sum(checkout_clicks)::bigint as checkout_clicks,
    sum(trial_signups)::bigint as trial_signups,
    sum(orders)::bigint as orders,
    sum(refunded_orders)::bigint as refunded_orders,
    sum(gross_revenue_usd_minor)::bigint as gross_revenue_usd_minor,
    sum(net_revenue_usd_minor)::bigint as net_revenue_usd_minor
  from public.growth_campaign_attribution_v
  group by campaign_key
), outcomes as (
  select
    action_id,
    count(*) filter (where event_type in ('sent', 'email_sent', 'published'))::bigint as executions,
    count(*) filter (where event_type = 'reply')::bigint as replies,
    count(*) filter (where event_type = 'positive_reply')::bigint as positive_replies,
    count(*) filter (where event_type = 'negative_reply')::bigint as negative_replies,
    count(*) filter (where event_type = 'mention')::bigint as mentions,
    max(occurred_at) as last_outcome_at
  from public.growth_outcome_events
  where action_id is not null
  group by action_id
)
select
  action.id as action_id,
  action.experiment_id,
  action.attribution_key as campaign_key,
  action.type as action_type,
  action.title as action_title,
  action.channel,
  action.status as action_status,
  funnel.first_seen_on,
  funnel.last_seen_on,
  coalesce(funnel.page_views, 0) as page_views,
  coalesce(funnel.trial_start_events, 0) as trial_start_events,
  coalesce(funnel.download_clicks, 0) as download_clicks,
  coalesce(funnel.checkout_clicks, 0) as checkout_clicks,
  coalesce(funnel.trial_signups, 0) as trial_signups,
  coalesce(funnel.orders, 0) as orders,
  coalesce(funnel.refunded_orders, 0) as refunded_orders,
  coalesce(funnel.gross_revenue_usd_minor, 0) as gross_revenue_usd_minor,
  coalesce(funnel.net_revenue_usd_minor, 0) as net_revenue_usd_minor,
  coalesce(outcomes.executions, 0) as executions,
  coalesce(outcomes.replies, 0) as replies,
  coalesce(outcomes.positive_replies, 0) as positive_replies,
  coalesce(outcomes.negative_replies, 0) as negative_replies,
  coalesce(outcomes.mentions, 0) as mentions,
  outcomes.last_outcome_at
from public.growth_actions as action
left join funnel on funnel.campaign_key = action.attribution_key
left join outcomes on outcomes.action_id = action.id;

create or replace function public.get_growth_dashboard(
  p_since timestamptz default (now() - interval '30 days'),
  p_until timestamptz default now()
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_since is null or p_until is null or p_since >= p_until then
    raise exception using
      errcode = '22023',
      message = 'invalid_growth_dashboard_window';
  end if;

  if p_until - p_since > interval '366 days' then
    raise exception using
      errcode = '22023',
      message = 'growth_dashboard_window_too_large';
  end if;

  select jsonb_build_object(
    'window', jsonb_build_object('since', p_since, 'until', p_until),
    'goal', (
      select jsonb_build_object(
        'currency', settings.goal_currency,
        'revenue_goal_minor', settings.revenue_goal_minor,
        'revenue_baseline_minor', settings.revenue_baseline_minor,
        'simulation_mode', settings.simulation_mode,
        'external_execution_enabled', settings.external_execution_enabled,
        'max_pending_actions', settings.max_pending_actions
      )
      from public.growth_settings as settings
      where settings.id = true
    ),
    'funnel', jsonb_build_object(
      'unique_session_days', coalesce(sum(daily.unique_sessions), 0),
      'page_views', coalesce(sum(daily.page_views), 0),
      'trial_start_events', coalesce(sum(daily.trial_start_events), 0),
      'trial_signups', coalesce(sum(daily.trial_signups), 0),
      'download_clicks', coalesce(sum(daily.download_clicks), 0),
      'checkout_clicks', coalesce(sum(daily.checkout_clicks), 0),
      'orders', coalesce(sum(daily.orders), 0),
      'refunded_orders', coalesce(sum(daily.refunded_orders), 0),
      'gross_revenue_usd_minor', coalesce(sum(daily.gross_revenue_usd_minor), 0),
      'net_revenue_usd_minor', coalesce(sum(daily.net_revenue_usd_minor), 0)
    ),
    'operations', jsonb_build_object(
      'pending_actions', (
        select count(*)
        from public.growth_actions
        where status = 'awaiting_approval'
      ),
      'active_experiments', (
        select count(*)
        from public.growth_experiments
        where status = 'active'
      ),
      'failed_runs', (
        select count(*)
        from public.growth_runs
        where status = 'failed'
          and created_at >= p_since
          and created_at < p_until
      )
    ),
    'top_actions_all_time', coalesce((
      select jsonb_agg(to_jsonb(ranked) order by ranked.net_revenue_usd_minor desc, ranked.orders desc)
      from (
        select
          attribution.action_id,
          attribution.campaign_key,
          attribution.action_type,
          attribution.action_title,
          attribution.channel,
          attribution.action_status,
          attribution.page_views,
          attribution.trial_signups,
          attribution.orders,
          attribution.net_revenue_usd_minor,
          attribution.replies
        from public.growth_action_attribution_v as attribution
        order by attribution.net_revenue_usd_minor desc, attribution.orders desc
        limit 10
      ) as ranked
    ), '[]'::jsonb)
  )
  into result
  from public.growth_funnel_daily_v as daily
  where daily.day >= (p_since at time zone 'UTC')::date
    and daily.day <= (p_until at time zone 'UTC')::date;

  return result;
end;
$$;

alter table public.growth_settings enable row level security;
alter table public.growth_settings force row level security;
alter table public.growth_contacts enable row level security;
alter table public.growth_contacts force row level security;
alter table public.growth_experiments enable row level security;
alter table public.growth_experiments force row level security;
alter table public.growth_runs enable row level security;
alter table public.growth_runs force row level security;
alter table public.growth_actions enable row level security;
alter table public.growth_actions force row level security;
alter table public.growth_approvals enable row level security;
alter table public.growth_approvals force row level security;
alter table public.growth_outcome_events enable row level security;
alter table public.growth_outcome_events force row level security;
alter table public.growth_audit_log enable row level security;
alter table public.growth_audit_log force row level security;

revoke all on table public.growth_settings from public, anon, authenticated;
revoke all on table public.growth_contacts from public, anon, authenticated;
revoke all on table public.growth_experiments from public, anon, authenticated;
revoke all on table public.growth_runs from public, anon, authenticated;
revoke all on table public.growth_actions from public, anon, authenticated;
revoke all on table public.growth_approvals from public, anon, authenticated;
revoke all on table public.growth_outcome_events from public, anon, authenticated;
revoke all on table public.growth_audit_log from public, anon, authenticated;
revoke all on table public.growth_funnel_daily_v from public, anon, authenticated;
revoke all on table public.growth_campaign_attribution_v from public, anon, authenticated;
revoke all on table public.growth_action_attribution_v from public, anon, authenticated;

grant select, update on table public.growth_settings to service_role;
grant select, insert, update on table public.growth_contacts to service_role;
grant select, insert, update on table public.growth_experiments to service_role;
grant select, insert, update on table public.growth_runs to service_role;
grant select, insert, update on table public.growth_actions to service_role;
grant select on table public.growth_approvals to service_role;
grant select, insert on table public.growth_outcome_events to service_role;
grant select, insert on table public.growth_audit_log to service_role;
grant select on table public.growth_funnel_daily_v to service_role;
grant select on table public.growth_campaign_attribution_v to service_role;
grant select on table public.growth_action_attribution_v to service_role;

revoke all on function public.growth_content_hash(jsonb) from public, anon, authenticated;
revoke all on function public.growth_touch_updated_at() from public, anon, authenticated;
revoke all on function public.growth_enforce_pending_limit() from public, anon, authenticated;
revoke all on function public.growth_require_action_version_bump() from public, anon, authenticated;
revoke all on function public.growth_validate_action_transition() from public, anon, authenticated;
revoke all on function public.growth_block_immutable_row_changes() from public, anon, authenticated;
revoke all on function public.growth_audit_action_change() from public, anon, authenticated;
revoke all on function public.decide_growth_action(uuid, bigint, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_growth_dashboard(timestamptz, timestamptz) from public, anon, authenticated;

grant execute on function public.growth_content_hash(jsonb) to service_role;
grant execute on function public.decide_growth_action(uuid, bigint, text, text, jsonb) to service_role;
grant execute on function public.get_growth_dashboard(timestamptz, timestamptz) to service_role;

comment on column public.growth_actions.attribution_key is
  'Use as the utm_campaign value for this exact action.';
comment on table public.growth_approvals is
  'Append-only CEO decisions with immutable reviewed-content snapshots and SHA-256 hashes.';
comment on view public.growth_funnel_daily_v is
  'Privacy-safe daily funnel totals. It exposes no names, email addresses, user agents, or raw events.';
comment on view public.growth_campaign_attribution_v is
  'Privacy-safe attribution grouped by UTM source, medium, and campaign.';
comment on view public.growth_action_attribution_v is
  'Privacy-safe action attribution by matching utm_campaign to growth_actions.attribution_key.';

commit;
