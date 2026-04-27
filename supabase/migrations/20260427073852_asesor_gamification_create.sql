-- M09 Estadísticas — asesor_gamification leaderboard table
-- Rankings mensuales asesores: revenue, visits, close_rate, response_time, overall
-- Privacy-first: opt_in_public_ranking default false

CREATE TABLE IF NOT EXISTS public.asesor_gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asesor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month date NOT NULL,
  rank_revenue integer,
  rank_visits integer,
  rank_close_rate integer,
  rank_response_time integer,
  rank_overall integer,
  revenue_mxn numeric(14, 2) DEFAULT 0,
  visits_count integer DEFAULT 0,
  close_rate_pct numeric(5, 2),
  response_time_avg_min numeric(8, 2),
  opt_in_public_ranking boolean NOT NULL DEFAULT false,
  badge_unlocked text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT asesor_gamification_asesor_month_unique UNIQUE (asesor_id, month),
  CONSTRAINT asesor_gamification_month_first_day CHECK (EXTRACT(DAY FROM month) = 1)
);

CREATE INDEX IF NOT EXISTS asesor_gamification_asesor_idx
  ON public.asesor_gamification (asesor_id);
CREATE INDEX IF NOT EXISTS asesor_gamification_month_rank_overall_idx
  ON public.asesor_gamification (month, rank_overall) WHERE rank_overall IS NOT NULL;
CREATE INDEX IF NOT EXISTS asesor_gamification_month_optin_idx
  ON public.asesor_gamification (month, opt_in_public_ranking) WHERE opt_in_public_ranking = true;

ALTER TABLE public.asesor_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY asesor_gamification_select_self ON public.asesor_gamification
  FOR SELECT
  TO authenticated
  USING (auth.uid() = asesor_id);

CREATE POLICY asesor_gamification_select_team ON public.asesor_gamification
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND COALESCE((p.meta->>'stats_team_comparison')::boolean, false) = true
    )
  );

CREATE POLICY asesor_gamification_select_public_ranking ON public.asesor_gamification
  FOR SELECT
  TO authenticated
  USING (opt_in_public_ranking = true);

CREATE POLICY asesor_gamification_admin_all ON public.asesor_gamification
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.rol IN ('superadmin', 'mb_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.rol IN ('superadmin', 'mb_admin')
    )
  );

CREATE TRIGGER asesor_gamification_set_updated_at
  BEFORE UPDATE ON public.asesor_gamification
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.asesor_gamification IS
  'M09 Estadísticas — leaderboard rankings mensuales asesor. Revenue + visits + close_rate + response_time + overall. RLS: select self + team (meta.stats_team_comparison) + public ranking (opt_in). Admin full access. Populated por cron mensual H2 (placeholder F14.D).';
