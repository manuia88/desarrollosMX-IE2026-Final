-- Pre-FASE 15 BD gap closure: 5 tablas core M11 que canon spec asume existentes
-- Reference: ADR-060 + audit MCP 2026-04-28 detection gap
-- Memoria 8 zero deuda + memoria 22 audit_rls strict + memoria 27 MCP apply pre-merge
-- Schema alineado canon spanish: proyecto_id, desarrolladora_id, broker_user_id, price_mxn

-- =====================================================================
-- 1. PROTOTIPOS — templates unidades por proyecto
-- =====================================================================

CREATE TABLE public.prototipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  m2_base numeric(8,2) NOT NULL CHECK (m2_base > 0),
  recamaras smallint NOT NULL DEFAULT 1 CHECK (recamaras >= 0),
  banos numeric(3,1) NOT NULL DEFAULT 1 CHECK (banos >= 0),
  precio_base_mxn numeric(14,2) NOT NULL CHECK (precio_base_mxn >= 0),
  amenidades jsonb NOT NULL DEFAULT '[]'::jsonb,
  planos_url text,
  fotos_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prototipos_nombre_proyecto_unique UNIQUE (proyecto_id, nombre)
);

CREATE INDEX idx_prototipos_proyecto ON public.prototipos(proyecto_id) WHERE active = true;

COMMENT ON TABLE public.prototipos IS 'Templates de unidades (Tipo A 80m² 2rec, etc) por proyecto. Canon spec FASE 15 M11.';

-- =====================================================================
-- 2. ESQUEMAS_PAGO — payment schemes per project
-- =====================================================================

CREATE TABLE public.esquemas_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  enganche_pct numeric(5,2) NOT NULL CHECK (enganche_pct >= 0 AND enganche_pct <= 100),
  mensualidades_count int NOT NULL DEFAULT 0 CHECK (mensualidades_count >= 0),
  contra_entrega_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (contra_entrega_pct >= 0 AND contra_entrega_pct <= 100),
  meses_gracia int NOT NULL DEFAULT 0 CHECK (meses_gracia >= 0),
  financing_partner text,
  comision_pct numeric(5,2) NOT NULL DEFAULT 0,
  iva_calc_logic text NOT NULL DEFAULT 'standard_16',
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_esquemas_pago_proyecto ON public.esquemas_pago(proyecto_id) WHERE active = true;

COMMENT ON TABLE public.esquemas_pago IS 'Payment schemes (contado / 24 MSI / financing / pre-venta 18m) por proyecto. Canon spec FASE 15 M11.';

-- =====================================================================
-- 3. HISTORIAL_PRECIOS — audit trail price changes per unit
-- =====================================================================

CREATE TABLE public.historial_precios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  fecha timestamptz NOT NULL DEFAULT now(),
  precio_anterior_mxn numeric(14,2),
  precio_nuevo_mxn numeric(14,2) NOT NULL CHECK (precio_nuevo_mxn >= 0),
  cambio_pct numeric(7,4),
  motivo text,
  autor_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_historial_precios_unidad_fecha ON public.historial_precios(unidad_id, fecha DESC);

COMMENT ON TABLE public.historial_precios IS 'Audit completo cambios precio por unidad. Canon spec FASE 15 M11 drawer tab Precios.';

-- =====================================================================
-- 4. UNIT_CHANGE_LOG — event log generic per unit
-- =====================================================================

CREATE TABLE public.unit_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_unit_change_log_unidad_occurred ON public.unit_change_log(unidad_id, occurred_at DESC);
CREATE INDEX idx_unit_change_log_event_type ON public.unit_change_log(event_type);

COMMENT ON TABLE public.unit_change_log IS 'Event log genérico por unidad (status_changed, price_changed, assigned_to_broker, etc). Canon spec FASE 15 M11 drawer tab Cambios.';

-- =====================================================================
-- 5. AVANCE_OBRA — construction progress per project
-- =====================================================================

CREATE TABLE public.avance_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  etapa text NOT NULL CHECK (etapa IN ('cimentacion','estructura','albanileria','instalaciones','acabados','areas_comunes','entrega')),
  porcentaje numeric(5,2) NOT NULL CHECK (porcentaje >= 0 AND porcentaje <= 100),
  fotos_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  drone_photo_url text,
  geo_location jsonb,
  notes text,
  autor_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_avance_obra_proyecto_fecha ON public.avance_obra(proyecto_id, fecha DESC);
