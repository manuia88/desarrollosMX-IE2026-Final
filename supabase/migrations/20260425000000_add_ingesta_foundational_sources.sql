-- =====================================================================
-- Migration v28: add granular INEGI sources for foundational ingest
-- =====================================================================
-- Purpose: introduce fine-grained `source` identifiers so each INEGI
-- product (MGN, Censo 2020, ENIGH 2022, INPC BIE) can have its own
-- ingest_runs / ingest_watermarks row. The generic 'inegi' / 'banxico'
-- entries remain active and continue to cover ad-hoc one-off runs.
--
-- Scope: INSERT only on public.ingest_allowed_sources.
-- No DDL, no RLS changes, no SECDEF functions, no ALTER TABLE.
-- Idempotent via ON CONFLICT (source) DO UPDATE.
--
-- Category values must satisfy
--   ingest_allowed_sources_category_check ∈ {macro, geo, market, derived}
-- =====================================================================

INSERT INTO public.ingest_allowed_sources (source, category, is_active, legal_basis, meta)
VALUES
  (
    'inegi_mgn',
    'geo',
    true,
    'Marco Geoestadistico Nacional INEGI — dataset publico abierto (Ley del SNIEG art. 97)',
    jsonb_build_object(
      'product', 'MGN',
      'granularity', 'colonia/alcaldia/estado',
      'added_by', 'fase-07.5.A',
      'notes', 'GeoJSON polygons for administrative boundaries'
    )
  ),
  (
    'inegi_census',
    'geo',
    true,
    'Censo de Poblacion y Vivienda 2020 INEGI — dataset publico abierto',
    jsonb_build_object(
      'product', 'Censo 2020',
      'granularity', 'zone-level (colonia via alcaldia aggregation)',
      'added_by', 'fase-07.5.A',
      'notes', 'Population, profession and age distributions'
    )
  ),
  (
    'inegi_enigh',
    'geo',
    true,
    'Encuesta Nacional de Ingresos y Gastos de los Hogares 2022 INEGI — dataset publico abierto',
    jsonb_build_object(
      'product', 'ENIGH 2022',
      'granularity', 'zone-level (colonia via alcaldia aggregation)',
      'added_by', 'fase-07.5.A',
      'notes', 'Household income salary distributions'
    )
  ),
  (
    'inegi_inpc',
    'macro',
    true,
    'Indice Nacional de Precios al Consumidor INEGI — BIE API con token publico',
    jsonb_build_object(
      'product', 'INPC',
      'granularity', 'national monthly series',
      'added_by', 'fase-07.5.A',
      'notes', 'Consumer price index, BIE indicator 628194'
    )
  )
ON CONFLICT (source) DO UPDATE
SET
  category    = EXCLUDED.category,
  is_active   = true,
  legal_basis = EXCLUDED.legal_basis,
  meta        = public.ingest_allowed_sources.meta || EXCLUDED.meta;
