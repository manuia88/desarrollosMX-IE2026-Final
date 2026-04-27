-- M10 Dashboard Desarrollador — dev_trust_scores H05 reputation table
-- Score 0-100 + level Bronze/Silver/Gold/Platinum + 5 categorías breakdown
-- Calculo H05 ship FASE 19 — H1 row poblada con score placeholder via cron mensual o manual seed.

CREATE TABLE IF NOT EXISTS public.dev_trust_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid NOT NULL UNIQUE REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  score_overall integer NOT NULL CHECK (score_overall BETWEEN 0 AND 100),
  level text NOT NULL CHECK (level IN ('bronze','silver','gold','platinum')),
  score_financial_health integer CHECK (score_financial_health BETWEEN 0 AND 100),
  score_on_time_delivery integer CHECK (score_on_time_delivery BETWEEN 0 AND 100),
  score_doc_transparency integer CHECK (score_doc_transparency BETWEEN 0 AND 100),
  score_post_venta integer CHECK (score_post_venta BETWEEN 0 AND 100),
  score_reviews integer CHECK (score_reviews BETWEEN 0 AND 100),
  improvements jsonb DEFAULT '[]'::jsonb,
  citations jsonb DEFAULT '[]'::jsonb,
  is_placeholder boolean NOT NULL DEFAULT true,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dev_trust_scores_desarrolladora_idx ON public.dev_trust_scores(desarrolladora_id);
CREATE INDEX IF NOT EXISTS dev_trust_scores_level_idx ON public.dev_trust_scores(level);

ALTER TABLE public.dev_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY dev_trust_scores_select_self ON public.dev_trust_scores
  FOR SELECT TO authenticated
  USING (
    desarrolladora_id IN (
      SELECT desarrolladora_id FROM public.profiles
      WHERE id = auth.uid() AND desarrolladora_id IS NOT NULL
    )
  );

CREATE POLICY dev_trust_scores_select_admin ON public.dev_trust_scores
  FOR SELECT TO authenticated
  USING (public.is_superadmin() OR public.get_user_role() IN ('mb_admin','mb_coordinator'));

CREATE POLICY dev_trust_scores_select_public_basic ON public.dev_trust_scores
  FOR SELECT TO authenticated
  USING (score_overall IS NOT NULL);

CREATE POLICY dev_trust_scores_admin_all ON public.dev_trust_scores
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE TRIGGER dev_trust_scores_set_updated_at
  BEFORE UPDATE ON public.dev_trust_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.dev_trust_scores IS
  'M10 Dashboard Dev — H05 Trust Score reputation desarrolladoras. Score 0-100 + level + 5 cats breakdown + improvements + citations. is_placeholder flag para H1 (calc engine ship FASE 19). RLS: select self via profiles.desarrolladora_id + admin + public_basic.';
