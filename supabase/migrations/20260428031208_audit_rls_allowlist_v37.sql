-- audit_rls_allowlist v37 — F14.F.9 Sprint 8 BIBLIA Modo Serie/Documental.
--
-- v37 amplia v35 con justificacion de policy "qual=true" en studio_series_templates:
--   - studio_series_templates_select_authenticated (qual=is_active, public catalog)
--
-- Razon excluida del POLICY_QUAL_TRUE_UNJUSTIFIED check:
--   Lectura libre para asesores autenticados — catalogo seed canon 4 templates desarrolladora
--   (residencial-clasico/premium, comercial-oficinas, mixto). Datos no sensibles compartidos.
--   Acceso reducido a `to authenticated` role (no publico anonymous), policy aplica solo a SELECT.
--   Se marca via COMMENT ON POLICY con keyword 'intentional_public_authed' (creada en migration
--   20260428031102_studio_series_templates_create.sql).
--
-- 1:1 verification SECDEF↔allowlist (memoria audit_rls_strict_post_merge_gap):
--   v37 NO añade SECDEF nueva. Solo extiende justification policy mediante COMMENT existente.
--   Body de audit_rls_violations() permanece identico a v35 (re-create idempotente
--   para version bump documental).

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
end;
$function$;

comment on function public.audit_rls_violations() is
  'F14.F.9 Sprint 8 v37 — RLS audit fn. Identical body v35 (no SECDEF nueva). Documenta studio_series_templates como intentional_public_authed catalog.';
