# BIBLIA DMX v5 — BACKEND COMPLETO
## PART 2 de 3: Functions + Triggers + RLS + tRPC + API Routes + Crons
## Contenido ÍNTEGRO de BACKEND_DMX_v4_PART2 + Verificación Real
## Fase: Sprint v5-S0 + referencia permanente
---
# BIBLIA BACKEND — DesarrollosMX v4
## Functions · Triggers · RLS · tRPC Routers · API Routes · Cron Jobs
## PART 2 de 3 (Módulos 3–5)
## Fecha: 8 abril 2026

---

# MÓDULO 3: HELPER FUNCTIONS + TRIGGERS + RLS

## 3.1 Helper Functions PostgreSQL (~25)

### Funciones existentes (conservar — ya en BD o definidas en v3)

```
IMPLEMENTADAS EN BD:
  normalize_phone(raw_phone text) → text
  expire_overdue_tasks() → void
  create_auto_task() → trigger function
  generate_operation_code() → trigger function
  calculate_commission() → trigger function
  update_contactos_search() → trigger function (FTS)
  check_duplicate_phone() → trigger function
  audit_sensitive_changes() → trigger function
  get_asesor_dashboard(p_asesor_id uuid) → jsonb
  get_developer_dashboard(p_dev_id uuid) → jsonb
  match_demand_query() → setof record
  calculate_project_absorption() → jsonb
  calculate_commission_forecast(p_asesor_id uuid) → jsonb
  get_demand_supply_gap() → jsonb
  get_market_pulse() → jsonb
  get_project_health() → jsonb
  enqueue_score_recalc(5 params) → void
  get_public_unit_summary(p_project_id uuid) → jsonb

DEFINIDAS EN v3 (pendientes de implementar):
  is_superadmin() → boolean
  is_project_owner(p_project_id uuid) → boolean
  is_authorized_broker(p_project_id uuid) → boolean
  get_user_desarrolladora_id() → uuid
  get_user_role() → text
  get_visible_asesor_ids() → uuid[]
  refresh_visible_cache(p_user_id uuid) → void
  get_visible_asesor_ids_for(p_user_id uuid) → uuid[]
  get_master_broker_dashboard(p_mb_id uuid) → jsonb
```

### Funciones NUEVAS v4

```sql
-- =====================================================
-- Gamification: agregar XP al asesor
-- =====================================================
CREATE OR REPLACE FUNCTION add_asesor_xp(
  p_user_id uuid,
  p_xp integer,
  p_action text
) RETURNS void AS $$
BEGIN
  INSERT INTO asesor_gamification (user_id, xp_total, xp_this_month, last_activity_at)
  VALUES (p_user_id, p_xp, p_xp, now())
  ON CONFLICT (user_id) DO UPDATE SET
    xp_total = asesor_gamification.xp_total + p_xp,
    xp_this_month = asesor_gamification.xp_this_month + p_xp,
    level = GREATEST(1, FLOOR(LOG(2, GREATEST(asesor_gamification.xp_total + p_xp, 1)) + 1)),
    current_streak = CASE
      WHEN asesor_gamification.last_activity_at::date = (now() - interval '1 day')::date
        THEN asesor_gamification.current_streak + 1
      WHEN asesor_gamification.last_activity_at::date = now()::date
        THEN asesor_gamification.current_streak  -- ya contó hoy
      ELSE 1  -- streak roto, reiniciar
    END,
    longest_streak = GREATEST(
      asesor_gamification.longest_streak,
      CASE
        WHEN asesor_gamification.last_activity_at::date = (now() - interval '1 day')::date
          THEN asesor_gamification.current_streak + 1
        ELSE 1
      END
    ),
    last_activity_at = now(),
    updated_at = now();
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ACM: calcular precio sugerido basado en comparables
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_acm(
  p_zone_id uuid,
  p_tipo_propiedad text,
  p_operacion text,
  p_m2 numeric
) RETURNS jsonb AS $$
DECLARE
  v_comparables jsonb;
  v_precio_m2_median numeric;
  v_count integer;
BEGIN
  -- Buscar comparables en market_prices_secondary + propiedades_secundarias activas
  SELECT
    jsonb_agg(jsonb_build_object(
      'source', sub.source,
      'precio_m2', sub.precio_m2,
      'period_date', sub.period_date
    )),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY sub.precio_m2),
    count(*)
  INTO v_comparables, v_precio_m2_median, v_count
  FROM (
    -- Fuente 1: market_prices_secondary
    SELECT 'market_prices' as source, price_m2_median as precio_m2, period_date
    FROM market_prices_secondary
    WHERE zone_id = p_zone_id
      AND operation_type = p_operacion
      AND property_type = p_tipo_propiedad
      AND period_date >= now() - interval '6 months'
    UNION ALL
    -- Fuente 2: propiedades_secundarias activas del marketplace
    SELECT 'dmx_captaciones', precio_m2, created_at::date
    FROM propiedades_secundarias
    WHERE zone_id = p_zone_id
      AND operacion = p_operacion
      AND tipo_propiedad = p_tipo_propiedad
      AND estado = 'activo'
      AND precio_m2 IS NOT NULL
      AND created_at >= now() - interval '6 months'
  ) sub;

  RETURN jsonb_build_object(
    'precio_m2_sugerido', v_precio_m2_median,
    'precio_total_sugerido', v_precio_m2_median * p_m2,
    'rango_min', v_precio_m2_median * p_m2 * 0.90,
    'rango_max', v_precio_m2_median * p_m2 * 1.10,
    'comparables_count', v_count,
    'comparables', v_comparables,
    'confidence', CASE
      WHEN v_count >= 10 THEN 0.90
      WHEN v_count >= 5 THEN 0.75
      WHEN v_count >= 2 THEN 0.55
      WHEN v_count >= 1 THEN 0.35
      ELSE 0.10
    END
  );
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Rate Limit REAL (FIX BUG 1 — reemplaza NO-OP)
-- =====================================================
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_per_hour integer DEFAULT 60
) RETURNS boolean AS $$
DECLARE
  v_window_start timestamptz;
  v_count integer;
BEGIN
  v_window_start := date_trunc('hour', now());

  INSERT INTO api_rate_limits (user_id, endpoint, window_start, request_count, max_allowed)
  VALUES (p_user_id, p_endpoint, v_window_start, 1, p_max_per_hour)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1;

  SELECT request_count INTO v_count
  FROM api_rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint AND window_start = v_window_start;

  RETURN v_count <= p_max_per_hour;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Sync propiedades secundarias → market_prices_secondary
-- =====================================================
CREATE OR REPLACE FUNCTION sync_props_sec_to_market_prices() RETURNS void AS $$
BEGIN
  -- Agregar precios de propiedades secundarias activas como fuente de datos IE
  INSERT INTO market_prices_secondary (
    zone_id, city_id, alcaldia, colonia, operation_type, property_type,
    price_m2_avg, price_m2_median, sample_count, period_date, source
  )
  SELECT
    ps.zone_id,
    ps.city_id,
    ps.alcaldia,
    ps.colonia,
    ps.operacion,
    ps.tipo_propiedad,
    avg(ps.precio_m2),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY ps.precio_m2),
    count(*),
    date_trunc('month', now())::date,
    'dmx_captaciones'
  FROM propiedades_secundarias ps
  WHERE ps.estado = 'activo'
    AND ps.precio_m2 IS NOT NULL
    AND ps.zone_id IS NOT NULL
  GROUP BY ps.zone_id, ps.city_id, ps.alcaldia, ps.colonia, ps.operacion, ps.tipo_propiedad
  ON CONFLICT (city_id, alcaldia, colonia, operation_type, property_type, period_date, source)
  DO UPDATE SET
    price_m2_avg = EXCLUDED.price_m2_avg,
    price_m2_median = EXCLUDED.price_m2_median,
    sample_count = EXCLUDED.sample_count;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Monthly XP reset
-- =====================================================
CREATE OR REPLACE FUNCTION reset_monthly_xp() RETURNS void AS $$
BEGIN
  UPDATE asesor_gamification
  SET xp_this_month = 0,
      monthly_rank = NULL,
      updated_at = now();
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Calculate monthly ranks
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_monthly_ranks() RETURNS void AS $$
BEGIN
  WITH ranked AS (
    SELECT user_id,
           RANK() OVER (ORDER BY xp_this_month DESC) as rank
    FROM asesor_gamification
    WHERE xp_this_month > 0
  )
  UPDATE asesor_gamification g
  SET monthly_rank = r.rank
  FROM ranked r
  WHERE g.user_id = r.user_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 3.2 Triggers (~10)

### Triggers existentes (conservar de v3)

```
T1: profiles_normalize_phone     → BEFORE INSERT/UPDATE OF telefono ON profiles
T2: unit_changes_logger          → BEFORE UPDATE ON unidades
T3: zone_scores_archive          → BEFORE UPDATE ON zone_scores
T3b: user_scores_archive         → BEFORE UPDATE ON user_scores
T4: project_scores_archive       → BEFORE UPDATE ON project_scores
T5: contacto_link_comprador      → BEFORE INSERT ON contactos
T6: webhooks_unidades            → AFTER UPDATE ON unidades
    webhooks_operaciones         → AFTER INSERT ON operaciones
