-- M09 Estadísticas — asesor_stats_daily MATERIALIZED VIEW
-- Aggregations precalculadas per (asesor_id, day) para portal asesor
-- Adaptado a schema real H1: leads / busquedas / captaciones / operaciones
-- Placeholders 0/NULL para visitas + SLA hasta tablas visitas/timeline_entries shipped

CREATE MATERIALIZED VIEW IF NOT EXISTS public.asesor_stats_daily AS
WITH leads_agg AS (
  SELECT
    assigned_asesor_id AS asesor_id,
    (DATE_TRUNC('day', created_at))::date AS day,
    COUNT(*)::integer AS consultas_recibidas,
    COUNT(*) FILTER (WHERE qualification_score IS NOT NULL)::integer AS consultas_atendidas
  FROM public.leads
  WHERE assigned_asesor_id IS NOT NULL
  GROUP BY 1, 2
),
busquedas_agg AS (
  SELECT
    asesor_id,
    (DATE_TRUNC('day', created_at))::date AS day,
    COUNT(*)::integer AS busquedas_total,
    COUNT(*) FILTER (WHERE status = 'activa')::integer AS busquedas_activas,
    COUNT(*) FILTER (WHERE status = 'propuesta')::integer AS busquedas_propuesta
  FROM public.busquedas
  WHERE asesor_id IS NOT NULL
  GROUP BY 1, 2
),
captaciones_create_agg AS (
  SELECT
    asesor_id,
    (DATE_TRUNC('day', created_at))::date AS day,
    COUNT(*)::integer AS captaciones_creadas,
    COUNT(*) FILTER (WHERE status IN ('en_promocion', 'firmado'))::integer AS inventario_activo
  FROM public.captaciones
  WHERE asesor_id IS NOT NULL
  GROUP BY 1, 2
),
captaciones_acm_agg AS (
  SELECT
    asesor_id,
    (DATE_TRUNC('day', acm_computed_at))::date AS day,
    COUNT(*)::integer AS acms_generados
  FROM public.captaciones
  WHERE asesor_id IS NOT NULL AND acm_computed_at IS NOT NULL
  GROUP BY 1, 2
),
operaciones_agg AS (
  SELECT
    asesor_id,
    (DATE_TRUNC('day', COALESCE(closed_at, fecha_cierre::timestamptz, created_at)))::date AS day,
    COUNT(*) FILTER (WHERE status = 'cerrada')::integer AS operaciones_cerradas,
    COALESCE(SUM(cierre_amount) FILTER (WHERE status = 'cerrada' AND cierre_currency = 'MXN'), 0)::numeric AS revenue_mxn
  FROM public.operaciones
  WHERE asesor_id IS NOT NULL
  GROUP BY 1, 2
)
SELECT
  COALESCE(l.asesor_id, b.asesor_id, cc.asesor_id, ca.asesor_id, o.asesor_id) AS asesor_id,
  COALESCE(l.day, b.day, cc.day, ca.day, o.day) AS day,
  COALESCE(l.consultas_recibidas, 0) AS consultas_recibidas,
  COALESCE(l.consultas_atendidas, 0) AS consultas_atendidas,
  COALESCE(b.busquedas_total, 0) AS busquedas_total,
  COALESCE(b.busquedas_activas, 0) AS busquedas_activas,
  COALESCE(b.busquedas_propuesta, 0) AS busquedas_propuesta,
  COALESCE(cc.captaciones_creadas, 0) AS captaciones_creadas,
  COALESCE(cc.inventario_activo, 0) AS inventario_activo,
  COALESCE(ca.acms_generados, 0) AS acms_generados,
  COALESCE(o.operaciones_cerradas, 0) AS operaciones_cerradas,
  COALESCE(o.revenue_mxn, 0) AS revenue_mxn,
  0::integer AS visitas_agendadas,
  0::integer AS visitas_completadas,
  NULL::numeric AS t_primera_respuesta_min,
  NULL::numeric AS t_promedio_min
FROM leads_agg l
FULL OUTER JOIN busquedas_agg b
  ON l.asesor_id = b.asesor_id AND l.day = b.day
FULL OUTER JOIN captaciones_create_agg cc
  ON COALESCE(l.asesor_id, b.asesor_id) = cc.asesor_id
  AND COALESCE(l.day, b.day) = cc.day
FULL OUTER JOIN captaciones_acm_agg ca
  ON COALESCE(l.asesor_id, b.asesor_id, cc.asesor_id) = ca.asesor_id
  AND COALESCE(l.day, b.day, cc.day) = ca.day
FULL OUTER JOIN operaciones_agg o
  ON COALESCE(l.asesor_id, b.asesor_id, cc.asesor_id, ca.asesor_id) = o.asesor_id
  AND COALESCE(l.day, b.day, cc.day, ca.day) = o.day;

CREATE UNIQUE INDEX IF NOT EXISTS asesor_stats_daily_asesor_day_uidx
  ON public.asesor_stats_daily (asesor_id, day);

CREATE INDEX IF NOT EXISTS asesor_stats_daily_day_idx
  ON public.asesor_stats_daily (day);

COMMENT ON MATERIALIZED VIEW public.asesor_stats_daily IS
  'M09 Estadísticas — agregaciones diarias asesor desde leads/busquedas/captaciones/operaciones. Refresh hora via cron asesor-stats-refresh. visitas_agendadas/completadas + t_*_min placeholder hasta tablas visitas/timeline_entries shipped (post H1).';
