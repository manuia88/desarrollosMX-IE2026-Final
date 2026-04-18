-- audit_rls_violations() v3 — allowlist extendida para helpers FASE 06
-- FASE 06 / MÓDULO 6.C (patch)

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
    (t.schemaname || '.' || t.tablename)::text,
    'ALTER TABLE enable row level security is missing'::text
  from pg_catalog.pg_tables t
  where t.schemaname = 'public'
    and not t.rowsecurity
    and t.tablename not in ('part_config', 'part_config_sub')
    and t.tablename not like 'template\_%'
    and t.tablename not like '%\_p20%'
    and t.tablename not like '%\_default'
    and not exists (
      select 1
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      join pg_catalog.pg_depend d on d.objid = c.oid and d.deptype = 'e'
      where c.relname = t.tablename and n.nspname = t.schemaname
    );

  -- (2) policies qual = true sin COMMENT intentional_public
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
      pol.polcmd as cmd,
      pol.oid as pol_oid,
      pg_catalog.pg_get_expr(pol.polqual, pol.polrelid) as qual
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
  ) pol_info
  where pol_info.cmd <> 'a'
    and (pol_info.qual is null or pol_info.qual in ('true', 'TRUE', 't'))
    and not exists (
      select 1
      from pg_catalog.pg_description d
      where d.objoid = pol_info.pol_oid
        and d.description ilike '%intentional_public%'
    );

  -- (3) SECURITY DEFINER sin SET search_path
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

  -- (4) SECURITY DEFINER sin validar auth
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
      -- Helpers puros / triggers internos
      'set_updated_at',
      'jsonb_diff',
      'audit_row_change',
      'create_parent',
      'run_maintenance',
      'match_embeddings',
      'encrypt_secret',
      'audit_rls_violations',
      -- Triggers internos FASE 06 (usan OLD/NEW, no auth context directo)
      'desarrolladoras_encrypt_tax',
      'profiles_encrypt_pii',
      'register_view',
      -- Autenticadores (service_role only; la auth context es el caller — tRPC/API)
      'verify_api_key',
      -- Supabase auth trigger
      'handle_new_user',
      'prevent_role_escalation'
    )
    and not exists (
      select 1 from pg_catalog.pg_depend d
      where d.objid = p.oid and d.deptype = 'e'
    );

  -- (5) VIEWs sin security_invoker
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
