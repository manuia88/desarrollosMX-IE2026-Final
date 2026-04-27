import { TRPCError } from '@trpc/server';
import { getStudioMetricsForAsesor } from '@/features/dmx-studio/lib/cross-functions/m09-studio-metrics';
import {
  estadisticasInput,
  leaderboardInput,
  metricsSemaforoInput,
  pipelineFunnelInput,
  revenueByMonthInput,
  teamComparisonInput,
  visitsConversionInput,
  zonesActivityInput,
} from '@/features/estadisticas/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import * as runtimeCache from '@/shared/lib/runtime-cache';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

const CACHE_TTL_SECONDS = 300;

type StatsRow = {
  asesor_id: string;
  day: string;
  consultas_recibidas: number;
  consultas_atendidas: number;
  busquedas_total: number;
  busquedas_activas: number;
  busquedas_propuesta: number;
  captaciones_creadas: number;
  inventario_activo: number;
  acms_generados: number;
  operaciones_cerradas: number;
  revenue_mxn: number;
  visitas_agendadas: number;
  visitas_completadas: number;
  t_primera_respuesta_min: number | null;
  t_promedio_min: number | null;
};

function cacheKey(prefix: string, asesorId: string, args: Record<string, unknown>): string {
  return `${prefix}:${asesorId}:${JSON.stringify(args)}`;
}

type Totals = {
  consultas_recibidas: number;
  consultas_atendidas: number;
  busquedas_total: number;
  busquedas_activas: number;
  busquedas_propuesta: number;
  captaciones_creadas: number;
  inventario_activo: number;
  acms_generados: number;
  operaciones_cerradas: number;
  revenue_mxn: number;
  visitas_agendadas: number;
  visitas_completadas: number;
};

export type EstadisticasResult = {
  rangeFrom: string;
  rangeTo: string;
  rows: StatsRow[];
  totals: Totals;
};

export type SemaforoResult = {
  rangeFrom: string;
  rangeTo: string;
  kpis: {
    pendingInquiries: number;
    firstResponseTime: number | null;
    avgResponseTime: number | null;
    interactionsVolume: number;
    avgSuggestions: number;
    visitRate: number | null;
    offerRate: number | null;
    inventoryActivePct: number | null;
    inventoryTotal: number;
    acmsGenerated: number;
    capturesNew: number;
  };
  slaUnavailable: ReadonlyArray<string>;
};

export type FunnelResult = {
  stages: Array<{ stage: string; count: number }>;
};

export type RevenueResult = {
  series: Array<{ month: string; revenue_mxn: number; operaciones_cerradas: number }>;
};

export type VisitsResult = {
  series: Array<{
    day: string;
    visitas_agendadas: number;
    visitas_completadas: number;
    operaciones_cerradas: number;
  }>;
  slaUnavailable: boolean;
};

export type ZonesResult = {
  heatmap: Array<{ colonia: string; count: number }>;
};

async function fetchStatsRange(
  supabase: ReturnType<typeof createAdminClient>,
  asesorId: string,
  rangeFrom: string,
  rangeTo: string,
): Promise<StatsRow[]> {
  const { data, error } = await supabase
    .from('asesor_stats_daily')
    .select(
      'asesor_id, day, consultas_recibidas, consultas_atendidas, busquedas_total, busquedas_activas, busquedas_propuesta, captaciones_creadas, inventario_activo, acms_generados, operaciones_cerradas, revenue_mxn, visitas_agendadas, visitas_completadas, t_primera_respuesta_min, t_promedio_min',
    )
    .eq('asesor_id', asesorId)
    .gte('day', rangeFrom)
    .lte('day', rangeTo)
    .order('day', { ascending: true });

  if (error) {
    sentry.captureException(error, {
      tags: { feature: 'estadisticas', op: 'fetchStatsRange' },
      extra: { asesorId, rangeFrom, rangeTo },
    });
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `asesor_stats_daily query failed: ${error.message}`,
    });
  }
  return (data ?? []) as StatsRow[];
}

