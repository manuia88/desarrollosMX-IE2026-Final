-- FASE 09 / D8 + D11 — score_weights runtime config + cascade trigger N1↔N0.
--
-- D8 score_weights: tabla persistente de weights por (score_id, dimension, country).
--   Cada N1 calculator lee weights vía runtime cache (1h). Admin puede actualizar
--   weights sin redeploy vía POST /api/admin/scores/weights (superadmin).
--
-- D11 cascade N1↔N0: trigger AFTER INSERT OR UPDATE en zone_scores/project_scores/
--   user_scores dispara fn_cascade_score_updated que enqueue downstream scores
--   dependientes según mapping directo del catálogo 03.8.

-- ============================================================
-- score_weights — config runtime weights por dimension
-- ============================================================
create table if not exists public.score_weights (
  id uuid primary key default gen_random_uuid(),
  score_id text not null,
  dimension_score_id text not null,
  weight numeric(6, 4) not null check (weight >= 0 and weight <= 1),
  country_code char(2) not null references public.countries(code),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (score_id, dimension_score_id, country_code, valid_from)
);

create index if not exists idx_score_weights_lookup
  on public.score_weights (score_id, country_code, valid_from desc);

alter table public.score_weights enable row level security;

create policy score_weights_select_authenticated on public.score_weights
  for select to authenticated using (true);

create policy score_weights_service_all on public.score_weights
  for all to service_role using (true) with check (true);

comment on table public.score_weights is
  'D8 FASE 09 — weights runtime para N1 calculators. Lookup por (score_id, country_code). '
  'valid_until NULL = activo. Admin superadmin actualiza vía POST /api/admin/scores/weights.';

-- ============================================================
-- Seed weights defaults desde catálogo 03.8 §Nivel 1 fórmulas
-- ============================================================
insert into public.score_weights (score_id, dimension_score_id, weight, country_code) values
  -- F08 LQI: 9.A.1.1 fórmula exacta
  ('F08', 'F01', 0.20, 'MX'),
  ('F08', 'F02', 0.15, 'MX'),
  ('F08', 'F03', 0.15, 'MX'),
  ('F08', 'H01', 0.10, 'MX'),
  ('F08', 'H02', 0.10, 'MX'),
  ('F08', 'N08', 0.10, 'MX'),
  ('F08', 'N01', 0.10, 'MX'),
  ('F08', 'N04', 0.05, 'MX'),
  ('F08', 'H07', 0.05, 'MX'),
  -- F12 Risk Map: 9.A.2.1 componentes
  ('F12', 'H03', 0.30, 'MX'),
  ('F12', 'N07', 0.20, 'MX'),
  ('F12', 'F01', 0.20, 'MX'),
  ('F12', 'F06', 0.15, 'MX'),
  ('F12', 'N05', 0.15, 'MX'),
  -- H07 Environmental: 9.A.3.1 H1 solo air
  ('H07', 'F04', 1.00, 'MX'),
  -- A06 Neighborhood: 9.B.3.1 buyer-adapted defaults
  ('A06', 'F08', 0.30, 'MX'),
  ('A06', 'H01', 0.20, 'MX'),
  ('A06', 'H02', 0.15, 'MX'),
  ('A06', 'N08', 0.20, 'MX'),
  ('A06', 'N10', 0.15, 'MX'),
  -- B07 Competitive Intel: 9.C.4.1 8 dims
  ('B07', 'precio_m2', 0.15, 'MX'),
  ('B07', 'amenidades', 0.10, 'MX'),
  ('B07', 'tamano', 0.10, 'MX'),
  ('B07', 'absorcion', 0.15, 'MX'),
  ('B07', 'marketing_spend', 0.10, 'MX'),
  ('B07', 'dom', 0.10, 'MX'),
  ('B07', 'quality', 0.15, 'MX'),
  ('B07', 'momentum', 0.15, 'MX'),
  -- B08 Absorption: 9.C.5.1 adjustments
  ('B08', 'N11', 0.30, 'MX'),
  ('B08', 'B01', 0.25, 'MX'),
  ('B08', 'B04', 0.25, 'MX'),
  ('B08', 'macro_tiie', 0.20, 'MX'),
  -- D05 Gentrification macro: 9.C.6.1
  ('D05', 'N03', 0.50, 'MX'),
  ('D05', 'N01', 0.25, 'MX'),
  ('D05', 'A04', 0.25, 'MX'),
  -- D06 Affordability Crisis: 9.C.7.1
  ('D06', 'A01', 0.50, 'MX'),
  ('D06', 'sobrecosto_vivienda', 0.30, 'MX'),
  ('D06', 'salario_gap', 0.20, 'MX'),
  -- H05 Trust Score: 9.A.4.1
  ('H05', 'reviews_avg', 0.40, 'MX'),
  ('H05', 'cumplimiento', 0.30, 'MX'),
  ('H05', 'volumen_ops_3y', 0.30, 'MX'),
  -- B01 Demand Heatmap: 9.C.1.2 weighted intention
  ('B01', 'wishlist_count', 0.50, 'MX'),
  ('B01', 'searches_count', 0.30, 'MX'),
  ('B01', 'views_count', 0.20, 'MX')
