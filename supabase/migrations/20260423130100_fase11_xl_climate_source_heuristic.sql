-- BLOQUE 11.P FIX — source='heuristic_v1' explícito (vs 'hybrid' confuso).
--
-- Distingue semánticamente stub heurístico H1 (CDMX pattern sintético) de
-- datos NOAA/CONAGUA reales futuros (L140 FASE 12 N5). El valor 'hybrid'
-- quedará para filas realmente híbridas (NOAA+CONAGUA merged) cuando exista
-- la ingestión real.

alter table public.climate_monthly_aggregates
  drop constraint if exists climate_monthly_aggregates_source_check;

alter table public.climate_monthly_aggregates
  add constraint climate_monthly_aggregates_source_check
  check (source in ('heuristic_v1', 'noaa', 'conagua', 'hybrid'));

alter table public.climate_monthly_aggregates
  alter column source set default 'heuristic_v1';

comment on column public.climate_monthly_aggregates.source is
  'heuristic_v1 (SEED H1 sintético CDMX pattern) | noaa (GHCND real L140 FASE 12) | '
  'conagua (scrape real) | hybrid (NOAA+CONAGUA merged).';
