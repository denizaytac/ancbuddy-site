-- Durable, approval-bound execution for the ANCBuddy Growth Agent.
-- Credentials are encrypted by the application with AES-256-GCM before they
-- reach Postgres. Operational access remains service-role only.

begin;

create table public.growth_integrations (
  provider text primary key check (
    provider = lower(btrim(provider))
    and provider ~ '^[a-z][a-z0-9_-]{1,31}$'
  ),
  status text not null default 'unconfigured' check (
    status in ('unconfigured', 'validating', 'ready', 'invalid', 'error')
  ),
  mode text not null default 'disabled' check (
    mode in ('disabled', 'canary', 'live', 'paused')
  ),
  credential_ciphertext text,
  credential_nonce text,
  credential_key_version integer,
  credentials_configured boolean generated always as (
    credential_ciphertext is not null
  ) stored,
  configuration jsonb not null default '{}'::jsonb check (
    jsonb_typeof(configuration) = 'object'
  ),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
  ),
  canary_limit integer not null default 1 check (canary_limit between 1 and 10),
  canary_reserved_count integer not null default 0 check (canary_reserved_count >= 0),
  canary_succeeded_count integer not null default 0 check (canary_succeeded_count >= 0),
  last_validated_at timestamptz,
  last_error text,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (
      credential_ciphertext is null
      and credential_nonce is null
      and credential_key_version is null
    )
    or (
      nullif(btrim(credential_ciphertext), '') is not null
      and nullif(btrim(credential_nonce), '') is not null
      and credential_key_version is not null
      and credential_key_version > 0
    )
  ),
  check (status <> 'unconfigured' or (not credentials_configured and mode = 'disabled')),
  check (status <> 'ready' or credentials_configured),
  check (mode not in ('canary', 'live') or (status = 'ready' and credentials_configured)),
  check (canary_succeeded_count <= canary_reserved_count),
  check (canary_reserved_count <= canary_limit)
);

create table public.growth_execution_jobs (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.growth_actions(id) on delete restrict,
  approval_id uuid not null unique references public.growth_approvals(id) on delete restrict,
  action_version bigint not null check (action_version > 0),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  content_snapshot jsonb not null check (jsonb_typeof(content_snapshot) = 'object'),
  provider text not null check (
    provider = lower(btrim(provider))
    and provider ~ '^[a-z][a-z0-9_-]{1,31}$'
  ),
  provider_mode text not null check (provider_mode in ('canary', 'live')),
  status text not null default 'queued' check (
    status in ('queued', 'running', 'succeeded', 'failed', 'unknown', 'cancelled')
  ),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  authorization_expires_at timestamptz not null,
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  last_heartbeat_at timestamptz,
  external_id text,
  external_url text check (external_url is null or external_url ~ '^https://'),
  error text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (action_id, action_version),
  check (attempts <= max_attempts),
  check (authorization_expires_at > created_at),
  check (
    (
      status = 'running'
      and nullif(btrim(lease_owner), '') is not null
      and lease_token is not null
      and lease_expires_at is not null
    )
    or (
      status <> 'running'
      and lease_owner is null
      and lease_token is null
      and lease_expires_at is null
    )
  ),
  check (
    (status in ('succeeded', 'failed', 'unknown', 'cancelled'))
    = (completed_at is not null)
  )
);

create index growth_integrations_status_mode_idx
  on public.growth_integrations (status, mode);

create index growth_execution_jobs_queue_idx
  on public.growth_execution_jobs (available_at, created_at)
  where status = 'queued';

create index growth_execution_jobs_expired_lease_idx
  on public.growth_execution_jobs (lease_expires_at, created_at)
  where status = 'running';

create index growth_execution_jobs_action_created_at_idx
  on public.growth_execution_jobs (action_id, created_at desc);

create unique index growth_execution_jobs_provider_external_id_unique_idx
  on public.growth_execution_jobs (provider, external_id)
  where external_id is not null;

create index growth_actions_email_created_at_idx
  on public.growth_actions (created_at)
  where type = 'email';

create unique index growth_outcome_events_manual_action_type_unique_idx
  on public.growth_outcome_events (action_id, event_type)
  where source = 'manual_ceo'
    and event_type in ('email_sent', 'reply', 'positive_reply', 'negative_reply');

create trigger growth_integrations_touch_updated_at
before update on public.growth_integrations
for each row execute function public.growth_touch_updated_at();

create trigger growth_execution_jobs_touch_updated_at
before update on public.growth_execution_jobs
for each row execute function public.growth_touch_updated_at();

create or replace function public.growth_guard_integration_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.provider <> old.provider then
    raise exception using errcode = '55000', message = 'growth_integration_provider_is_immutable';
  end if;

  if new.canary_succeeded_count < old.canary_succeeded_count then
    raise exception using errcode = '55000', message = 'growth_integration_canary_history_is_immutable';
  end if;

  if new.canary_reserved_count < old.canary_reserved_count
     and exists (
       select 1
       from public.growth_execution_jobs as job
       where job.provider = old.provider
         and job.status in ('queued', 'running')
     ) then
    raise exception using errcode = '55000', message = 'growth_integration_has_active_reservation';
  end if;

  if row(
       new.credential_ciphertext,
       new.credential_nonce,
       new.credential_key_version,
       new.configuration
     ) is distinct from row(
       old.credential_ciphertext,
       old.credential_nonce,
       old.credential_key_version,
       old.configuration
     )
     and exists (
       select 1
       from public.growth_execution_jobs as job
       where job.provider = old.provider
         and job.status = 'running'
     ) then
    raise exception using errcode = '55000', message = 'growth_integration_has_running_execution';
  end if;

  return new;
