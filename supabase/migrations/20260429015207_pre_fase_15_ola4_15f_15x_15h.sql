-- Pre-FASE 15 OLA 4 cierre — 15.F UPG 7.10 + 15.X Moonshots + 15.H Plans + B.5 BI Export
-- Reusa SECDEF helpers shipped: dev_owns_project, dev_owns_unit (commit 338f4ff)

CREATE TABLE public.developer_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  period_quarter text NOT NULL,
  metric text NOT NULL CHECK (metric IN ('absorcion','days_on_market','trust_score','visit_to_close','nps','time_delivery_vs_planned')),
  value numeric NOT NULL,
  percentile int NOT NULL CHECK (percentile >= 0 AND percentile <= 100),
  cohort_size int NOT NULL DEFAULT 0,
  cohort_median numeric,
  cohort_top10 numeric,
  cohort_top25 numeric,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT developer_benchmarks_unique UNIQUE (desarrolladora_id, period_quarter, metric)
);
CREATE INDEX idx_dev_benchmarks_dev_period ON public.developer_benchmarks(desarrolladora_id, period_quarter DESC);
COMMENT ON TABLE public.developer_benchmarks IS '15.F UPG 84 E06 Benchmark — dev vs cohort percentile MX. Cron quarterly recompute.';

CREATE TABLE public.feasibility_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  zone_id uuid,
  catastro_link text,
  geometry_geojson jsonb,
  programa_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  cash_flow_5y jsonb,
  irr_5y numeric,
  irr_10y numeric,
  npv_mxn numeric,
  break_even_month int,
  pmf_score int,
  comparables jsonb DEFAULT '[]'::jsonb,
  sensitivity_analysis jsonb DEFAULT '{}'::jsonb,
  pdf_url text,
  cost_usd numeric(8,4),
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feasibility_user ON public.feasibility_reports(user_id, created_at DESC);
CREATE INDEX idx_feasibility_dev ON public.feasibility_reports(desarrolladora_id, created_at DESC);
COMMENT ON TABLE public.feasibility_reports IS '15.F UPG 85 I03 Feasibility auto con Catastro link + cash flow + IRR + NPV.';

CREATE TABLE public.simulator_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ubicacion_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  tipologia_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_absorcion_meses numeric,
  output_revenue_mxn numeric,
  output_cost_mxn numeric,
  output_irr numeric,
  output_npv numeric,
  output_break_even_month int,
  output_sensitivity jsonb DEFAULT '{}'::jsonb,
  output_comparables jsonb DEFAULT '[]'::jsonb,
  output_risk_flags jsonb DEFAULT '[]'::jsonb,
  output_pmf_score int,
  pdf_url text,
  cost_usd numeric(8,4),
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_simulator_user ON public.simulator_runs(user_id, created_at DESC);
COMMENT ON TABLE public.simulator_runs IS '15.X.1 Simulador Proyecto — consume 15 indices DMX + B03/B04/B08/B12.';

CREATE TABLE public.committee_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  feasibility_id uuid REFERENCES public.feasibility_reports(id) ON DELETE SET NULL,
  thesis_summary text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  pdf_url text,
  word_url text,
  cost_usd numeric(8,4),
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_committee_dev ON public.committee_reports(desarrolladora_id, created_at DESC);
CREATE INDEX idx_committee_proyecto ON public.committee_reports(proyecto_id);
COMMENT ON TABLE public.committee_reports IS '15.X.3 Investment Committee Memo. Quota Pro 5/mo, Enterprise unlimited.';

CREATE TABLE public.pipeline_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  zone_id uuid,
  status text,
  avance_obra_pct numeric(5,2),
  absorcion_actual numeric,
  absorcion_benchmark numeric,
  absorcion_delta_pct numeric,
  precio_m2_mxn numeric,
  precio_m2_zone_median numeric,
  precio_delta_pct numeric,
  dmx_score numeric,
  trust_score numeric,
  alerts jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_snapshots_unique UNIQUE (proyecto_id, snapshot_date)
);
CREATE INDEX idx_pipeline_dev_date ON public.pipeline_snapshots(desarrolladora_id, snapshot_date DESC);
CREATE INDEX idx_pipeline_proyecto ON public.pipeline_snapshots(proyecto_id, snapshot_date DESC);
COMMENT ON TABLE public.pipeline_snapshots IS '15.X.4 Pipeline Tracker daily. Cron snapshot proyectos del dev vs market zone median.';

ALTER TABLE public.developer_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feasibility_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulator_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY developer_benchmarks_select ON public.developer_benchmarks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = developer_benchmarks.desarrolladora_id)
  );
CREATE POLICY developer_benchmarks_system_insert ON public.developer_benchmarks
  FOR INSERT WITH CHECK (true);
CREATE POLICY developer_benchmarks_system_update ON public.developer_benchmarks
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY feasibility_reports_select ON public.feasibility_reports
  FOR SELECT USING (
    user_id = auth.uid()
    OR (desarrolladora_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.desarrolladora_id = feasibility_reports.desarrolladora_id
    ))
  );
CREATE POLICY feasibility_reports_insert ON public.feasibility_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY feasibility_reports_delete ON public.feasibility_reports
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY simulator_runs_select ON public.simulator_runs
  FOR SELECT USING (
    user_id = auth.uid()
    OR (desarrolladora_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.desarrolladora_id = simulator_runs.desarrolladora_id
    ))
  );
CREATE POLICY simulator_runs_insert ON public.simulator_runs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY simulator_runs_delete ON public.simulator_runs
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY committee_reports_select ON public.committee_reports
  FOR SELECT USING (
    user_id = auth.uid()
    OR (desarrolladora_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.desarrolladora_id = committee_reports.desarrolladora_id
    ))
  );
CREATE POLICY committee_reports_insert ON public.committee_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY pipeline_snapshots_select ON public.pipeline_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = pipeline_snapshots.desarrolladora_id)
  );
CREATE POLICY pipeline_snapshots_system_insert ON public.pipeline_snapshots
  FOR INSERT WITH CHECK (true);

CREATE OR REPLACE VIEW public.v_bi_export_developer AS
SELECT
  p.id AS proyecto_id,
  p.nombre AS proyecto_nombre,
  p.desarrolladora_id,
  p.zone_id,
  p.status AS proyecto_status,
  p.units_total,
  p.units_available,
  p.price_min_mxn,
  p.price_max_mxn,
  d.name AS desarrolladora_name,
  d.country_code,
  COALESCE((SELECT score_overall FROM public.dev_trust_scores WHERE desarrolladora_id = d.id LIMIT 1), 0) AS trust_score,
  (SELECT COUNT(*) FROM public.unidades u WHERE u.proyecto_id = p.id AND u.status = 'vendida') AS unidades_vendidas,
  (SELECT COUNT(*) FROM public.unidades u WHERE u.proyecto_id = p.id AND u.status = 'apartada') AS unidades_apartadas,
  p.created_at,
  p.updated_at
FROM public.proyectos p
JOIN public.desarrolladoras d ON d.id = p.desarrolladora_id
WHERE p.is_active = true;

COMMENT ON VIEW public.v_bi_export_developer IS '15.H.3 B.5 BI export Enterprise tier — Power BI/Tableau/Looker/CSV consumption.';
