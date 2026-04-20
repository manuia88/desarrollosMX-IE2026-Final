-- audit_rls_allowlist v8 — cierre FASE 08 BLOQUE 8.F.
-- Agrega allowlist para:
--   1) 4 policies `using (true)` nuevas de BLOQUE 8.F:
--        - tier_requirements_select_all (descriptores públicos del producto)
--        - tier_requirements_service_write (service_role bypass)
--        - market_anomalies_service_all (service_role bypass queue writer)
--        - cascade_replay_log_service_all (service_role bypass audit writer)
--   2) 4 funciones SECDEF del BLOQUE 8.F.8 cascadas triggers (invocadas solo
--      desde triggers BD STATEMENT-level, no entry points externos):
--        - fn_cascade_geo_data_updated (helper enqueue per source)
--        - fn_trg_geo_data_points_cascade (trigger body)
--        - fn_cascade_macro_updated (helper enqueue all zones)
--        - fn_trg_macro_series_cascade (trigger body)

-- ============================================================
-- 1) COMMENT ON POLICY → marker intentional_public.
-- ============================================================
do $$
declare
  pol_name text;
  tbl_name text;
  pol_oid oid;
  rationale text;
begin
  for pol_name, tbl_name, rationale in
    select unnest(array[
      'tier_requirements_select_all',
      'tier_requirements_service_write',
      'market_anomalies_service_all',
      'cascade_replay_log_service_all'
    ]),
    unnest(array[
      'tier_requirements',
      'tier_requirements',
      'market_anomalies',
      'cascade_replay_log'
    ]),
    unnest(array[
      'intentional_public: umbrales tier son descriptores de producto (FASE 08 §8.F.1) — pública authenticated SELECT',
      'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); qual=true convención',
      'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); writer anomaly detector',
      'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); writer cascade replay audit'
    ])
  loop
    select pol.oid into pol_oid
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = tbl_name and pol.polname = pol_name;

    if pol_oid is not null then
      execute format('comment on policy %I on public.%I is %L',
        pol_name, tbl_name, rationale);
    end if;
  end loop;
end
$$;

-- ============================================================
-- 2) Reemplaza audit_rls_violations() v7 con v8 que extiende la
--    allowlist de funciones SECDEF con los 4 helpers cascadas IE.
-- ============================================================
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
      'run_scheduled_deletions', 'mfa_reminders_tick',
      'increment_api_budget_spend',
      'reset_api_budgets_monthly',
      'recompute_zone_tier',
      'recompute_zone_tiers',
      'recompute_all_zone_tiers',
      'confidence_level_for',
      'verify_extension_api_key',
      'record_extension_capture',
      'enqueue_score_recalc',
      'claim_pending_score_jobs',
      'finalize_score_job',
      'queue_metrics_summary',
      'archive_score_before_update',
      -- FASE 08 BLOQUE 8.F.8: cascadas triggers SECDEF. Invocadas solo desde
      -- triggers BD STATEMENT-level (AFTER INSERT geo_data_points / macro_series).
      -- No tienen entry point externo ni callable desde cliente.
      'fn_cascade_geo_data_updated',
      'fn_trg_geo_data_points_cascade',
      'fn_cascade_macro_updated',
      'fn_trg_macro_series_cascade'
    )
    and not exists (
      select 1 from pg_catalog.pg_depend d where d.objid = p.oid and d.deptype = 'e'
    );
end;
$$;

revoke all on function public.audit_rls_violations() from public;
grant execute on function public.audit_rls_violations() to authenticated, service_role;

comment on function public.audit_rls_violations() is
  'v8 — FASE 08 BLOQUE 8.F cierre: allowlist 4 policies nuevas IE (tier_requirements, '
  'market_anomalies, cascade_replay_log) + 4 SECDEF del BLOQUE 8.F.8 cascadas triggers.';
