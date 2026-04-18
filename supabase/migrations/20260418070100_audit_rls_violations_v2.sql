-- audit_rls_violations() v2 — filtros corregidos + COMMENTs justificadores
-- FASE 06 / MÓDULO 6.A.1 (refinamiento)
-- Ref: docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.A.1
--
-- Cambios vs v1:
--  • Excluye pg_partman template/child partitions (inherit grants via REVOKE ALL en parent)
--  • Excluye tablas/funciones/views owned-by-extension (postgis, pg_partman)
--  • Solo flagea qual=true cuando la policy NO es FOR INSERT (INSERT usa with_check, no qual)
--  • Añade COMMENT ON POLICY "intentional_public: …" a las 3 policies ADR-approved:
--       - role_features.role_features_select_public
--       - fx_rates.fx_rates_select_authenticated
--       - tax_rules.tax_rules_select_authenticated
--  • Añade handle_new_user al allowlist (auth trigger; auth.users.id llega en NEW.id)

-- ============================================================
-- COMMENTs intencionales en policies existentes (ADR-009 D3)
-- ============================================================

comment on policy role_features_select_public on public.role_features is
  'intentional_public: catalogo de features por rol es información de producto, no PII. ADR-008.';

comment on policy fx_rates_select_authenticated on public.fx_rates is
  'intentional_public: tipos de cambio diarios son data de referencia, no confidencial. FASE 05.';

comment on policy tax_rules_select_authenticated on public.tax_rules is
  'intentional_public: reglas fiscales por país son públicas por diseño. FASE 05.';

-- ============================================================
-- audit_rls_violations() v2
-- ============================================================

create or replace function public.audit_rls_violations()
returns table (
  category text,
  object_name text,
  detail text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- (1) tablas sin RLS habilitado (excluye particiones y templates pg_partman,
  -- excluye tablas de extensiones vía pg_depend, excluye system/PostGIS).
  return query
  select
    'RLS_DISABLED'::text,
    (t.schemaname || '.' || t.tablename)::text,
    'ALTER TABLE enable row level security is missing'::text
  from pg_catalog.pg_tables t
  where t.schemaname = 'public'
    and not t.rowsecurity
    -- pg_partman artifacts
    and t.tablename not in ('part_config', 'part_config_sub')
    and t.tablename not like 'template\_%'
    and t.tablename not like '%\_p20%'       -- child partitions (e.g. audit_log_p20260401)
    and t.tablename not like '%\_default'    -- default partition (pg_partman v5)
    -- extensiones owned tables
    and not exists (
      select 1
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      join pg_catalog.pg_depend d on d.objid = c.oid and d.deptype = 'e'
      where c.relname = t.tablename and n.nspname = t.schemaname
    );

  -- (2) policies qual = true (o NULL) sin COMMENT 'intentional_public',
  -- SOLO para policies que aplican qual (no FOR INSERT puro).
  return query
  select
    'POLICY_QUAL_TRUE_UNJUSTIFIED'::text,
    (pol_info.schemaname || '.' || pol_info.tablename || ' :: ' || pol_info.policyname)::text,
    coalesce(pol_info.qual::text, '(null)')::text
  from (
    select
      n.nspname as schemaname,
      c.relname as tablename,
      pol.polname as policyname,
      pol.polcmd as cmd,                      -- 'r' select, 'a' insert, 'w' update, 'd' delete, '*' all
      pol.oid as pol_oid,
      pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) as qual
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  ) pol_info
  where pol_info.cmd <> 'a'                   -- excluir INSERT (qual no aplica)
    and (pol_info.qual is null or pol_info.qual in ('true', 'TRUE', 't'))
    and not exists (
      select 1
      from pg_catalog.pg_description d
      where d.objoid = pol_info.pol_oid
        and d.description ilike '%intentional_public%'
    );

  -- (3) SECURITY DEFINER sin SET search_path (excluye extension-owned)
  return query
  select
    'SECDEF_NO_SEARCH_PATH'::text,
    (n.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')')::text,
    'missing SET search_path in proconfig'::text
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef
    and n.nspname = 'public'
    and (p.proconfig is null or not exists (
      select 1 from unnest(p.proconfig) c where c like 'search_path=%'
    ))
    and not exists (
      select 1 from pg_catalog.pg_depend d
      where d.objid = p.oid and d.deptype = 'e'
    );

  -- (4) SECURITY DEFINER sin validar auth (excluye extensiones + allowlist explícita)
  return query
  select
    'SECDEF_NO_AUTH_CHECK'::text,
    (n.nspname || '.' || p.proname)::text,
    'function body does not reference auth.uid() / is_superadmin() / get_user_role() / jwt claims'::text
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where p.prosecdef
    and n.nspname = 'public'
    and pg_catalog.pg_get_functiondef(p.oid) !~* '(auth\.uid|auth\.jwt|is_superadmin|get_user_role|check_rate_limit_db)'
    and p.proname not in (
      -- Helpers puros / triggers internos que no exponen datos al caller final
      'set_updated_at',
      'jsonb_diff',
      'audit_row_change',
      'create_parent',
      'run_maintenance',
      'match_embeddings',
      'encrypt_secret',
      'audit_rls_violations',
      'desarrolladoras_encrypt_tax',
      'register_view',
      -- Auth trigger invocado por Supabase en INSERT en auth.users (NEW.id es el nuevo user)
      'handle_new_user',
      -- Trigger genérico de prevención; usa OLD/NEW.rol no auth.uid()
      'prevent_role_escalation'
    )
    and not exists (
      select 1 from pg_catalog.pg_depend d
      where d.objid = p.oid and d.deptype = 'e'
    );

  -- (5) VIEWs sin security_invoker=true (excluye extension-owned)
  return query
  select
    'VIEW_NO_SECURITY_INVOKER'::text,
    (n.nspname || '.' || c.relname)::text,
    coalesce(array_to_string(c.reloptions, ', '), '(no reloptions)')::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'v'
    and n.nspname = 'public'
    and (c.reloptions is null or not ('security_invoker=true' = any(c.reloptions)))
    and not exists (
      select 1 from pg_catalog.pg_depend d
      where d.objid = c.oid and d.deptype = 'e'
    );
end;
$$;