on conflict (score_id, dimension_score_id, country_code, valid_from) do nothing;

-- ============================================================
-- D11 — fn_cascade_score_updated: lookup downstream N1 per source score
-- ============================================================
create or replace function public.fn_cascade_score_updated(
  p_source_score_id text,
  p_entity_type text,
  p_entity_id uuid,
  p_country char(2)
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_downstream text[];
  v_score text;
  v_enqueued int := 0;
  v_result jsonb;
  v_target_entity text;
begin
  v_downstream := case p_source_score_id
    -- N0 → N1 direct dependencies
    when 'F01' then array['F08','F12']
    when 'F02' then array['F08']
    when 'F03' then array['F08','A06']
    when 'F04' then array['F08','H07']
    when 'F05' then array['F12']
    when 'F06' then array['F12']
    when 'F07' then array['A05']
    when 'H01' then array['F08','A06']
    when 'H02' then array['F08','A06']
    when 'H03' then array['F12']
    when 'H04' then array['A02']
    when 'H10' then array['F12']
    when 'H11' then array['A02','A05']
    when 'N01' then array['A06','D05','F08']
    when 'N03' then array['D05']
    when 'N04' then array['F08']
    when 'N05' then array['F12']
    when 'N07' then array['F12']
    when 'N08' then array['F08','A06']
    when 'N10' then array['A06']
    when 'N11' then array['A02','B08']
    when 'A01' then array['A02','A05','D06']
    when 'A04' then array['D05']
    when 'B12' then array['B02']
    -- N1 → N1 direct dependencies
    when 'F08' then array['A06']
    when 'H07' then array['F08']
    when 'H14' then array['H05']
    when 'B01' then array['B08']
    when 'B04' then array['B08']
    else array[]::text[]
  end;

  if array_length(v_downstream, 1) is null then
    return 0;
  end if;

  foreach v_score in array v_downstream loop
    -- Target entity defaults zone. Excepciones: H14 user-scoped, A12 project-scoped.
    v_target_entity := case v_score
      when 'H14' then 'user'
      when 'A12' then 'project'
      else 'zone'
    end;

    -- Cross-entity cascades (ej. user-scoped H14 → zone-scoped H05) skip: solo
    -- cascadea si entity_type coincide con target. Worker secundario consolida.
    if v_target_entity <> p_entity_type then
      continue;
    end if;

    v_result := public.enqueue_score_recalc(
      v_score, v_target_entity, p_entity_id, p_country,
      'cascade:score_updated:' || p_source_score_id, 6, true, null
    );
    if (v_result ->> 'enqueued')::boolean then
      v_enqueued := v_enqueued + 1;
    end if;
  end loop;

  return v_enqueued;
end;
$$;

comment on function public.fn_cascade_score_updated is
  'D11 FASE 09 — enqueue downstream N1 scores al cambio de score N0/N1. '
  'Mapping directo del catálogo 03.8 §Nivel 1 dependencies. Priority 6 batch_mode.';

grant execute on function public.fn_cascade_score_updated to service_role;

-- ============================================================
-- fn_trg_score_changed — trigger body para zone/project/user_scores
-- ============================================================
create or replace function public.fn_trg_zone_scores_cascade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select distinct score_type, zone_id, country_code
    from new_rows
  loop
    perform public.fn_cascade_score_updated(r.score_type, 'zone', r.zone_id, r.country_code);
  end loop;
  return null;
end;
$$;

create or replace function public.fn_trg_project_scores_cascade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select distinct score_type, project_id, country_code
    from new_rows
  loop
    perform public.fn_cascade_score_updated(r.score_type, 'project', r.project_id, r.country_code);
  end loop;
  return null;
end;
$$;

create or replace function public.fn_trg_user_scores_cascade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select distinct score_type, user_id, country_code
    from new_rows
  loop
    perform public.fn_cascade_score_updated(r.score_type, 'user', r.user_id, r.country_code);
  end loop;
  return null;
end;
$$;

-- Postgres restringe transition tables a UN event por trigger. Split INSERT/UPDATE.

drop trigger if exists trg_zone_scores_cascade on public.zone_scores;
drop trigger if exists trg_zone_scores_cascade_ins on public.zone_scores;
drop trigger if exists trg_zone_scores_cascade_upd on public.zone_scores;
create trigger trg_zone_scores_cascade_ins
  after insert on public.zone_scores
  referencing new table as new_rows
  for each statement
  execute function public.fn_trg_zone_scores_cascade();
create trigger trg_zone_scores_cascade_upd
  after update on public.zone_scores
  referencing new table as new_rows
  for each statement
  execute function public.fn_trg_zone_scores_cascade();

drop trigger if exists trg_project_scores_cascade on public.project_scores;
drop trigger if exists trg_project_scores_cascade_ins on public.project_scores;
drop trigger if exists trg_project_scores_cascade_upd on public.project_scores;
create trigger trg_project_scores_cascade_ins
  after insert on public.project_scores
  referencing new table as new_rows
  for each statement
  execute function public.fn_trg_project_scores_cascade();
create trigger trg_project_scores_cascade_upd
  after update on public.project_scores
  referencing new table as new_rows
  for each statement
  execute function public.fn_trg_project_scores_cascade();

drop trigger if exists trg_user_scores_cascade on public.user_scores;
drop trigger if exists trg_user_scores_cascade_ins on public.user_scores;
drop trigger if exists trg_user_scores_cascade_upd on public.user_scores;
create trigger trg_user_scores_cascade_ins
  after insert on public.user_scores
  referencing new table as new_rows
  for each statement
  execute function public.fn_trg_user_scores_cascade();
create trigger trg_user_scores_cascade_upd
  after update on public.user_scores
  referencing new table as new_rows
  for each statement
  execute function public.fn_trg_user_scores_cascade();

comment on trigger trg_zone_scores_cascade_ins on public.zone_scores is
  'D11 FASE 09 — Cascade N0/N1 → downstream N1 on INSERT. STATEMENT-level.';
comment on trigger trg_zone_scores_cascade_upd on public.zone_scores is
  'D11 FASE 09 — Cascade N0/N1 → downstream N1 on UPDATE. STATEMENT-level.';

-- ============================================================
-- audit_rls_allowlist v9 — extend con 4 nuevos SECDEF N1 cascade
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
      'fn_cascade_geo_data_updated',
      'fn_trg_geo_data_points_cascade',
      'fn_cascade_macro_updated',
      'fn_trg_macro_series_cascade',
      -- FASE 09 D11: cascade N1↔N0 triggers SECDEF. Invocadas solo desde
      -- triggers BD STATEMENT-level (AFTER INS/UPD zone/project/user_scores).
      'fn_cascade_score_updated',
      'fn_trg_zone_scores_cascade',
      'fn_trg_project_scores_cascade',
      'fn_trg_user_scores_cascade'
    )
    and not exists (
      select 1 from pg_catalog.pg_depend d where d.objid = p.oid and d.deptype = 'e'
    );
end;
$$;

revoke all on function public.audit_rls_violations() from public;
grant execute on function public.audit_rls_violations() to authenticated, service_role;

comment on function public.audit_rls_violations() is
  'v9 — FASE 09 D8+D11: allowlist 4 SECDEF nuevos cascade N1↔N0 triggers.';