function sumRows(rows: StatsRow[]) {
  return rows.reduce(
    (acc, r) => {
      acc.consultas_recibidas += r.consultas_recibidas;
      acc.consultas_atendidas += r.consultas_atendidas;
      acc.busquedas_total += r.busquedas_total;
      acc.busquedas_activas += r.busquedas_activas;
      acc.busquedas_propuesta += r.busquedas_propuesta;
      acc.captaciones_creadas += r.captaciones_creadas;
      acc.inventario_activo = Math.max(acc.inventario_activo, r.inventario_activo);
      acc.acms_generados += r.acms_generados;
      acc.operaciones_cerradas += r.operaciones_cerradas;
      acc.revenue_mxn += Number(r.revenue_mxn ?? 0);
      acc.visitas_agendadas += r.visitas_agendadas;
      acc.visitas_completadas += r.visitas_completadas;
      return acc;
    },
    {
      consultas_recibidas: 0,
      consultas_atendidas: 0,
      busquedas_total: 0,
      busquedas_activas: 0,
      busquedas_propuesta: 0,
      captaciones_creadas: 0,
      inventario_activo: 0,
      acms_generados: 0,
      operaciones_cerradas: 0,
      revenue_mxn: 0,
      visitas_agendadas: 0,
      visitas_completadas: 0,
    },
  );
}

