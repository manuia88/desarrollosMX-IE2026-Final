-- Pre-FASE 15 OLA 1 ventanas 2+3 BD gap closure
-- Reference: ADR-060 + M13 + M15 APPEND v3
-- Tablas para M13 (CRM + B.6 lead scoring + B.7 journey builder) + M15 (Dynamic Pricing + Competitor Radar)
-- Reusa SECDEF helpers shipped: dev_owns_project, asesor_authorized_broker, dev_owns_unit (commit 338f4ff)
-- Schema real leads: assigned_asesor_id (NO asesor_id)

-- =====================================================================
-- M13 + B.6 — LEAD_SCORES (anchor 21x conversion <5min Onyx)
-- =====================================================================

CREATE TABLE public.lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text NOT NULL DEFAULT 'c01-v1',
  computed_at timestamptz NOT NULL DEFAULT now(),
  ttl_until timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_scores_lead_unique UNIQUE (lead_id)
);
CREATE INDEX idx_lead_scores_score ON public.lead_scores(score DESC) WHERE score > 0;
CREATE INDEX idx_lead_scores_ttl ON public.lead_scores(ttl_until) WHERE score > 0;
COMMENT ON TABLE public.lead_scores IS 'B.6 Lead scoring C01 IA cache 0-100. Calculator engine + cron lead_score_recompute_hourly.';

-- =====================================================================
-- M13 + B.7 — MARKETING_JOURNEYS + JOURNEY_EXECUTIONS (anchor -30% ciclo ventas)
-- =====================================================================

CREATE TABLE public.marketing_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger_event text NOT NULL CHECK (trigger_event IN ('lead_created','lead_score_changed','visit_scheduled','offer_sent','days_no_activity','aniversary_apartado')),
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_marketing_journeys_dev ON public.marketing_journeys(desarrolladora_id) WHERE active = true;
CREATE INDEX idx_marketing_journeys_proyecto ON public.marketing_journeys(proyecto_id) WHERE active = true;
CREATE INDEX idx_marketing_journeys_trigger ON public.marketing_journeys(trigger_event) WHERE active = true;
COMMENT ON TABLE public.marketing_journeys IS 'B.7 Journey builder. Steps jsonb array of {type, config, wait_minutes}. Templates seed bienvenida/follow-up/abandono/aniversario/drip.';

CREATE TABLE public.journey_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.marketing_journeys(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  current_step int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_executed_at timestamptz,
  next_run_at timestamptz,
  error_log jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journey_executions_lead_unique UNIQUE (journey_id, lead_id)
);
CREATE INDEX idx_journey_executions_status ON public.journey_executions(status, next_run_at) WHERE status IN ('pending','running');
CREATE INDEX idx_journey_executions_lead ON public.journey_executions(lead_id);
COMMENT ON TABLE public.journey_executions IS 'B.7 Journey runtime. Cron journey_executor_hourly evaluates pending + executes step.';

-- =====================================================================
-- M15.E.8 — DYNAMIC_PRICING_SUGGESTIONS (GC-87 Onyx M3)
-- =====================================================================

CREATE TABLE public.dynamic_pricing_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  current_price_mxn numeric(14,2) NOT NULL,
  suggested_price_mxn numeric(14,2) NOT NULL,
  delta_pct numeric(7,4) NOT NULL,
  reasoning text,
  confidence text CHECK (confidence IN ('high','medium','low','insufficient_data')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  applied boolean NOT NULL DEFAULT false,
  applied_at timestamptz,
  applied_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dynamic_pricing_unidad ON public.dynamic_pricing_suggestions(unidad_id, created_at DESC);
CREATE INDEX idx_dynamic_pricing_expires ON public.dynamic_pricing_suggestions(expires_at) WHERE applied = false;
COMMENT ON TABLE public.dynamic_pricing_suggestions IS 'M15.E.8 Dynamic Pricing daily cron output. Toggle Auto-apply Pro+ tier.';

-- =====================================================================
-- M15.E.9 — COMPETITOR_MONITORS + COMPETITOR_ALERTS (GC-88 Onyx M5/M2)
-- =====================================================================

CREATE TABLE public.competitor_monitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  my_proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  competitor_proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  competitor_external_name text,
  competitor_external_url text,
  metrics_tracked jsonb NOT NULL DEFAULT '["price","inventory","avance","ads"]'::jsonb,
  last_checked_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competitor_monitors_target_check CHECK (competitor_proyecto_id IS NOT NULL OR competitor_external_name IS NOT NULL)
);
CREATE INDEX idx_competitor_monitors_my ON public.competitor_monitors(my_proyecto_id) WHERE active = true;
COMMENT ON TABLE public.competitor_monitors IS 'M15.E.9 Competitor Radar config. Pro+ 10 monitors / Enterprise unlimited.';

