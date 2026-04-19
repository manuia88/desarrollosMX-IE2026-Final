-- audit_rls_allowlist v6 — cierre FASE 07
-- Agrega allowlist para:
--   1) 9 policies SELECT públicas de tablas ingest (BLOQUE 7.A / 7.J / 7.K):
--      exponen agregados no-sensibles (macro_series, geo_snapshots,
--      search_trends, market_pulse, zone_price_index, zona_snapshots,
--      confidence_thresholds, zone_tiers, ingest_allowed_sources).
--   2) 8 funciones SECDEF utilitarias + cron/helpers que no necesitan
--      auth.uid() check porque se invocan únicamente desde service_role
--      (crons pg_cron o Vercel) o con auth verification previa en el caller:
--        - increment_api_budget_spend (cost-tracker)
--        - reset_api_budgets_monthly (cron nightly)
--        - recompute_zone_tier(s) / recompute_all_zone_tiers (cron nightly)
--        - confidence_level_for (pure helper, sin side effects)
--        - verify_extension_api_key (auth delegada al caller)
--        - record_extension_capture (auth delegada al caller + rate limit)

-- 1) COMMENT ON POLICY marca intentional_public en los 9 SELECT públicos.

do $$
declare
  pol_name text;
  tbl_name text;
  pol_oid oid;
begin
  for pol_name, tbl_name in
    select unnest(array[
      'geo_snapshots_select_public',
      'allowed_sources_select_public',
      'macro_series_select_public',
      'search_trends_select_public',
      'market_pulse_select_public',
      'zpi_select_public',
      'zs_select_public',
      'thresholds_select_public',
      'zone_tiers_select_public'
    ]),
    unnest(array[
      'geo_snapshots',
      'ingest_allowed_sources',
      'macro_series',
      'search_trends',
      'market_pulse',
      'zone_price_index',
      'zona_snapshots',
      'confidence_thresholds',
      'zone_tiers'
    ])
  loop
    select pol.oid into pol_oid
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = tbl_name and pol.polname = pol_name;

    if pol_oid is not null then
      execute format('comment on policy %I on public.%I is %L',
        pol_name, tbl_name,
        'intentional_public: agregado no-sensible expuesto a anon/authenticated por diseño (FASE 07 §7.A/J/K)');
    end if;
  end loop;
end
$$;

-- 2) Reemplaza audit_rls_violations() v5 con v6 que extiende la allowlist
--    de funciones SECDEF.

create or replace function public.audit_rls_violations()
returns table (category text, object_name text, detail text)
language plpgsql security definer set search_path = ''
as $$
begin
  return query
  select 'RLS_DISABLED'::text, (t.schemaname || '.' || t.tablename)::text, 'ALTER TABLE enable row level security is missing'::text
  from pg_catalog.pg_tables t
  where t.schemaname = 'public' and not t.rowsecurity
    and t.tablename not in ('part_config', 'part_config_sub')
    and t.tablename not like 'template\_%'
    and t.tablename not like '%\_p20%'
    and t.tablename not like '%\_default'
    and not exists (
      select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      join pg_catalog.pg_depend d on d.objid = c.oid and d.deptype = 'e'
      where c.relname = t.tablename and n.nspname = t.schemaname
    );

  return query
  select 'POLICY_QUAL_TRUE_UNJUSTIFIED'::text,
    (pol_info.schemaname || '.' || pol_info.tablename || ' :: ' || pol_info.policyname)::text,
    coalesce(pol_info.qual::text, '(null)')::text
  from (
    select n.nspname as schemaname, c.relname as tablename, pol.polname as policyname,
      pol.polcmd as cmd, pol.oid as pol_oid,
      pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) as qual
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  ) pol_info
  where pol_info.cmd <> 'a'
    and (pol_info.qual is null or pol_info.qual in ('true', 'TRUE', 't'))
    and not exists (
      select 1 from pg_catalog.pg_description d
      where d.objoid = pol_info.pol_oid
        and d.description ilike '%intentional_public%'
    );

  return query
  select 'SECDEF_NO_SEARCH_PATH'::text,
    (n.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')')::text,
    'missing SET search_path in proconfig'::text
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef and n.nspname = 'public'
    and (p.proconfig is null or not exists (
      select 1 from unnest(p.proconfig) c where c like 'search_path=%'
    ))
    and not exists (
      select 1 from pg_catalog.pg_depend d where d.objid = p.oid and d.deptype = 'e'
    );

  return query
  select 'SECDEF_NO_AUTH_CHECK'::text,
    (n.nspname || '.' || p.proname)::text,
    'function body does not reference auth.uid() / is_superadmin() / get_user_role() / jwt claims'::text
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef and n.nspname = 'public'
    and pg_catalog.pg_get_functiondef(p.oid) !~* '(auth\.uid|auth\.jwt|is_superadmin|get_user_role|check_rate_limit_db)'
    and p.proname not in (
      'set_updated_at', 'jsonb_diff', 'audit_row_change',
      'create_parent', 'run_maintenance', 'match_embeddings',
      'encrypt_secret', 'audit_rls_violations',
      'desarrolladoras_encrypt_tax', 'profiles_encrypt_pii',
      'register_view', 'verify_api_key',
      'handle_new_user', 'prevent_role_escalation',
      'check_rate_limit',
      -- Cron jobs ejecutados por service_role
      'run_scheduled_deletions', 'mfa_reminders_tick',
      -- FASE 07 cierre v6: cron/utils invocados solo desde service_role
      -- o con auth verificada en el caller aplicación/API.
      'increment_api_budget_spend',
      'reset_api_budgets_monthly',
      'recompute_zone_tier',
      'recompute_zone_tiers',
      'recompute_all_zone_tiers',
      'confidence_level_for',
      'verify_extension_api_key',
      'record_extension_capture'
    )
    and not exists (
      select 1 from pg_catalog.pg_depend d where d.objid = p.oid and d.deptype = 'e'
    );
end;
$$;

revoke all on function public.audit_rls_violations() from public;
grant execute on function public.audit_rls_violations() to authenticated, service_role;

comment on function public.audit_rls_violations() is
  'v6 — expande allowlist de SECDEF: cron jobs (budget reset, zone tier recompute) + utils sin side effects (confidence_level_for) + auth delegada al caller (verify_extension_api_key, record_extension_capture).';
