-- M10 Dashboard Desarrollador — leads_dev table
-- Leads que llegan al portal desarrollador via landing/portal/referral/walk_in
-- Distinct de leads (CRM brokerage) — ownership via desarrolladora_id

CREATE TABLE IF NOT EXISTS public.leads_dev (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE SET NULL,
  contacto_name text NOT NULL,
  contacto_email text,
  contacto_phone text,
  source text NOT NULL CHECK (source IN ('landing','portal','referral','walk_in','other')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted','lost')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_dev_desarrolladora_idx ON public.leads_dev(desarrolladora_id, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_dev_proyecto_idx ON public.leads_dev(proyecto_id);
CREATE INDEX IF NOT EXISTS leads_dev_status_idx ON public.leads_dev(status);

ALTER TABLE public.leads_dev ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_dev_select_owner ON public.leads_dev
  FOR SELECT TO authenticated
  USING (
    desarrolladora_id IN (
      SELECT desarrolladora_id FROM public.profiles
      WHERE id = auth.uid() AND desarrolladora_id IS NOT NULL
    )
  );

CREATE POLICY leads_dev_insert_owner ON public.leads_dev
  FOR INSERT TO authenticated
  WITH CHECK (
    desarrolladora_id IN (
      SELECT desarrolladora_id FROM public.profiles
      WHERE id = auth.uid() AND desarrolladora_id IS NOT NULL
    )
  );

CREATE POLICY leads_dev_update_owner ON public.leads_dev
  FOR UPDATE TO authenticated
  USING (
    desarrolladora_id IN (
      SELECT desarrolladora_id FROM public.profiles
      WHERE id = auth.uid() AND desarrolladora_id IS NOT NULL
    )
  );

CREATE POLICY leads_dev_admin_all ON public.leads_dev
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE TRIGGER leads_dev_set_updated_at
  BEFORE UPDATE ON public.leads_dev
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.leads_dev IS
  'M10 Dashboard Dev — leads que llegan al portal desarrolladora (landing/portal/referral/walk_in). Distinto de leads CRM brokerage. Ownership via desarrolladora_id en profiles.';
