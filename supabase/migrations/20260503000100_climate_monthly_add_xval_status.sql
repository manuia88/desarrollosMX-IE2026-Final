-- F1.C.A — Add cross_validation_status to canonical aggregate rows.
--
-- Persiste outcome deterministico de recompute_climate_aggregates_from_observations()
-- en columna nueva. Consumers (UI badges, audit, twin engine) leen sin recompute query-time.
--
-- DO NOT alter `source` semantics: queda label del winner ('noaa' | 'conagua' |
-- 'hybrid' | 'heuristic_v1') backward-compat con 6014 heuristic_v1 rows existing.

alter table public.climate_monthly_aggregates
  add column if not exists cross_validation_status text not null default 'pending';

alter table public.climate_monthly_aggregates
  drop constraint if exists climate_monthly_aggregates_xval_status_check;
alter table public.climate_monthly_aggregates
  add constraint climate_monthly_aggregates_xval_status_check
  check (cross_validation_status in (
    'pending',
    'single_source_noaa',
    'single_source_conagua',
    'cross_validated_match',
    'cross_validated_outlier_noaa_winner',
    'cross_validated_outlier_conagua_winner',
    'no_data'
  ));

create index if not exists climate_monthly_xval_idx
  on public.climate_monthly_aggregates (cross_validation_status);

comment on column public.climate_monthly_aggregates.cross_validation_status is
  'F1.C.A — outcome of recompute_climate_aggregates_from_observations(): '
  'pending (initial / heuristic_v1 legacy) | single_source_* | '
  'cross_validated_match | cross_validated_outlier_*_winner | no_data.';
