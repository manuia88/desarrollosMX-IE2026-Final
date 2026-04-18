-- FASE 06 — Script de auditoría RLS / SECURITY DEFINER / VIEWs públicas
-- Ref: docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.A.1 + ADR-009 D2/D3/D5
--
-- Uso local (requiere psql + DATABASE_URL apuntando al proyecto Supabase):
--     psql "$DATABASE_URL" -f scripts/audit-rls.sql
-- Uso remoto (CI):
--     node scripts/audit-rls.mjs    (invoca public.audit_rls_violations() via RPC)
--
-- Las 5 categorías corresponden 1-a-1 con las reglas de ADR-009. Cualquier fila
-- devuelta es una violación y debe fixearse antes de merge.

\echo '=== (1) Tablas sin RLS habilitado (excluye particiones pg_partman) ==='
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and tablename not like 'partman_%'
  and not rowsecurity;

\echo '=== (2) Policies qual = true sin COMMENT justificador intentional_public ==='
select schemaname, tablename, policyname, qual::text as qual
from pg_policies
where schemaname = 'public'
  and (qual is null or qual::text in ('true', 'TRUE', 't'))
  and not exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_description d on d.objoid = pol.oid
    where pol.polname = pg_policies.policyname
      and c.relname = pg_policies.tablename
      and n.nspname = pg_policies.schemaname
      and d.description ilike '%intentional_public%'
  );

\echo '=== (3) SECURITY DEFINER sin SET search_path ==='
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef
  and n.nspname = 'public'
  and (p.proconfig is null or not exists (
    select 1 from unnest(p.proconfig) c where c like 'search_path=%'
  ));

\echo '=== (4) SECURITY DEFINER sin validar auth.uid()/is_superadmin()/get_user_role() ==='
-- Allowlist en audit_rls_violations() función — ver migration.
select n.nspname, p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef
  and n.nspname = 'public'
  and pg_get_functiondef(p.oid) !~* '(auth\.uid|auth\.jwt|is_superadmin|get_user_role|check_rate_limit_db)'
  and p.proname not in (
    'set_updated_at', 'jsonb_diff', 'audit_row_change',
    'create_parent', 'run_maintenance', 'match_embeddings',
    'encrypt_secret', 'audit_rls_violations',
    'desarrolladoras_encrypt_tax', 'register_view'
  );

\echo '=== (5) VIEWs sin security_invoker=true ==='
select n.nspname, c.relname, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'v'
  and n.nspname = 'public'
  and (c.reloptions is null or not ('security_invoker=true' = any(c.reloptions)));