```

### Triggers NUEVOS v4

```sql
-- =====================================================
-- T7: XP automático al crear contacto
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_xp_contacto_creado() RETURNS trigger AS $$
BEGIN
  PERFORM add_asesor_xp(NEW.asesor_id, 10, 'contacto_creado');
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER xp_contacto_creado
  AFTER INSERT ON contactos
  FOR EACH ROW EXECUTE FUNCTION trigger_xp_contacto_creado();

-- =====================================================
-- T8: XP automático al cerrar operación
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_xp_operacion_cerrada() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'cerrada_ganada' AND (OLD.status IS NULL OR OLD.status != 'cerrada_ganada') THEN
    PERFORM add_asesor_xp(NEW.asesor_comprador_id, 500, 'operacion_cerrada');
    IF NEW.asesor_productor_id IS NOT NULL AND NEW.asesor_productor_id != NEW.asesor_comprador_id THEN
      PERFORM add_asesor_xp(NEW.asesor_productor_id, 300, 'operacion_cerrada_productor');
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER xp_operacion_cerrada
  AFTER UPDATE ON operaciones
  FOR EACH ROW EXECUTE FUNCTION trigger_xp_operacion_cerrada();

-- =====================================================
-- T9: Auto-calcular precio_m2 en propiedades_secundarias
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_calc_precio_m2() RETURNS trigger AS $$
BEGIN
  IF NEW.m2_total IS NOT NULL AND NEW.m2_total > 0 THEN
    IF NEW.operacion = 'venta' AND NEW.precio_venta IS NOT NULL THEN
      NEW.precio_m2 = NEW.precio_venta / NEW.m2_total;
    ELSIF NEW.operacion = 'renta' AND NEW.precio_renta IS NOT NULL THEN
      NEW.precio_m2 = NEW.precio_renta / NEW.m2_total;
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER calc_precio_m2_props_sec
  BEFORE INSERT OR UPDATE OF precio_venta, precio_renta, m2_total, operacion
  ON propiedades_secundarias
  FOR EACH ROW EXECUTE FUNCTION trigger_calc_precio_m2();

-- =====================================================
-- T10: XP por respuesta rápida a lead
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_xp_respuesta_rapida() RETURNS trigger AS $$
DECLARE
  v_busqueda record;
  v_minutos integer;
BEGIN
  -- Solo para la primera actividad en una búsqueda en etapa 'pendiente'
  IF NEW.entity_type = 'busqueda' AND NEW.action = 'stage_changed' THEN
    SELECT * INTO v_busqueda FROM busquedas WHERE id = NEW.entity_id;
    IF v_busqueda.etapa = 'buscando' THEN
      v_minutos = EXTRACT(EPOCH FROM (now() - v_busqueda.created_at)) / 60;
      IF v_minutos <= 15 THEN
        PERFORM add_asesor_xp(NEW.actor_id, 30, 'respuesta_15min');
      ELSIF v_minutos <= 60 THEN
        PERFORM add_asesor_xp(NEW.actor_id, 15, 'respuesta_60min');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER xp_respuesta_rapida
  AFTER INSERT ON actividad_timeline
  FOR EACH ROW EXECUTE FUNCTION trigger_xp_respuesta_rapida();
