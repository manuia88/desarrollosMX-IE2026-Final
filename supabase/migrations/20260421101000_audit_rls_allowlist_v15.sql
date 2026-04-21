-- audit_rls_allowlist v15 — FASE 11 XL.
--
-- Bump de versión para absorber las 21 tablas nuevas del schema XL de
-- índices DMX + moonshots (migration 20260421100000). No cambia la forma
-- de la función — todas las policies con `qual=true` intentional llevan
-- comment 'RATIONALE intentional_public:' inline y el allowlist v14
-- ya maneja esa heurística automáticamente.
--
-- Tablas nuevas cubiertas (21):
--   dmx_indices (public_read_closed NO es qual=true, no requiere allowlist)
--   dmx_indices_audit_log (service_role only, no public policy)
--   dmx_indices_methodology_versions (public read qual=true — marcado intentional)
--   zone_migration_flows (public_read_closed — no es qual=true puro)
--   zone_pulse_scores (public_read_closed — no es qual=true puro)
--   zone_alpha_alerts (authenticated only)
--   influencer_heat_zones (service_role only)
--   colonia_dna_vectors (public read qual=true — marcado intentional)
--   zone_constellations_edges (public read qual=true — marcado intentional)
--   colonia_wiki_entries (public read con filter reviewed+published)
--   zone_alert_subscriptions (owner-based, no public)
--   causal_explanations (public read qual=true — marcado intentional)
--   climate_twin_projections (public read qual=true — marcado intentional)
--   lifepath_user_profiles (owner-based, no public)
--   widget_embed_registry (public read con filter active)
--   sticker_templates (public read qual=true — marcado intentional)
--   ghost_zones_ranking (authenticated only)
--   scorecard_national_reports (public read con filter published_at)
--   futures_curve_projections (public read qual=true — marcado intentional)
--   dna_migration_matches (public read qual=true — marcado intentional)
--   historical_forensics_reports (public read qual=true — marcado intentional)
--
-- No hay nuevas SECDEF functions en esta FASE 11 XL schema; todos los
-- calculators se ejecutan como service_role via tRPC backend (N0 path).
-- La allowlist SECDEF queda idéntica a v14.

create or replace function public.audit_rls_violations()
returns table(category text, object_name text, detail text)
language plpgsql
security definer
set search_path = ''
as $function$
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
      'fn_cascade_geo_data_updated',
      'fn_trg_geo_data_points_cascade',
      'fn_cascade_macro_updated',
      'fn_trg_macro_series_cascade',
      'fn_cascade_score_updated',
      'fn_trg_zone_scores_cascade',
      'fn_trg_project_scores_cascade',
      'fn_trg_user_scores_cascade',
      'fn_emit_score_change_webhook',
      -- FASE 10 SESIÓN 2/3 L-69: MV refresh wrapper invocado vía cron admin.
      'exec_refresh_zone_demographics_cache',
      -- FASE 10 SESIÓN 3/3 D34: retention purge wrapper invocado vía cron admin.
      'purge_expired_score_history',
      -- FASE 10 SESIÓN 3/3 L-72: heatmap MV refresh wrapper invocado vía cron admin.
      'exec_refresh_heatmap_cache'
    )
    and not exists (
      select 1 from pg_catalog.pg_depend d where d.objid = p.oid and d.deptype = 'e'
    );
end;
$function$;

comment on function public.audit_rls_violations() is
  'v15 — FASE 11 XL: allowlist 21 new tables for indices + moonshots. '
  'Todas las policies públicas usan comment RATIONALE intentional_public; '
  'lista SECDEF sin cambios vs v14.';
