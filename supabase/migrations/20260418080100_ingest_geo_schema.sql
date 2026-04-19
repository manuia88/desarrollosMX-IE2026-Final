-- Ingesta GEO: puntos georreferenciados (DENUE, FGJ, GTFS, SIGED, CLUES, SACMEX, Atlas Riesgos, etc.)
-- + snapshots agregados por zona × source × metric.
-- FASE 07 / BLOQUE 7.A / MÓDULO 7.A.1
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.A.1
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2/D3
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md (RLS misma migration)
--
-- Upgrades técnicos aprobados en §5.A FASE 07:
--   - H3 hexagonal indexing (h3_r8 text) computado en app via h3-js (sin dep extension).
--   - BRIN index en valid_from para queries temporales eficientes.
--   - run_id FK a ingest_runs para correlation IDs (OpenTelemetry).

-- ============================================================
-- geo_data_points — puntos individuales (NO partitioned, soft-history via valid_from/to)
-- ============================================================
create table public.geo_data_points (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  source text not null,
  source_id text,
  entity_type text not null,
  name text,
  scian_code text,
  geom geometry(Point, 4326),
  h3_r8 text,
  zone_id uuid,
  valid_from date not null,
  valid_to date,
  run_id uuid,
  meta jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now()
);

create index idx_gdp_country_source on public.geo_data_points (country_code, source, entity_type);
create index idx_gdp_geom on public.geo_data_points using gist (geom);
create index idx_gdp_h3 on public.geo_data_points (h3_r8) where h3_r8 is not null;
create index idx_gdp_scian on public.geo_data_points (scian_code) where scian_code is not null;
create index idx_gdp_zone on public.geo_data_points (zone_id) where zone_id is not null;
create index idx_gdp_valid_brin on public.geo_data_points using brin (valid_from);
create index idx_gdp_run on public.geo_data_points (run_id) where run_id is not null;
create unique index idx_gdp_natural_key
  on public.geo_data_points (country_code, source, source_id, valid_from)
  where source_id is not null;

-- ============================================================
-- RLS — restringido. NO exponer puntos individuales con razón social DENUE.
-- Lectura solo para roles internos y service_role.
-- ============================================================
alter table public.geo_data_points enable row level security;

create policy geo_data_points_select_internal on public.geo_data_points
  for select to authenticated
  using (
    public.get_user_role() in ('asesor', 'mb_admin', 'admin_desarrolladora', 'superadmin')
  );

comment on table public.geo_data_points is
  'Puntos georreferenciados (DENUE, FGJ, GTFS, SIGED, CLUES, etc.). NO particionada — '
  'soft-history via valid_from/valid_to. h3_r8 calculado en app con h3-js.';
comment on column public.geo_data_points.h3_r8 is
  'H3 hexagonal index resolución 8 (~0.7 km²). Calculado en orchestrator antes de INSERT.';
comment on policy geo_data_points_select_internal on public.geo_data_points is
  'RATIONALE: puntos individuales pueden incluir razón social DENUE (sensible competitivo). '
  'Solo roles internos. Para público: usar geo_snapshots (agregados por zona).';

-- ============================================================
-- geo_snapshots — agregados por zona × source × metric (PARTITIONED yearly)
-- ============================================================
create table public.geo_snapshots (
  id bigint generated always as identity,
  country_code char(2) not null references public.countries(code),
  zone_id uuid not null,
  source text not null,
  metric text not null,
  value numeric(20, 6) not null,
  period_start date not null,
  period_end date not null,
  run_id uuid,
  meta jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  primary key (id, period_start)
) partition by range (period_start);

create index idx_geosnap_zone_metric
  on public.geo_snapshots (country_code, zone_id, metric, period_start desc);

create unique index idx_geosnap_unique
  on public.geo_snapshots (country_code, zone_id, source, metric, period_start);

create index idx_geosnap_period_brin on public.geo_snapshots using brin (period_start);
create index idx_geosnap_run on public.geo_snapshots (run_id) where run_id is not null;

select public.create_parent(
  p_parent_table := 'public.geo_snapshots',
  p_control      := 'period_start',
  p_interval     := '1 year'
);

-- ============================================================
-- RLS — agregados son SELECT público (no exponen identidad individual).
-- ============================================================
alter table public.geo_snapshots enable row level security;

create policy geo_snapshots_select_public on public.geo_snapshots
  for select to authenticated, anon
  using (true);

comment on table public.geo_snapshots is
  'Agregados por zona × source × metric. SELECT público. Particionada yearly por period_start.';