```

## 3.3 RLS Policies (~160)

### Principio (conservado de v3)

```
TODA tabla tiene RLS habilitado. Sin excepciones.

Patrones:
  Tablas de usuario: dueño + employer hierarchy + superadmin
  Tablas IE públicas: READ autenticado, WRITE service_role
  Tablas IE privadas: solo el usuario + admin
  Tablas config: READ público
  Tablas admin: solo superadmin
```

### RLS conservadas de v3 (~150 policies)

Todas las 150 policies definidas en BIBLIA_BACKEND_v3 §6 se conservan sin cambios. Incluye:
- 67 tablas existentes con RLS habilitado
- Patterns para notificaciones (post-rename recipient_id), IE público/privado
- Helper functions: is_superadmin(), get_visible_asesor_ids()

### RLS NUEVAS v4 (tablas nuevas)

```sql
-- =====================================================
-- geo_snapshots: READ autenticado, WRITE service_role
-- =====================================================
ALTER TABLE geo_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY geo_snapshots_read ON geo_snapshots FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- api_keys: dueño + superadmin
-- =====================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_keys_own ON api_keys FOR ALL
  USING (user_id = auth.uid());
CREATE POLICY api_keys_admin ON api_keys FOR ALL
  USING (is_superadmin());

-- =====================================================
-- api_request_logs: via api_keys (dueño del key) + superadmin
-- =====================================================
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_logs_own ON api_request_logs FOR SELECT
  USING (api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid()));
CREATE POLICY api_logs_admin ON api_request_logs FOR ALL
  USING (is_superadmin());

-- =====================================================
-- asesor_gamification: propio + employer + superadmin
-- =====================================================
ALTER TABLE asesor_gamification ENABLE ROW LEVEL SECURITY;
CREATE POLICY gamification_own ON asesor_gamification FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY gamification_employer ON asesor_gamification FOR SELECT
  USING (user_id = ANY(
    SELECT id FROM profiles WHERE employer_id = auth.uid() AND is_active = true
  ));
CREATE POLICY gamification_admin ON asesor_gamification FOR ALL
  USING (is_superadmin());
-- UPDATE solo por service_role (triggers/crons)

-- =====================================================
-- captaciones: asesor propio + employer + superadmin
-- =====================================================
ALTER TABLE captaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY captaciones_own ON captaciones FOR ALL
  USING (asesor_id = auth.uid());
CREATE POLICY captaciones_employer ON captaciones FOR SELECT
  USING (asesor_id = ANY(
    SELECT id FROM profiles WHERE employer_id = auth.uid() AND is_active = true
  ));
CREATE POLICY captaciones_admin ON captaciones FOR ALL
  USING (is_superadmin());

-- =====================================================
-- propiedades_secundarias: asesor propio + employer + superadmin
-- =====================================================
ALTER TABLE propiedades_secundarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY props_sec_own ON propiedades_secundarias FOR ALL
  USING (asesor_id = auth.uid());
CREATE POLICY props_sec_employer ON propiedades_secundarias FOR SELECT
  USING (asesor_id = ANY(
    SELECT id FROM profiles WHERE employer_id = auth.uid() AND is_active = true
  ));
CREATE POLICY props_sec_public ON propiedades_secundarias FOR SELECT
  USING (estado = 'activo' AND auth.uid() IS NOT NULL);
  -- Propiedades activas son visibles para cualquier asesor autenticado (MLS interno)
CREATE POLICY props_sec_admin ON propiedades_secundarias FOR ALL
  USING (is_superadmin());

-- =====================================================
-- propiedades_secundarias_fotos: via propiedades_secundarias
-- =====================================================
ALTER TABLE propiedades_secundarias_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY props_sec_fotos_own ON propiedades_secundarias_fotos FOR ALL
  USING (propiedad_id IN (
    SELECT id FROM propiedades_secundarias WHERE asesor_id = auth.uid()
  ));
CREATE POLICY props_sec_fotos_read ON propiedades_secundarias_fotos FOR SELECT
  USING (propiedad_id IN (
    SELECT id FROM propiedades_secundarias WHERE estado = 'activo'
  ) AND auth.uid() IS NOT NULL);
CREATE POLICY props_sec_fotos_admin ON propiedades_secundarias_fotos FOR ALL
  USING (is_superadmin());

-- =====================================================
-- acm_valuaciones: asesor propio + superadmin
-- =====================================================
ALTER TABLE acm_valuaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY acm_own ON acm_valuaciones FOR ALL
  USING (asesor_id = auth.uid());
CREATE POLICY acm_admin ON acm_valuaciones FOR ALL
  USING (is_superadmin());
```

---

# MÓDULO 4: tRPC ROUTERS

## 4.1 Estado actual y plan

```
CONSERVAR (5 routers funcionales, 32 procedures):
  developer.ts     → 13 procedures (614 lines)
  documentIntel.ts → 6 procedures (478 lines)
  driveMonitor.ts  → 5 procedures (307 lines)
  photos.ts        → 6 procedures (211 lines)
  geo.ts           → 2 procedures (15 lines)

ELIMINAR (8 routers vacíos — son literalmente '{}'):
  admin.ts, ai.ts, comprador.ts, distribution.ts,
  intelligence.ts, masterBroker.ts, payments.ts, scores.ts

RECREAR con procedures reales (8 routers):
  admin.ts         → 6 procedures
  ai.ts            → 5 procedures
  comprador.ts     → 7 procedures
  distribution.ts  → 6 procedures
  masterBroker.ts  → 5 procedures
  payments.ts      → 4 procedures
  scores.ts        → 6 procedures
  intelligence.ts  → 4 procedures

