-- Pre-FASE 15 OLA 2 BD gap closure
-- Reference: ADR-060 + plan ola 2 (15.A + 15.D.2)
-- Tablas para 15.A.4 Site Selection AI + 15.D.2 M14 Marketing Dev (campaigns + B.4 attribution)
-- Reusa SECDEF helpers shipped: dev_owns_project, dev_owns_unit (commit 338f4ff)
-- Reusa lead_belongs_to_dev_or_asesor (commit c8805da) para attribution_events

-- =====================================================================
-- 15.A.4 — SITE_SELECTION_QUERIES (Site Selection AI cache + history)
-- =====================================================================

CREATE TABLE public.site_selection_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query_text text NOT NULL,
  parsed_intent jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  output_listings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_narrative text,
  cost_usd numeric(8,4),
  duration_ms int,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_site_selection_user ON public.site_selection_queries(user_id, created_at DESC);
CREATE INDEX idx_site_selection_dev ON public.site_selection_queries(desarrolladora_id, created_at DESC);
COMMENT ON TABLE public.site_selection_queries IS '15.A.4 Site Selection AI (GC-81). Claude Sonnet function-calling cache + history Pro+ tier ~$0.50 USD/query.';

-- =====================================================================
-- 15.D.2 — CAMPAIGNS (M14 wizard launch/promo/evento/branding)
-- =====================================================================

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  proyecto_ids uuid[] NOT NULL DEFAULT '{}',
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('launch','promo','evento','branding')),
  presupuesto_mxn numeric(14,2) NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  canales jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','cancelled')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaigns_dev ON public.campaigns(desarrolladora_id) WHERE status IN ('draft','active','paused');
CREATE INDEX idx_campaigns_status ON public.campaigns(status, end_date);
COMMENT ON TABLE public.campaigns IS '15.D.2 M14 Marketing Dev wizard. Tipos: launch/promo/evento/branding.';

-- =====================================================================
-- 15.D.2 — CAMPAIGN_CREATIVES (assets variantes Meta/IG/Story/Video)
-- =====================================================================

CREATE TABLE public.campaign_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  variant text NOT NULL CHECK (variant IN ('postCuadrado','postLargo','story','videoStory','video','email','wa')),
  url text NOT NULL,
  preview_url text,
  ai_generated boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_creatives_campaign ON public.campaign_creatives(campaign_id);
COMMENT ON TABLE public.campaign_creatives IS '15.D.2 Assets por variant. AI-generated flag para tracking Studio video CF.2.';

-- =====================================================================
-- 15.D.2 — CAMPAIGN_ANALYTICS (daily aggregations CTR/CPL/CAC)
-- =====================================================================

CREATE TABLE public.campaign_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  date date NOT NULL,
  channel text NOT NULL,
  impressions int NOT NULL DEFAULT 0,
  clicks int NOT NULL DEFAULT 0,
  spend_mxn numeric(12,2) NOT NULL DEFAULT 0,
  leads int NOT NULL DEFAULT 0,
  conversions int NOT NULL DEFAULT 0,
  ctr numeric(8,6),
  cpl_mxn numeric(10,2),
  cac_mxn numeric(12,2),
  attribution_model text NOT NULL DEFAULT 'last_touch' CHECK (attribution_model IN ('last_touch','linear','time_decay','position_based')),
  attribution_score jsonb DEFAULT '{}'::jsonb,
  recommended_action text CHECK (recommended_action IN ('continue','pause','scale','optimize')),
  ai_recommendation_reasoning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_analytics_unique UNIQUE (campaign_id, date, channel)
);
CREATE INDEX idx_campaign_analytics_campaign_date ON public.campaign_analytics(campaign_id, date DESC);
CREATE INDEX idx_campaign_analytics_action ON public.campaign_analytics(recommended_action) WHERE recommended_action IN ('pause','scale');
COMMENT ON TABLE public.campaign_analytics IS '15.D.2 Daily aggregations. B.4 multi-touch attribution + Claude IA pause/scale recommendations.';

-- =====================================================================
-- 15.D.2 — ATTRIBUTION_EVENTS (B.4 multi-touch chain por lead)
-- =====================================================================

CREATE TABLE public.attribution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  channel text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  event_type text NOT NULL CHECK (event_type IN ('impression','click','form_submit','visit','offer','close')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  weight numeric(5,4),
  attribution_model text NOT NULL DEFAULT 'linear',
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attribution_lead_occurred ON public.attribution_events(lead_id, occurred_at);
CREATE INDEX idx_attribution_campaign ON public.attribution_events(campaign_id, occurred_at DESC);
COMMENT ON TABLE public.attribution_events IS '15.D.2 B.4 Multi-touch attribution chain. linear/time_decay/position_based/last_touch.';

-- ENABLE RLS + Policies + Triggers (ver migration aplicada via MCP en BD remota commit 20260428203312)
-- Esta migration file local matches remote para evitar drift (memoria 26).
ALTER TABLE public.site_selection_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_selection_queries_select ON public.site_selection_queries
  FOR SELECT USING (
    user_id = auth.uid()
    OR (desarrolladora_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.desarrolladora_id = site_selection_queries.desarrolladora_id
    ))
  );
CREATE POLICY site_selection_queries_insert ON public.site_selection_queries
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY site_selection_queries_delete ON public.site_selection_queries
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY campaigns_select ON public.campaigns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = campaigns.desarrolladora_id)
  );
CREATE POLICY campaigns_insert ON public.campaigns
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = campaigns.desarrolladora_id)
  );
CREATE POLICY campaigns_update ON public.campaigns
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = campaigns.desarrolladora_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = campaigns.desarrolladora_id)
  );
CREATE POLICY campaigns_delete ON public.campaigns
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.desarrolladora_id = campaigns.desarrolladora_id)
  );

CREATE POLICY campaign_creatives_select ON public.campaign_creatives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.profiles p ON p.desarrolladora_id = c.desarrolladora_id
      WHERE c.id = campaign_creatives.campaign_id AND p.id = auth.uid()
    )
  );
CREATE POLICY campaign_creatives_insert ON public.campaign_creatives
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.profiles p ON p.desarrolladora_id = c.desarrolladora_id
      WHERE c.id = campaign_creatives.campaign_id AND p.id = auth.uid()
    )
  );
CREATE POLICY campaign_creatives_delete ON public.campaign_creatives
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.profiles p ON p.desarrolladora_id = c.desarrolladora_id
      WHERE c.id = campaign_creatives.campaign_id AND p.id = auth.uid()
    )
  );

CREATE POLICY campaign_analytics_select ON public.campaign_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.profiles p ON p.desarrolladora_id = c.desarrolladora_id
      WHERE c.id = campaign_analytics.campaign_id AND p.id = auth.uid()
    )
  );
CREATE POLICY campaign_analytics_system_insert ON public.campaign_analytics
  FOR INSERT WITH CHECK (true);
CREATE POLICY campaign_analytics_system_update ON public.campaign_analytics
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY attribution_events_select ON public.attribution_events
  FOR SELECT USING (
    (lead_id IS NOT NULL AND public.lead_belongs_to_dev_or_asesor(lead_id))
    OR (campaign_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.profiles p ON p.desarrolladora_id = c.desarrolladora_id
      WHERE c.id = attribution_events.campaign_id AND p.id = auth.uid()
    ))
  );
CREATE POLICY attribution_events_system_insert ON public.attribution_events
  FOR INSERT WITH CHECK (true);

DROP TRIGGER IF EXISTS campaigns_set_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
