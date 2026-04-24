-- =====================================================================
-- Migration v29: add compute pipeline sources for IE + DMX batch
-- =====================================================================
-- Purpose: introduce 6 `source` identifiers so the IE compute batch
-- (zone_scores N0-N4) and the 15 DMX indices batch can each log their
-- own ingest_runs / ingest_watermarks rows separately from raw data
-- ingestion sources.
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
    'compute_ie_n0',
    'derived',
    true,
    'Compute pipeline interno — derivacion de zone_scores N0 desde datos ya ingestados (no consume fuente externa)',
    jsonb_build_object(
      'product', 'IE compute N0',
      'granularity', 'zone-level',
      'added_by', 'fase-07.5.B',
      'notes', 'Foundational zone scores (F01-F07, H01-H11, A01-A04, B12, D07, N01-N11)'
    )
  ),
  (
    'compute_ie_n1',
    'derived',
    true,
    'Compute pipeline interno — derivacion de zone_scores N1 desde N0',
    jsonb_build_object(
      'product', 'IE compute N1',
      'granularity', 'zone-level',
      'added_by', 'fase-07.5.B',
      'notes', 'Causal zone scores (F08, F12, H07, A02, A05, A06, A12, B01, B02, B04, B07, B08, D05, D06, H05, H14, F15, H17)'
    )
  ),
  (
    'compute_ie_n2',
    'derived',
    true,
    'Compute pipeline interno — derivacion de zone_scores N2 desde N0/N1',
    jsonb_build_object(
      'product', 'IE compute N2',
      'granularity', 'zone-level',
      'added_by', 'fase-07.5.B',
      'notes', 'Predictive zone scores (F09, F10, B03, B05, B09, B10, B13, B14, B15, C01, C03, D03, H12, H16, D11)'
    )
  ),
  (
    'compute_ie_n3',
    'derived',
    true,
    'Compute pipeline interno — derivacion de zone_scores N3 desde N0/N1/N2',
    jsonb_build_object(
      'product', 'IE compute N3',
      'granularity', 'zone-level',
      'added_by', 'fase-07.5.B',
      'notes', 'Prescriptive zone scores (A07-A11, B06, B11, C04, C06, D04, H13, H15)'
    )
  ),
  (
    'compute_ie_n4',
    'derived',
    true,
    'Compute pipeline interno — derivacion de zone_scores N4 desde N0/N1/N2/N3',
    jsonb_build_object(
      'product', 'IE compute N4',
      'granularity', 'zone-level',
      'added_by', 'fase-07.5.B',
      'notes', 'Multi-tenant institutional scores (E01, G01, E02, E03, E04, D09, D02)'
    )
  ),
  (
    'compute_dmx_indices',
    'derived',
    true,
    'Compute pipeline interno — 15 indices DMX (IPV, IAB, IDS, IRE, ICO, MOM, LIV, FAM, YNG, GRN, STR, INV, DEV, GNT, STA) derivados de zone_scores + fuentes base',
    jsonb_build_object(
      'product', 'DMX indices compute',
      'granularity', 'zone-level (colonia/alcaldia/city/estado)',
      'added_by', 'fase-07.5.B',
      'notes', 'Persists to dmx_indices table; ranking/percentile post-pass'
    )
  )
ON CONFLICT (source) DO UPDATE
SET
  category    = EXCLUDED.category,
  is_active   = true,
  legal_basis = EXCLUDED.legal_basis,
  meta        = public.ingest_allowed_sources.meta || EXCLUDED.meta;