NUEVOS v4 (3 routers):
  asesorCRM.ts     → 8 procedures (captaciones + props secundarias)
  gamification.ts  → 3 procedures
  apiExternal.ts   → 3 procedures (admin: keys + metrics)

TOTAL: 5 conservados + 8 recreados + 3 nuevos = 16 routers
TOTAL PROCEDURES: 32 existentes + ~57 nuevos = ~89 procedures
```

## 4.2 Router: scores.ts (RECREAR — antes vacío)

```typescript
// server/trpc/routers/scores.ts

export const scoresRouter = router({
  // 1. Score de zona por tipo
  getZoneScore: publicProcedure
    .input(z.object({
      zoneId: z.string().uuid(),
      scoreType: z.string()
    }))
    .query(async ({ input, ctx }) => {
      const { data } = await ctx.supabase
        .from('zone_scores')
        .select('*')
        .eq('zone_id', input.zoneId)
        .eq('score_type', input.scoreType)
        .order('period_date', { ascending: false })
        .limit(1)
        .single();
      return data;
    }),

  // 2. Todos los scores de una zona
  getAllZoneScores: publicProcedure
    .input(z.object({ zoneId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { data } = await ctx.supabase
        .from('zone_scores')
        .select('*')
        .eq('zone_id', input.zoneId)
        .order('period_date', { ascending: false });
      // Dedup: solo el más reciente por score_type
      const latest = new Map();
      data?.forEach(s => { if (!latest.has(s.score_type)) latest.set(s.score_type, s); });
      return Object.fromEntries(latest);
    }),

  // 3. Scores de proyecto
  getProjectScores: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { data } = await ctx.supabase
        .from('project_scores')
        .select('*')
        .eq('project_id', input.projectId)
        .order('period_date', { ascending: false });
      const latest = new Map();
      data?.forEach(s => {
        const key = `${s.score_type}_${s.unidad_id || 'project'}`;
        if (!latest.has(key)) latest.set(key, s);
      });
      return Object.fromEntries(latest);
    }),

  // 4. Request recalc on-demand (GAP 2 de auditoría v3)
  requestRecalc: authenticatedProcedure
    .input(z.object({
      scoreType: z.string(),
      entityType: z.enum(['zone', 'project', 'unit']),
      entityId: z.string().uuid(),
      priority: z.literal(1)
    }))
    .mutation(async ({ input, ctx }) => {
      // Rate limit: 10/min
      await ctx.supabase.rpc('check_rate_limit', {
        p_user_id: ctx.user.id,
        p_endpoint: 'score_recalc',
        p_max_per_hour: 600
      });
      await ctx.supabase.rpc('enqueue_score_recalc', {
        p_score_type: input.scoreType,
        p_entity_type: input.entityType,
        p_entity_id: input.entityId,
        p_triggered_by: 'on_demand',
        p_priority: 1
      });
      return { queued: true, estimatedSeconds: 15 };
    }),

  // 5. Comparar proyectos (A08)
  compareProjects: authenticatedProcedure
    .input(z.object({
      projectIds: z.array(z.string().uuid()).min(2).max(5)
    }))
    .query(async ({ input, ctx }) => {
      const results = [];
      for (const pid of input.projectIds) {
        const { data: scores } = await ctx.supabase
          .from('project_scores')
          .select('score_type, score_value, score_label, confidence')
          .eq('project_id', pid)
          .order('period_date', { ascending: false });
        const { data: project } = await ctx.supabase
          .from('projects')
          .select('id, nombre, alcaldia, desarrolladora_id')
          .eq('id', pid)
          .single();
        const latest = new Map();
        scores?.forEach(s => { if (!latest.has(s.score_type)) latest.set(s.score_type, s); });
        results.push({ project, scores: Object.fromEntries(latest) });
      }
      return results;
    }),

  // 6. Índices DMX por zona
  getDMXIndices: publicProcedure
    .input(z.object({ zoneId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { data } = await ctx.supabase
        .from('dmx_indices')
        .select('*')
        .eq('zone_id', input.zoneId)
        .order('period_date', { ascending: false });
      const latest = new Map();
      data?.forEach(i => { if (!latest.has(i.index_code)) latest.set(i.index_code, i); });
      return Object.fromEntries(latest);
    }),
});
```

## 4.3 Router: asesorCRM.ts (NUEVO v4)

```typescript
// server/trpc/routers/asesorCRM.ts
// CRM integrado del asesor: captaciones + propiedades secundarias

