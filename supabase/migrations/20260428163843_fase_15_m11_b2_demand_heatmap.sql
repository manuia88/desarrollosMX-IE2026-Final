-- FASE 15 v3 — B.2 Unit-level demand heatmap (Onyx M2 anchor +30% eficiencia op)
-- Reference: ADR-060 + M11 APPEND v3
-- Memoria 13 escalable: jsonb extensible para futuras señales (wishlist H2 + busqueda_matches H2)

-- =====================================================================
-- B.2 — Agregar columnas demand a unidades (RLS inherited)
-- =====================================================================

ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS demand_score_30d int NOT NULL DEFAULT 0
    CHECK (demand_score_30d >= 0 AND demand_score_30d <= 100),
  ADD COLUMN IF NOT EXISTS demand_signals jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Computed column color (rojo<30 / ámbar 30-70 / verde>70)
ALTER TABLE public.unidades
  ADD COLUMN IF NOT EXISTS demand_color text GENERATED ALWAYS AS (
    CASE
      WHEN demand_score_30d < 30 THEN 'red'
      WHEN demand_score_30d < 70 THEN 'amber'
      ELSE 'green'
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_unidades_demand_score ON public.unidades(demand_score_30d DESC) WHERE demand_score_30d > 0;
CREATE INDEX IF NOT EXISTS idx_unidades_demand_color ON public.unidades(demand_color);

COMMENT ON COLUMN public.unidades.demand_score_30d IS 'B.2 demand heatmap unit-level 0-100 calculado cron diario. Señales: 60% landing_analytics + 25% qr_codes.scan_count + 15% busquedas.matched_count (wishlist + busqueda_matches diferida H2 via demand_signals.is_partial_signal=true).';
COMMENT ON COLUMN public.unidades.demand_signals IS 'B.2 demand signals breakdown jsonb extensible. Schema actual: { landing_views_30d, qr_scans_total, busquedas_matched_total, project_age_days, is_partial_signal: true, missing_signals: [wishlist, busqueda_matches] }';
COMMENT ON COLUMN public.unidades.demand_color IS 'B.2 derived color rojo/ámbar/verde para UI grid M11 unit cards.';