CREATE INDEX idx_avance_obra_etapa ON public.avance_obra(etapa);

COMMENT ON TABLE public.avance_obra IS 'Avance obra mensual por etapa con fotos + drone + geo. Canon spec FASE 15 M11 sub-ruta avance-obra.';

-- =====================================================================
-- ENABLE RLS
-- =====================================================================

ALTER TABLE public.prototipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esquemas_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avance_obra ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- SECDEF helpers reusables (use auth.uid() — pasan audit-rls check 4)
-- Schema canon: proyectos.desarrolladora_id, project_brokers.proyecto_id + broker_user_id
-- =====================================================================

CREATE OR REPLACE FUNCTION public.dev_owns_project(p_proyecto_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proyectos p
    WHERE p.id = p_proyecto_id
      AND p.desarrolladora_id IN (
        SELECT desarrolladora_id FROM public.profiles WHERE id = auth.uid()
      )
  );
$$;

COMMENT ON FUNCTION public.dev_owns_project(uuid) IS 'intentional_security_definer: developer ownership check via profiles.desarrolladora_id (uses auth.uid)';

CREATE OR REPLACE FUNCTION public.asesor_authorized_broker(p_proyecto_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_brokers pb
    WHERE pb.proyecto_id = p_proyecto_id
      AND pb.broker_user_id = auth.uid()
      AND pb.active = true
  );
$$;

COMMENT ON FUNCTION public.asesor_authorized_broker(uuid) IS 'intentional_security_definer: asesor authorization via project_brokers (uses auth.uid)';

CREATE OR REPLACE FUNCTION public.dev_owns_unit(p_unidad_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.unidades u
    JOIN public.proyectos p ON p.id = u.proyecto_id
    WHERE u.id = p_unidad_id
      AND p.desarrolladora_id IN (
        SELECT desarrolladora_id FROM public.profiles WHERE id = auth.uid()
      )
  );
$$;

COMMENT ON FUNCTION public.dev_owns_unit(uuid) IS 'intentional_security_definer: developer ownership check via unidades→proyectos JOIN (uses auth.uid)';

-- =====================================================================
-- RLS POLICIES: prototipos
-- =====================================================================

CREATE POLICY prototipos_dev_select ON public.prototipos
  FOR SELECT USING (public.dev_owns_project(proyecto_id) OR public.asesor_authorized_broker(proyecto_id));

CREATE POLICY prototipos_dev_insert ON public.prototipos
  FOR INSERT WITH CHECK (public.dev_owns_project(proyecto_id));

CREATE POLICY prototipos_dev_update ON public.prototipos
  FOR UPDATE USING (public.dev_owns_project(proyecto_id))
  WITH CHECK (public.dev_owns_project(proyecto_id));

CREATE POLICY prototipos_dev_delete ON public.prototipos
  FOR DELETE USING (public.dev_owns_project(proyecto_id));

-- =====================================================================
-- RLS POLICIES: esquemas_pago
-- =====================================================================

CREATE POLICY esquemas_pago_dev_select ON public.esquemas_pago
  FOR SELECT USING (public.dev_owns_project(proyecto_id) OR public.asesor_authorized_broker(proyecto_id));

CREATE POLICY esquemas_pago_dev_insert ON public.esquemas_pago
  FOR INSERT WITH CHECK (public.dev_owns_project(proyecto_id));

CREATE POLICY esquemas_pago_dev_update ON public.esquemas_pago
  FOR UPDATE USING (public.dev_owns_project(proyecto_id))
  WITH CHECK (public.dev_owns_project(proyecto_id));

CREATE POLICY esquemas_pago_dev_delete ON public.esquemas_pago
  FOR DELETE USING (public.dev_owns_project(proyecto_id));

-- =====================================================================
-- RLS POLICIES: historial_precios (immutable audit trail)
-- =====================================================================

CREATE POLICY historial_precios_dev_select ON public.historial_precios
  FOR SELECT USING (
    public.dev_owns_unit(unidad_id)
    OR EXISTS (
      SELECT 1 FROM public.unidades u
      WHERE u.id = unidad_id
        AND public.asesor_authorized_broker(u.proyecto_id)
    )
  );

