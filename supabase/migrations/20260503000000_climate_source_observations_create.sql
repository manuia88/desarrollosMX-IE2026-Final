-- F1.C.A — Climate Hybrid Fix: raw per-source observation table.
--
-- Replaces the previous F1.B pattern where NOAA + CONAGUA both wrote into
-- climate_monthly_aggregates with onConflict=(zone_id, year_month), which
-- silently overwrote NOAA rows once CONAGUA backfill ran (39166 conagua vs
-- 1046 noaa post-F1.B → cross-validation impossible).
--
-- Design: keep one row per (zone_id, year_month, source). Aggregates are
-- recomputed deterministically from observations into climate_monthly_aggregates
-- via recompute_climate_aggregates_from_observations() SECDEF function (Migration C).

create table if not exists public.climate_source_observations (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.zones(id) on delete cascade,
  year_month date not null,
  source text not null check (source in ('noaa', 'conagua')),
  station_id text not null,
  temp_avg numeric(5, 2),
  temp_max numeric(5, 2),
  temp_min numeric(5, 2),
  rainfall_mm numeric(7, 2),
  humidity_avg numeric(5, 2)
    check (humidity_avg is null or (humidity_avg >= 0 and humidity_avg <= 100)),
  extreme_events_count jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  constraint climate_source_observations_uniq unique (zone_id, year_month, source)
);

create index if not exists climate_source_observations_zone_idx
  on public.climate_source_observations (zone_id, year_month desc);
create index if not exists climate_source_observations_ym_idx
  on public.climate_source_observations (year_month);
create index if not exists climate_source_observations_source_idx
  on public.climate_source_observations (source);

alter table public.climate_source_observations enable row level security;

drop policy if exists climate_source_observations_public_read on public.climate_source_observations;
create policy climate_source_observations_public_read
  on public.climate_source_observations
  for select
  using (true);

comment on policy climate_source_observations_public_read
  on public.climate_source_observations is
  'RATIONALE intentional_public: raw NOAA/CONAGUA monthly observations son '
  'datos científicos públicos (sin PII); read endpoint del Climate Twin / '
  'Cross-validation surface.';

drop policy if exists climate_source_observations_service_write on public.climate_source_observations;
create policy climate_source_observations_service_write
  on public.climate_source_observations
  for all to service_role
  using (true) with check (true);

comment on table public.climate_source_observations is
  'F1.C.A — raw per-source monthly observations. UNIQUE (zone_id, year_month, source) '
  'para que NOAA + CONAGUA coexistan sin overwrite. Feed de '
  'recompute_climate_aggregates_from_observations() que deriva canonical winners '
  'a climate_monthly_aggregates con cross_validation_status.';