CREATE TABLE public.competitor_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id uuid NOT NULL REFERENCES public.competitor_monitors(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('new_launch','price_change','inventory_change','avance_change','ad_visible','review_change')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_narrative text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_competitor_alerts_monitor ON public.competitor_alerts(monitor_id, detected_at DESC);
CREATE INDEX idx_competitor_alerts_unread ON public.competitor_alerts(monitor_id) WHERE read_at IS NULL;
COMMENT ON TABLE public.competitor_alerts IS 'M15.E.9 Competitor Radar alerts feed. Cron competitor_radar_daily detects.';

-- =====================================================================
-- ENABLE RLS
-- =====================================================================

ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_pricing_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SECDEF helper: lead_belongs_to_dev_or_asesor (uses auth.uid)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.lead_belongs_to_dev_or_asesor(p_lead_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = p_lead_id
      AND (
        l.assigned_asesor_id = auth.uid()
        OR l.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin','mb_coordinator','broker_manager')
        )
      )
  );
$$;
COMMENT ON FUNCTION public.lead_belongs_to_dev_or_asesor(uuid) IS 'intentional_security_definer: lead access check via assigned_asesor_id/user_id or dev/superadmin role (uses auth.uid)';

-- =====================================================================
-- RLS POLICIES (16 total)
-- =====================================================================

CREATE POLICY lead_scores_select ON public.lead_scores
  FOR SELECT USING (public.lead_belongs_to_dev_or_asesor(lead_id));
CREATE POLICY lead_scores_system_insert ON public.lead_scores
  FOR INSERT WITH CHECK (true);
CREATE POLICY lead_scores_system_update ON public.lead_scores
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY marketing_journeys_select ON public.marketing_journeys
  FOR SELECT USING (
    created_by = auth.uid()
    OR (proyecto_id IS NOT NULL AND public.dev_owns_project(proyecto_id))
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.desarrolladora_id = marketing_journeys.desarrolladora_id
    )
  );
CREATE POLICY marketing_journeys_insert ON public.marketing_journeys
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (proyecto_id IS NULL OR public.dev_owns_project(proyecto_id))
  );
CREATE POLICY marketing_journeys_update ON public.marketing_journeys
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (proyecto_id IS NOT NULL AND public.dev_owns_project(proyecto_id))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (proyecto_id IS NOT NULL AND public.dev_owns_project(proyecto_id))
  );
CREATE POLICY marketing_journeys_delete ON public.marketing_journeys
  FOR DELETE USING (created_by = auth.uid());

CREATE POLICY journey_executions_select ON public.journey_executions
  FOR SELECT USING (
    public.lead_belongs_to_dev_or_asesor(lead_id)
    OR EXISTS (
      SELECT 1 FROM public.marketing_journeys j
      WHERE j.id = journey_executions.journey_id
        AND j.created_by = auth.uid()
    )
  );
CREATE POLICY journey_executions_system_insert ON public.journey_executions
  FOR INSERT WITH CHECK (true);
CREATE POLICY journey_executions_system_update ON public.journey_executions
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY dynamic_pricing_select ON public.dynamic_pricing_suggestions
  FOR SELECT USING (public.dev_owns_unit(unidad_id));
CREATE POLICY dynamic_pricing_system_insert ON public.dynamic_pricing_suggestions
  FOR INSERT WITH CHECK (true);
CREATE POLICY dynamic_pricing_dev_update ON public.dynamic_pricing_suggestions
  FOR UPDATE USING (public.dev_owns_unit(unidad_id))
  WITH CHECK (public.dev_owns_unit(unidad_id));

CREATE POLICY competitor_monitors_select ON public.competitor_monitors
  FOR SELECT USING (public.dev_owns_project(my_proyecto_id));
CREATE POLICY competitor_monitors_insert ON public.competitor_monitors
  FOR INSERT WITH CHECK (public.dev_owns_project(my_proyecto_id));
CREATE POLICY competitor_monitors_update ON public.competitor_monitors
  FOR UPDATE USING (public.dev_owns_project(my_proyecto_id))
  WITH CHECK (public.dev_owns_project(my_proyecto_id));
CREATE POLICY competitor_monitors_delete ON public.competitor_monitors
  FOR DELETE USING (public.dev_owns_project(my_proyecto_id));

CREATE POLICY competitor_alerts_select ON public.competitor_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.competitor_monitors m
      WHERE m.id = competitor_alerts.monitor_id
        AND public.dev_owns_project(m.my_proyecto_id)
    )
  );
CREATE POLICY competitor_alerts_system_insert ON public.competitor_alerts
  FOR INSERT WITH CHECK (true);
CREATE POLICY competitor_alerts_dev_update ON public.competitor_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.competitor_monitors m
      WHERE m.id = competitor_alerts.monitor_id
        AND public.dev_owns_project(m.my_proyecto_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competitor_monitors m
      WHERE m.id = competitor_alerts.monitor_id
        AND public.dev_owns_project(m.my_proyecto_id)
    )
  );

-- Triggers updated_at
DROP TRIGGER IF EXISTS marketing_journeys_set_updated_at ON public.marketing_journeys;
CREATE TRIGGER marketing_journeys_set_updated_at
  BEFORE UPDATE ON public.marketing_journeys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS competitor_monitors_set_updated_at ON public.competitor_monitors;
CREATE TRIGGER competitor_monitors_set_updated_at
  BEFORE UPDATE ON public.competitor_monitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
