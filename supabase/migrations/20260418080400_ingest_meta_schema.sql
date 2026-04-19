-- Ingesta META: orchestrator state (ingest_runs), provenance (data_lineage),
-- watermarks por source, cost tracker (api_budgets), dead-letter queue (ingest_dlq),
-- confidence thresholds, zone_tiers seed.
-- FASE 07 / BLOQUE 7.A + 7.B + 7.J + 7.K
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.B + §7.J + §7.K
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
--   §5.A FASE 07 — 5 upgrades aprobados (data quality gates, replay, sample determinism,
--                                         OTel correlation IDs, cost tracker pre-emptive).

-- ============================================================
-- ingest_runs — auditoría por ejecución del orchestrator
-- ============================================================
create table public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  country_code char(2) not null references public.countries(code),
  status text not null check (status in ('running', 'success', 'failed', 'partial', 'budget_exceeded', 'dlq')),
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  rows_skipped integer not null default 0,
  rows_dlq integer not null default 0,
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  cost_estimated_usd numeric(10, 6) default 0,
  raw_payload_url text,
  sample_percentage smallint default 100 check (sample_percentage between 1 and 100),
  triggered_by text,
  meta jsonb not null default '{}'::jsonb
);

create index idx_ir_source_status on public.ingest_runs (source, status, started_at desc);
create index idx_ir_started on public.ingest_runs (started_at desc);
create index idx_ir_country on public.ingest_runs (country_code, started_at desc);

alter table public.ingest_runs enable row level security;

create policy ingest_runs_select_admin on public.ingest_runs
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  );

comment on table public.ingest_runs is
  'Audit por ejecución del ingest orchestrator. id == correlation_id (OpenTelemetry). '
  'raw_payload_url apunta a Storage bucket ingest-raw para replay (30d retention).';

-- ============================================================
-- data_lineage — provenance formal por dataset output
-- ============================================================
create table public.data_lineage (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ingest_runs(id) on delete cascade,
  source text not null,
  destination_table text not null,
  destination_pk text,
  upstream_url text,
  upstream_hash text,
  transformation text,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  source_span jsonb,
  recorded_at timestamptz not null default now()
);

create index idx_lineage_run on public.data_lineage (run_id);
create index idx_lineage_dest on public.data_lineage (destination_table, recorded_at desc);
create index idx_lineage_source on public.data_lineage (source, recorded_at desc);

alter table public.data_lineage enable row level security;

create policy data_lineage_select_admin on public.data_lineage
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  );

comment on table public.data_lineage is
  'Provenance per (run_id, destination). Soporta Constitutional AI GC-7: source_span '
  'guarda página + texto literal cuando un LLM extrajo un campo desde PDF.';

-- ============================================================
-- ingest_watermarks — last successful period por source
-- ============================================================
create table public.ingest_watermarks (
  source text primary key,
  country_code char(2) not null references public.countries(code),
  last_successful_run_id uuid references public.ingest_runs(id) on delete set null,
  last_successful_period_end date,
  last_successful_at timestamptz,
  expected_periodicity text check (expected_periodicity in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'on_demand')),
  alert_after_hours integer default 48,
  meta jsonb not null default '{}'::jsonb
);

alter table public.ingest_watermarks enable row level security;

create policy watermarks_select_admin on public.ingest_watermarks
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  );

comment on table public.ingest_watermarks is
  'Watermark por source: hasta qué periodo ya se ingestó exitosamente. Cron de health check '
  'usa last_successful_at + alert_after_hours para emitir alerta a admin.';

-- ============================================================
-- api_budgets — cost tracker pre-emptive (upgrade 5 §5.A)
-- ============================================================
create table public.api_budgets (
  source text primary key,
  monthly_budget_usd numeric(10, 2) not null,
  spent_mtd_usd numeric(10, 6) not null default 0,
  alert_threshold_pct smallint not null default 80 check (alert_threshold_pct between 1 and 100),
  hard_limit_pct smallint not null default 100 check (hard_limit_pct between 1 and 200),
  reset_day_of_month smallint not null default 1 check (reset_day_of_month between 1 and 28),
  is_paused boolean not null default false,
  last_reset_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

alter table public.api_budgets enable row level security;

create policy api_budgets_select_admin on public.api_budgets
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  );

comment on table public.api_budgets is
  'Cost tracker pre-emptive (FASE 07 upgrade #5). preCheckBudget(source, estimatedCost) '
  'consulta esta tabla antes de hit API y bloquea si > hard_limit_pct. Alert a admin a alert_threshold_pct.';

