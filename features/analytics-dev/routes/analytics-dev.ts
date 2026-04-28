import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import {
  loadProjectContext,
  runAbsorptionForecast,
  runCompetitiveIntel,
  runCostTracker,
  runDemandHeatmap,
  runPmfAnalysis,
  runPredictions,
  runPricingAutopilot,
} from '../lib/score-runners';
import {
  absorptionForecastInput,
  competitorAlertListInput,
  competitorAlertMarkReadInput,
  competitorMonitorCreateInput,
  competitorMonitorDeleteInput,
  competitorMonitorListInput,
  demandHeatmapInput,
  dynamicPricingListInput,
  pricingApplyInput,
  projectIdInput,
  projectsListInput,
} from '../schemas';

const ALLOWED_DEV_ROLES: ReadonlySet<string> = new Set([
  'admin_desarrolladora',
  'superadmin',
  'mb_admin',
]);

async function ensureDevAccess(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  proyectoId: string,
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, desarrolladora_id')
    .eq('id', userId)
    .maybeSingle();
  if (!profile || !ALLOWED_DEV_ROLES.has(profile.rol)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'role_required_dev' });
  }
  const { data: proyecto } = await supabase
    .from('proyectos')
    .select('id, desarrolladora_id')
    .eq('id', proyectoId)
    .maybeSingle();
  if (!proyecto) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'proyecto_not_found' });
  }
  if (
    profile.rol === 'admin_desarrolladora' &&
    proyecto.desarrolladora_id !== profile.desarrolladora_id
  ) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'project_not_owned' });
  }
}

