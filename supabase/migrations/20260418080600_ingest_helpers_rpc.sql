-- Helpers RPC para orchestrator de ingesta (BLOQUE 7.B).
-- FASE 07 / BLOQUE 7.B
-- Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.B

-- ============================================================
-- increment_api_budget_spend(source, amount) — atomic UPDATE
-- ============================================================
create or replace function public.increment_api_budget_spend(
  p_source text,
  p_amount numeric
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.api_budgets
    set spent_mtd_usd = spent_mtd_usd + p_amount
    where source = p_source;
$$;

revoke all on function public.increment_api_budget_spend(text, numeric) from public, anon, authenticated;
grant execute on function public.increment_api_budget_spend(text, numeric) to service_role;

comment on function public.increment_api_budget_spend(text, numeric) is
  'Incremento atómico spent_mtd_usd. Service-role only — el cost-tracker del '
  'orchestrator lo invoca tras cada API call con costo real.';

-- ============================================================
-- reset_api_budgets_monthly() — cron mensual día 1, 00:00 UTC
-- ============================================================
create or replace function public.reset_api_budgets_monthly()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.api_budgets
    set spent_mtd_usd = 0,
        last_reset_at = now()
    where reset_day_of_month = extract(day from current_date)::smallint;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.reset_api_budgets_monthly() from public, anon, authenticated;
grant execute on function public.reset_api_budgets_monthly() to service_role;

comment on function public.reset_api_budgets_monthly() is
  'Reset mensual de spent_mtd_usd. Cron pg_cron lo dispara diariamente; el WHERE '
  'reset_day_of_month limita el efecto al día configurado por source.';

-- ============================================================
-- Seed budgets H1 (estimaciones conservadoras §FASE_07 plan)
-- ============================================================
insert into public.api_budgets (source, monthly_budget_usd, alert_threshold_pct, hard_limit_pct, meta) values
  ('mapbox_traffic', 60, 80, 100, '{"plan": "pay_as_you_go", "rate_per_1k": 0.50}'::jsonb),
  ('airdna', 99, 80, 100, '{"plan": "starter_h1_stub"}'::jsonb),
  ('bbva_research', 30, 80, 100, '{"plan": "gpt_4o_mini_pdf_extract", "tokens_per_pdf": 50000}'::jsonb),
  ('cushman', 25, 80, 100, '{"plan": "gpt_4o_mini_pdf_extract"}'::jsonb),
  ('cbre', 25, 80, 100, '{"plan": "gpt_4o_mini_pdf_extract"}'::jsonb),
  ('tinsa', 20, 80, 100, '{"plan": "gpt_4o_mini_pdf_extract"}'::jsonb),
  ('jll', 15, 80, 100, '{"plan": "gpt_4o_mini_pdf_extract"}'::jsonb),
  ('softec', 15, 80, 100, '{"plan": "gpt_4o_mini_pdf_extract"}'::jsonb)
on conflict (source) do nothing;

-- ============================================================
-- Seed watermarks iniciales — periodicidades esperadas H1
-- ============================================================
insert into public.ingest_watermarks (source, country_code, expected_periodicity, alert_after_hours) values
  ('banxico', 'MX', 'daily', 26),
  ('inegi', 'MX', 'monthly', 720),
  ('shf', 'MX', 'quarterly', 2160),
  ('bbva_research', 'MX', 'monthly', 720),
  ('cnbv', 'MX', 'monthly', 720),
  ('infonavit', 'MX', 'monthly', 720),
  ('fovissste', 'MX', 'quarterly', 2160),
  ('denue', 'MX', 'monthly', 720),
  ('fgj', 'MX', 'weekly', 168),
  ('gtfs', 'MX', 'quarterly', 2160),
  ('atlas_riesgos', 'MX', 'on_demand', 8760),
  ('siged', 'MX', 'monthly', 720),
  ('clues', 'MX', 'monthly', 720),
  ('sacmex', 'MX', 'weekly', 168),
  ('mapbox_traffic', 'MX', 'on_demand', 168),
  ('google_trends', 'MX', 'weekly', 168),
  ('airdna', 'MX', 'monthly', 720)
on conflict (source) do nothing;
