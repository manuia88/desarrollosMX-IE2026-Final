-- BLOQUE 11.P.-1 — Climate Twin SEED: schema histórico 15y + twin similarity.
--
-- Decisión producto (founder 2026-04-23, Opción B refinada):
--
--   1. RENAME `climate_twin_projections` → `climate_future_projections`
--      (era proyecciones 2040/2050 — feature H2 Clima Futuro, diferenciar
--      semánticamente de Clima Gemelo Histórico 11.P).
--   2. 3 CREATE nuevas (histórico aggregates + signatures + twin matches).
--
-- Escala SEED:
--   - Daily 15y × 200 colonias = 1.1M rows (NO cabe 8GB Supabase free).
--   - Mensual 15y = 180 meses × 200 colonias = 36K rows ✓.
--   - Daily sólo últimos 12m rolling (73K rows descartable) — no se persiste H1.
--
-- Fuentes H1:
--   - NOAA GHCND API público (primary). Cache por zone → station mapping.
--   - CONAGUA scrape mensuales (fallback, graceful degrade si frágil).

-- ============================================================
-- RENAME existente: climate_twin_projections → climate_future_projections
-- ============================================================
alter table if exists public.climate_twin_projections
  rename to climate_future_projections;

-- Renombrar policies para claridad semántica (rename tabla ya las arrastró,
-- pero los nombres de policy aún reflejan 'climate_twin_*').
alter policy climate_twin_public_read on public.climate_future_projections
  rename to climate_future_public_read;
alter policy climate_twin_service_write on public.climate_future_projections
  rename to climate_future_service_write;

comment on table public.climate_future_projections is
  'BLOQUE 11.P (rename): proyecciones climáticas 2040/2050 (H2 Clima Futuro). '
  'Separado de climate_twin_matches (Clima Gemelo Histórico H1 SEED).';

-- ============================================================
-- TABLA 1: climate_monthly_aggregates — 15y × 200 zonas SEED
-- ============================================================
create table if not exists public.climate_monthly_aggregates (
  zone_id uuid not null,
  year_month date not null,
  temp_avg numeric(5,2),
  temp_max numeric(5,2),
  temp_min numeric(5,2),
  rainfall_mm numeric(7,2),
  humidity_avg numeric(5,2) check (humidity_avg is null or (humidity_avg >= 0 and humidity_avg <= 100)),
  extreme_events_count jsonb not null default '{}'::jsonb,
  source text not null default 'noaa' check (source in ('noaa', 'conagua', 'hybrid')),
  computed_at timestamptz not null default now(),
  unique (zone_id, year_month)
);

create index if not exists climate_monthly_zone_idx
  on public.climate_monthly_aggregates (zone_id, year_month desc);
create index if not exists climate_monthly_ym_idx
  on public.climate_monthly_aggregates (year_month);

alter table public.climate_monthly_aggregates enable row level security;

create policy climate_monthly_public_read on public.climate_monthly_aggregates
  for select
  using (true);

comment on policy climate_monthly_public_read on public.climate_monthly_aggregates is
  'RATIONALE intentional_public: aggregates climáticos históricos son datos '
  'públicos NOAA/CONAGUA (sin PII); feed del Clima Gemelo histórico.';

create policy climate_monthly_service_write on public.climate_monthly_aggregates
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 2: climate_annual_summaries — signature 12-dim por año × zona
-- ============================================================
create table if not exists public.climate_annual_summaries (
  zone_id uuid not null,
  year integer not null check (year between 2010 and 2030),
  climate_type text check (climate_type in ('tropical', 'arid', 'temperate', 'cold', 'humid_subtropical')),
  composite_climate_signature numeric[] not null default array[]::numeric[],
  summary jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (zone_id, year),
  check (array_length(composite_climate_signature, 1) is null or array_length(composite_climate_signature, 1) = 12)
);

create index if not exists climate_annual_zone_idx
  on public.climate_annual_summaries (zone_id, year desc);

alter table public.climate_annual_summaries enable row level security;

create policy climate_annual_public_read on public.climate_annual_summaries
  for select
  using (true);

comment on policy climate_annual_public_read on public.climate_annual_summaries is
  'RATIONALE intentional_public: summaries climáticos anuales son features '
  'públicos del Clima Gemelo (sin PII).';

create policy climate_annual_service_write on public.climate_annual_summaries
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 3: climate_twin_matches — similarity zone ↔ zone
-- ============================================================
create table if not exists public.climate_twin_matches (
  zone_id uuid not null,
  twin_zone_id uuid not null,
  similarity numeric(5,2) not null check (similarity >= 0 and similarity <= 100),
  shared_patterns jsonb not null default '{}'::jsonb,
  methodology text not null default 'heuristic_v1',
  computed_at timestamptz not null default now(),
  unique (zone_id, twin_zone_id),
  check (zone_id <> twin_zone_id)
);

create index if not exists climate_twin_matches_zone_idx
  on public.climate_twin_matches (zone_id, similarity desc);

alter table public.climate_twin_matches enable row level security;

create policy climate_twin_matches_public_read on public.climate_twin_matches
  for select
  using (true);

comment on policy climate_twin_matches_public_read on public.climate_twin_matches is
  'RATIONALE intentional_public: twins climáticos son producto narrativo '
  'público (diferenciador tipo Zestimate — sin PII).';

create policy climate_twin_matches_service_write on public.climate_twin_matches
  for all to service_role
  using (true) with check (true);

comment on table public.climate_monthly_aggregates is
  'BLOQUE 11.P: aggregates mensuales NOAA+CONAGUA 15y (180 meses × 200 colonias SEED).';
comment on table public.climate_annual_summaries is
  'BLOQUE 11.P: summary anual + signature vector(12) por zona × año.';
comment on table public.climate_twin_matches is
  'BLOQUE 11.P: twins por cosine similarity sobre signature vector(12). H1 heuristic_v1.';