export const analyticsDevRouter = router({
  listProjects: authenticatedProcedure.input(projectsListInput).query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol, desarrolladora_id')
      .eq('id', ctx.user.id)
      .maybeSingle();
    if (!profile || !ALLOWED_DEV_ROLES.has(profile.rol)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    let query = supabase
      .from('proyectos')
      .select('id, nombre, slug, ciudad, colonia, status, units_total, units_available')
      .eq('is_active', true);
    if (profile.rol === 'admin_desarrolladora' && profile.desarrolladora_id) {
      query = query.eq('desarrolladora_id', profile.desarrolladora_id);
    }
    const { data, error } = await query.order('nombre', { ascending: true });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? [];
  }),

  getDemandHeatmap: authenticatedProcedure
    .input(demandHeatmapInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevAccess(supabase, ctx.user.id, input.proyectoId);
      const projectCtx = await loadProjectContext(supabase, input.proyectoId);
      if (!projectCtx) throw new TRPCError({ code: 'NOT_FOUND' });
      return runDemandHeatmap(supabase, projectCtx, input.radiusKm);
    }),

  getPricingAutopilot: authenticatedProcedure
    .input(projectIdInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevAccess(supabase, ctx.user.id, input.proyectoId);
      const projectCtx = await loadProjectContext(supabase, input.proyectoId);
      if (!projectCtx) throw new TRPCError({ code: 'NOT_FOUND' });
      return runPricingAutopilot(projectCtx);
    }),

  applyPricingSuggestion: authenticatedProcedure
    .input(pricingApplyInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: unidad } = await supabase
        .from('unidades')
        .select('id, proyecto_id, price_mxn')
        .eq('id', input.unidadId)
        .maybeSingle();
      if (!unidad) throw new TRPCError({ code: 'NOT_FOUND', message: 'unidad_not_found' });
      await ensureDevAccess(supabase, ctx.user.id, unidad.proyecto_id);

      const oldPrice = unidad.price_mxn ?? 0;
      const { error: updateErr } = await supabase
        .from('unidades')
        .update({ price_mxn: input.suggestedPriceMxn, updated_at: new Date().toISOString() })
        .eq('id', input.unidadId);
      if (updateErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateErr.message });
      }

      await supabase.from('unit_change_log').insert({
        unidad_id: input.unidadId,
        actor_id: ctx.user.id,
        event_type: 'price_changed',
        payload: {
          old_price: oldPrice,
          new_price: input.suggestedPriceMxn,
          source: 'b03_autopilot',
        },
      });

      await supabase
        .from('dynamic_pricing_suggestions')
        .update({
          applied: true,
          applied_at: new Date().toISOString(),
          applied_by: ctx.user.id,
        })
        .eq('unidad_id', input.unidadId)
        .eq('applied', false);

      return { ok: true, oldPrice, newPrice: input.suggestedPriceMxn };
    }),

  listDynamicPricing: authenticatedProcedure
    .input(dynamicPricingListInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevAccess(supabase, ctx.user.id, input.proyectoId);
      const { data: unidades } = await supabase
        .from('unidades')
        .select('id, numero, tipo')
        .eq('proyecto_id', input.proyectoId);
      const ids = (unidades ?? []).map((u) => u.id);
      if (ids.length === 0) return [];
      let q = supabase
        .from('dynamic_pricing_suggestions')
        .select('*')
        .in('unidad_id', ids)
        .order('created_at', { ascending: false });
      if (input.unappliedOnly) q = q.eq('applied', false);
      const { data, error } = await q.limit(200);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      const byId = new Map((unidades ?? []).map((u) => [u.id, u]));
      return (data ?? []).map((row) => ({
        ...row,
        unidadNumero: byId.get(row.unidad_id)?.numero ?? '—',
        unidadTipo: byId.get(row.unidad_id)?.tipo ?? 'departamento',
      }));
    }),

  getAbsorptionForecast: authenticatedProcedure
    .input(absorptionForecastInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevAccess(supabase, ctx.user.id, input.proyectoId);
      const projectCtx = await loadProjectContext(supabase, input.proyectoId);
      if (!projectCtx) throw new TRPCError({ code: 'NOT_FOUND' });
      return runAbsorptionForecast(projectCtx, input.horizonMonths, input.priceShockPct);
    }),

  getCompetitiveIntel: authenticatedProcedure
    .input(projectIdInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevAccess(supabase, ctx.user.id, input.proyectoId);
      const projectCtx = await loadProjectContext(supabase, input.proyectoId);
      if (!projectCtx) throw new TRPCError({ code: 'NOT_FOUND' });
      return runCompetitiveIntel(supabase, projectCtx);
    }),

  getPmfAnalysis: authenticatedProcedure.input(projectIdInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    await ensureDevAccess(supabase, ctx.user.id, input.proyectoId);
    const projectCtx = await loadProjectContext(supabase, input.proyectoId);
    if (!projectCtx) throw new TRPCError({ code: 'NOT_FOUND' });
    return runPmfAnalysis(supabase, projectCtx);
  }),

  getCostTracker: authenticatedProcedure.input(projectIdInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    await ensureDevAccess(supabase, ctx.user.id, input.proyectoId);
    return runCostTracker(supabase);
  }),

  getPredictions: authenticatedProcedure.input(projectIdInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    await ensureDevAccess(supabase, ctx.user.id, input.proyectoId);
    const projectCtx = await loadProjectContext(supabase, input.proyectoId);
    if (!projectCtx) throw new TRPCError({ code: 'NOT_FOUND' });
    return runPredictions(projectCtx);
  }),

  // Competitor Radar (15.E.9)
  listMonitors: authenticatedProcedure
    .input(competitorMonitorListInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevAccess(supabase, ctx.user.id, input.myProyectoId);
      const { data, error } = await supabase
        .from('competitor_monitors')
        .select(
          'id, my_proyecto_id, competitor_proyecto_id, competitor_external_name, competitor_external_url, metrics_tracked, active, last_checked_at, created_at',
        )
        .eq('my_proyecto_id', input.myProyectoId)
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      const rows = (data ?? []) as ReadonlyArray<{
        readonly id: string;
        readonly my_proyecto_id: string;
        readonly competitor_proyecto_id: string | null;
        readonly competitor_external_name: string | null;
        readonly competitor_external_url: string | null;
        readonly metrics_tracked: unknown;
        readonly active: boolean;
        readonly last_checked_at: string | null;
        readonly created_at: string;
      }>;
      return rows;
    }),

  createMonitor: authenticatedProcedure
    .input(competitorMonitorCreateInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevAccess(supabase, ctx.user.id, input.myProyectoId);
      if (!input.competitorProyectoId && !input.competitorExternalName) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'competitor_proyecto_id_or_external_name_required',
        });
      }
      const { data, error } = await supabase
        .from('competitor_monitors')
        .insert({
          my_proyecto_id: input.myProyectoId,
          competitor_proyecto_id: input.competitorProyectoId ?? null,
          competitor_external_name: input.competitorExternalName ?? null,
          competitor_external_url: input.competitorExternalUrl ?? null,
          metrics_tracked: input.metricsTracked,
          created_by: ctx.user.id,
        })
        .select('*')
        .single();
      if (error) {
        sentry.captureException(error, { tags: { feature: 'analytics-dev', op: 'createMonitor' } });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data;
    }),

  deleteMonitor: authenticatedProcedure
    .input(competitorMonitorDeleteInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: monitor } = await supabase
        .from('competitor_monitors')
        .select('id, my_proyecto_id')
        .eq('id', input.monitorId)
        .maybeSingle();
      if (!monitor) throw new TRPCError({ code: 'NOT_FOUND' });
      await ensureDevAccess(supabase, ctx.user.id, monitor.my_proyecto_id);
      const { error } = await supabase
        .from('competitor_monitors')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', input.monitorId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { ok: true };
    }),

  listAlerts: authenticatedProcedure
    .input(competitorAlertListInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevAccess(supabase, ctx.user.id, input.myProyectoId);
      const { data: monitors } = await supabase
        .from('competitor_monitors')
        .select('id, competitor_external_name, competitor_proyecto_id')
        .eq('my_proyecto_id', input.myProyectoId);
      const monitorIds = (monitors ?? []).map((m) => m.id);
      if (monitorIds.length === 0) return [];
      let q = supabase
        .from('competitor_alerts')
        .select(
          'id, monitor_id, alert_type, severity, payload, ai_narrative, detected_at, read_at, created_at',
        )
        .in('monitor_id', monitorIds)
        .order('detected_at', { ascending: false });
      if (input.unreadOnly) q = q.is('read_at', null);
      const { data, error } = await q.limit(100);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      const byMonitor = new Map((monitors ?? []).map((m) => [m.id, m]));
      const alerts = (data ?? []) as ReadonlyArray<{
        readonly id: string;
        readonly monitor_id: string;
        readonly alert_type: string;
        readonly severity: string;
        readonly payload: unknown;
        readonly ai_narrative: string | null;
        readonly detected_at: string;
        readonly read_at: string | null;
        readonly created_at: string;
      }>;
      return alerts.map((a) => {
        const m = byMonitor.get(a.monitor_id);
        return {
          ...a,
          competitorName: m?.competitor_external_name ?? null,
        };
      });
    }),

  markAlertRead: authenticatedProcedure
    .input(competitorAlertMarkReadInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: alert } = await supabase
        .from('competitor_alerts')
        .select('id, monitor_id')
        .eq('id', input.alertId)
        .maybeSingle();
      if (!alert) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: monitor } = await supabase
        .from('competitor_monitors')
        .select('my_proyecto_id')
        .eq('id', alert.monitor_id)
        .maybeSingle();
      if (!monitor) throw new TRPCError({ code: 'NOT_FOUND' });
      await ensureDevAccess(supabase, ctx.user.id, monitor.my_proyecto_id);
      const { error } = await supabase
        .from('competitor_alerts')
        .update({ read_at: new Date().toISOString() })
        .eq('id', input.alertId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { ok: true };
    }),
});
