-- =====================================================================
-- Migration v30: add compute pulse + forecasts + colonia DNA sources
-- =====================================================================
-- Purpose: introduce 3 `source` identifiers so the SESIÓN 07.5.C compute
-- scripts (zone-pulse histórico 365d, pulse forecasts H+30d, colonia DNA
-- 64-dim vectors) can each log their own ingest_runs / ingest_watermarks
-- rows separately from raw data + IE/DMX compute sources.
--
-- Scope: INSERT only on public.ingest_allowed_sources.
-- No DDL, no RLS changes, no SECDEF functions, no ALTER TABLE.
-- Idempotent via ON CONFLICT (source) DO UPDATE.
--
-- Category values must satisfy
--   ingest_allowed_sources_category_check ∈ {macro, geo, market, derived}
-- Compute pipelines produce derived data, hence category='derived'.
-- =====================================================================

INSERT INTO public.ingest_allowed_sources (source, category, is_active, legal_basis, meta)
VALUES
  (
    'compute_zone_pulse',
    'derived',
    true,
    'Compute pipeline interno — derivacion de zone_pulse_scores daily 365d desde zone_scores N0-N4 + DMX indices (no consume fuente externa)',
    jsonb_build_object(
      'product', 'Zone pulse histórico 12m',
      'granularity', 'zone-level daily',
      'added_by', 'fase-07.5.C',
      'notes', 'Synthetic-derived-v1 deterministic: momentum + volatility + activity_index per zone per day. Fallback determinístico seed=(scope_id,day) cuando raw signals ausentes.'
    )
  ),
  (
    'compute_pulse_forecasts',
    'derived',
    true,
    'Compute pipeline interno — forecasts H+30d desde zone_pulse_scores últimos 90d (moving average window 30d + stddev bands ±1σ)',
    jsonb_build_object(
      'product', 'Zone pulse forecasts',
      'granularity', 'zone-level H+30d',
      'added_by', 'fase-07.5.C',
      'notes', 'Zero LLM. methodology=moving_avg_v1. Persists value + value_lower (mean-σ) + value_upper (mean+σ) en pulse_forecasts.'
    )
  ),
  (
    'compute_colonia_dna',
    'derived',
    true,
    'Compute pipeline interno — colonia DNA 64-dim vectors L2-normalized desde N-scores + DMX + demographics + macro + h3 (zero LLM)',
    jsonb_build_object(
      'product', 'Colonia DNA 64-dim',
      'granularity', 'colonia-level (scope_type=colonia country=MX)',
      'added_by', 'fase-07.5.C',
      'notes', 'Feature vector 64 dims (N23+DMX14+DEMO10+MACRO5+H3_3+PAD9). L2-normalized unit vector. Stores top_5_contributors en components jsonb para explainability.'
    )
  )
ON CONFLICT (source) DO UPDATE
SET
  category    = EXCLUDED.category,
  is_active   = true,
  legal_basis = EXCLUDED.legal_basis,
  meta        = public.ingest_allowed_sources.meta || EXCLUDED.meta;
