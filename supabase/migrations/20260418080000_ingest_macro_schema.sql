-- Ingesta MACRO: time-series por país (Banxico, INEGI, SHF, BBVA Research, CNBV, Infonavit, FOVISSSTE)
-- FASE 07 / BLOQUE 7.A / MÓDULO 7.A.1
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.A.1
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2/D3
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md (RLS en misma migration)
--
-- Particionado yearly por period_start vía pg_partman v5 (helper public.create_parent).
-- BRIN index en period_start (upgrade técnico aprobado en §5.A FASE 07).

-- ============================================================
-- macro_series — series temporales nacionales
-- ============================================================
create table public.macro_series (
  id bigint generated always as identity,
  country_code char(2) not null references public.countries(code),
  source text not null,
  series_id text not null,
  metric_name text not null,
  value numeric(20, 6) not null,
  unit text not null,
  period_start date not null,
  period_end date not null,
  periodicity text not null check (periodicity in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  run_id uuid,
  fetched_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  primary key (id, period_start)
) partition by range (period_start);

create index idx_macro_country_series
  on public.macro_series (country_code, source, series_id, period_start desc);

create unique index idx_macro_unique_period
  on public.macro_series (country_code, source, series_id, period_start);

create index idx_macro_period_brin
  on public.macro_series using brin (period_start);

create index idx_macro_run on public.macro_series (run_id) where run_id is not null;

select public.create_parent(
  p_parent_table := 'public.macro_series',
  p_control      := 'period_start',
  p_interval     := '1 year'
);

-- ============================================================
-- RLS — series macro son SELECT público (datos agregados nacionales).
-- INSERT/UPDATE/DELETE solo service_role (bypass RLS).
-- ============================================================
alter table public.macro_series enable row level security;

create policy macro_series_select_public on public.macro_series
  for select to authenticated, anon
  using (true);

comment on table public.macro_series is
  'Series macroeconómicas nacionales (Banxico, INEGI, SHF, BBVA Research, CNBV, Infonavit, FOVISSSTE). '
  'Particionada yearly por period_start. SELECT público; mutations solo service_role.';

comment on policy macro_series_select_public on public.macro_series is
  'RATIONALE: macro_series son indicadores nacionales públicos (tasa Banxico, INPC INEGI, etc.). '
  'Sin restricción de lectura — alimenta /metodologia y dashboards públicos.';