export const estadisticasRouter = router({
  getEstadisticas: authenticatedProcedure.input(estadisticasInput).query(async ({ ctx, input }) => {
    const key = cacheKey('estadisticas:dashboard', ctx.user.id, input);
    const cached = runtimeCache.get<EstadisticasResult>(key);
    if (cached) return cached;

    const supabase = createAdminClient();
    const rows = await fetchStatsRange(supabase, ctx.user.id, input.rangeFrom, input.rangeTo);
    const totals = sumRows(rows);
    const result = {
      rangeFrom: input.rangeFrom,
      rangeTo: input.rangeTo,
      rows,
      totals,
    };
    runtimeCache.set(key, result, { ttlSeconds: CACHE_TTL_SECONDS });
    return result;
  }),

  getMetricsSemaforo: authenticatedProcedure
    .input(metricsSemaforoInput)
    .query(async ({ ctx, input }) => {
      const key = cacheKey('estadisticas:semaforo', ctx.user.id, input);
      const cached = runtimeCache.get<SemaforoResult>(key);
      if (cached) return cached;

      const supabase = createAdminClient();
      const rows = await fetchStatsRange(supabase, ctx.user.id, input.rangeFrom, input.rangeTo);
      const totals = sumRows(rows);
      const days = Math.max(rows.length, 1);
      const consultasPendientes = Math.max(
        0,
        totals.consultas_recibidas - totals.consultas_atendidas,
      );
      const visitRate =
        totals.visitas_agendadas > 0
          ? (totals.visitas_completadas / totals.visitas_agendadas) * 100
          : null;
      const offerRate =
        totals.busquedas_total > 0
          ? (totals.busquedas_propuesta / totals.busquedas_total) * 100
          : null;
      const inventoryActivePct =
        totals.captaciones_creadas > 0
          ? (totals.inventario_activo / totals.captaciones_creadas) * 100
          : null;

      const result = {
        rangeFrom: input.rangeFrom,
        rangeTo: input.rangeTo,
        kpis: {
          pendingInquiries: consultasPendientes,
          firstResponseTime: null as number | null,
          avgResponseTime: null as number | null,
          interactionsVolume: totals.consultas_atendidas / days,
          avgSuggestions: totals.busquedas_total / days,
          visitRate,
          offerRate,
          inventoryActivePct,
          inventoryTotal: totals.captaciones_creadas,
          acmsGenerated: totals.acms_generados,
          capturesNew: totals.captaciones_creadas,
        },
        slaUnavailable: ['firstResponseTime', 'avgResponseTime'],
      };
      runtimeCache.set(key, result, { ttlSeconds: CACHE_TTL_SECONDS });
      return result;
    }),

  getPipelineFunnel: authenticatedProcedure
    .input(pipelineFunnelInput)
    .query(async ({ ctx, input }) => {
      const key = cacheKey('estadisticas:funnel', ctx.user.id, input);
      const cached = runtimeCache.get<FunnelResult>(key);
      if (cached) return cached;

      const supabase = createAdminClient();
      const rows = await fetchStatsRange(supabase, ctx.user.id, input.rangeFrom, input.rangeTo);
      const totals = sumRows(rows);
      const result = {
        stages: [
          { stage: 'pendiente', count: totals.consultas_recibidas },
          { stage: 'buscando', count: totals.busquedas_activas },
          { stage: 'visitando', count: totals.visitas_agendadas },
          { stage: 'ofertando', count: totals.busquedas_propuesta },
          { stage: 'cerrando', count: totals.operaciones_cerradas },
          { stage: 'ganada', count: totals.operaciones_cerradas },
        ],
      };
      runtimeCache.set(key, result, { ttlSeconds: CACHE_TTL_SECONDS });
      return result;
    }),

  getRevenueByMonth: authenticatedProcedure
    .input(revenueByMonthInput)
    .query(async ({ ctx, input }) => {
      const key = cacheKey('estadisticas:revenue', ctx.user.id, input);
      const cached = runtimeCache.get<RevenueResult>(key);
      if (cached) return cached;

      const supabase = createAdminClient();
      const rows = await fetchStatsRange(supabase, ctx.user.id, input.rangeFrom, input.rangeTo);
      const byMonth = new Map<string, { revenue_mxn: number; operaciones_cerradas: number }>();
      for (const r of rows) {
        const month = r.day.slice(0, 7);
        const acc = byMonth.get(month) ?? { revenue_mxn: 0, operaciones_cerradas: 0 };
        acc.revenue_mxn += Number(r.revenue_mxn ?? 0);
        acc.operaciones_cerradas += r.operaciones_cerradas;
        byMonth.set(month, acc);
      }
      const series = Array.from(byMonth.entries())
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => a.month.localeCompare(b.month));
      const result = { series };
      runtimeCache.set(key, result, { ttlSeconds: CACHE_TTL_SECONDS });
      return result;
    }),

  getVisitsConversion: authenticatedProcedure
    .input(visitsConversionInput)
    .query(async ({ ctx, input }) => {
      const key = cacheKey('estadisticas:visits', ctx.user.id, input);
      const cached = runtimeCache.get<VisitsResult>(key);
      if (cached) return cached;

      const supabase = createAdminClient();
      const rows = await fetchStatsRange(supabase, ctx.user.id, input.rangeFrom, input.rangeTo);
      const series = rows.map((r) => ({
        day: r.day,
        visitas_agendadas: r.visitas_agendadas,
        visitas_completadas: r.visitas_completadas,
        operaciones_cerradas: r.operaciones_cerradas,
      }));
      const result = {
        series,
        slaUnavailable: rows.every((r) => r.visitas_agendadas === 0),
      };
      runtimeCache.set(key, result, { ttlSeconds: CACHE_TTL_SECONDS });
      return result;
    }),

  getZonesActivity: authenticatedProcedure
    .input(zonesActivityInput)
    .query(async ({ ctx, input }) => {
      const key = cacheKey('estadisticas:zones', ctx.user.id, input);
      const cached = runtimeCache.get<ZonesResult>(key);
      if (cached) return cached;

      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('captaciones')
        .select('colonia, ciudad, status, country_code, created_at')
        .eq('asesor_id', ctx.user.id)
        .gte('created_at', input.rangeFrom)
        .lte('created_at', input.rangeTo);

      if (error) {
        sentry.captureException(error, {
          tags: { feature: 'estadisticas', op: 'getZonesActivity' },
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `zones activity query failed: ${error.message}`,
        });
      }

      type ZoneRow = { colonia: string | null; ciudad: string | null; status: string | null };
      const counts = new Map<string, number>();
      for (const row of (data ?? []) as ZoneRow[]) {
        const colonia = row.colonia ?? row.ciudad ?? 'sin_zona';
        counts.set(colonia, (counts.get(colonia) ?? 0) + 1);
      }
      const heatmap = Array.from(counts.entries())
        .map(([colonia, count]) => ({ colonia, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      const result = { heatmap };
      runtimeCache.set(key, result, { ttlSeconds: CACHE_TTL_SECONDS });
      return result;
    }),

  getTeamComparison: authenticatedProcedure
    .input(teamComparisonInput)
    .query(async ({ ctx, input }) => {
      const meta = (ctx.profile?.meta as Record<string, unknown> | null) ?? null;
      const allowed = Boolean(meta?.stats_team_comparison);
      if (!allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'team comparison requires permission stats_team_comparison',
        });
      }

      const supabase = createAdminClient();
      const { data: selfRows, error: selfErr } = await supabase
        .from('asesor_stats_daily')
        .select('revenue_mxn, operaciones_cerradas, visitas_completadas, consultas_atendidas')
        .eq('asesor_id', ctx.user.id)
        .gte('day', input.rangeFrom)
        .lte('day', input.rangeTo);

      if (selfErr) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `team comparison self query failed: ${selfErr.message}`,
        });
      }

      const { data: teamRows, error: teamErr } = await supabase
        .from('asesor_stats_daily')
        .select('asesor_id, revenue_mxn, operaciones_cerradas, visitas_completadas')
        .gte('day', input.rangeFrom)
        .lte('day', input.rangeTo);

      if (teamErr) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `team comparison team query failed: ${teamErr.message}`,
        });
      }

      type TeamRow = {
        asesor_id: string;
        revenue_mxn: number;
        operaciones_cerradas: number;
        visitas_completadas: number;
      };
      const byAsesor = new Map<
        string,
        { revenue_mxn: number; operaciones_cerradas: number; visitas_completadas: number }
      >();
      for (const r of (teamRows ?? []) as TeamRow[]) {
        const acc = byAsesor.get(r.asesor_id) ?? {
          revenue_mxn: 0,
          operaciones_cerradas: 0,
          visitas_completadas: 0,
        };
        acc.revenue_mxn += Number(r.revenue_mxn ?? 0);
        acc.operaciones_cerradas += r.operaciones_cerradas;
        acc.visitas_completadas += r.visitas_completadas;
        byAsesor.set(r.asesor_id, acc);
      }

      const teamArr = Array.from(byAsesor.values());
      const teamCount = Math.max(teamArr.length, 1);
      const teamAvg = {
        revenue_mxn: teamArr.reduce((s, x) => s + x.revenue_mxn, 0) / teamCount,
        operaciones_cerradas: teamArr.reduce((s, x) => s + x.operaciones_cerradas, 0) / teamCount,
        visitas_completadas: teamArr.reduce((s, x) => s + x.visitas_completadas, 0) / teamCount,
      };
      const sortedByRevenue = [...teamArr].sort((a, b) => b.revenue_mxn - a.revenue_mxn);
      const top = sortedByRevenue[0] ?? {
        revenue_mxn: 0,
        operaciones_cerradas: 0,
        visitas_completadas: 0,
      };
      const self = (selfRows ?? []).reduce(
        (acc, r) => ({
          revenue_mxn: acc.revenue_mxn + Number(r.revenue_mxn ?? 0),
          operaciones_cerradas: acc.operaciones_cerradas + (r.operaciones_cerradas ?? 0),
          visitas_completadas: acc.visitas_completadas + (r.visitas_completadas ?? 0),
        }),
        { revenue_mxn: 0, operaciones_cerradas: 0, visitas_completadas: 0 },
      );

      return {
        rangeFrom: input.rangeFrom,
        rangeTo: input.rangeTo,
        self,
        teamAvg,
        topAnonymous: { label: 'Asesor #1', ...top },
        teamSize: teamArr.length,
      };
    }),

  getLeaderboard: authenticatedProcedure.input(leaderboardInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const targetMonth = input.month ?? firstDayOfCurrentMonth();
    const { data, error } = await supabase
      .from('asesor_gamification')
      .select(
        'asesor_id, month, rank_revenue, rank_visits, rank_close_rate, rank_response_time, rank_overall, revenue_mxn, visits_count, close_rate_pct, response_time_avg_min, opt_in_public_ranking, badge_unlocked',
      )
      .eq('month', targetMonth)
      .order('rank_overall', { ascending: true, nullsFirst: false })
      .limit(50);

    if (error) {
      sentry.captureException(error, {
        tags: { feature: 'estadisticas', op: 'getLeaderboard' },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `leaderboard query failed: ${error.message}`,
      });
    }
    return {
      month: targetMonth,
      entries: data ?? [],
    };
  }),

  getStudioMetrics: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    try {
      return await getStudioMetricsForAsesor(supabase, ctx.user.id);
    } catch (err) {
      sentry.captureException(err, {
        tags: { feature: 'estadisticas', op: 'getStudioMetrics' },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'getStudioMetrics failed',
        cause: err,
      });
    }
  }),
});

function firstDayOfCurrentMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}