-- ============================================================
-- ingest_dlq — dead-letter queue (Data Quality Gates failures, upgrade #1)
-- ============================================================
create table public.ingest_dlq (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.ingest_runs(id) on delete cascade,
  source text not null,
  failed_at timestamptz not null default now(),
  reason text not null,
  payload jsonb not null,
  retry_count smallint not null default 0,
  resolved_at timestamptz,
  resolved_by_user_id uuid references public.profiles(id),
  resolution_notes text
);

create index idx_dlq_source_unresolved
  on public.ingest_dlq (source, failed_at desc)
  where resolved_at is null;
create index idx_dlq_run on public.ingest_dlq (run_id);

alter table public.ingest_dlq enable row level security;

create policy dlq_select_admin on public.ingest_dlq
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() = 'mb_admin'
  );

create policy dlq_update_admin on public.ingest_dlq
  for update to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin')
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.ingest_dlq is
  'Dead-letter queue. Quality gates (row count sanity, schema, dedup, geo validity) que '
  'rechazan batches dejan rows aquí. Admin revisa, decide replay o discard.';

-- ============================================================
-- confidence_thresholds — seed por source × metric (BLOQUE 7.J)
-- ============================================================
create table public.confidence_thresholds (
  source text not null,
  metric text not null,
  min_sample_high integer not null,
  min_sample_medium integer not null,
  min_sample_low integer not null,
  notes text,
  primary key (source, metric)
);

alter table public.confidence_thresholds enable row level security;

create policy thresholds_select_public on public.confidence_thresholds
  for select to authenticated, anon
  using (true);

insert into public.confidence_thresholds (source, metric, min_sample_high, min_sample_medium, min_sample_low, notes) values
  ('denue', 'business_count', 100, 30, 10, 'Comercios por zona DENUE'),
  ('fgj', 'crime_count', 50, 20, 5, 'Incidentes carpetas investigación FGJ por zona/mes'),
  ('siged', 'school_count', 10, 5, 2, 'Escuelas SIGED por zona'),
  ('clues', 'hospital_count', 5, 2, 1, 'Establecimientos salud CLUES por zona'),
  ('gtfs', 'transit_stops', 8, 3, 1, 'Paradas transporte por zona'),
  ('chrome_ext', 'listings_count', 30, 10, 3, 'Listados capturados Chrome ext por zona/op/tipo'),
  ('google_trends', 'interest_score', 50, 20, 0, 'Score mínimo confiable Trends'),
  ('mapbox_traffic', 'commute_samples', 20, 5, 1, 'Muestras tráfico por OD'),
  ('airdna', 'str_listings', 30, 10, 3, 'Listados STR por zona'),
  ('cushman', 'report_quarters', 4, 2, 1, 'Trimestres reporte Cushman histórico')
on conflict (source, metric) do nothing;

comment on table public.confidence_thresholds is
  'Thresholds por source × metric para confidence cascade (high/medium/low/insufficient). '
  'Consumido por scoring engine FASE 08+.';

