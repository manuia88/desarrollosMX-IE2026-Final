-- =====================================================================
-- Migration v31: SESIÓN 07.5.D — compute sources climate + constellations + ghost
--                + zone_topology_metrics table + ghost_zones_ranking.transition_probability
-- =====================================================================
-- Purpose (SESIÓN 07.5.D):
--   1) INSERT 3 `source` identifiers en ingest_allowed_sources para que los
--      compute wrappers logueen ingest_runs separados:
--        - compute_climate_signatures (script 10)
--        - compute_constellations     (script 11)
--        - compute_ghost_zones        (script 12)
--   2) CREATE TABLE public.zone_topology_metrics (nueva en 07.5.D):
--        degree_centrality + closeness_centrality + approximate_pagerank
--        por zone × snapshot_date. Persistencia del U-D-3 topology output.
--   3) ALTER TABLE public.ghost_zones_ranking ADD COLUMN transition_probability
--        numeric [0,1] nullable — U-D-4 prediction 12-month horizon.
--
-- Non-destructive:
--   - ingest_allowed_sources INSERT con ON CONFLICT DO UPDATE (idempotente).
--   - CREATE TABLE con IF NOT EXISTS (idempotente).
--   - ALTER TABLE ADD COLUMN nullable (zero data loss, sin default).
--
-- RLS:
--   zone_topology_metrics enable row level security + 2 policies
--   (public_read intentional_public + service_write role=service_role)
--   ambas cubiertas automáticamente por audit_rls_violations() v27
--   (comment 'intentional_public' OR role = service_role).
--
-- Sin audit_rls_allowlist bump — v27 dinámico cubre patrones estándar.
-- Category ingest_allowed_sources_category_check ∈ {macro, geo, market, derived}.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (1) ingest_allowed_sources: 3 compute sources
-- ---------------------------------------------------------------------
INSERT INTO public.ingest_allowed_sources (source, category, is_active, legal_basis, meta)
VALUES
  (
    'compute_climate_signatures',
    'derived',
    true,
    'Compute pipeline interno — derivación synthetic-heuristic-v1 climate data 2011-2026 (temperature, rainfall, humidity) por zone × mes determinístico (seed=zone_id,year,month). Populates climate_monthly_aggregates + climate_annual_summaries + climate_zone_signatures (vector 12-dim) + climate_twin_matches. Anomaly detection ±2σ.',
    jsonb_build_object(
      'product', 'Climate signatures + twin matches + anomaly detection (07.5.D U-D-2)',
      'granularity', 'zone-level monthly 15y historical',
      'added_by', 'fase-07.5.D',
      'notes', 'Zero LLM, zero external API. data_source=heuristic_v1 (CHECK climate_monthly_aggregates_source_check). Anomaly flags persisted en extreme_events_count.anomalies_flags jsonb cuando |temp_observed - mean_15y_month| > 2σ.'
    )
  ),
  (
    'compute_constellations',
    'derived',
    true,
    'Compute pipeline interno — derivación edges inter-colonia + clusters + topology metrics. 4 edge types (demographic_flow + economic_complement + cultural_affinity + spatial_adjacency) en edge_types jsonb; clusters Louvain-approx; centrality metrics (degree + closeness + pagerank).',
    jsonb_build_object(
      'product', 'Zone constellations edges + clusters + topology (07.5.D U-D-3)',
      'granularity', 'pair-level colonia × colonia × period_date',
      'added_by', 'fase-07.5.D',
      'notes', 'threshold edge_weight >= 0.3 para evitar explosion combinatorial. topology metrics persistidas en zone_topology_metrics (una snapshot por run).'
    )
  ),
  (
    'compute_ghost_zones',
    'derived',
    true,
    'Compute pipeline interno — ghost_score composite 0-100 (pulse trend 30% + price stagnant 25% + demographics aging 20% + occupancy low 25%) + transition probability 12-month logistic regression.',
    jsonb_build_object(
      'product', 'Ghost zones ranking + transition prediction (07.5.D U-D-4)',
      'granularity', 'colonia-level monthly',
      'added_by', 'fase-07.5.D',
      'notes', 'Threshold ghost = ghost_score > 60. Transition probability sigmoid logistic combinando ghost_score current + pulse_momentum_12m_slope + dna_similarity_to_top5_ghosts.'
    )
  )
ON CONFLICT (source) DO UPDATE
SET
  category    = EXCLUDED.category,
  is_active   = true,
  legal_basis = EXCLUDED.legal_basis,
  meta        = public.ingest_allowed_sources.meta || EXCLUDED.meta;

-- ---------------------------------------------------------------------
-- (2) zone_topology_metrics — new table for U-D-3 topology output
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.zone_topology_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  degree_centrality integer NOT NULL DEFAULT 0,
  closeness_centrality numeric NOT NULL DEFAULT 0,
  approximate_pagerank numeric NOT NULL DEFAULT 0,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zone_id, snapshot_date),
  CHECK (degree_centrality >= 0),
  CHECK (closeness_centrality >= 0),
  CHECK (approximate_pagerank >= 0)
);

CREATE INDEX IF NOT EXISTS zone_topology_metrics_zone_idx
  ON public.zone_topology_metrics (zone_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS zone_topology_metrics_snapshot_idx
  ON public.zone_topology_metrics (snapshot_date, approximate_pagerank DESC);

ALTER TABLE public.zone_topology_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY zone_topology_metrics_public_read
  ON public.zone_topology_metrics
  FOR SELECT
  USING (true);

COMMENT ON POLICY zone_topology_metrics_public_read
  ON public.zone_topology_metrics IS
  'RATIONALE intentional_public: topology metrics (degree + closeness + pagerank) son '
  'features agregadas del producto Zone Constellations sin PII; mismo tratamiento '
  'público que zone_constellation_clusters.';

CREATE POLICY zone_topology_metrics_service_write
  ON public.zone_topology_metrics
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON POLICY zone_topology_metrics_service_write
  ON public.zone_topology_metrics IS
  'RATIONALE intentional_public: service_role cron compute_constellations mensual.';

COMMENT ON TABLE public.zone_topology_metrics IS
  'SESIÓN 07.5.D U-D-3: topology metrics (degree_centrality + closeness_centrality + '
  'approximate_pagerank) per zone × snapshot_date. Computadas offline en '
  '11_compute-constellations-edges.ts sobre zone_constellations_edges (iterative '
  'pagerank 10 rounds damping 0.85, closeness via BFS approx).';

-- ---------------------------------------------------------------------
-- (3) ghost_zones_ranking: ADD COLUMN transition_probability (U-D-4)
-- ---------------------------------------------------------------------
ALTER TABLE public.ghost_zones_ranking
  ADD COLUMN IF NOT EXISTS transition_probability numeric NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ghost_zones_ranking_transition_probability_check'
  ) THEN
    ALTER TABLE public.ghost_zones_ranking
      ADD CONSTRAINT ghost_zones_ranking_transition_probability_check
      CHECK (transition_probability IS NULL OR (transition_probability >= 0 AND transition_probability <= 1));
  END IF;
END
$$;

COMMENT ON COLUMN public.ghost_zones_ranking.transition_probability IS
  'SESIÓN 07.5.D U-D-4: probabilidad [0,1] de que la colonia transicione a ghost '
  'durante los próximos 12 meses. Sigmoid logistic regression combinando '
  'ghost_score current + pulse_momentum_12m_slope + dna_similarity_to_top5_ghosts_avg. '
  'NULL permitido para rows históricos pre-07.5.D.';
