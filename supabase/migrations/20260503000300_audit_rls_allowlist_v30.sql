-- audit_rls_allowlist v30 — F1.C.A Climate Hybrid Fix
--
-- v30 amplía v29 con 1 SECDEF nueva F1.C.A:
--   - recompute_climate_aggregates_from_observations(uuid, date)
--
-- Razón excluida del SECDEF auth check:
--   Service-role-only orchestration RPC. Aggregates climate_source_observations
--   (RLS public read) en climate_monthly_aggregates (service-role write).
--   Callable solo por cron + backfill scripts con service_role key. Body NO
--   referencia auth.uid() porque gating sucede en API/cron layer (Bearer
--   CRON_SECRET pattern). search_path='' obligatorio.
--
-- 1:1 verification SECDEF↔allowlist (memoria audit_rls_strict_post_merge_gap):
--   Migration C añade exactamente 1 SECDEF nueva → v30 añade exactamente 1 entry.

create or replace function public.audit_rls_violations()
returns table(category text, object_name text, detail text)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- RLS_DISABLED: tablas sin row level security
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

  -- POLICY_QUAL_TRUE_UNJUSTIFIED: policies SELECT con qual=true sin justificación
  return query
  select 'POLICY_QUAL_TRUE_UNJUSTIFIED'::text,
    (pol_info.schemaname || '.' || pol_info.tablename || ' :: ' || pol_info.policyname)::text,
    coalesce(pol_info.qual::text, '(null)')::text
  from (
    select n.nspname as schemaname, c.relname as tablename, pol.polname as policyname,
      pol.polcmd as cmd, pol.oid as pol_oid,
      pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) as qual,
      (
        select array_agg(r.rolname::text order by r.rolname)
        from unnest(pol.polroles) as role_oid
        left join pg_catalog.pg_roles r on r.oid = role_oid
      ) as role_names
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  ) pol_info
  where pol_info.cmd <> 'a'
    and (pol_info.qual is null or pol_info.qual in ('true', 'TRUE', 't'))
    and coalesce(pol_info.role_names, ARRAY[]::text[]) <> ARRAY['service_role']::text[]
    and not exists (
      select 1 from pg_catalog.pg_description d
      where d.objoid = pol_info.pol_oid
        and (d.description ilike '%intentional_public%'
             or d.description ilike '%intentional_public_authed%')
    );

  -- SECDEF_NO_SEARCH_PATH: SECDEF sin SET search_path
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

  -- SECDEF_NO_AUTH_CHECK: SECDEF que no referencia auth/role checks
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
      'fn_cascade_geo_data_updated',
      'fn_trg_geo_data_points_cascade',
      'fn_cascade_macro_updated',
      'fn_trg_macro_series_cascade',
      'fn_cascade_score_updated',
      'fn_trg_zone_scores_cascade',
      'fn_trg_project_scores_cascade',
      'fn_trg_user_scores_cascade',
      'fn_emit_score_change_webhook',
      'exec_refresh_zone_demographics_cache',
      'purge_expired_score_history',
      'exec_refresh_heatmap_cache',
      'fn_enqueue_indices_for_zone',
      'fn_trg_zone_scores_cascade_indices',
      'fn_trg_project_scores_cascade_indices',
      'find_climate_twins',
      -- v28 additions FASE 07.7.A.4 CRM Foundation:
      'fn_crm_retention_cleanup',
      'trg_buyer_twins_recompute_embedding',
      'trg_buyer_twin_traits_cascade_embedding',
      -- v29 additions (3 SECDEF triggers olvidados en v28):
      'crm_handle_deal_stage_change',
      'crm_handle_operacion_insert',
      'trg_behavioral_signals_update_heartbeat',
      -- v30 additions F1.C.A Climate Hybrid Fix:
      -- recompute_climate_aggregates_from_observations: SECDEF service-role-only
      -- orchestration RPC. Aggregates climate_source_observations en
      -- climate_monthly_aggregates. search_path=''. No auth.uid() necesario porque
      -- callable solo via service role (cron + backfill scripts con CRON_SECRET).
      'recompute_climate_aggregates_from_observations'
    )
    and not exists (
      select 1 from pg_catalog.pg_depend d where d.objid = p.oid and d.deptype = 'e'
    );
end;
$function$;

comment on function public.audit_rls_violations() is
  'v30 — F1.C.A Climate Hybrid Fix. Amplía v29 con 1 SECDEF nueva: '
  'recompute_climate_aggregates_from_observations. Razón excluida: service-role-only '
  'orchestration RPC, aggregates climate_source_observations → climate_monthly_aggregates. '
  'search_path='''' obligatorio. Callable solo via service role (cron + backfill scripts).';