-- ============================================================
-- zone_tiers — 4 tiers data confiability (BLOQUE 7.K)
-- ============================================================
create table public.zone_tiers (
  zone_id uuid primary key,
  country_code char(2) not null references public.countries(code),
  tier smallint not null check (tier between 1 and 4),
  projects_count integer not null default 0,
  sales_count integer not null default 0,
  months_tracked integer not null default 0,
  last_recomputed_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create index idx_zt_country_tier on public.zone_tiers (country_code, tier);

alter table public.zone_tiers enable row level security;

create policy zone_tiers_select_public on public.zone_tiers
  for select to authenticated, anon
  using (true);

comment on table public.zone_tiers is
  'Tier de calibración por zona (1=fuentes externas día-1, 2=≥10 proyectos, '
  '3=≥50 proyectos+6m, 4=≥100 ventas cerradas). Recomputado por cron nightly.';

-- ============================================================
-- recompute_zone_tiers() — función para cron nightly (BLOQUE 7.K)
-- ============================================================
create or replace function public.recompute_zone_tiers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer := 0;
begin
  -- Placeholder: en FASE 08+ se conectará a tablas zones / projects / operaciones.
  -- Por ahora, garantiza que la función existe para que el cron funcione idempotente.
  -- STUB — activar lógica completa en FASE 08 cuando exista public.zones.
  update public.zone_tiers
    set last_recomputed_at = now()
    where last_recomputed_at < now() - interval '1 hour';
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

comment on function public.recompute_zone_tiers() is
  'Recomputa tier por zona. Stub mínimo en FASE 07 — lógica completa en FASE 08+ cuando '
  'existan public.zones + agregaciones de projects / operaciones.';

-- ============================================================
-- Whitelist registrada en BD para auditoría programática (BLOQUE 7.I).
-- Habi explícitamente NO está en la lista — runtime guard en orchestrator.
-- ============================================================
create table public.ingest_allowed_sources (
  source text primary key,
  category text not null check (category in ('macro', 'geo', 'market', 'derived')),
  is_active boolean not null default true,
  legal_basis text,
  added_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

alter table public.ingest_allowed_sources enable row level security;

create policy allowed_sources_select_public on public.ingest_allowed_sources
  for select to authenticated, anon
  using (true);

insert into public.ingest_allowed_sources (source, category, legal_basis) values
  -- MACRO (7)
  ('banxico', 'macro', 'API oficial Banxico SIE token público'),
  ('inegi', 'macro', 'API oficial INEGI BIE token público'),
  ('shf', 'macro', 'XLSX público SHF + admin upload'),
  ('bbva_research', 'macro', 'PDF público BBVA Research + admin upload'),
  ('cnbv', 'macro', 'CSV público CNBV + admin upload'),
  ('infonavit', 'macro', 'CSV portal transparencia Infonavit'),
  ('fovissste', 'macro', 'PDF/XLSX informe trimestral FOVISSSTE'),
  -- GEO (17)
  ('denue', 'geo', 'API DENUE INEGI token público'),
  ('fgj', 'geo', 'datos.cdmx.gob.mx carpetas investigación CC-BY'),
  ('gtfs', 'geo', 'GTFS feeds públicos Metro/Metrobús/Tren/Cablebús/EcoBici'),
  ('atlas_riesgos', 'geo', 'Shapefiles CENAPRED uso público'),
  ('siged', 'geo', 'Datos abiertos SEP CCT'),
  ('clues', 'geo', 'Catálogo público CLUES Salud'),
  ('sacmex', 'geo', 'Portal avisos SACMEX scraping de avisos públicos'),
  ('rama', 'geo', 'API SINAICA H2 stub'),
  ('seduvi', 'geo', 'Shapefile uso suelo CDMX H2 stub'),
  ('catastro_cdmx', 'geo', 'Catastro público CDMX H2 stub'),
  ('paot', 'geo', 'Denuncias ambientales público'),
  ('sedema', 'geo', 'Alertas atmosféricas + áreas verdes público'),
  ('conagua', 'geo', 'Precipitación CONAGUA público'),
  ('inah', 'geo', 'Zonas arqueológicas INAH público'),
  ('profeco', 'geo', 'Denuncias PROFECO público'),
  ('locatel', 'geo', 'Reportes 0311 Locatel CC-BY'),
  ('mapbox_traffic', 'geo', 'Mapbox Traffic API on-demand contratado'),
  -- MARKET (Chrome ext + admin upload + APIs oficiales) ADR-012
  ('chrome_ext_inmuebles24', 'market', 'Browser automation usuario per ADR-012'),
  ('chrome_ext_vivanuncios', 'market', 'Browser automation usuario per ADR-012'),
  ('chrome_ext_propiedades_com', 'market', 'Browser automation usuario per ADR-012'),
  ('chrome_ext_ml_inmuebles', 'market', 'Browser automation usuario per ADR-012'),
  ('chrome_ext_fb_marketplace', 'market', 'Browser automation usuario per ADR-012'),
  ('chrome_ext_lamudi', 'market', 'Browser automation usuario per ADR-012'),
  ('airdna', 'market', 'API contratada AirDNA MarketMinder'),
  ('google_trends', 'market', 'API oficial Google Trends'),
  ('cushman', 'market', 'PDF/XLSX licenciado admin upload'),
  ('cbre', 'market', 'PDF/XLSX licenciado admin upload'),
  ('tinsa', 'market', 'PDF/XLSX licenciado admin upload'),
  ('jll', 'market', 'PDF/XLSX licenciado admin upload'),
  ('softec', 'market', 'XLSX licenciado admin upload')
on conflict (source) do nothing;

comment on table public.ingest_allowed_sources is
  'Whitelist auditable de sources autorizadas (ADR-010 §D10 + ADR-012). Habi explícitamente '
  'NO está aquí. Runtime guard en orchestrator (shared/lib/ingest/orchestrator.ts) consulta '
  'esta tabla además del array hardcoded ALLOWED_SOURCES.';
