-- M10 Dashboard Desarrollador — documents table
-- Documentos legales/operativos: escritura, licencia, plano, contrato
-- Doc Intel ship FASE 17 — H1 status workflow básico + storage_path

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  proyecto_id uuid REFERENCES public.proyectos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('escritura','licencia','plano','contrato','otro')),
  nombre text NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  expires_at timestamptz,
  meta jsonb DEFAULT '{}'::jsonb,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_desarrolladora_idx ON public.documents(desarrolladora_id, created_at DESC);
CREATE INDEX IF NOT EXISTS documents_proyecto_idx ON public.documents(proyecto_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON public.documents(status);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY documents_select_owner ON public.documents
  FOR SELECT TO authenticated
  USING (
    desarrolladora_id IN (
      SELECT desarrolladora_id FROM public.profiles
      WHERE id = auth.uid() AND desarrolladora_id IS NOT NULL
    )
  );

CREATE POLICY documents_insert_owner ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    desarrolladora_id IN (
      SELECT desarrolladora_id FROM public.profiles
      WHERE id = auth.uid() AND desarrolladora_id IS NOT NULL
    )
  );

CREATE POLICY documents_update_owner ON public.documents
  FOR UPDATE TO authenticated
  USING (
    desarrolladora_id IN (
      SELECT desarrolladora_id FROM public.profiles
      WHERE id = auth.uid() AND desarrolladora_id IS NOT NULL
    )
  );

CREATE POLICY documents_admin_all ON public.documents
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.documents IS
  'M10 Dashboard Dev — documentos legales/operativos por desarrolladora/proyecto. Doc Intel ship FASE 17 (auto-classify + AI extract). H1 workflow básico pending/approved/rejected/expired.';
