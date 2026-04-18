-- Endurecimiento RLS audit_log (SELECT self + super, INSERT solo via triggers)
-- FASE 02 / MÓDULO 2.F.4
-- Ref: docs/02_PLAN_MAESTRO/FASE_02_AUTH_Y_PERMISOS.md §2.F.4 + ADR-009 D7
--
-- Estado previo (FASE 01):
--   - RLS enabled
--   - policy audit_log_no_delete (DELETE → false)
--   - policy audit_log_select_superadmin (SELECT superadmin)
-- Faltante (este módulo):
--   - SELECT self: un usuario puede leer sus propias entries (actor_id = uid)
--   - Revocar INSERT/UPDATE/DELETE explícito a authenticated/anon.
--     Los triggers de auditoría son SECURITY DEFINER (postgres) y no dependen
--     de estos grants.
--
-- role_requests ya tiene sus policies SELECT/INSERT/UPDATE canónicas en la
-- migration 20260418041242_role_requests.sql — no se re-emiten aquí.

-- ============================================================
-- SELECT: el propio actor puede consultar sus filas (actor_id = auth.uid())
-- ============================================================
create policy audit_log_select_self on public.audit_log
  for select to authenticated
  using (actor_id is not null and actor_id = auth.uid());

comment on policy audit_log_select_self on public.audit_log is
  'Permite a cada usuario ver sólo sus propias entries de auditoría (actor_id = uid). Superadmin ve todo vía audit_log_select_superadmin.';

-- ============================================================
-- Revocar cualquier grant default de escritura para authenticated/anon.
-- Los triggers usan SECURITY DEFINER + owner postgres, así que siguen
-- funcionando. service_role mantiene BYPASS RLS.
-- ============================================================
revoke insert, update, delete on public.audit_log from authenticated, anon;
