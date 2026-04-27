-- M10 Dashboard Desarrollador — ai_generated_content table
-- Cache contenido AI: morning briefing, landing copy, email templates
-- Tracking cost + model + prompt para auditoría

CREATE TABLE IF NOT EXISTS public.ai_generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content_type text NOT NULL CHECK (content_type IN ('morning_briefing_dev','morning_briefing_asesor','landing_copy','email_template','wa_template','other')),
  content text NOT NULL,
  prompt_used text,
  model text NOT NULL DEFAULT 'claude-sonnet-4-5',
  cost_usd numeric(10,4),
  input_tokens integer,
  output_tokens integer,
  meta jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_generated_content_desarrolladora_idx ON public.ai_generated_content(desarrolladora_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS ai_generated_content_user_idx ON public.ai_generated_content(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS ai_generated_content_type_idx ON public.ai_generated_content(content_type, generated_at DESC);

ALTER TABLE public.ai_generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_generated_content_select_owner ON public.ai_generated_content
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR desarrolladora_id IN (
      SELECT desarrolladora_id FROM public.profiles
      WHERE id = auth.uid() AND desarrolladora_id IS NOT NULL
    )
  );

CREATE POLICY ai_generated_content_insert_self ON public.ai_generated_content
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR desarrolladora_id IN (
      SELECT desarrolladora_id FROM public.profiles
      WHERE id = auth.uid() AND desarrolladora_id IS NOT NULL
    )
  );

CREATE POLICY ai_generated_content_admin_all ON public.ai_generated_content
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

COMMENT ON TABLE public.ai_generated_content IS
  'M10 Dashboard Dev — cache AI generated content (morning briefing dev/asesor + landing copy + email/wa templates). Tracking cost_usd + model + tokens para budget audit.';
