-- =====================================================================
-- Migration v32: SESIÓN 07.5.E — compute source atlas wiki Haiku LLM
-- =====================================================================
-- Purpose (SESIÓN 07.5.E):
--   INSERT-only idempotente.
--   Agregar 1 nueva fuente compute al registro ingest_allowed_sources:
--     1) compute_atlas_wiki (derived) — Haiku 4.5 LLM narrative per colonia × 8 sections
-- Safety:
--   - INSERT ON CONFLICT (source) DO UPDATE (idempotente).
--   - Zero DDL destructivo.
--   - Zero data loss.
-- =====================================================================

BEGIN;

INSERT INTO public.ingest_allowed_sources (source, category, is_active, legal_basis, meta)
VALUES
  (
    'compute_atlas_wiki',
    'derived',
    true,
    'Compute pipeline interno — generación narrativa multi-seccional Haiku 4.5 LLM (claude-haiku-4-5-20251001) per colonia. Integra contexto: zones + zone_scores + dmx_indices + zone_pulse_scores + pulse_forecasts + colonia_dna_vectors + ghost_zones_ranking + climate_zone_signatures + zone_constellations_edges + inegi_census_zone_stats + enigh_zone_income. Populates colonia_wiki_entries (content_md + sections jsonb 8 sections overview/demographics/climate/pulse_trend/ghost_status/twin_cities/cultural_vibes/best_for). Prompt caching ON (system+schema+examples cacheados). Explainability meta: sources_consulted + facts_cited + generation_seed + token_usage + cost_usd per entry.',
    jsonb_build_object(
      'product', 'Atlas wiki narrative Haiku LLM (07.5.E U-E-1+U-E-2+U-E-4)',
      'granularity', 'colonia × entry × 8 structured sections',
      'model', 'claude-haiku-4-5-20251001',
      'temperature', 0.3,
      'max_tokens_output', 1500,
      'prompt_caching', true,
      'budget_cap_usd_per_run', 3.00,
      'added_by', 'fase-07.5.E',
      'session', 'fase-07.5.E'
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
--   WHERE source = 'compute_atlas_wiki';
-- Expected: 1 row, category='derived', is_active=true.
-- =====================================================================
