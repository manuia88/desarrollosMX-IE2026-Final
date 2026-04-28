-- Pre-FASE 15 OLA 3 sub-bloque 15.C Worksheets brokers (B.1 onyx-benchmarked)
-- Anchor Onyx M9: -25% ciclo brokers (asesor solicita reserva 48h, dev aprueba 1-click)
-- Reusa SECDEF helpers shipped: dev_owns_project, dev_owns_unit, asesor_authorized_broker (commit 338f4ff)
-- Cross-fn: M02 Desarrollos asesor (botón solicitar) ↔ M11 Inventario dev (panel pendientes 1-click)
-- CF.4 priority sort UI: Trust H05 + lead_score combinado

CREATE TABLE public.unit_worksheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  asesor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  desarrolladora_id uuid NOT NULL REFERENCES public.desarrolladoras(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','converted','cancelled')),
  client_first_name text NOT NULL,
  client_phone_hash text,
  client_email_hash text,
  notes text,
  decided_at timestamptz,
  decided_by uuid REFERENCES public.profiles(id),
  reject_reason text,
  operacion_id uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_unit_worksheets_dev_pending ON public.unit_worksheets(desarrolladora_id, requested_at DESC) WHERE status = 'pending';
CREATE INDEX idx_unit_worksheets_asesor ON public.unit_worksheets(asesor_id, requested_at DESC);
CREATE INDEX idx_unit_worksheets_unit ON public.unit_worksheets(unit_id, status);
CREATE INDEX idx_unit_worksheets_expires ON public.unit_worksheets(expires_at) WHERE status = 'pending';

COMMENT ON TABLE public.unit_worksheets IS '15.C B.1 Worksheets brokers (anchor Onyx M9 -25% ciclo brokers). Asesor solicita reserva 48h, dev aprueba 1-click. CF.4 priority sort por Trust H05 + lead score.';

ALTER TABLE public.unit_worksheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY unit_worksheets_select ON public.unit_worksheets
  FOR SELECT USING (
    asesor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.desarrolladora_id = unit_worksheets.desarrolladora_id
    )
  );

CREATE POLICY unit_worksheets_insert ON public.unit_worksheets
  FOR INSERT WITH CHECK (
    asesor_id = auth.uid()
    AND public.asesor_authorized_broker(
      (SELECT proyecto_id FROM public.unidades WHERE id = unit_worksheets.unit_id)
    )
  );

CREATE POLICY unit_worksheets_update_dev ON public.unit_worksheets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.desarrolladora_id = unit_worksheets.desarrolladora_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.desarrolladora_id = unit_worksheets.desarrolladora_id
    )
  );

CREATE POLICY unit_worksheets_update_asesor_cancel ON public.unit_worksheets
  FOR UPDATE USING (asesor_id = auth.uid() AND status = 'pending')
  WITH CHECK (asesor_id = auth.uid());

CREATE POLICY unit_worksheets_system_expire ON public.unit_worksheets
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.on_worksheet_approve()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE public.unidades SET status = 'reservada' WHERE id = NEW.unit_id;
    IF NEW.decided_at IS NULL THEN NEW.decided_at := now(); END IF;
    IF NEW.decided_by IS NULL THEN NEW.decided_by := auth.uid(); END IF;
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    IF NEW.decided_at IS NULL THEN NEW.decided_at := now(); END IF;
    IF NEW.decided_by IS NULL THEN NEW.decided_by := auth.uid(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.on_worksheet_approve() IS 'intentional_security_definer: cascade on worksheet status change → update unidades.status + set decided_at/by (uses auth.uid)';

DROP TRIGGER IF EXISTS unit_worksheets_on_decision ON public.unit_worksheets;
CREATE TRIGGER unit_worksheets_on_decision
  BEFORE UPDATE ON public.unit_worksheets
  FOR EACH ROW EXECUTE FUNCTION public.on_worksheet_approve();

DROP TRIGGER IF EXISTS unit_worksheets_set_updated_at ON public.unit_worksheets;
CREATE TRIGGER unit_worksheets_set_updated_at
  BEFORE UPDATE ON public.unit_worksheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
