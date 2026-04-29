-- Pre-FASE 15 OLA 3 sub-bloque 15.G.3 Contracts + e-sign + smart pre-fill (B.3 onyx-benchmarked)
-- Anchor Onyx M6: smart contract templates con campos pre-llenados
-- Mifiel + DocuSign integrations: STUB ADR-018 H1, real H2 (founder lock-in 2026-04-29)

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion_id uuid NOT NULL REFERENCES public.operaciones(id) ON DELETE CASCADE,
  contract_type text NOT NULL CHECK (contract_type IN ('aps','promesa','escritura','anexo','reserva')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','partial_signed','signed','rejected','cancelled','expired')),
  signers jsonb NOT NULL DEFAULT '[]'::jsonb,
  audit_trail jsonb NOT NULL DEFAULT '[]'::jsonb,
  pre_filled_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  template_version text DEFAULT 'v1',
  mifiel_doc_id text,
  docusign_envelope_id text,
  pdf_unsigned_url text,
  pdf_signed_url text,
  sent_at timestamptz,
  signed_at timestamptz,
  expires_at timestamptz,
  cancellation_reason text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_operacion ON public.contracts(operacion_id);
CREATE INDEX idx_contracts_status ON public.contracts(status, created_at DESC) WHERE status NOT IN ('signed','cancelled','rejected','expired');
CREATE INDEX idx_contracts_mifiel ON public.contracts(mifiel_doc_id) WHERE mifiel_doc_id IS NOT NULL;
CREATE INDEX idx_contracts_expires ON public.contracts(expires_at) WHERE status IN ('sent','viewed','partial_signed');

COMMENT ON TABLE public.contracts IS '15.G.3 B.3 Contracts + e-sign + smart pre-fill (anchor Onyx M6). signers jsonb[]: array {name, email, role, signed_at?, viewed_at?}. audit_trail jsonb append-only events. pre_filled_data snapshot: unidades+esquemas_pago+comision+IVA at draft creation. mifiel_doc_id/docusign_envelope_id STUB H1 ADR-018 (4 señales) — real H2.';

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_select ON public.contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = contracts.operacion_id
        AND (
          o.asesor_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                p.rol IN ('superadmin','mb_admin')
                OR (
                  p.rol = 'admin_desarrolladora'
                  AND o.propiedad_type = 'unidad'
                  AND public.dev_owns_unit(o.propiedad_id)
                )
              )
          )
        )
    )
  );

CREATE POLICY contracts_insert ON public.contracts
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = contracts.operacion_id
        AND (
          o.asesor_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin')
          )
        )
    )
  );

CREATE POLICY contracts_update_parties ON public.contracts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = contracts.operacion_id
        AND (
          o.asesor_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operaciones o
      WHERE o.id = contracts.operacion_id
        AND (
          o.asesor_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.rol IN ('admin_desarrolladora','superadmin','mb_admin')
          )
        )
    )
  );

CREATE POLICY contracts_system_update ON public.contracts
  FOR UPDATE USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS contracts_set_updated_at ON public.contracts;
CREATE TRIGGER contracts_set_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
