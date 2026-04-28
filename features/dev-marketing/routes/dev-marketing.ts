// FASE 15 ola 2 ventana 15.D.2 — M14 Marketing Dev router.
// Scope: campaigns CRUD + B.4 multi-touch attribution + Claude IA optimizer + CF.2 Studio video auto.

import { TRPCError } from '@trpc/server';
import {
  applyOptimizerActionInput,
  campaignIdInput,
  createCampaignInput,
  getAttributionReportInput,
  getCampaignAnalyticsInput,
  getOptimizerRecommendationsInput,
  listCampaignsInput,
  requestStudioVideoJobInput,
  updateCampaignInput,
} from '@/features/dev-marketing/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import {
  type AttributionTouchpoint,
  aggregateByChannel,
  computeAttributionWeights,
} from '@/shared/lib/marketing/attribution/multi-touch';
import {
  type CampaignSnapshot,
  evaluateCampaigns,
} from '@/shared/lib/marketing/optimizer/ad-spend-optimizer';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Json } from '@/shared/types/database';

const ALLOWED_DEV_ROLES = new Set(['admin_desarrolladora', 'superadmin', 'mb_admin']);

type AdminClient = ReturnType<typeof createAdminClient>;

interface DevContext {
  readonly userId: string;
  readonly desarrolladoraId: string | null;
  readonly rol: string;
  readonly isPlatformAdmin: boolean;
}

interface CampaignRow {
  readonly id: string;
  readonly desarrolladora_id: string;
  readonly proyecto_ids: readonly string[];
  readonly nombre: string;
  readonly tipo: string;
  readonly presupuesto_mxn: number;
  readonly start_date: string;
  readonly end_date: string;
  readonly canales: Json;
  readonly status: string;
  readonly utm_source: string | null;
  readonly utm_medium: string | null;
  readonly utm_campaign: string | null;
  readonly meta: Json;
  readonly created_at: string;
  readonly updated_at: string;
}

interface CampaignAnalyticsRow {
  readonly id: string;
  readonly campaign_id: string;
  readonly date: string;
  readonly channel: string;
  readonly impressions: number;
  readonly clicks: number;
  readonly spend_mxn: number;
  readonly leads: number;
  readonly conversions: number;
  readonly ctr: number | null;
  readonly cpl_mxn: number | null;
  readonly cac_mxn: number | null;
  readonly attribution_model: string;
  readonly attribution_score: Json;
  readonly recommended_action: string | null;
  readonly ai_recommendation_reasoning: string | null;
}

interface AttributionEventRow {
  readonly id: string;
  readonly lead_id: string | null;
  readonly campaign_id: string | null;
  readonly channel: string;
  readonly utm_source: string | null;
  readonly utm_medium: string | null;
  readonly utm_campaign: string | null;
  readonly event_type: string;
  readonly occurred_at: string;
}

const CAMPAIGN_FIELDS =
  'id, desarrolladora_id, proyecto_ids, nombre, tipo, presupuesto_mxn, start_date, end_date, canales, status, utm_source, utm_medium, utm_campaign, meta, created_at, updated_at';
const ANALYTICS_FIELDS =
  'id, campaign_id, date, channel, impressions, clicks, spend_mxn, leads, conversions, ctr, cpl_mxn, cac_mxn, attribution_model, attribution_score, recommended_action, ai_recommendation_reasoning';
const ASSUMED_REVENUE_PER_CONVERSION_MXN = 250_000;

async function requireDevContext(supabase: AdminClient, userId: string): Promise<DevContext> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, rol, desarrolladora_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    sentry.captureException(error, { tags: { feature: 'dev-marketing', op: 'requireDevContext' } });
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (!data || !ALLOWED_DEV_ROLES.has(data.rol)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'developer role required' });
  }

  return {
    userId: data.id,
    desarrolladoraId: data.desarrolladora_id,
    rol: data.rol,
    isPlatformAdmin: data.rol === 'superadmin' || data.rol === 'mb_admin',
  };
}

async function loadOwnedCampaign(
  supabase: AdminClient,
  devCtx: DevContext,
  campaignId: string,
): Promise<CampaignRow> {
  let q = supabase.from('campaigns').select(CAMPAIGN_FIELDS).eq('id', campaignId);
  if (!devCtx.isPlatformAdmin) {
    if (!devCtx.desarrolladoraId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'desarrolladora_id required' });
    }
    q = q.eq('desarrolladora_id', devCtx.desarrolladoraId);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'campaign not found' });
  return data as CampaignRow;
}

async function logAuditAction(
  supabase: AdminClient,
  devCtx: DevContext,
  action: string,
  recordId: string,
  meta: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    actor_id: devCtx.userId,
    actor_role: devCtx.rol as never,
    action,
    table_name: 'campaigns',
    record_id: recordId,
    meta: meta as Json,
  } as never);
  if (error) {
    sentry.captureException(error, { tags: { feature: 'dev-marketing', op: 'audit_log' } });
  }
}

