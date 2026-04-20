-- audit_rls_allowlist v7 — cierre BLOQUE 8.A (FASE 08 IE)
-- Agrega allowlist para:
--   1) 7 policies `using (true)` del schema IE (zone_scores / project_scores /
--      user_scores / score_history / score_recalculation_queue). Las `*_service`
--      están restringidas `to service_role` (bypass RLS natural); las
--      `*_select_internal` exponen scores no-sensibles a authenticated por
--      diseño (marketplace interno).
--   2) 5 funciones SECDEF del pipeline IE que son invocadas exclusivamente
--      desde service_role (worker cron, triggers BD, runScore server-side):
--        - enqueue_score_recalc
--        - claim_pending_score_jobs
--        - finalize_score_job
--        - queue_metrics_summary
--        - archive_score_before_update (trigger, no entry point externo)

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
      'zone_scores_service',
      'zone_scores_select_internal',
      'project_scores_service',
      'project_scores_select_internal',
      'user_scores_service',
      'score_history_service_all',
      'queue_service_all'
    ]),
    unnest(array[
      'zone_scores', 'zone_scores',
      'project_scores', 'project_scores',
      'user_scores',
      'score_history',
      'score_recalculation_queue'
    ]),
    unnest(array[
      'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); qual=true es convención',
      'intentional_public: scores IE de zona agregados no-sensibles expuestos a authenticated por diseño (FASE 08 §8.A.3 + ADR-010 §D9)',
      'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); qual=true es convención',
      'intentional_public: scores IE de proyecto agregados públicos por diseño (FASE 08 §8.A.3 + G01 Full Score 2.0 público)',
      'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); qual=true es convención',
      'intentional_public: policy FOR ALL TO service_role (bypass RLS); historial append-only con RLS no-DELETE adicional',
      'intentional_public: policy FOR ALL TO service_role (bypass RLS natural); queue IE exclusiva del worker'
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
-- 2) Reemplaza audit_rls_violations() v6 con v7 que extiende la
--    allowlist de funciones SECDEF con los 5 helpers IE.
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
      'record_extension_capture',
      -- FASE 08 BLOQUE 8.A: pipeline IE. GRANT EXECUTE solo a service_role.
      -- Invocados desde worker cron (/api/cron/score-worker) y triggers BD.
      'enqueue_score_recalc',
      'claim_pending_score_jobs',
      'finalize_score_job',
      'queue_metrics_summary',
      'archive_score_before_update'
    )
    and not exists (
      select 1 from pg_catalog.pg_depend d where d.objid = p.oid and d.deptype = 'e'
    );
end;
$$;

revoke all on function public.audit_rls_violations() from public;
grant execute on function public.audit_rls_violations() to authenticated, service_role;

comment on function public.audit_rls_violations() is
  'v7 — FASE 08 BLOQUE 8.A: allowlist 7 policies IE (service_role + agregados '
  'internal-visible) + 5 SECDEF del pipeline IE (queue RPCs + trigger archive).';
