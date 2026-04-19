-- FASE 07b — Documentar 5 policies SELECT public que son intencionalmente públicas.
-- Refs:
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md
--   supabase/migrations/20260419010000_audit_rls_allowlist_v6.sql (audit_rls_violations function)
--
-- audit_rls_violations() v6 exige que toda policy SELECT con qual=true tenga
-- comment ilike '%intentional_public%' para pasar strict mode. Estas 5
-- policies son legítimamente públicas (datos agregados o reference) y nunca
-- exponen PII ni listings individuales.

comment on policy str_markets_select_public on public.str_markets is
  'intentional_public — catálogo AirROI markets, no sensitive';

comment on policy str_mma_select_public on public.str_market_monthly_aggregates is
  'intentional_public — medianas agregadas, no listings individuales';

comment on policy str_cost_select_public on public.str_cost_assumptions is
  'intentional_public — reference data costos típicos';

comment on policy str_zone_regs_select_public on public.str_zone_regulations is
  'intentional_public — info regulatoria pública';

comment on policy str_events_calendar_select_authenticated on public.str_events_calendar is
  'intentional_public — eventos públicos seed CDMX';