export const asesorCRMRouter = router({
  // 1. Listar captaciones del asesor
  listCaptaciones: authenticatedProcedure
    .input(z.object({
      etapa: z.enum(['pendiente','seguimiento','encuentro','valuacion','documentacion','captado','perdida']).optional(),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ input, ctx }) => {
      let query = ctx.supabase
        .from('captaciones')
        .select('*, contactos(first_name, last_name, telefono), propiedades_secundarias(direccion, tipo_propiedad, precio_venta)')
        .eq('asesor_id', ctx.user.id)
        .order('updated_at', { ascending: false })
        .limit(input.limit);
      if (input.etapa) query = query.eq('etapa', input.etapa);
      return (await query).data;
    }),

  // 2. Crear captación (captura rápida)
  createCaptacion: authenticatedProcedure
    .input(z.object({
      contacto_id: z.string().uuid().optional(),
      direccion_aproximada: z.string().min(1).optional(),
      tipo_propiedad: z.enum(['departamento','casa','casa_condominio','terreno','ph','oficina','local','bodega','edificio','otro']).optional(),
      tipo_operacion: z.enum(['venta','renta','ambas']).optional(),
      precio_propietario: z.number().positive().optional(),
      urgencia: z.enum(['alta','media','baja']).optional(),
      motivo_venta: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const profile = ctx.profile;
      const { data } = await ctx.supabaseAdmin
        .from('captaciones')
        .insert({
          asesor_id: ctx.user.id,
          employer_id: profile.employer_id,
          ...input
        })
        .select()
        .single();
      // XP
      await ctx.supabaseAdmin.rpc('add_asesor_xp', {
        p_user_id: ctx.user.id, p_xp: 15, p_action: 'captacion_creada'
      });
      // Timeline
      await ctx.supabaseAdmin.from('actividad_timeline').insert({
        entity_type: 'captacion', entity_id: data.id,
        action: 'created', actor_id: ctx.user.id,
        actor_name: `${profile.first_name} ${profile.last_name}`
      });
      return data;
    }),

  // 3. Actualizar etapa de captación
  updateCaptacionEtapa: authenticatedProcedure
    .input(z.object({
      captacionId: z.string().uuid(),
      etapa: z.enum(['pendiente','seguimiento','encuentro','valuacion','documentacion','captado','perdida']),
      motivo_perdida: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const update: any = { etapa: input.etapa, updated_at: new Date() };
      if (input.etapa === 'perdida') {
        update.closed_at = new Date();
        update.motivo_perdida = input.motivo_perdida;
      }
      const { data } = await ctx.supabase
        .from('captaciones')
        .update(update)
        .eq('id', input.captacionId)
        .eq('asesor_id', ctx.user.id)
        .select()
        .single();
      return data;
    }),

  // 4. Crear propiedad secundaria (desde captación o independiente)
  createPropiedadSecundaria: authenticatedProcedure
    .input(z.object({
      captacion_id: z.string().uuid().optional(),
      contacto_propietario_id: z.string().uuid().optional(),
      direccion: z.string().min(1),
      colonia: z.string().optional(),
      alcaldia: z.string().optional(),
      tipo_propiedad: z.enum(['departamento','casa','casa_condominio','terreno','ph','oficina','local','bodega','edificio','otro']),
      operacion: z.enum(['venta','renta','ambas']),
      precio_venta: z.number().positive().optional(),
      precio_renta: z.number().positive().optional(),
      recamaras: z.number().int().min(0).optional(),
      banos: z.number().int().min(0).optional(),
      m2_total: z.number().positive().optional(),
      antiguedad_anos: z.number().int().min(0).optional(),
      amenidades: z.array(z.string()).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const profile = ctx.profile;
      // Geocodificar dirección → zone_id (si Mapbox disponible)
      const zoneId = await geocodeToZone(input.direccion, input.alcaldia);
      const { data } = await ctx.supabaseAdmin
        .from('propiedades_secundarias')
        .insert({
          asesor_id: ctx.user.id,
          employer_id: profile.employer_id,
          zone_id: zoneId,
          city_id: 'cdmx', // default, mejorar con geocoding
          ...input
        })
        .select()
        .single();
      // Si viene de captación, vincular
      if (input.captacion_id) {
        await ctx.supabase
          .from('captaciones')
          .update({ propiedad_id: data.id })
          .eq('id', input.captacion_id);
      }
      return data;
    }),

  // 5. Listar propiedades secundarias
  listPropiedadesSecundarias: authenticatedProcedure
    .input(z.object({
      estado: z.string().optional(),
      tipo: z.string().optional(),
      tab: z.enum(['propias','empresa','todas']).default('propias')
    }))
    .query(async ({ input, ctx }) => {
      let query = ctx.supabase
        .from('propiedades_secundarias')
        .select('*, propiedades_secundarias_fotos(url_thumb, is_cover)')
        .order('updated_at', { ascending: false });

      if (input.tab === 'propias') query = query.eq('asesor_id', ctx.user.id);
      else if (input.tab === 'empresa') query = query.eq('employer_id', ctx.profile.employer_id);
      // 'todas' uses RLS (activas son visibles para autenticados)

      if (input.estado) query = query.eq('estado', input.estado);
      if (input.tipo) query = query.eq('tipo_propiedad', input.tipo);
      return (await query).data;
    }),

  // 6. Solicitar ACM (valuación IE)
  requestACM: authenticatedProcedure
    .input(z.object({
      propiedadId: z.string().uuid()
    }))
    .mutation(async ({ input, ctx }) => {
      // Rate limit
      const allowed = await ctx.supabaseAdmin.rpc('check_rate_limit', {
        p_user_id: ctx.user.id, p_endpoint: 'acm', p_max_per_hour: 20
      });
      if (!allowed) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });

      const { data: prop } = await ctx.supabase
        .from('propiedades_secundarias')
        .select('*')
        .eq('id', input.propiedadId)
        .single();

      if (!prop.zone_id || !prop.m2_total) {
        throw new TRPCError({ code: 'BAD_REQUEST',
          message: 'Propiedad necesita zona y m² para generar ACM' });
      }

      const acm = await ctx.supabaseAdmin.rpc('calculate_acm', {
        p_zone_id: prop.zone_id,
        p_tipo_propiedad: prop.tipo_propiedad,
        p_operacion: prop.operacion,
        p_m2: prop.m2_total
      });

      // Guardar ACM
      const { data: acmRecord } = await ctx.supabaseAdmin
        .from('acm_valuaciones')
        .insert({
          propiedad_id: input.propiedadId,
          asesor_id: ctx.user.id,
          tipo_propiedad: prop.tipo_propiedad,
          operacion: prop.operacion,
          m2: prop.m2_total,
          colonia: prop.colonia,
          alcaldia: prop.alcaldia,
          zone_id: prop.zone_id,
          precio_sugerido: acm.precio_total_sugerido,
          precio_m2_sugerido: acm.precio_m2_sugerido,
          rango_min: acm.rango_min,
          rango_max: acm.rango_max,
          confidence: acm.confidence,
          comparables: acm.comparables,
          comparables_count: acm.comparables_count,
          sources_used: ['market_prices_secondary', 'propiedades_secundarias']
        })
        .select()
        .single();

      // Actualizar propiedad con precio sugerido
      await ctx.supabase
        .from('propiedades_secundarias')
        .update({
          precio_sugerido_ie: acm.precio_total_sugerido,
          acm_id: acmRecord.id,
          valuacion_status: determineValuationStatus(prop.precio_venta, acm.precio_total_sugerido)
        })
        .eq('id', input.propiedadId);

      return acmRecord;
    }),

  // 7. Registrar encuentro en captación
  registrarEncuentro: authenticatedProcedure
    .input(z.object({
      captacionId: z.string().uuid(),
      fecha: z.string().datetime(),
      notas: z.string().optional(),
      motivo: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      await ctx.supabase
        .from('captaciones')
        .update({
          encuentros_count: ctx.supabase.rpc('increment_encounters'),
          ultimo_encuentro_at: input.fecha,
          updated_at: new Date()
        })
        .eq('id', input.captacionId)
        .eq('asesor_id', ctx.user.id);
      // Timeline
      await ctx.supabaseAdmin.from('actividad_timeline').insert({
        entity_type: 'captacion', entity_id: input.captacionId,
        action: 'updated', actor_id: ctx.user.id,
        metadata: { tipo: 'encuentro', notas: input.notas }
      });
      // XP
      await ctx.supabaseAdmin.rpc('add_asesor_xp', {
        p_user_id: ctx.user.id, p_xp: 25, p_action: 'encuentro_registrado'
      });
      return { success: true };
    }),

  // 8. Dashboard CRM del asesor (métricas de captaciones + props)
  getCRMDashboard: authenticatedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const [captaciones, props, operaciones] = await Promise.all([
        ctx.supabase.from('captaciones').select('etapa').eq('asesor_id', userId),
        ctx.supabase.from('propiedades_secundarias').select('estado, days_on_market').eq('asesor_id', userId),
        ctx.supabase.from('operaciones').select('status, comision_total')
          .eq('asesor_comprador_id', userId)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ]);
      return {
        captaciones_por_etapa: groupBy(captaciones.data, 'etapa'),
        props_por_estado: groupBy(props.data, 'estado'),
        props_activas: props.data?.filter(p => p.estado === 'activo').length || 0,
        operaciones_mes: operaciones.data?.length || 0,
        comisiones_mes: operaciones.data?.reduce((s, o) => s + (o.comision_total || 0), 0) || 0
      };
    }),
});
```

## 4.4 Router: gamification.ts (NUEVO v4)

```typescript
export const gamificationRouter = router({
  getMyStats: authenticatedProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('asesor_gamification')
        .select('*')
        .eq('user_id', ctx.user.id)
        .single();
      return data;
    }),

  getLeaderboard: authenticatedProcedure
    .input(z.object({ limit: z.number().min(5).max(50).default(20) }))
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('asesor_gamification')
        .select('user_id, xp_this_month, level, current_streak, monthly_rank, profiles(first_name, last_name)')
        .gt('xp_this_month', 0)
        .order('xp_this_month', { ascending: false })
        .limit(input.limit);
      return data;
    }),

  getMyBadges: authenticatedProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('asesor_gamification')
        .select('badges')
        .eq('user_id', ctx.user.id)
        .single();
      return data?.badges || [];
    }),
});
```

## 4.5 Routers restantes (resumen de procedures)

```
RECREAR admin.ts:
  getPlatformMetrics()     → platform_metrics AARRR
  getAnomalies()           → market_anomalies activas
  getRelationships()       → profiles + project_brokers vista global
  releaseAsesor(id)        → override liberación
  bulkDataLoad(payload)    → INSERT geo_data_points batch
  getCohorts()             → cohort analysis por semana registro

