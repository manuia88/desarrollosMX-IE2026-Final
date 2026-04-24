-- =====================================================================
-- Migration v33: SESIÓN 07.5.F — validation + audit sources
-- =====================================================================
-- Purpose (SESIÓN 07.5.F):
--   INSERT-only idempotente.
--   Agregar 2 nuevas fuentes derived al registro ingest_allowed_sources:
--     1) audit_fk_zones (derived) — audit FK integrity zones.id coverage
--     2) validation_e2e_fase_07.5 (derived) — E2E cross-layer smoke test
-- Safety:
--   - INSERT ON CONFLICT (source) DO UPDATE (idempotente).
--   - Zero DDL destructivo.
--   - Zero data loss.
-- =====================================================================

BEGIN;

INSERT INTO public.ingest_allowed_sources (source, category, is_active, legal_basis, meta)
VALUES
  (
    'audit_fk_zones',
    'derived',
    true,
    'Audit interno de integridad referencial sobre public.zones(id). Scan information_schema detecta tablas con columnas zone_id/colonia_id/scope_id, verifica FK enforcement y reporta orphan references cuando la FK aún no está ALTER-añadida (L-NEW13 agenda FK enforcement FASE 08 post-Opción D). Zero-tolerance: si orphan_count > 0 en cualquier tabla, pipeline STOP y reporta sample IDs huérfanos.',
    jsonb_build_object(
      'product', 'FK integrity audit zones references (07.5.F B.2)',
      'scope', 'information_schema + runtime SELECT COUNT orphans',
      'granularity', 'table × column × orphan_count × sample_ids',
      'fk_enforcement_status', 'deferred (L-NEW13 FASE 08)',
      'cost', 'zero (solo SELECT queries metadata + data)',
      'added_by', 'fase-07.5.F',
      'session', 'fase-07.5.F'
    )
  ),
  (
    'validation_e2e_fase_07.5',
    'derived',
    true,
    'Validación integración E2E FASE 07.5 cross-9-layers. Smoke test sobre zone representativa (default roma-norte) cruzando data capas: zone_scores (N0-N4) · dmx_indices (14 códigos) · zone_pulse_scores (daily 12m) · pulse_forecasts (H+30d) · colonia_dna_vectors (64-dim) · climate_zone_signatures + climate_monthly_aggregates (12m) · zone_constellations_edges (top 5) + zone_topology_metrics · ghost_zones_ranking · colonia_wiki_entries. Cada capa debe retornar >0 rows o flag WARNING + reporte estructurado. Zero cost (SELECT-only).',
    jsonb_build_object(
      'product', 'E2E integration validation FASE 07.5 (07.5.F B.1)',
      'scope', '9 data layers cross-reference per zone',
      'granularity', 'zone × 9 layers × counts + sample fields',
      'default_zone', 'roma-norte',
      'cost', 'zero (solo SELECT queries)',
      'added_by', 'fase-07.5.F',
      'session', 'fase-07.5.F'
    )
  )
ON CONFLICT (source) DO UPDATE
  SET category = EXCLUDED.category,
      is_active = EXCLUDED.is_active,
      legal_basis = EXCLUDED.legal_basis,
      meta = EXCLUDED.meta;

COMMIT;

-- =====================================================================
-- Post-apply validation (manual):
-- =====================================================================
-- SELECT source, category, is_active FROM public.ingest_allowed_sources
--   WHERE source IN ('audit_fk_zones', 'validation_e2e_fase_07.5');
-- Expected: 2 rows, category='derived', is_active=true.
-- =====================================================================