end;
$$;

create trigger growth_integrations_guard_mutation
before update on public.growth_integrations
for each row execute function public.growth_guard_integration_mutation();

create or replace function public.growth_enforce_email_draft_daily_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  utc_day_start timestamptz;
  existing_count integer;
begin
  if new.type <> 'email'
     or new.status <> 'awaiting_approval'
     or (
       tg_op = 'UPDATE'
       and old.type = 'email'
       and old.status = 'awaiting_approval'
     ) then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ancbuddy_growth_email_drafts_daily', 0)
  );

  utc_day_start := pg_catalog.date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';

  select count(*)::integer
  into existing_count
  from public.growth_actions as action
  where action.type = 'email'
    and action.created_at >= utc_day_start
    and action.created_at < utc_day_start + interval '1 day'
    and action.id is distinct from new.id;

  if existing_count >= 3 then
    raise exception using
      errcode = '54000',
      message = 'growth_email_draft_daily_limit_exceeded',
      detail = 'At most three new email drafts may enter the CEO inbox per UTC day.';
  end if;

  return new;
end;
$$;

create trigger growth_actions_email_draft_daily_limit
before insert or update of type, status on public.growth_actions
for each row execute function public.growth_enforce_email_draft_daily_limit();

create or replace function public.growth_audit_integration_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.growth_audit_log (event_type, actor, details)
  values (
    case when tg_op = 'INSERT' then 'integration_created' else 'integration_updated' end,
    'database',
    jsonb_build_object(
      'provider', new.provider,
      'previous_status', case when tg_op = 'UPDATE' then old.status else null end,
      'status', new.status,
      'previous_mode', case when tg_op = 'UPDATE' then old.mode else null end,
      'mode', new.mode,
      'credentials_configured', new.credentials_configured,
      'canary_reserved_count', new.canary_reserved_count,
      'canary_succeeded_count', new.canary_succeeded_count
    )
  );
  return new;
end;
$$;

create trigger growth_integrations_audit_change
after insert or update on public.growth_integrations
for each row execute function public.growth_audit_integration_change();