RECREAR ai.ts:
  generateArgumentario({ projectId, unitId })
  generateBriefing({ aseserId })
  generateDossier({ projectId, contactoId })
  generateObjectionKiller({ projectId, objection })
  projectAudit({ projectId })        ← ya existe como API route

RECREAR comprador.ts:
  getDashboard()
  getWishlist()
  toggleWishlist({ projectId })
  getOperaciones()
  getPagos()
  getLifestyleMatch({ projectId, preference })
  getDiscoverWeekly()

RECREAR distribution.ts:
  requestAuthorization({ projectId })
  approveAsesor({ brokerId })
  rejectAsesor({ brokerId })
  revokeAsesor({ brokerId })
  setCommission({ brokerId, pct })
  listBrokers({ projectId })

RECREAR masterBroker.ts:
  registerAsesor(input)
  releaseAsesor(id)
  requestTeamAuth({ projectId })
  getTeam()
  getTeamPipeline()

RECREAR payments.ts:
  createCheckout({ planId })
  getPortalUrl()
  getUsage()
  handleWebhook()              ← ya existe como API route

RECREAR intelligence.ts:
  getMarketPulse()
  getDemandHeatmap({ cityId })
  getAnomalies({ zoneId })
  getIndices({ zoneId })

NUEVO apiExternal.ts:
  createApiKey({ name, plan })
  listApiKeys()
  getApiMetrics({ period })
```

---

# MÓDULO 5: API ROUTES + CRON JOBS

## 5.1 API Routes — Estado y Plan

```
CONSERVAR (14 funcionales):
  /api/trpc/[trpc]                → tRPC handler
  /api/admin/ingest-upload        → Excel/CSV/PDF upload
  /api/document-intelligence/extract → Claude extraction
  /api/broker-verification        → Claude broker verification
  /api/photos/upload              → Sharp image processing
  /api/photos/classify            → Claude Vision classification
  /api/cron/drive-check           → Google Drive monitoring
  /api/cron/weekly-digest         → Weekly notifications
  /api/ai/project-audit           → Claude project audit
  /api/advisor-ai                 → NL search → Claude → DB (FIX: add rate limiting)
  /api/cron/score-worker          → Process score queue
  /api/match                      → Demand matching
  /api/profile/estado             → Update asesor availability
  /api/cron/ingest-macro          → Banxico + INEGI

ELIMINAR (9 placeholders que retornan strings fijos):
  /api/ai/disc, /api/tracking, /api/ai/suggest, /api/ai/summarize,
  /api/acm, /api/str-estimate, /api/dossier, /api/intelligence, /api/ai/briefing

