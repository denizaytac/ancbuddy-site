-- Supabase may provision broad service_role table grants independently of the
-- application migrations. Keep durable executor state read-only over PostgREST;
-- all mutations must pass through the security-definer RPCs defined above.

begin;

revoke all on table public.growth_integrations from service_role;
revoke all on table public.growth_execution_jobs from service_role;

grant select on table public.growth_integrations to service_role;
grant select on table public.growth_execution_jobs to service_role;

commit;