-- Outcomes may arrive long after the seven-day approval window. The approval
-- must still be current when execution starts, but observation/evaluation is
-- authorized by immutable outcome rows instead of by a still-live approval.
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
  elsif new.status = 'executing' then
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
  elsif new.status = 'executed' and old.status <> 'executed' then
    if old.status = 'executing' then
      select exists (
        select 1
        from public.growth_execution_jobs as job
        join public.growth_approvals as approval
          on approval.id = job.approval_id
        where job.action_id = old.id
          and job.status = 'succeeded'
          and job.action_version + 1 = new.version
          and job.content_hash = public.growth_content_hash(new.content)
          and job.content_snapshot = new.content
          and approval.action_id = old.id
          and approval.action_version = job.action_version
          and approval.decision = 'approve'
          and approval.content_hash = job.content_hash
          and approval.content_snapshot = job.content_snapshot
      )
      into matching_decision;
    elsif old.status = 'approved' and new.type = 'email' then
      select exists (
        select 1
        from public.growth_approvals as approval
        join public.growth_outcome_events as outcome
          on outcome.action_id = approval.action_id
        where approval.action_id = old.id
          and approval.decision = 'approve'
          and approval.content_hash = public.growth_content_hash(new.content)
          and outcome.source = 'manual_ceo'
          and outcome.event_type = 'email_sent'
      )
      into matching_decision;
    else
      select exists (
        select 1
        from public.growth_approvals as approval
        where approval.action_id = old.id
          and approval.decision = 'approve'
          and approval.content_hash = public.growth_content_hash(new.content)
          and approval.expires_at > now()
      )
      into matching_decision;
    end if;

    if not matching_decision then
      raise exception using
        errcode = '55000',
        message = 'growth_action_execution_not_authorized';
    end if;
  elsif new.status = 'observed' then
    select old.status in ('executed', 'observed') and exists (
      select 1
      from public.growth_outcome_events as outcome
      where outcome.action_id = old.id
    )
    into matching_decision;

    if not matching_decision then
      raise exception using
        errcode = '55000',
        message = 'growth_action_observation_requires_outcome';
    end if;
  elsif new.status = 'evaluated' then
    select old.status in ('observed', 'evaluated') and exists (
      select 1
      from public.growth_outcome_events as outcome
      where outcome.action_id = old.id
    )
    into matching_decision;

    if not matching_decision then
      raise exception using
        errcode = '55000',
        message = 'growth_action_evaluation_requires_observation';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enable_growth_integration(
  p_provider text,
  p_mode text
)
returns table (
  provider text,
  status text,
  mode text,
  credentials_configured boolean,
  configuration jsonb,
  canary_limit integer,
  canary_reserved_count integer,
  canary_succeeded_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_provider text;
  current_integration public.growth_integrations%rowtype;
begin
  normalized_provider := lower(btrim(p_provider));

  if normalized_provider is null or normalized_provider = '' then
    raise exception using errcode = '22023', message = 'invalid_growth_integration_provider';
  end if;

  if p_mode is null or p_mode not in ('disabled', 'canary', 'live', 'paused') then
    raise exception using errcode = '22023', message = 'invalid_growth_integration_mode';
  end if;

  select integration.*
  into current_integration
  from public.growth_integrations as integration
  where integration.provider = normalized_provider
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'growth_integration_not_found';
  end if;

  if p_mode in ('canary', 'live')
     and (
       current_integration.status <> 'ready'
       or not current_integration.credentials_configured
     ) then
    raise exception using
      errcode = '55000',
      message = 'growth_integration_not_ready';
  end if;

  if p_mode = 'canary' then
    if current_integration.mode = 'canary' then
      return query
      select
        current_integration.provider,
        current_integration.status,
        current_integration.mode,
        current_integration.credentials_configured,
        current_integration.configuration,
        current_integration.canary_limit,
        current_integration.canary_reserved_count,
        current_integration.canary_succeeded_count,
        current_integration.updated_at;
      return;
    end if;

    if current_integration.canary_reserved_count > 0
       or exists (
         select 1
         from public.growth_execution_jobs as job
         where job.provider = normalized_provider
           and job.status in ('queued', 'running')
       ) then
      raise exception using
        errcode = '55000',
        message = 'growth_integration_canary_already_reserved';
    end if;
  end if;

  if p_mode = 'live'
     and current_integration.canary_reserved_count
       > current_integration.canary_succeeded_count then
    raise exception using
      errcode = '55000',
      message = 'growth_integration_canary_in_progress';
  end if;

  update public.growth_integrations as integration
  set mode = p_mode,
      canary_limit = case when p_mode = 'canary' then 1 else integration.canary_limit end,
      paused_at = case when p_mode = 'paused' then now() else null end,
      last_error = case when p_mode in ('canary', 'live') then null else integration.last_error end
  where integration.provider = normalized_provider
  returning integration.* into current_integration;

  return query
  select
    current_integration.provider,
    current_integration.status,
    current_integration.mode,
    current_integration.credentials_configured,
    current_integration.configuration,
    current_integration.canary_limit,
    current_integration.canary_reserved_count,
    current_integration.canary_succeeded_count,
    current_integration.updated_at;
end;
$$;

create or replace function public.save_growth_integration(
  p_provider text,
  p_status text,
  p_credential_ciphertext text,
  p_credential_nonce text,
  p_credential_key_version integer,
  p_configuration jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb,
  p_last_validated_at timestamptz default now(),
  p_last_error text default null
)
returns table (
  provider text,
  status text,
  mode text,
  credentials_configured boolean,
  configuration jsonb,
  canary_limit integer,
  canary_reserved_count integer,
  canary_succeeded_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_provider text;
  current_integration public.growth_integrations%rowtype;
begin
  normalized_provider := lower(btrim(p_provider));

  if normalized_provider is null
     or normalized_provider !~ '^[a-z][a-z0-9_-]{1,31}$' then
    raise exception using errcode = '22023', message = 'invalid_growth_integration_provider';
  end if;

  if p_status is null or p_status not in ('validating', 'ready', 'invalid', 'error') then
    raise exception using errcode = '22023', message = 'invalid_growth_integration_status';
  end if;

  if nullif(btrim(p_credential_ciphertext), '') is null
     or nullif(btrim(p_credential_nonce), '') is null
     or p_credential_key_version is null
     or p_credential_key_version < 1 then
    raise exception using errcode = '22023', message = 'invalid_growth_integration_credential';
  end if;

  if p_configuration is null or jsonb_typeof(p_configuration) <> 'object'
     or p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_growth_integration_metadata';
  end if;

  if p_status = 'ready' and p_last_validated_at is null then
    raise exception using errcode = '22023', message = 'growth_integration_validation_timestamp_required';
  end if;

  select integration.*
  into current_integration
  from public.growth_integrations as integration
  where integration.provider = normalized_provider
  for update;

  if found then
    -- Do not rotate credentials underneath an execution or turn a queued job
    -- into a dormant replay. The CEO can remove (queued) or wait (running).
    perform job.id
    from public.growth_execution_jobs as job
    where job.provider = normalized_provider
      and job.status in ('queued', 'running')
    order by job.created_at
    for update;

    if exists (
      select 1
      from public.growth_execution_jobs as job
      where job.provider = normalized_provider
        and job.status in ('queued', 'running')
    ) then
      raise exception using
        errcode = '55000',
        message = 'growth_integration_has_active_execution';
    end if;

    if current_integration.mode in ('canary', 'live') and p_status <> 'ready' then
      raise exception using
        errcode = '55000',
        message = 'active_growth_integration_must_remain_ready';
    end if;

    update public.growth_integrations as integration
    set status = p_status,
        credential_ciphertext = btrim(p_credential_ciphertext),
        credential_nonce = btrim(p_credential_nonce),
        credential_key_version = p_credential_key_version,
        configuration = p_configuration,
        metadata = p_metadata,
        last_validated_at = p_last_validated_at,
        last_error = nullif(btrim(p_last_error), '')
    where integration.provider = normalized_provider
    returning integration.* into current_integration;
  else
    insert into public.growth_integrations (
      provider,
      status,
      mode,
      credential_ciphertext,
      credential_nonce,
      credential_key_version,
      configuration,
      metadata,
      last_validated_at,
      last_error
    )
    values (
      normalized_provider,
      p_status,
      'disabled',
      btrim(p_credential_ciphertext),
      btrim(p_credential_nonce),
      p_credential_key_version,
      p_configuration,
      p_metadata,
      p_last_validated_at,
      nullif(btrim(p_last_error), '')
    )
    returning * into current_integration;
  end if;

  return query
  select
    current_integration.provider,
    current_integration.status,
    current_integration.mode,
    current_integration.credentials_configured,
    current_integration.configuration,
    current_integration.canary_limit,
    current_integration.canary_reserved_count,
    current_integration.canary_succeeded_count,
    current_integration.updated_at;
end;
$$;

create or replace function public.remove_growth_integration(
  p_provider text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_provider text;
  current_integration public.growth_integrations%rowtype;
  cancelled_job public.growth_execution_jobs%rowtype;
  cancelled_count integer := 0;
begin
  normalized_provider := lower(btrim(p_provider));

  if normalized_provider is null or normalized_provider = '' then
    raise exception using errcode = '22023', message = 'invalid_growth_integration_provider';
  end if;

  select integration.*
  into current_integration
  from public.growth_integrations as integration
  where integration.provider = normalized_provider
  for update;

  if not found then
    return;
  end if;

  -- Serialize with claims/reclaims before classifying the jobs. If a worker
  -- already owns one, deletion is ambiguous and must wait for reconciliation.
  perform job.id
  from public.growth_execution_jobs as job
  where job.provider = normalized_provider
    and job.status in ('queued', 'running')
  order by job.created_at
  for update;

  if exists (
    select 1
    from public.growth_execution_jobs as job
    where job.provider = normalized_provider
      and job.status = 'running'
  ) then
    raise exception using
      errcode = '55000',
      message = 'growth_integration_has_running_execution',
      detail = 'Wait for the in-flight execution to complete or become explicitly reconciled.';
  end if;

  for cancelled_job in
    update public.growth_execution_jobs as job
    set status = 'cancelled',
        error = 'integration_removed_before_execution',
        completed_at = now(),
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null
    where job.provider = normalized_provider
      and job.status = 'queued'
    returning job.*
  loop
    cancelled_count := cancelled_count + 1;

    update public.growth_actions as action
    set status = 'expired'
    where action.id = cancelled_job.action_id
      and action.status in ('approved', 'executing');

    insert into public.growth_audit_log (
      action_id,
      approval_id,
      event_type,
      actor,
      details
    )
    values (
      cancelled_job.action_id,
      cancelled_job.approval_id,
      'execution_cancelled',
      'ceo',
      jsonb_build_object(
        'job_id', cancelled_job.id,
        'provider', cancelled_job.provider,
        'reason', 'integration_removed_before_execution'
      )
    );
  end loop;

  delete from public.growth_integrations as integration
  where integration.provider = normalized_provider;

  insert into public.growth_audit_log (event_type, actor, details)
  values (
    'integration_removed',
    'ceo',
    jsonb_build_object(
      'provider', normalized_provider,
      'cancelled_queued_jobs', cancelled_count,
      'credentials_deleted', true
    )
  );
end;
$$;

create or replace function public.decide_growth_action_v2(
  p_action_id uuid,
  p_expected_version bigint,
  p_decision text,
  p_feedback text default null,
  p_edited_content jsonb default null,
  p_enqueue_provider text default null
)
returns table (
  action_id uuid,
  status text,
  version bigint,
  approval_id uuid,
  decision text,
  content_hash text,
  content jsonb,
  decided_at timestamptz,
  execution_job_id uuid,
  execution_status text,
  execution_provider text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_action public.growth_actions%rowtype;
  existing_approval public.growth_approvals%rowtype;
  approval_record public.growth_approvals%rowtype;
  integration_record public.growth_integrations%rowtype;
  job_record public.growth_execution_jobs%rowtype;
  decision_record record;
  settings_record public.growth_settings%rowtype;
  normalized_provider text;
begin
  if p_enqueue_provider is not null and nullif(btrim(p_enqueue_provider), '') is null then
    raise exception using errcode = '22023', message = 'invalid_growth_execution_provider';
  end if;

  normalized_provider := case
    when p_enqueue_provider is null then null
    else lower(btrim(p_enqueue_provider))
  end;

  if normalized_provider is not null and normalized_provider <> 'github' then
    raise exception using errcode = '22023', message = 'unsupported_growth_execution_provider';
  end if;

  if normalized_provider is not null and p_decision <> 'approve' then
    raise exception using errcode = '22023', message = 'growth_execution_requires_approval';
  end if;

  select action.*
  into current_action
  from public.growth_actions as action
  where action.id = p_action_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'growth_action_not_found';
  end if;

  select approval.*
  into existing_approval
  from public.growth_approvals as approval
  where approval.action_id = p_action_id
    and approval.action_version = p_expected_version;

  if found then
    if existing_approval.decision <> p_decision then
      raise exception using errcode = '40001', message = 'growth_action_decision_conflict';
    end if;

    if normalized_provider is not null then
      select job.*
      into job_record
      from public.growth_execution_jobs as job
      where job.approval_id = existing_approval.id;

      if not found then
        raise exception using
          errcode = '55000',
          message = 'growth_action_decision_has_no_execution_job',
          detail = 'Existing approvals are never retroactively enqueued.';
      end if;

      if job_record.provider <> normalized_provider then
        raise exception using errcode = '40001', message = 'growth_execution_provider_conflict';
      end if;
    end if;

    return query
    select
      current_action.id,
      current_action.status,
      current_action.version,
      existing_approval.id,
      existing_approval.decision,
      current_action.content_hash,
      current_action.content,
      existing_approval.decided_at,
      job_record.id,
      job_record.status,
      job_record.provider;
    return;
  end if;

  if normalized_provider is not null then
    if current_action.type <> 'site_pr' then
      raise exception using errcode = '22023', message = 'growth_execution_action_type_not_supported';
    end if;

    select settings.*
    into settings_record
    from public.growth_settings as settings
    where settings.id = true
    for update;

    if not found then
      raise exception using errcode = '55000', message = 'growth_settings_missing';
    end if;

    if settings_record.simulation_mode or not settings_record.external_execution_enabled then
      raise exception using errcode = '55000', message = 'growth_external_execution_disabled';
    end if;

    select integration.*
    into integration_record
    from public.growth_integrations as integration
    where integration.provider = normalized_provider
    for update;

    if not found
       or integration_record.status <> 'ready'
       or not integration_record.credentials_configured
       or integration_record.mode not in ('canary', 'live') then
      raise exception using errcode = '55000', message = 'growth_integration_not_executable';
    end if;

    if integration_record.mode = 'canary'
       and integration_record.canary_reserved_count >= integration_record.canary_limit then
      raise exception using errcode = '54000', message = 'growth_integration_canary_limit_reached';
    end if;
  end if;

  select decided.*
  into decision_record
  from public.decide_growth_action(
    p_action_id,
    p_expected_version,
    p_decision,
    p_feedback,
    p_edited_content
  ) as decided;

  select approval.*
  into approval_record
  from public.growth_approvals as approval
  where approval.id = decision_record.approval_id;

  if normalized_provider is not null then
    insert into public.growth_execution_jobs (
      action_id,
      approval_id,
      action_version,
      content_hash,
      content_snapshot,
      provider,
      provider_mode,
      authorization_expires_at
    )
    values (
      approval_record.action_id,
      approval_record.id,
      approval_record.action_version,
      approval_record.content_hash,
      approval_record.content_snapshot,
      normalized_provider,
      integration_record.mode,
      approval_record.expires_at
    )
    returning * into job_record;

    if integration_record.mode = 'canary' then
      update public.growth_integrations as integration
      set canary_reserved_count = integration.canary_reserved_count + 1
      where integration.provider = normalized_provider;
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
      'execution_queued',
      'database',
      jsonb_build_object(
        'job_id', job_record.id,
        'provider', job_record.provider,
        'action_version', job_record.action_version,
        'content_hash', job_record.content_hash
      )
    );
  end if;

  return query
  select
    decision_record.action_id,
    decision_record.status,
    decision_record.version,
    decision_record.approval_id,
    decision_record.decision,
    decision_record.content_hash,
    decision_record.content,
    decision_record.decided_at,
    job_record.id,
    job_record.status,
    job_record.provider;
end;
$$;

create or replace function public.claim_growth_execution_job(
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns setof public.growth_execution_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_job public.growth_execution_jobs%rowtype;
  affected_rows integer;
  expired_canary_providers text[];
begin
  if nullif(btrim(p_worker_id), '') is null or length(p_worker_id) > 200 then
    raise exception using errcode = '22023', message = 'invalid_growth_worker_id';
  end if;

  if p_lease_seconds is null or p_lease_seconds not between 15 and 900 then
    raise exception using errcode = '22023', message = 'invalid_growth_execution_lease';
  end if;

  select pg_catalog.array_agg(distinct job.provider)
  into expired_canary_providers
  from public.growth_execution_jobs as job
  join public.growth_integrations as integration
    on integration.provider = job.provider
  where job.authorization_expires_at <= now()
    and (
      job.status = 'queued'
      or (job.status = 'running' and job.lease_expires_at <= now())
    )
    and job.provider_mode = 'canary';

  with expired_jobs as (
    update public.growth_execution_jobs as job
    set status = 'cancelled',
        error = 'approval_expired_before_execution',
        completed_at = now(),
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null
    where job.authorization_expires_at <= now()
      and (
        job.status = 'queued'
        or (job.status = 'running' and job.lease_expires_at <= now())
      )
    returning job.action_id
  )
  update public.growth_actions as action
  set status = 'expired'
  where action.id in (select expired.action_id from expired_jobs as expired)
    and action.status in ('approved', 'executing');

  if expired_canary_providers is not null then
    update public.growth_integrations as integration
    set mode = 'paused',
        status = 'error',
        canary_reserved_count = pg_catalog.greatest(
          integration.canary_succeeded_count,
          integration.canary_reserved_count - 1
        ),
        paused_at = now(),
        last_error = 'approval_expired_before_execution'
    where integration.provider = any(expired_canary_providers);
  end if;

  select job.*
  into selected_job
  from public.growth_execution_jobs as job
  join public.growth_actions as action
    on action.id = job.action_id
  join public.growth_approvals as approval
    on approval.id = job.approval_id
  join public.growth_integrations as integration
    on integration.provider = job.provider
  cross join public.growth_settings as settings
  where settings.id = true
    and not settings.simulation_mode
    and settings.external_execution_enabled
    and integration.status = 'ready'
    and integration.mode in ('canary', 'live')
    and action.status in ('approved', 'executing')
    and action.version = job.action_version + 1
    and action.content_hash = job.content_hash
    and action.approved_content_hash = job.content_hash
    and action.content = job.content_snapshot
    and approval.action_id = job.action_id
    and approval.action_version = job.action_version
    and approval.decision = 'approve'
    and approval.content_hash = job.content_hash
    and approval.content_snapshot = job.content_snapshot
    and approval.expires_at = job.authorization_expires_at
    and approval.expires_at > now()
    and job.authorization_expires_at > now()
    and job.attempts < job.max_attempts
    and (
      (job.status = 'queued' and job.available_at <= now())
      or (job.status = 'running' and job.lease_expires_at <= now())
    )
  order by job.available_at, job.created_at
  for update of job skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.growth_execution_jobs as job
  set status = 'running',
      attempts = job.attempts + 1,
      lease_owner = btrim(p_worker_id),
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + pg_catalog.make_interval(secs => p_lease_seconds),
      last_heartbeat_at = now(),
      started_at = coalesce(job.started_at, now()),
      completed_at = null
  where job.id = selected_job.id
  returning job.* into selected_job;

  update public.growth_actions as action
  set status = 'executing'
  where action.id = selected_job.action_id
    and action.status in ('approved', 'executing');

  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    raise exception using errcode = '55000', message = 'growth_execution_action_not_executable';
  end if;

  insert into public.growth_audit_log (action_id, approval_id, event_type, actor, details)
  values (
    selected_job.action_id,
    selected_job.approval_id,
    'execution_claimed',
    btrim(p_worker_id),
    jsonb_build_object(
      'job_id', selected_job.id,
      'provider', selected_job.provider,
      'attempt', selected_job.attempts,
      'lease_expires_at', selected_job.lease_expires_at
    )
  );

  return next selected_job;
  return;
end;
$$;

create or replace function public.heartbeat_growth_execution_job(
  p_job_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_lease_seconds integer default 120
)
returns setof public.growth_execution_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job public.growth_execution_jobs%rowtype;
begin
  if nullif(btrim(p_worker_id), '') is null
     or p_lease_token is null
     or p_lease_seconds is null
     or p_lease_seconds not between 15 and 900 then
    raise exception using errcode = '22023', message = 'invalid_growth_execution_heartbeat';
  end if;

  update public.growth_execution_jobs as job
  set lease_expires_at = now() + pg_catalog.make_interval(secs => p_lease_seconds),
      last_heartbeat_at = now()
  where job.id = p_job_id
    and job.status = 'running'
    and job.lease_owner = btrim(p_worker_id)
    and job.lease_token = p_lease_token
    and job.lease_expires_at > now()
  returning job.* into current_job;

  if not found then
    raise exception using errcode = '55000', message = 'growth_execution_lease_lost';
  end if;

  return next current_job;
  return;
end;
$$;

create or replace function public.complete_growth_execution_job(
  p_job_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_status text default 'succeeded',
  p_external_id text default null,
  p_external_url text default null,
  p_error text default null,
  p_details jsonb default '{}'::jsonb
)
returns setof public.growth_execution_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job public.growth_execution_jobs%rowtype;
  integration_record public.growth_integrations%rowtype;
begin
  if nullif(btrim(p_worker_id), '') is null or p_lease_token is null then
    raise exception using errcode = '22023', message = 'invalid_growth_execution_owner';
  end if;

  if p_status is null or p_status not in ('succeeded', 'failed', 'unknown') then
    raise exception using errcode = '22023', message = 'invalid_growth_execution_terminal_status';
  end if;

  if p_details is null or jsonb_typeof(p_details) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_growth_execution_details';
  end if;

  if p_external_url is not null and p_external_url !~ '^https://' then
    raise exception using errcode = '22023', message = 'invalid_growth_execution_external_url';
  end if;

  if p_status <> 'succeeded' and nullif(btrim(p_error), '') is null then
    raise exception using errcode = '22023', message = 'growth_execution_failure_requires_error';
  end if;

  select job.*
  into current_job
  from public.growth_execution_jobs as job
  where job.id = p_job_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'growth_execution_job_not_found';
  end if;

  if current_job.status <> 'running'
     or current_job.lease_owner <> btrim(p_worker_id)
     or current_job.lease_token <> p_lease_token then
    raise exception using errcode = '55000', message = 'growth_execution_lease_lost';
  end if;

  if p_status = 'succeeded'
     and current_job.provider = 'github'
     and nullif(btrim(p_external_id), '') is null
     and nullif(btrim(p_external_url), '') is null then
    raise exception using errcode = '22023', message = 'github_execution_requires_external_reference';
  end if;

  update public.growth_execution_jobs as job
  set status = p_status,
      external_id = coalesce(nullif(btrim(p_external_id), ''), job.external_id),
      external_url = coalesce(nullif(btrim(p_external_url), ''), job.external_url),
      error = case when p_status = 'succeeded' then null else btrim(p_error) end,
      details = job.details || p_details,
      completed_at = now(),
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      last_heartbeat_at = now()
  where job.id = current_job.id
  returning job.* into current_job;

  if p_status = 'succeeded' then
    update public.growth_actions as action
    set status = 'executed',
        executed_at = now()
    where action.id = current_job.action_id
      and action.status = 'executing';
  else
    update public.growth_actions as action
    set status = 'failed'
    where action.id = current_job.action_id
      and action.status in ('approved', 'executing');
  end if;

  select integration.*
  into integration_record
  from public.growth_integrations as integration
  where integration.provider = current_job.provider
  for update;

  if found and current_job.provider_mode = 'canary' then
    update public.growth_integrations as integration
    set mode = 'paused',
        status = case when p_status = 'succeeded' then 'ready' else 'error' end,
        canary_succeeded_count = integration.canary_succeeded_count
          + case when p_status = 'succeeded' then 1 else 0 end,
        paused_at = now(),
        last_error = case when p_status = 'succeeded' then null else btrim(p_error) end
    where integration.provider = current_job.provider;
  elsif found and p_status <> 'succeeded' then
    update public.growth_integrations as integration
    set mode = 'paused',
        status = 'error',
        paused_at = now(),
        last_error = btrim(p_error)
    where integration.provider = current_job.provider;
  end if;

  insert into public.growth_audit_log (action_id, approval_id, event_type, actor, details)
  values (
    current_job.action_id,
    current_job.approval_id,
    'execution_' || current_job.status,
    btrim(p_worker_id),
    jsonb_build_object(
      'job_id', current_job.id,
      'provider', current_job.provider,
      'attempts', current_job.attempts,
      'external_id', current_job.external_id,
      'external_url', current_job.external_url,
      'error', current_job.error
    )
  );

  return next current_job;
  return;
end;
$$;

create or replace function public.retry_growth_execution_job(
  p_job_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_error text,
  p_retry_delay_seconds integer default 60,
  p_details jsonb default '{}'::jsonb
)
returns setof public.growth_execution_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job public.growth_execution_jobs%rowtype;
  terminal_failure boolean;
begin
  if nullif(btrim(p_worker_id), '') is null
     or p_lease_token is null
     or nullif(btrim(p_error), '') is null then
    raise exception using errcode = '22023', message = 'invalid_growth_execution_retry';
  end if;

  if p_retry_delay_seconds is null or p_retry_delay_seconds not between 0 and 86400 then
    raise exception using errcode = '22023', message = 'invalid_growth_execution_retry_delay';
  end if;

  if p_details is null or jsonb_typeof(p_details) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_growth_execution_details';
  end if;

  select job.*
  into current_job
  from public.growth_execution_jobs as job
  where job.id = p_job_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'growth_execution_job_not_found';
  end if;

  if current_job.status <> 'running'
     or current_job.lease_owner <> btrim(p_worker_id)
     or current_job.lease_token <> p_lease_token then
    raise exception using errcode = '55000', message = 'growth_execution_lease_lost';
  end if;

  terminal_failure := current_job.attempts >= current_job.max_attempts;

  update public.growth_execution_jobs as job
  set status = case when terminal_failure then 'failed' else 'queued' end,
      available_at = case
        when terminal_failure then job.available_at
        else now() + pg_catalog.make_interval(secs => p_retry_delay_seconds)
      end,
      error = btrim(p_error),
      details = job.details || p_details,
      completed_at = case when terminal_failure then now() else null end,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      last_heartbeat_at = now()
  where job.id = current_job.id
  returning job.* into current_job;

  if terminal_failure then
    update public.growth_actions as action
    set status = 'failed'
    where action.id = current_job.action_id
      and action.status in ('approved', 'executing');

    update public.growth_integrations as integration
    set mode = 'paused',
        status = 'error',
        paused_at = now(),
        last_error = btrim(p_error)
    where integration.provider = current_job.provider;
  end if;

  insert into public.growth_audit_log (action_id, approval_id, event_type, actor, details)
  values (
    current_job.action_id,
    current_job.approval_id,
    case when terminal_failure then 'execution_failed' else 'execution_retry_scheduled' end,
    btrim(p_worker_id),
    jsonb_build_object(
      'job_id', current_job.id,
      'provider', current_job.provider,
      'attempts', current_job.attempts,
      'max_attempts', current_job.max_attempts,
      'available_at', current_job.available_at,
      'error', current_job.error
    )
  );

  return next current_job;
  return;
end;
$$;

create or replace function public.record_growth_manual_outcome(
  p_action_id uuid,
  p_event_type text,
  p_note text default null,
  p_idempotency_key text default null
)
returns table (
  event_id uuid,
  action_id uuid,
  event_type text,
  action_status text,
  occurred_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_action public.growth_actions%rowtype;
  outcome_record public.growth_outcome_events%rowtype;
  canonical_event_type text;
  clean_note text;
  clean_idempotency_key text;
begin
  canonical_event_type := case p_event_type
    when 'sent' then 'email_sent'
    when 'reply' then 'reply'
    when 'positive' then 'positive_reply'
    when 'negative' then 'negative_reply'
    else null
  end;

  if canonical_event_type is null then
    raise exception using
      errcode = '22023',
      message = 'invalid_growth_manual_outcome',
      hint = 'event_type must be sent, reply, positive, or negative';
  end if;

  clean_note := nullif(btrim(p_note), '');
  if clean_note is not null and length(clean_note) > 2000 then
    raise exception using errcode = '22023', message = 'growth_manual_outcome_note_too_long';
  end if;

  clean_idempotency_key := nullif(btrim(p_idempotency_key), '');
  if clean_idempotency_key is not null and length(clean_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'growth_manual_outcome_idempotency_key_too_long';
  end if;

  select action.*
  into current_action
  from public.growth_actions as action
  where action.id = p_action_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'growth_action_not_found';
  end if;

  if current_action.type <> 'email' then
    raise exception using errcode = '22023', message = 'growth_manual_outcome_requires_email_action';
  end if;

  if clean_idempotency_key is not null then
    select outcome.*
    into outcome_record
    from public.growth_outcome_events as outcome
    where outcome.source = 'manual_ceo'
      and outcome.external_event_id = clean_idempotency_key;

    if found then
      if outcome_record.action_id <> p_action_id
         or outcome_record.event_type <> canonical_event_type then
        raise exception using errcode = '40001', message = 'growth_manual_outcome_idempotency_conflict';
      end if;

      return query
      select
        outcome_record.id,
        outcome_record.action_id,
        outcome_record.event_type,
        current_action.status,
        outcome_record.occurred_at;
      return;
    end if;
  end if;

  select outcome.*
  into outcome_record
  from public.growth_outcome_events as outcome
  where outcome.action_id = p_action_id
    and outcome.source = 'manual_ceo'
    and outcome.event_type = canonical_event_type;

  if found then
    return query
    select
      outcome_record.id,
      outcome_record.action_id,
      outcome_record.event_type,
      current_action.status,
      outcome_record.occurred_at;
    return;
  end if;

  if canonical_event_type = 'email_sent' then
    if current_action.status <> 'approved' then
      raise exception using
        errcode = '55000',
        message = 'growth_email_action_not_approved_for_sending';
    end if;

  elsif not exists (
    select 1
    from public.growth_outcome_events as sent
    where sent.action_id = p_action_id
      and sent.source = 'manual_ceo'
      and sent.event_type = 'email_sent'
  ) then
    raise exception using
      errcode = '55000',
      message = 'growth_email_reply_requires_sent_outcome';
  end if;

  if canonical_event_type <> 'email_sent'
     and current_action.status not in ('executed', 'observed', 'evaluated') then
    raise exception using
      errcode = '55000',
      message = 'growth_email_action_not_ready_for_feedback';
  end if;

  insert into public.growth_outcome_events (
    action_id,
    experiment_id,
    contact_id,
    run_id,
    event_type,
    source,
    external_event_id,
    campaign_key,
    attribution_confidence,
    metadata
  )
  values (
    current_action.id,
    current_action.experiment_id,
    current_action.contact_id,
    current_action.run_id,
    canonical_event_type,
    'manual_ceo',
    clean_idempotency_key,
    current_action.attribution_key,
    'manual',
    jsonb_strip_nulls(jsonb_build_object(
      'note', clean_note,
      'input_event_type', p_event_type
    ))
  )
  returning * into outcome_record;

  if canonical_event_type = 'email_sent' then
    update public.growth_actions as action
    set status = 'executed',
        executed_at = now()
    where action.id = current_action.id
    returning action.* into current_action;
  elsif canonical_event_type = 'reply' and current_action.status = 'executed' then
    update public.growth_actions as action
    set status = 'observed',
        observed_at = now()
    where action.id = current_action.id
    returning action.* into current_action;
  elsif canonical_event_type in ('positive_reply', 'negative_reply') then
    if current_action.status = 'executed' then
      update public.growth_actions as action
      set status = 'observed',
          observed_at = now()
      where action.id = current_action.id
      returning action.* into current_action;
    end if;

    if current_action.status = 'observed' then
      update public.growth_actions as action
      set status = 'evaluated',
          evaluated_at = now()
      where action.id = current_action.id
      returning action.* into current_action;
    end if;
  end if;

  insert into public.growth_audit_log (action_id, run_id, event_type, actor, details)
  values (
    current_action.id,
    current_action.run_id,
    'manual_outcome_recorded',
    'ceo',
    jsonb_build_object(
      'outcome_id', outcome_record.id,
      'event_type', outcome_record.event_type,
      'action_status', current_action.status
    )
  );

  return query
  select
    outcome_record.id,
    outcome_record.action_id,
    outcome_record.event_type,
    current_action.status,
    outcome_record.occurred_at;
end;
$$;

alter table public.growth_integrations enable row level security;
alter table public.growth_integrations force row level security;
alter table public.growth_execution_jobs enable row level security;
alter table public.growth_execution_jobs force row level security;

revoke all on table public.growth_integrations from public, anon, authenticated;
revoke all on table public.growth_execution_jobs from public, anon, authenticated;

grant select on table public.growth_integrations to service_role;
grant select on table public.growth_execution_jobs to service_role;

revoke all on function public.growth_enforce_email_draft_daily_limit() from public, anon, authenticated;
revoke all on function public.growth_audit_integration_change() from public, anon, authenticated;
revoke all on function public.growth_guard_integration_mutation() from public, anon, authenticated;
revoke all on function public.enable_growth_integration(text, text) from public, anon, authenticated;
revoke all on function public.save_growth_integration(text, text, text, text, integer, jsonb, jsonb, timestamptz, text) from public, anon, authenticated;
revoke all on function public.remove_growth_integration(text) from public, anon, authenticated;
revoke all on function public.decide_growth_action_v2(uuid, bigint, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.claim_growth_execution_job(text, integer) from public, anon, authenticated;
revoke all on function public.heartbeat_growth_execution_job(uuid, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.complete_growth_execution_job(uuid, text, uuid, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.retry_growth_execution_job(uuid, text, uuid, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.record_growth_manual_outcome(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.enable_growth_integration(text, text) to service_role;
grant execute on function public.save_growth_integration(text, text, text, text, integer, jsonb, jsonb, timestamptz, text) to service_role;
grant execute on function public.remove_growth_integration(text) to service_role;
grant execute on function public.decide_growth_action_v2(uuid, bigint, text, text, jsonb, text) to service_role;
grant execute on function public.claim_growth_execution_job(text, integer) to service_role;
grant execute on function public.heartbeat_growth_execution_job(uuid, text, uuid, integer) to service_role;
grant execute on function public.complete_growth_execution_job(uuid, text, uuid, text, text, text, text, jsonb) to service_role;
grant execute on function public.retry_growth_execution_job(uuid, text, uuid, text, integer, jsonb) to service_role;
grant execute on function public.record_growth_manual_outcome(uuid, text, text, text) to service_role;

comment on table public.growth_integrations is
  'Service-role-only provider configuration. Credential fields contain application-encrypted AES-GCM material, never plaintext.';
comment on table public.growth_execution_jobs is
  'Durable approval-bound executor queue. Workers must claim a lease and never scan approvals directly.';
comment on function public.decide_growth_action_v2(uuid, bigint, text, text, jsonb, text) is
  'Atomically records the CEO decision and, only for a newly approved site_pr in live/canary mode, creates one durable execution job.';
comment on function public.remove_growth_integration(text) is
  'Deletes encrypted credentials safely: queued jobs are cancelled, while an in-flight running job blocks removal.';
comment on function public.save_growth_integration(text, text, text, text, integer, jsonb, jsonb, timestamptz, text) is
  'Stores application-encrypted credentials without exposing them or resetting provider mode and canary history; active jobs block rotation.';
comment on function public.record_growth_manual_outcome(uuid, text, text, text) is
  'Records idempotent CEO-reported email outcomes. Reply outcomes remain valid after approval expiry.';

commit;