NUEVAS v4:
  /api/cron/ingest-geo            → Orchestrator para 7 ingestores geo
  /api/cron/snapshot-denue        → Snapshot mensual DENUE
  /api/cron/sync-props-market     → Sync propiedades_secundarias → market_prices
  /api/cron/gamification-daily    → Streak check + monthly rank
  /api/cron/zone-scores-weekly    → Refresh zone_scores
  /api/cron/dmx-indices-monthly   → Calcular 7 índices DMX
  /api/cron/anomaly-detector      → Detectar anomalías en scores
  /api/cron/discover-weekly       → Generar matches semanales compradores
  /api/v1/scores/livability       → API externa: livability score
  /api/v1/scores/momentum         → API externa: momentum index
  /api/v1/scores/risk             → API externa: risk score
  /api/v1/estimate                → API externa: DMX Estimate
  /api/v1/rankings                → API externa: zone rankings
  /api/health                     → Health check completo
```

## 5.2 Cron Jobs — vercel.json (12 entries)

```json
{
  "crons": [
    { "path": "/api/cron/score-worker", "schedule": "* * * * *" },
    { "path": "/api/cron/ingest-macro", "schedule": "0 8 * * *" },
    { "path": "/api/cron/drive-check", "schedule": "0 * * * *" },
    { "path": "/api/cron/weekly-digest", "schedule": "0 7 * * 1" },
    { "path": "/api/cron/ingest-geo", "schedule": "0 3 1 * *" },
    { "path": "/api/cron/snapshot-denue", "schedule": "0 2 1 * *" },
    { "path": "/api/cron/sync-props-market", "schedule": "0 4 1 * *" },
    { "path": "/api/cron/gamification-daily", "schedule": "0 0 * * *" },
    { "path": "/api/cron/zone-scores-weekly", "schedule": "0 4 * * 1" },
    { "path": "/api/cron/dmx-indices-monthly", "schedule": "0 5 1 * *" },
    { "path": "/api/cron/anomaly-detector", "schedule": "0 6 * * *" },
    { "path": "/api/cron/discover-weekly", "schedule": "0 8 * * 1" }
  ]
}
```

## 5.2b Catálogo completo de 27 Jobs lógicos

Vercel.json tiene 12 entries, pero varios son orchestrators que disparan sub-jobs.
El catálogo completo de jobs lógicos es:

```
#   Job lógico                        Entry vercel.json            Schedule           Tipo
──  ─────────────────────────────────  ───────────────────────────  ─────────────────  ──────────
01  score-worker                      /api/cron/score-worker       * * * * *          worker
02  ingest-banxico                    /api/cron/ingest-macro       0 8 * * *          sub-job
03  ingest-inegi                      /api/cron/ingest-macro       0 8 * * *          sub-job
04  ingest-shf                        /api/cron/ingest-macro       0 8 * * *          sub-job
05  drive-check                       /api/cron/drive-check        0 * * * *          standalone
06  weekly-digest                     /api/cron/weekly-digest      0 7 * * 1          standalone
07  ingest-denue                      /api/cron/ingest-geo         0 3 1 * *          sub-job
08  ingest-fgj                        /api/cron/ingest-geo         0 3 1 * *          sub-job
09  ingest-gtfs                       /api/cron/ingest-geo         0 3 1 * *          sub-job
10  ingest-atlas-riesgos              /api/cron/ingest-geo         0 3 1 * *          sub-job
11  ingest-siged                      /api/cron/ingest-geo         0 3 1 * *          sub-job
12  ingest-dgis                       /api/cron/ingest-geo         0 3 1 * *          sub-job
13  ingest-sacmex                     /api/cron/ingest-geo         0 3 1 * *          sub-job
14  snapshot-denue                    /api/cron/snapshot-denue     0 2 1 * *          standalone
15  sync-props-market                 /api/cron/sync-props-market  0 4 1 * *          standalone
16  gamification-streak-check         /api/cron/gamification-daily 0 0 * * *          sub-job
17  gamification-monthly-rank-reset   /api/cron/gamification-daily 0 0 * * * (día 1)  sub-job
18  zone-scores-weekly                /api/cron/zone-scores-weekly 0 4 * * 1          standalone
19  dmx-indices-monthly               /api/cron/dmx-indices-monthly 0 5 1 * *         standalone
20  anomaly-detector                  /api/cron/anomaly-detector   0 6 * * *          standalone
21  discover-weekly                   /api/cron/discover-weekly    0 8 * * 1          standalone
22  weekly-briefing-generate          /api/cron/weekly-digest      0 7 * * 1          sub-job
23  monthly-index-newsletter          /api/cron/dmx-indices-monthly 0 5 5 * *         sub-job
24  search-behavior-aggregate         score-worker (cascada 6)     cada 1 hora        implicit
25  inventory-snapshot-daily          score-worker (trigger T6)    cada venta          implicit
26  score-history-archive             score-worker (trigger)       cada update score   implicit
27  api-usage-daily-reset             /api/cron/gamification-daily 0 0 * * *          sub-job

