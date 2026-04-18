-- REVOKE DELETE en tablas append-only
-- FASE 06 / MÓDULO 6.I.1
-- Ref: docs/02_PLAN_MAESTRO/FASE_06_SEGURIDAD_BASELINE.md §6.I + ADR-009 D7

revoke delete on public.audit_log from authenticated, anon, service_role;
revoke delete on public.auth_sessions_log from authenticated, anon, service_role;
-- rate_limit_log: service_role conserva DELETE para prune via pg_partman maintenance.
revoke delete on public.rate_limit_log from authenticated, anon;
revoke delete on public.api_rate_limits from authenticated, anon;
revoke delete on public.fx_rates from authenticated, anon, service_role;

comment on table public.audit_log is
  'Append-only. DELETE revocado a todos los roles (ADR-009 D7). Retención >=5 años (LFPDPPP MX).';
comment on table public.auth_sessions_log is
  'Append-only. DELETE revocado (ADR-009 D7).';
comment on table public.fx_rates is
  'Append-only (histórico de FX). DELETE revocado (ADR-009 D7).';
