-- audit_rls_violations() — función de introspección para CI security-audit
-- FASE 06 / MÓDULO 6.A.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.A.1 + ADR-009 D3

-- Retorna UN row por cada violación encontrada en las 5 categorías del ADR-009:
--   1) Tablas sin RLS habilitado
--   2) Policies qual = true (o NULL) sin COMMENT justificador 'intentional_public'
--   3) SECURITY DEFINER sin SET search_path
--   4) SECURITY DEFINER sin validar auth.uid()
--   5) VIEWs sin security_invoker=true

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
  -- (1) tablas sin RLS habilitado
  return query
  select
    'RLS_DISABLED'::text,
    (schemaname || '.' || tablename)::text,
    'ALTER TABLE enable row level security is missing'::text
  from pg_catalog.pg_tables
  where schemaname = 'public'
    and tablename not like 'partman_%'
    and tablename not in (
      -- pg_partman child tables (particiones) heredan RLS del parent
      -- se excluyen por nombre en el generador del catalogo
      ''
    )
    and not rowsecurity;

  -- (2) policies qual = true (o NULL) sin comentario justificador 'intentional_public'
  return query
  select
    'POLICY_QUAL_TRUE_UNJUSTIFIED'::text,
    (schemaname || '.' || tablename || ' :: ' || policyname)::text,
    coalesce(qual::text, '(null)')::text
  from pg_catalog.pg_policies
  where schemaname = 'public'
    and (qual is null or qual::text in ('true', 'TRUE', 't'))
    and not exists (
      select 1
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      left join pg_catalog.pg_description d on d.objoid = pol.oid
      where pol.polname = pg_policies.policyname
        and c.relname = pg_policies.tablename
        and n.nspname = pg_policies.schemaname
        and d.description ilike '%intentional_public%'
    );

  -- (3) funciones SECURITY DEFINER sin SET search_path (schema public)
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
    ));

  -- (4) funciones SECURITY DEFINER sin validar auth.uid() ni is_superadmin()/get_user_role() ni allowlist
  -- Allowlist de funciones que NO requieren auth check (ej: triggers genéricos que corren en contexto de transacción)
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
      -- Allowlist: helpers puros/triggers genéricos que no gatillan desde usuario final
      'set_updated_at',
      'jsonb_diff',
      'audit_row_change',
      'create_parent',                          -- pg_partman
      'run_maintenance',                        -- pg_partman
      'match_embeddings',                       -- pgvector helper, protegido por RLS de la tabla consultada
      'encrypt_secret',                         -- uso interno via trigger
      'audit_rls_violations',                   -- esta misma función
      'desarrolladoras_encrypt_tax',            -- trigger interno
      'register_view'                           -- protegido por tabla view_dedup
    );

  -- (5) VIEWs sin security_invoker=true
  return query
  select
    'VIEW_NO_SECURITY_INVOKER'::text,
    (n.nspname || '.' || c.relname)::text,
    coalesce(array_to_string(c.reloptions, ', '), '(no reloptions)')::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'v'
    and n.nspname = 'public'
    and (c.reloptions is null or not ('security_invoker=true' = any(c.reloptions)));
end;
$$;

revoke execute on function public.audit_rls_violations() from public, anon, authenticated;
grant execute on function public.audit_rls_violations() to service_role;

comment on function public.audit_rls_violations() is
  'Introspección de patrones SEC del ADR-009. SECURITY DEFINER + search_path="" + solo service_role. El CI job security-audit falla si retorna filas.';