function actionRank(action: string): number {
  if (action === 'pause') return 0;
  if (action === 'optimize') return 1;
  if (action === 'scale') return 2;
  return 3;
}

export const devMarketingRouter = router({
  listCampaigns: authenticatedProcedure.input(listCampaignsInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const devCtx = await requireDevContext(supabase, ctx.user.id);
    let q = supabase
      .from('campaigns')
      .select(CAMPAIGN_FIELDS)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (!devCtx.isPlatformAdmin) {
      if (!devCtx.desarrolladoraId) return [] as CampaignRow[];
      q = q.eq('desarrolladora_id', devCtx.desarrolladoraId);
    }
    if (input.status) q = q.eq('status', input.status);
    if (input.proyectoId) q = q.contains('proyecto_ids', [input.proyectoId]);

    const { data, error } = await q;
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return (data ?? []) as CampaignRow[];
  }),

  getCampaign: authenticatedProcedure.input(campaignIdInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const devCtx = await requireDevContext(supabase, ctx.user.id);
    const campaign = await loadOwnedCampaign(supabase, devCtx, input.campaignId);
    const { data: creatives } = await supabase
      .from('campaign_creatives')
      .select('id, variant, url, preview_url, ai_generated, created_at')
      .eq('campaign_id', input.campaignId);
    return { campaign, creatives: creatives ?? [] };
  }),

  createCampaign: authenticatedProcedure
    .input(createCampaignInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const devCtx = await requireDevContext(supabase, ctx.user.id);
      if (!devCtx.desarrolladoraId && !devCtx.isPlatformAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'desarrolladora required' });
      }

      const { data: ownedProjects, error: projErr } = await supabase
        .from('proyectos')
        .select('id, desarrolladora_id')
        .in('id', input.proyectoIds);
      if (projErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: projErr.message });
      }
      const owned = (ownedProjects ?? []).filter(
        (p) => devCtx.isPlatformAdmin || p.desarrolladora_id === devCtx.desarrolladoraId,
      );
      if (owned.length !== input.proyectoIds.length) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'proyectoIds outside scope' });
      }

      const desarrolladoraIdForCampaign = devCtx.desarrolladoraId ?? owned[0]?.desarrolladora_id;
      if (!desarrolladoraIdForCampaign) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'desarrolladora_id missing' });
      }

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          desarrolladora_id: desarrolladoraIdForCampaign,
          proyecto_ids: input.proyectoIds,
          nombre: input.nombre,
          tipo: input.tipo,
          presupuesto_mxn: input.presupuestoMxn,
          start_date: input.startDate,
          end_date: input.endDate,
          canales: input.canales as unknown as Json,
          status: 'draft',
          utm_source: input.utmSource,
          utm_medium: input.utmMedium,
          utm_campaign: input.utmCampaign,
          created_by: devCtx.userId,
        })
        .select(CAMPAIGN_FIELDS)
        .single();
      if (error || !campaign) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'insert campaign failed',
        });
      }

      if (input.creatives.length > 0) {
        const rows = input.creatives.map((c) => ({
          campaign_id: campaign.id,
          variant: c.variant,
          url: c.url,
          ai_generated: c.aiGenerated,
        }));
        const { error: cErr } = await supabase.from('campaign_creatives').insert(rows);
        if (cErr) {
          sentry.captureException(cErr, {
            tags: { feature: 'dev-marketing', op: 'insert_creatives' },
          });
        }
      }

      await logAuditAction(supabase, devCtx, 'campaign.create', campaign.id, {
        nombre: input.nombre,
        tipo: input.tipo,
      });

      return campaign as CampaignRow;
    }),

  updateCampaign: authenticatedProcedure
    .input(updateCampaignInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const devCtx = await requireDevContext(supabase, ctx.user.id);
      await loadOwnedCampaign(supabase, devCtx, input.campaignId);

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.patch.nombre !== undefined) patch.nombre = input.patch.nombre;
      if (input.patch.presupuestoMxn !== undefined) {
        patch.presupuesto_mxn = input.patch.presupuestoMxn;
      }
      if (input.patch.endDate !== undefined) patch.end_date = input.patch.endDate;
      if (input.patch.canales !== undefined) patch.canales = input.patch.canales;

      const { data, error } = await supabase
        .from('campaigns')
        .update(patch as never)
        .eq('id', input.campaignId)
        .select(CAMPAIGN_FIELDS)
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'update failed',
        });
      }
      await logAuditAction(supabase, devCtx, 'campaign.update', input.campaignId, { patch });
      return data as CampaignRow;
    }),

  pauseCampaign: authenticatedProcedure.input(campaignIdInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const devCtx = await requireDevContext(supabase, ctx.user.id);
    await loadOwnedCampaign(supabase, devCtx, input.campaignId);
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', input.campaignId);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    await logAuditAction(supabase, devCtx, 'campaign.pause', input.campaignId, {});
    return { ok: true as const };
  }),

  cancelCampaign: authenticatedProcedure.input(campaignIdInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const devCtx = await requireDevContext(supabase, ctx.user.id);
    await loadOwnedCampaign(supabase, devCtx, input.campaignId);
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', input.campaignId);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    await logAuditAction(supabase, devCtx, 'campaign.cancel', input.campaignId, {});
    return { ok: true as const };
  }),

  getCampaignAnalytics: authenticatedProcedure
    .input(getCampaignAnalyticsInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const devCtx = await requireDevContext(supabase, ctx.user.id);
      await loadOwnedCampaign(supabase, devCtx, input.campaignId);

      const since = new Date();
      since.setDate(since.getDate() - input.rangeDays);

      let q = supabase
        .from('campaign_analytics')
        .select(ANALYTICS_FIELDS)
        .eq('campaign_id', input.campaignId)
        .gte('date', since.toISOString().slice(0, 10))
        .order('date', { ascending: true });
      if (input.channel) q = q.eq('channel', input.channel);

      const { data, error } = await q;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      const rows = (data ?? []) as CampaignAnalyticsRow[];

      const totals = rows.reduce(
        (acc, r) => ({
          impressions: acc.impressions + (r.impressions ?? 0),
          clicks: acc.clicks + (r.clicks ?? 0),
          spendMxn: acc.spendMxn + Number(r.spend_mxn ?? 0),
          leads: acc.leads + (r.leads ?? 0),
          conversions: acc.conversions + (r.conversions ?? 0),
        }),
        { impressions: 0, clicks: 0, spendMxn: 0, leads: 0, conversions: 0 },
      );
      const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : null;
      const cplMxn = totals.leads > 0 ? totals.spendMxn / totals.leads : null;
      const cacMxn = totals.conversions > 0 ? totals.spendMxn / totals.conversions : null;

      return { daily: rows, totals: { ...totals, ctr, cplMxn, cacMxn } };
    }),

  getAttributionReport: authenticatedProcedure
    .input(getAttributionReportInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const devCtx = await requireDevContext(supabase, ctx.user.id);
      await loadOwnedCampaign(supabase, devCtx, input.campaignId);

      const { data, error } = await supabase
        .from('attribution_events')
        .select(
          'id, lead_id, campaign_id, channel, utm_source, utm_medium, utm_campaign, event_type, occurred_at',
        )
        .eq('campaign_id', input.campaignId)
        .order('occurred_at', { ascending: true });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const events = (data ?? []) as AttributionEventRow[];
      const byLead = new Map<string, AttributionTouchpoint[]>();
      for (const e of events) {
        const key = e.lead_id ?? 'unattributed';
        const arr = byLead.get(key) ?? [];
        arr.push({
          id: e.id,
          channel: e.channel,
          occurredAt: e.occurred_at,
          utmSource: e.utm_source,
          utmMedium: e.utm_medium,
          utmCampaign: e.utm_campaign,
        });
        byLead.set(key, arr);
      }

      const allWeights = [...byLead.values()].flatMap((tps) =>
        computeAttributionWeights(tps, input.model),
      );
      const breakdown = aggregateByChannel(allWeights);
      const total = breakdown.reduce((a, b) => a + b.weight, 0);
      const waterfall = breakdown.map((b) => ({
        channel: b.channel,
        weight: b.weight,
        share: total > 0 ? b.weight / total : 0,
        touches: b.touches,
      }));

      return { model: input.model, leadsCount: byLead.size, eventsCount: events.length, waterfall };
    }),

  getOptimizerRecommendations: authenticatedProcedure
    .input(getOptimizerRecommendationsInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const devCtx = await requireDevContext(supabase, ctx.user.id);

      let q = supabase
        .from('campaigns')
        .select(CAMPAIGN_FIELDS)
        .in('status', ['active', 'draft', 'paused'])
        .order('updated_at', { ascending: false })
        .limit(input.limit);
      if (!devCtx.isPlatformAdmin) {
        if (!devCtx.desarrolladoraId) return { recommendations: [] };
        q = q.eq('desarrolladora_id', devCtx.desarrolladoraId);
      }
      const { data: campaignsData, error: campaignsErr } = await q;
      if (campaignsErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: campaignsErr.message });
      }
      const campaigns = (campaignsData ?? []) as CampaignRow[];
      if (campaigns.length === 0) return { recommendations: [] };

      const since = new Date();
      since.setDate(since.getDate() - input.rangeDays);
      const sinceStr = since.toISOString().slice(0, 10);

      const ids = campaigns.map((c) => c.id);
      const { data: analyticsData, error: aErr } = await supabase
        .from('campaign_analytics')
        .select('campaign_id, channel, impressions, clicks, spend_mxn, leads, conversions')
        .in('campaign_id', ids)
        .gte('date', sinceStr);
      if (aErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: aErr.message });

      const aggregated = new Map<string, CampaignSnapshot>();
      const initial = (id: string, name: string, channel: string): CampaignSnapshot => ({
        campaignId: id,
        campaignName: name,
        channel,
        spendMxn: 0,
        leads: 0,
        conversions: 0,
        revenueMxn: 0,
        impressions: 0,
        clicks: 0,
      });
      for (const c of campaigns) aggregated.set(c.id, initial(c.id, c.nombre, 'all'));

      type AnalyticsAggRow = {
        readonly campaign_id: string;
        readonly channel: string;
        readonly impressions: number;
        readonly clicks: number;
        readonly spend_mxn: number;
        readonly leads: number;
        readonly conversions: number;
      };
      for (const r of (analyticsData ?? []) as AnalyticsAggRow[]) {
        const prev = aggregated.get(r.campaign_id);
        if (!prev) continue;
        const updated: CampaignSnapshot = {
          ...prev,
          impressions: prev.impressions + (r.impressions ?? 0),
          clicks: prev.clicks + (r.clicks ?? 0),
          spendMxn: prev.spendMxn + Number(r.spend_mxn ?? 0),
          leads: prev.leads + (r.leads ?? 0),
          conversions: prev.conversions + (r.conversions ?? 0),
          revenueMxn:
            prev.revenueMxn + Number(r.conversions ?? 0) * ASSUMED_REVENUE_PER_CONVERSION_MXN,
        };
        aggregated.set(r.campaign_id, updated);
      }

      const verdicts = evaluateCampaigns({
        campaigns: [...aggregated.values()],
        mediaCplMxn: null,
      });

      const cmap = new Map(campaigns.map((c) => [c.id, c]));
      const recommendations = verdicts
        .map((v) => {
          const c = cmap.get(v.campaignId);
          return {
            campaignId: v.campaignId,
            nombre: c?.nombre ?? '—',
            tipo: c?.tipo ?? '—',
            status: c?.status ?? '—',
            action: v.action,
            cplMxn: v.cplMxn,
            cplRatio: v.cplRatio,
            roi: v.roi,
            ctr: v.ctr,
            reasoning: v.reasoning,
          };
        })
        .sort((a, b) => actionRank(a.action) - actionRank(b.action));

      return { recommendations };
    }),

  applyOptimizerAction: authenticatedProcedure
    .input(applyOptimizerActionInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const devCtx = await requireDevContext(supabase, ctx.user.id);
      await loadOwnedCampaign(supabase, devCtx, input.campaignId);

      const newStatus =
        input.action === 'pause' ? 'paused' : input.action === 'scale' ? 'active' : null;
      if (newStatus) {
        const { error } = await supabase
          .from('campaigns')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', input.campaignId);
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      await logAuditAction(supabase, devCtx, `optimizer.${input.action}`, input.campaignId, {
        action: input.action,
      });
      return { ok: true as const, action: input.action };
    }),

  requestStudioVideoJob: authenticatedProcedure
    .input(requestStudioVideoJobInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const devCtx = await requireDevContext(supabase, ctx.user.id);

      const { data: project, error: projErr } = await supabase
        .from('proyectos')
        .select('id, nombre, desarrolladora_id')
        .eq('id', input.proyectoId)
        .maybeSingle();
      if (projErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: projErr.message });
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'proyecto not found' });
      if (!devCtx.isPlatformAdmin && project.desarrolladora_id !== devCtx.desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'proyecto outside scope' });
      }

      const sourceMetadata = {
        source: 'm14_marketing_dev' as const,
        type: input.type,
        proyecto_id: input.proyectoId,
        dev_id: devCtx.userId,
        desarrolladora_id: devCtx.desarrolladoraId,
        requested_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('studio_video_projects')
        .insert({
          user_id: devCtx.userId,
          proyecto_id: input.proyectoId,
          unidad_id: input.unidadId ?? null,
          title: `${project.nombre} — ${input.type === 'project' ? 'Hero proyecto' : 'Prototipo'}`,
          project_type: input.type === 'prototype' ? 'remarketing' : 'standard',
          status: 'draft',
          source_metadata: sourceMetadata as unknown as Json,
        })
        .select('id, title, status, project_type, created_at')
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'insert studio video failed',
        });
      }

      await logAuditAction(supabase, devCtx, 'studio_video.request', data.id, {
        proyecto_id: input.proyectoId,
        type: input.type,
      });

      return data;
    }),
});
