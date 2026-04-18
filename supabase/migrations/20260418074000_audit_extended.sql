-- Audit log extendido a 5 tablas adicionales
-- FASE 06 / MÓDULO 6.F.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.F + ADR-009 D13
--
-- FASE 02 ya ataché audit a: profiles, desarrolladoras, subscriptions, profile_feature_overrides, role_requests.
-- FASE 06 añade: plans, feature_registry, role_features, api_keys, fiscal_docs.

do $$
declare
  v_table text;
  v_tables text[] := array['plans', 'feature_registry', 'role_features', 'api_keys', 'fiscal_docs'];
begin
  foreach v_table in array v_tables loop
    execute format('drop trigger if exists trg_audit_%1$I on public.%1$I', v_table);
    execute format(
      'create trigger trg_audit_%1$I after insert or update or delete on public.%1$I for each row execute function public.audit_row_change()',
      v_table
    );
  end loop;
end $$;