TOTAL: 27 jobs lógicos (12 vercel.json entries + 15 sub-jobs/implicit)
```

### Detalle de orchestrators:

```
/api/cron/ingest-macro (entry #2):
  Ejecuta secuencialmente:
  → ingestBanxico() — 4 series diarias
  → ingestINEGI() — 7 series (día 15 del mes, skip otros días)
  → ingestSHF() — quarterly (skip si no es trimestre nuevo)
  Cada sub-job es idempotente (upsert por serie_key + period_date)

/api/cron/ingest-geo (entry #5):
  Ejecuta secuencialmente los 7 ingestores geo:
  → ingestDENUE() — ~200K registros
  → ingestFGJ() — ~8K registros/mes
  → ingestGTFS() — ~300 estaciones
  → ingestAtlasRiesgos() — ~500 AGEBs
  → ingestSIGED() — ~15K escuelas
  → ingestDGIS() — ~5K establecimientos
  → ingestSACMEX() — ~2K registros
  Orden importa: DENUE primero (N01-N03 dependen), FGJ segundo (N04), resto parallelizable
  Cada sub-job loggea resultado en geo_snapshots

/api/cron/gamification-daily (entry #8):
  → streakCheck() — marcar streaks rotos si no hubo actividad ayer
  → monthlyRankReset() — solo día 1 del mes: recalcular ranking
  → apiUsageDailyReset() — reset contadores diarios de api_request_logs
```

## 5.3 Tabla completa de Cron Jobs (23 de v3 + 8 nuevos v4 = 31)

```
#  | Cron Job                    | Schedule        | Fase  | Status
───┼─────────────────────────────┼─────────────────┼───────┼────────
1  | score_recalculation_worker  | * * * * *       | R0    | IMPLEMENTADO
2  | ingest_banxico_daily        | 0 8 * * *       | R5    | IMPLEMENTADO
3  | ingest_inegi_monthly        | 0 8 15 * *      | R5    | IMPLEMENTADO
4  | drive_monitor_check         | 0 * * * *       | R3    | IMPLEMENTADO
5  | weekly_digest               | 0 7 * * 1       | R7    | IMPLEMENTADO
6  | expire_overdue_tasks        | 0 6 * * *       | R10   | pendiente
7  | inventory_snapshot_daily    | 0 2 * * *       | R10   | pendiente
8  | metricas_kpi_weekly         | 0 6 * * 1       | R10   | pendiente
9  | trust_score_monthly         | 0 5 1 * *       | R10   | pendiente
10 | platform_metrics_daily      | 0 1 * * *       | R10   | pendiente
11 | payment_reminders_daily     | 0 9 * * *       | R8    | pendiente
12 | ingest_shf_quarterly        | 0 8 1 1,4,7,10 *| R10   | pendiente
13 | refresh_fgj_monthly         | 0 3 1 * *       | R5a-2 | pendiente
14 | zone_scores_weekly_refresh  | 0 4 * * 1       | R10   | pendiente
15 | dmx_indices_monthly         | 0 5 1 * *       | R10   | pendiente
16 | score_subscriptions_notify  | */5 * * * *      | R10   | pendiente
17 | cleanup_old_jobs            | 0 3 * * 0       | R10   | pendiente
18 | storage_usage_update        | 0 3 * * *       | R10   | pendiente
19 | days_on_market_update       | 0 5 * * *       | R10   | pendiente
20 | weekly_briefing_generate    | 0 7 * * 1       | R10   | pendiente
21 | market_anomaly_detector     | 0 6 * * *       | R10   | pendiente
22 | workflow_executor           | * * * * *        | R7c   | pendiente
23 | asesor_status_offline_check | */5 * * * *      | R10   | pendiente
24 | ingest_geo_orchestrator     | 0 3 1 * *       | R5a-2 | NUEVO v4
25 | snapshot_denue_monthly      | 0 2 1 * *       | R5a-2 | NUEVO v4
26 | sync_props_to_market        | 0 4 1 * *       | R5    | NUEVO v4
27 | gamification_daily          | 0 0 * * *       | R1    | NUEVO v4
28 | gamification_monthly_reset  | 0 0 1 * *       | R1    | NUEVO v4
29 | discover_weekly_generate    | 0 8 * * 1       | R7    | NUEVO v4
30 | api_rate_limits_cleanup     | 0 0 * * *       | R9    | NUEVO v4
31 | props_sec_days_on_market    | 0 5 * * *       | R5    | NUEVO v4
```

## 5.4 Archivo CLAUDE.md (NUEVO — no existe en repo)

```markdown
# CLAUDE.md — DesarrollosMX v8

## Qué es este proyecto
Plataforma de Spatial Decision Intelligence para el mercado inmobiliario mexicano.
Marketplace + CRM + Intelligence Engine con 107 scores, 7 índices propietarios,
50+ fuentes de datos.

## Stack
Next.js 16, TypeScript strict, Tailwind v4, tRPC 11, Supabase, Mapbox GL JS,
Recharts, PostHog, Sharp, Claude API, OpenAI API.

## Estructura clave
/app/              → Next.js routes (4 portales: asesor, dev, admin, public)
/server/trpc/      → tRPC routers (16 routers, ~89 procedures)
/lib/intelligence-engine/ → IE módulo aislado (calculators, cascades, ingest, queue)
/lib/supabase/     → 3 clientes: client (anon), server (cookie), admin (service_role)
/components/       → UI compartidos + portal-specific

## Reglas
- NUNCA poner lógica de cálculo de scores fuera de /lib/intelligence-engine/
- SIEMPRE usar Zod para validar inputs de API routes y tRPC
- SIEMPRE verificar auth + profile + is_active antes de cualquier operación
- NUNCA exponer service_role_key al cliente
- Verificar columnas reales con information_schema antes de escribir SQL
- Si success, avanzar sin verificación extra — POST-SPRINT valida todo

## Archivos protegidos (no modificar sin backup)
middleware.ts, lib/supabase/*.ts, server/trpc/context.ts, server/trpc/middleware.ts

## BD
Supabase project: kcxnjdzichxixukfnenm
107 tablas, 160 RLS policies, ~10 triggers, ~25 functions
```

---

# CROSS-REFERENCES

```
→ BIBLIA_BACKEND_DMX_v4 PART 1: Tablas que estas functions/triggers/RLS operan
→ BIBLIA_BACKEND_DMX_v4 PART 3: Integraciones que usan estos routers/crons
→ BIBLIA_IE_DMX_v4: Scores que los calculators/cascades/crons procesan
→ BIBLIA_FRONTEND_DMX_v4: Hooks y componentes que consumen estos tRPC procedures
```

---

**FIN DE PART 2 — Continúa en BIBLIA_BACKEND_DMX_v4_PART3.md (Integraciones + Sprints)**

---
# ANEXO: VERIFICACIÓN REAL
```
64 funciones reales (doc dice ~25). 46 son SECURITY DEFINER.
8 peligrosas (aceptan uuid sin validar auth.uid()):
  get_asesor_dashboard, get_asesor_performance, get_developer_dashboard,
  get_master_broker_dashboard, get_morning_briefing, add_asesor_xp,
  calculate_commission_forecast, match_busqueda_inventario

36 triggers en 10 tablas. 15 tRPC routers (9 funcionales, 6 stubs).
19 crons funcionales en vercel.json. 9/9 cascadas conectadas. 107 scores en registry.
```
