-- FASE 10 SESIÓN 2/3 — RPC para refresh zone_demographics_cache desde cron.
-- CONCURRENTLY requiere UNIQUE index (ya creado en migration 20260420120000).
-- SECURITY DEFINER para que el admin client pueda invocar sin ser postgres role.

create or replace function public.exec_refresh_zone_demographics_cache()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.zone_demographics_cache;
end;
$$;

revoke execute on function public.exec_refresh_zone_demographics_cache() from public;
grant execute on function public.exec_refresh_zone_demographics_cache() to service_role;

comment on function public.exec_refresh_zone_demographics_cache() is
  'L-69 FASE 10 SESIÓN 2/3 — refresh MV zone_demographics_cache via cron. '
  'Trigger body SECDEF, no entry point externo (cron admin client invoca).';