CREATE POLICY historial_precios_system_insert ON public.historial_precios
  FOR INSERT WITH CHECK (public.dev_owns_unit(unidad_id));

-- NO update, NO delete (audit trail immutable)

-- =====================================================================
-- RLS POLICIES: unit_change_log (immutable audit trail)
-- =====================================================================

CREATE POLICY unit_change_log_dev_select ON public.unit_change_log
  FOR SELECT USING (
    public.dev_owns_unit(unidad_id)
    OR EXISTS (
      SELECT 1 FROM public.unidades u
      WHERE u.id = unidad_id
        AND public.asesor_authorized_broker(u.proyecto_id)
    )
  );

CREATE POLICY unit_change_log_system_insert ON public.unit_change_log
  FOR INSERT WITH CHECK (
    public.dev_owns_unit(unidad_id)
    OR EXISTS (
      SELECT 1 FROM public.unidades u
      WHERE u.id = unidad_id
        AND public.asesor_authorized_broker(u.proyecto_id)
    )
  );

-- NO update, NO delete (audit trail immutable)

-- =====================================================================
-- RLS POLICIES: avance_obra
-- =====================================================================

CREATE POLICY avance_obra_dev_select ON public.avance_obra
  FOR SELECT USING (public.dev_owns_project(proyecto_id) OR public.asesor_authorized_broker(proyecto_id));

CREATE POLICY avance_obra_dev_insert ON public.avance_obra
  FOR INSERT WITH CHECK (public.dev_owns_project(proyecto_id));

CREATE POLICY avance_obra_dev_update ON public.avance_obra
  FOR UPDATE USING (public.dev_owns_project(proyecto_id))
  WITH CHECK (public.dev_owns_project(proyecto_id));

CREATE POLICY avance_obra_dev_delete ON public.avance_obra
  FOR DELETE USING (public.dev_owns_project(proyecto_id));

-- =====================================================================
-- TRIGGER auto-log unidades changes → historial_precios + unit_change_log
-- Schema real: unidades.price_mxn (NO precio_lista), unidades.status
-- =====================================================================

CREATE OR REPLACE FUNCTION public.log_unidades_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log price change (price_mxn schema canon)
  IF NEW.price_mxn IS DISTINCT FROM OLD.price_mxn THEN
    INSERT INTO public.historial_precios (unidad_id, precio_anterior_mxn, precio_nuevo_mxn, cambio_pct, motivo, autor_id)
    VALUES (
      NEW.id,
      OLD.price_mxn,
      NEW.price_mxn,
      CASE
        WHEN OLD.price_mxn IS NOT NULL AND OLD.price_mxn > 0
        THEN ((NEW.price_mxn - OLD.price_mxn) / OLD.price_mxn * 100)::numeric(7,4)
        ELSE NULL
      END,
      'auto_logged',
      auth.uid()
    );

    INSERT INTO public.unit_change_log (unidad_id, event_type, actor_id, payload)
    VALUES (
      NEW.id,
      'price_changed',
      auth.uid(),
      jsonb_build_object('from', OLD.price_mxn, 'to', NEW.price_mxn)
    );
  END IF;

  -- Log status change
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.unit_change_log (unidad_id, event_type, actor_id, payload)
    VALUES (
      NEW.id,
      'status_changed',
      auth.uid(),
      jsonb_build_object('from', OLD.status::text, 'to', NEW.status::text)
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_unidades_change() IS 'intentional_security_definer: trigger AFTER UPDATE unidades inserts historial_precios + unit_change_log audit (uses auth.uid)';

-- Drop trigger if exists (idempotent re-apply)
DROP TRIGGER IF EXISTS unidades_log_changes ON public.unidades;

CREATE TRIGGER unidades_log_changes
  AFTER UPDATE ON public.unidades
  FOR EACH ROW
  EXECUTE FUNCTION public.log_unidades_change();

-- =====================================================================
-- updated_at triggers (idempotent — set_updated_at debe existir shipped F0)
-- =====================================================================

DROP TRIGGER IF EXISTS prototipos_set_updated_at ON public.prototipos;
CREATE TRIGGER prototipos_set_updated_at
  BEFORE UPDATE ON public.prototipos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS esquemas_pago_set_updated_at ON public.esquemas_pago;
CREATE TRIGGER esquemas_pago_set_updated_at
  BEFORE UPDATE ON public.esquemas_pago
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
