import { TRPCError } from '@trpc/server';
import {
  avanceObraCreateInput,
  avanceObraDeleteInput,
  avanceObraListInput,
  type DocumentRow,
  dashboardInput,
  documentApproveInput,
  documentCreateInput,
  documentDeleteInput,
  documentListInput,
  documentSignedUrlInput,
  esquemaPagoCreateInput,
  esquemaPagoDeleteInput,
  esquemaPagoListInput,
  esquemaPagoUpdateInput,
  inventarioAddPhotoInput,
  inventarioChangeLogInput,
  inventarioLeadsByUnidadInput,
  inventarioListProyectosInput,
  inventarioListUnidadesInput,
  inventarioMetricsInput,
  inventarioPriceHistoryInput,
  inventarioRemovePhotoInput,
  inventarioReorderPhotosInput,
  inventarioReservasInput,
  inventarioUnidadDetailInput,
  inventarioUpdateUnidadInput,
  inventorySnapshotInput,
  kpisInput,
  listMyProjectsInput,
  type MyProjectItem,
  morningBriefingDevInput,
  type PlanRow,
  pendientesInput,
  prototipoCreateInput,
  prototipoDeleteInput,
  prototipoListInput,
  prototipoUpdateInput,
  type SiteSelectionAIResult,
  siteSelectionAIInput,
  siteSelectionHistoryInput,
  switchPlanInput,
  trustScoreInput,
  type UnitDemandHeatmapItem,
  unitDemandHeatmapInput,
  type WeeklyHighlightItem,
  weeklyHighlightsInput,
} from '@/features/developer/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import * as runtimeCache from '@/shared/lib/runtime-cache';
import { runSiteSelectionAI } from '@/shared/lib/site-selection/site-selection-ai';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Database, Json } from '@/shared/types/database';

type UnidadUpdate = Database['public']['Tables']['unidades']['Update'];
type PrototipoUpdate = Database['public']['Tables']['prototipos']['Update'];
type PrototipoInsert = Database['public']['Tables']['prototipos']['Insert'];
type EsquemaPagoUpdate = Database['public']['Tables']['esquemas_pago']['Update'];

const ALLOWED_DEV_ROLES = new Set(['admin_desarrolladora', 'superadmin', 'mb_admin']);
const KPI_CACHE_TTL = 300;
const BRIEFING_CACHE_TTL = 12 * 60 * 60;

type ProfileLite = {
  id: string;
  rol: string;
  desarrolladora_id: string | null;
};

async function requireDevContext(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ profile: ProfileLite; desarrolladoraId: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, rol, desarrolladora_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (!data || !ALLOWED_DEV_ROLES.has(data.rol)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'developer role required' });
  }
  return {
    profile: { id: data.id, rol: data.rol, desarrolladora_id: data.desarrolladora_id },
    desarrolladoraId: data.desarrolladora_id ?? null,
  };
}

function startOfMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export type TrustScoreResult = {
  desarrolladora_id: string | null;
  score_overall: number | null;
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
  breakdown: {
    financial_health: number | null;
    on_time_delivery: number | null;
    doc_transparency: number | null;
    post_venta: number | null;
    reviews: number | null;
  };
  improvements: ReadonlyArray<string>;
  citations: ReadonlyArray<string>;
  is_placeholder: boolean;
};

export type InventorySnapshotResult = {
  proyectos: ReadonlyArray<{
    proyecto_id: string;
    nombre: string;
    units_total: number;
    disponible: number;
    apartada: number;
    vendida: number;
    otra: number;
  }>;
};

export type PendientesResult = {
  documents: {
    count: number;
    latest: ReadonlyArray<{ id: string; nombre: string; tipo: string; created_at: string }>;
  };
  landings: { count: number };
  cfdis: { count: number };
};

export type DevKpisResult = {
  rangeFrom: string;
  rangeTo: string;
  proyectos_activos: number;
  unidades_vendidas: number;
  revenue_mxn: number;
  conversion_pct: number | null;
  tickets_open: number;
};

export type MorningBriefingDevResult = {
  content: string;
  generated_at: string;
  is_placeholder: boolean;
  cost_usd: number | null;
};

export const developerRouter = router({
  getDashboard: authenticatedProcedure.input(dashboardInput).query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
    return {
      desarrolladora_id: desarrolladoraId,
      role: ctx.profile?.rol ?? null,
    };
  }),

  getTrustScore: authenticatedProcedure.input(trustScoreInput).query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
    if (!desarrolladoraId) {
      const result: TrustScoreResult = {
        desarrolladora_id: null,
        score_overall: null,
        level: null,
        breakdown: {
          financial_health: null,
          on_time_delivery: null,
          doc_transparency: null,
          post_venta: null,
          reviews: null,
        },
        improvements: [],
        citations: [],
        is_placeholder: true,
      };
      return result;
    }

    const { data, error } = await supabase
      .from('dev_trust_scores')
      .select(
        'desarrolladora_id, score_overall, level, score_financial_health, score_on_time_delivery, score_doc_transparency, score_post_venta, score_reviews, improvements, citations, is_placeholder',
      )
      .eq('desarrolladora_id', desarrolladoraId)
      .maybeSingle();

    if (error) {
      sentry.captureException(error, {
        tags: { feature: 'developer', op: 'getTrustScore' },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `dev_trust_scores query failed: ${error.message}`,
      });
    }

    if (!data) {
      const result: TrustScoreResult = {
        desarrolladora_id: desarrolladoraId,
        score_overall: null,
        level: null,
        breakdown: {
          financial_health: null,
          on_time_delivery: null,
          doc_transparency: null,
          post_venta: null,
          reviews: null,
        },
        improvements: [],
        citations: [],
        is_placeholder: true,
      };
      return result;
    }

    const result: TrustScoreResult = {
      desarrolladora_id: data.desarrolladora_id,
      score_overall: data.score_overall,
      level: data.level as TrustScoreResult['level'],
      breakdown: {
        financial_health: data.score_financial_health,
        on_time_delivery: data.score_on_time_delivery,
        doc_transparency: data.score_doc_transparency,
        post_venta: data.score_post_venta,
        reviews: data.score_reviews,
      },
      improvements: Array.isArray(data.improvements) ? (data.improvements as string[]) : [],
      citations: Array.isArray(data.citations) ? (data.citations as string[]) : [],
      is_placeholder: data.is_placeholder ?? false,
    };
    return result;
  }),

  getInventorySnapshot: authenticatedProcedure
    .input(inventorySnapshotInput)
    .query(async ({ ctx }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) {
        const empty: InventorySnapshotResult = { proyectos: [] };
        return empty;
      }

      const cacheKey = `dev:inventory:${desarrolladoraId}`;
      const cached = runtimeCache.get<InventorySnapshotResult>(cacheKey);
      if (cached) return cached;

      const { data: proyectos, error: pErr } = await supabase
        .from('proyectos')
        .select('id, nombre, units_total')
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('is_active', true)
        .order('nombre', { ascending: true });

      if (pErr) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `proyectos query failed: ${pErr.message}`,
        });
      }

      const proyectoIds = (proyectos ?? []).map((p) => p.id);
      type ProyectoRow = {
        proyecto_id: string;
        nombre: string;
        units_total: number;
        disponible: number;
        apartada: number;
        vendida: number;
        otra: number;
      };
      const result: ProyectoRow[] = [];
      if (proyectoIds.length === 0) {
        const empty: InventorySnapshotResult = { proyectos: [] };
        runtimeCache.set(cacheKey, empty, { ttlSeconds: KPI_CACHE_TTL });
        return empty;
      }

      const { data: unidades, error: uErr } = await supabase
        .from('unidades')
        .select('proyecto_id, status')
        .in('proyecto_id', proyectoIds);

      if (uErr) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `unidades query failed: ${uErr.message}`,
        });
      }

      const counts = new Map<string, { d: number; a: number; v: number; o: number }>();
      for (const u of (unidades ?? []) as Array<{ proyecto_id: string; status: string | null }>) {
        const acc = counts.get(u.proyecto_id) ?? { d: 0, a: 0, v: 0, o: 0 };
        if (u.status === 'disponible') acc.d += 1;
        else if (u.status === 'apartada' || u.status === 'reservada') acc.a += 1;
        else if (u.status === 'vendida') acc.v += 1;
        else acc.o += 1;
        counts.set(u.proyecto_id, acc);
      }

      for (const p of proyectos ?? []) {
        const c = counts.get(p.id) ?? { d: 0, a: 0, v: 0, o: 0 };
        result.push({
          proyecto_id: p.id,
          nombre: p.nombre,
          units_total: p.units_total ?? 0,
          disponible: c.d,
          apartada: c.a,
          vendida: c.v,
          otra: c.o,
        });
      }

      const out: InventorySnapshotResult = { proyectos: result };
      runtimeCache.set(cacheKey, out, { ttlSeconds: KPI_CACHE_TTL });
      return out;
    }),

  getPendientes: authenticatedProcedure.input(pendientesInput).query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
    if (!desarrolladoraId) {
      const empty: PendientesResult = {
        documents: { count: 0, latest: [] },
        landings: { count: 0 },
        cfdis: { count: 0 },
      };
      return empty;
    }

    const [docsRes, landingsRes, cfdisRes] = await Promise.all([
      supabase
        .from('documents')
        .select('id, nombre, tipo, created_at')
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('landings')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', false),
      supabase
        .from('fiscal_docs')
        .select('id', { count: 'exact', head: true })
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('status', 'pending'),
    ]);

    if (docsRes.error || landingsRes.error || cfdisRes.error) {
      const err = docsRes.error || landingsRes.error || cfdisRes.error;
      sentry.captureException(err, { tags: { feature: 'developer', op: 'getPendientes' } });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `pendientes query failed: ${err?.message ?? 'unknown'}`,
      });
    }

    const result: PendientesResult = {
      documents: {
        count: docsRes.data?.length ?? 0,
        latest: (docsRes.data ?? []).map((d) => ({
          id: d.id,
          nombre: d.nombre,
          tipo: d.tipo,
          created_at: d.created_at,
        })),
      },
      landings: { count: landingsRes.count ?? 0 },
      cfdis: { count: cfdisRes.count ?? 0 },
    };
    return result;
  }),

  getKpis: authenticatedProcedure.input(kpisInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
    const rangeFrom = input?.rangeFrom ?? startOfMonth();
    const today = new Date();
    const rangeTo =
      input?.rangeTo ??
      `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(
        today.getUTCDate(),
      ).padStart(2, '0')}`;

    if (!desarrolladoraId) {
      const empty: DevKpisResult = {
        rangeFrom,
        rangeTo,
        proyectos_activos: 0,
        unidades_vendidas: 0,
        revenue_mxn: 0,
        conversion_pct: null,
        tickets_open: 0,
      };
      return empty;
    }

    const cacheKey = `dev:kpis:${desarrolladoraId}:${rangeFrom}:${rangeTo}`;
    const cached = runtimeCache.get<DevKpisResult>(cacheKey);
    if (cached) return cached;

    const [proyRes, unidVendRes, leadsRes] = await Promise.all([
      supabase
        .from('proyectos')
        .select('id', { count: 'exact', head: true })
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('is_active', true),
      supabase
        .from('proyectos')
        .select('id, unidades(id, status, price_mxn, updated_at)')
        .eq('desarrolladora_id', desarrolladoraId),
      supabase
        .from('leads_dev')
        .select('id, status, created_at')
        .eq('desarrolladora_id', desarrolladoraId)
        .gte('created_at', rangeFrom)
        .lte('created_at', `${rangeTo}T23:59:59Z`),
    ]);

    if (proyRes.error || unidVendRes.error || leadsRes.error) {
      const err = proyRes.error || unidVendRes.error || leadsRes.error;
      sentry.captureException(err, { tags: { feature: 'developer', op: 'getKpis' } });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `kpis query failed: ${err?.message ?? 'unknown'}`,
      });
    }

    type UnitRow = {
      id: string;
      status: string | null;
      price_mxn: number | null;
      updated_at: string | null;
    };
    type ProyectoWithUnits = { id: string; unidades: UnitRow[] | null };
    let unidades_vendidas = 0;
    let revenue_mxn = 0;
    for (const p of (unidVendRes.data ?? []) as ProyectoWithUnits[]) {
      for (const u of p.unidades ?? []) {
        if (u.status !== 'vendida') continue;
        if (u.updated_at && u.updated_at >= rangeFrom && u.updated_at <= `${rangeTo}T23:59:59Z`) {
          unidades_vendidas += 1;
          revenue_mxn += Number(u.price_mxn ?? 0);
        }
      }
    }

    const leads = leadsRes.data ?? [];
    const totalLeads = leads.length;
    const converted = leads.filter((l) => l.status === 'converted').length;
    const conversion_pct = totalLeads > 0 ? (converted / totalLeads) * 100 : null;

    const result: DevKpisResult = {
      rangeFrom,
      rangeTo,
      proyectos_activos: proyRes.count ?? 0,
      unidades_vendidas,
      revenue_mxn,
      conversion_pct,
      tickets_open: 0,
    };
    runtimeCache.set(cacheKey, result, { ttlSeconds: KPI_CACHE_TTL });
    return result;
  }),

  generateMorningBriefingDev: authenticatedProcedure
    .input(morningBriefingDevInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) {
        const fallback: MorningBriefingDevResult = {
          content:
            'Conecta tu desarrolladora para recibir un briefing diario con alertas de inventario, leads calientes y movimientos de mercado.',
          generated_at: new Date().toISOString(),
          is_placeholder: true,
          cost_usd: null,
        };
        return fallback;
      }

      const cacheKey = `dev:briefing:${desarrolladoraId}`;
      if (!input?.forceRegenerate) {
        const cached = runtimeCache.get<MorningBriefingDevResult>(cacheKey);
        if (cached) return cached;
      }

      const { data: latest } = await supabase
        .from('ai_generated_content')
        .select('content, generated_at, cost_usd')
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('content_type', 'morning_briefing_dev')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) {
        const generatedAt = new Date(latest.generated_at).getTime();
        const fresh = Date.now() - generatedAt < BRIEFING_CACHE_TTL * 1000;
        if (fresh && !input?.forceRegenerate) {
          const result: MorningBriefingDevResult = {
            content: latest.content,
            generated_at: latest.generated_at,
            is_placeholder: false,
            cost_usd: Number(latest.cost_usd ?? 0),
          };
          runtimeCache.set(cacheKey, result, { ttlSeconds: BRIEFING_CACHE_TTL });
          return result;
        }
      }

      const placeholder: MorningBriefingDevResult = {
        content:
          'Briefing AI ship FASE 17 (Doc Intel + Anthropic). Mientras: revisa unidades por encima de 60 días en mercado, leads sin contactar y CFDIs pendientes en la sección Pendientes.',
        generated_at: new Date().toISOString(),
        is_placeholder: true,
        cost_usd: null,
      };
      runtimeCache.set(cacheKey, placeholder, { ttlSeconds: 60 * 60 });
      return placeholder;
    }),

  // FASE 15 v3 onyx-benchmarked — B.2 Unit-level demand heatmap (M11 APPEND v3 + ADR-060)
  // Cron unit_demand_score_daily refresca demand_score_30d + demand_signals + demand_color
  // Aquí solo SELECT (RLS dev/asesor authorized via inherited unidades policy)
  getUnitDemandHeatmap: authenticatedProcedure
    .input(unitDemandHeatmapInput)
    .query(async ({ ctx, input }): Promise<readonly UnitDemandHeatmapItem[]> => {
      const supabase = createAdminClient();
      await requireDevContext(supabase, ctx.user.id);

      const { data: project, error: projErr } = await supabase
        .from('proyectos')
        .select('id, desarrolladora_id')
        .eq('id', input.proyectoId)
        .maybeSingle();

      if (projErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: projErr.message });
      }
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'proyecto not found' });
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('desarrolladora_id, rol')
        .eq('id', ctx.user.id)
        .single();

      const isOwner =
        profileData?.desarrolladora_id === project.desarrolladora_id ||
        profileData?.rol === 'superadmin';
      if (!isOwner) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'project access denied' });
      }

      const { data: units, error: unitsErr } = await supabase
        .from('unidades')
        .select('id, numero, demand_score_30d, demand_color, demand_signals')
        .eq('proyecto_id', input.proyectoId)
        .order('demand_score_30d', { ascending: false });

      if (unitsErr) {
        sentry.captureException(unitsErr, {
          tags: { route: 'developer.getUnitDemandHeatmap' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: unitsErr.message });
      }

      return (units ?? []).map((u) => ({
        unitId: u.id,
        numero: u.numero,
        demandScore: u.demand_score_30d ?? 0,
        color: (u.demand_color ?? 'red') as 'red' | 'amber' | 'green',
        signals: (u.demand_signals as Record<string, unknown> | null) ?? null,
      }));
    }),

  // FASE 15.B (M11) — Inventario Desarrollador procedures
  // Todos restringidos a admin_desarrolladora/superadmin/mb_admin via requireDevContext
  // Scope: proyectos del desarrollador logged-in. Cursor pagination created_at desc.

  inventarioListProyectos: authenticatedProcedure
    .input(inventarioListProyectosInput)
    .query(async ({ ctx }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) return [];
      const { data, error } = await supabase
        .from('proyectos')
        .select('id, nombre, slug, ciudad, status, units_total, units_available, cover_photo_url')
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('is_active', true)
        .order('nombre', { ascending: true });
      if (error) {
        sentry.captureException(error, {
          tags: { feature: 'developer', op: 'inventarioListProyectos' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  inventarioListUnidades: authenticatedProcedure
    .input(inventarioListUnidadesInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) return { rows: [], nextCursor: null };

      const { data: proyectos, error: pErr } = await supabase
        .from('proyectos')
        .select('id, nombre')
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('is_active', true);
      if (pErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: pErr.message });
      }
      const proyectoIds = (proyectos ?? []).map((p) => p.id);
      if (proyectoIds.length === 0) return { rows: [], nextCursor: null };
      const proyectoNombres = new Map((proyectos ?? []).map((p) => [p.id, p.nombre]));

      let q = supabase
        .from('unidades')
        .select(
          'id, proyecto_id, numero, tipo, status, recamaras, banos, parking, area_m2, price_mxn, floor, photos, demand_score_30d, demand_color, created_at, updated_at',
        );

      if (input.proyectoId) {
        if (!proyectoIds.includes(input.proyectoId)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'project not owned' });
        }
        q = q.eq('proyecto_id', input.proyectoId);
      } else {
        q = q.in('proyecto_id', proyectoIds);
      }
      if (input.status) q = q.eq('status', input.status);
      if (input.tipo) q = q.eq('tipo', input.tipo);
      if (input.recamaras !== undefined) q = q.eq('recamaras', input.recamaras);
      if (input.priceMin !== undefined) q = q.gte('price_mxn', input.priceMin);
      if (input.priceMax !== undefined) q = q.lte('price_mxn', input.priceMax);
      if (input.m2Min !== undefined) q = q.gte('area_m2', input.m2Min);
      if (input.m2Max !== undefined) q = q.lte('area_m2', input.m2Max);
      if (input.cursor) q = q.lt('created_at', input.cursor);

      q = q.order('created_at', { ascending: false }).limit(input.limit);
      const { data, error } = await q;
      if (error) {
        sentry.captureException(error, {
          tags: { feature: 'developer', op: 'inventarioListUnidades' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      const rows = (data ?? []).map((u) => ({
        ...u,
        proyecto_nombre: proyectoNombres.get(u.proyecto_id) ?? null,
      }));
      const nextCursor =
        rows.length === input.limit ? (rows[rows.length - 1]?.created_at ?? null) : null;
      return { rows, nextCursor };
    }),

  inventarioMetrics: authenticatedProcedure
    .input(inventarioMetricsInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const empty = {
        total: 0,
        disponible: 0,
        apartada: 0,
        vendida: 0,
        otra: 0,
        absorption_30d_pct: null,
        precio_promedio_m2_mxn: null,
        days_on_market_p50: null,
      };
      if (!desarrolladoraId) return empty;

      const { data: proyectos, error: pErr } = await supabase
        .from('proyectos')
        .select('id')
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('is_active', true);
      if (pErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: pErr.message });
      const proyectoIds = (proyectos ?? []).map((p) => p.id);
      if (proyectoIds.length === 0) return empty;
      const targetIds = input.proyectoId ? [input.proyectoId] : proyectoIds;

      const { data: unidades, error: uErr } = await supabase
        .from('unidades')
        .select('id, status, area_m2, price_mxn, created_at, updated_at')
        .in('proyecto_id', targetIds);
      if (uErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: uErr.message });

      const total = unidades?.length ?? 0;
      let disponible = 0;
      let apartada = 0;
      let vendida = 0;
      let otra = 0;
      let priceM2Sum = 0;
      let priceM2Count = 0;
      const daysOnMarket: number[] = [];
      const now = Date.now();
      const thirtyDaysAgoIso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      let vendidasUltimos30 = 0;

      for (const u of unidades ?? []) {
        if (u.status === 'disponible') disponible += 1;
        else if (u.status === 'apartada' || u.status === 'reservada') apartada += 1;
        else if (u.status === 'vendida') vendida += 1;
        else otra += 1;
        if (u.price_mxn && u.area_m2 && u.area_m2 > 0) {
          priceM2Sum += u.price_mxn / u.area_m2;
          priceM2Count += 1;
        }
        if (u.status !== 'vendida' && u.created_at) {
          const days = Math.floor((now - new Date(u.created_at).getTime()) / (24 * 60 * 60 * 1000));
          if (days >= 0) daysOnMarket.push(days);
        }
        if (u.status === 'vendida' && u.updated_at && u.updated_at >= thirtyDaysAgoIso) {
          vendidasUltimos30 += 1;
        }
      }

      daysOnMarket.sort((a, b) => a - b);
      const p50 =
        daysOnMarket.length > 0 ? (daysOnMarket[Math.floor(daysOnMarket.length / 2)] ?? 0) : null;
      const absorption = total > 0 ? (vendidasUltimos30 / total) * 100 : null;
      const precio_promedio_m2_mxn = priceM2Count > 0 ? priceM2Sum / priceM2Count : null;

      return {
        total,
        disponible,
        apartada,
        vendida,
        otra,
        absorption_30d_pct: absorption,
        precio_promedio_m2_mxn,
        days_on_market_p50: p50,
      };
    }),

  inventarioGetUnidad: authenticatedProcedure
    .input(inventarioUnidadDetailInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: u, error } = await supabase
        .from('unidades')
        .select(
          'id, proyecto_id, numero, tipo, status, recamaras, banos, parking, area_m2, area_terreno_m2, price_mxn, maintenance_fee_mxn, floor, floor_plan_url, photos, features, meta, demand_score_30d, demand_color, demand_signals, created_at, updated_at',
        )
        .eq('id', input.unidadId)
        .maybeSingle();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      if (!u) throw new TRPCError({ code: 'NOT_FOUND', message: 'unidad not found' });

      const { data: proy } = await supabase
        .from('proyectos')
        .select('id, nombre, desarrolladora_id')
        .eq('id', u.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'unidad not owned' });
      }
      return { ...u, proyecto_nombre: proy.nombre };
    }),

  inventarioUpdateUnidad: authenticatedProcedure
    .input(inventarioUpdateUnidadInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);

      const { data: existing, error: getErr } = await supabase
        .from('unidades')
        .select('id, proyecto_id, price_mxn')
        .eq('id', input.unidadId)
        .maybeSingle();
      if (getErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: getErr.message });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      const { data: proy } = await supabase
        .from('proyectos')
        .select('id, desarrolladora_id')
        .eq('id', existing.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'unidad not owned' });
      }

      const update: UnidadUpdate = {};
      if (input.patch.numero !== undefined) update.numero = input.patch.numero;
      if (input.patch.tipo !== undefined) update.tipo = input.patch.tipo;
      if (input.patch.status !== undefined) update.status = input.patch.status;
      if (input.patch.recamaras !== undefined) update.recamaras = input.patch.recamaras;
      if (input.patch.banos !== undefined) update.banos = input.patch.banos;
      if (input.patch.parking !== undefined) update.parking = input.patch.parking;
      if (input.patch.area_m2 !== undefined) update.area_m2 = input.patch.area_m2;
      if (input.patch.price_mxn !== undefined) update.price_mxn = input.patch.price_mxn;
      if (input.patch.floor !== undefined) update.floor = input.patch.floor;
      if (input.patch.maintenance_fee_mxn !== undefined)
        update.maintenance_fee_mxn = input.patch.maintenance_fee_mxn;

      const priceChanged =
        input.patch.price_mxn !== undefined &&
        Number(input.patch.price_mxn) !== Number(existing.price_mxn ?? 0);

      const { data, error } = await supabase
        .from('unidades')
        .update(update)
        .eq('id', input.unidadId)
        .select(
          'id, proyecto_id, numero, tipo, status, recamaras, banos, parking, area_m2, price_mxn, photos, demand_score_30d, demand_color, updated_at',
        )
        .single();
      if (error) {
        sentry.captureException(error, {
          tags: { feature: 'developer', op: 'inventarioUpdateUnidad' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      if (priceChanged && input.patch.price_mxn !== undefined) {
        const previo = Number(existing.price_mxn ?? 0);
        const nuevo = Number(input.patch.price_mxn);
        const cambioPct = previo > 0 ? ((nuevo - previo) / previo) * 100 : null;
        await supabase.from('historial_precios').insert({
          unidad_id: input.unidadId,
          precio_anterior_mxn: previo > 0 ? previo : null,
          precio_nuevo_mxn: nuevo,
          cambio_pct: cambioPct,
          motivo: input.motivoPriceChange ?? null,
          autor_id: ctx.user.id,
        });
      }

      return data;
    }),

  inventarioGetPriceHistory: authenticatedProcedure
    .input(inventarioPriceHistoryInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: u } = await supabase
        .from('unidades')
        .select('id, proyecto_id')
        .eq('id', input.unidadId)
        .maybeSingle();
      if (!u) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', u.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { data, error } = await supabase
        .from('historial_precios')
        .select(
          'id, fecha, precio_anterior_mxn, precio_nuevo_mxn, cambio_pct, motivo, autor_id, created_at',
        )
        .eq('unidad_id', input.unidadId)
        .order('fecha', { ascending: false })
        .limit(input.limit);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  inventarioGetChangeLog: authenticatedProcedure
    .input(inventarioChangeLogInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: u } = await supabase
        .from('unidades')
        .select('id, proyecto_id')
        .eq('id', input.unidadId)
        .maybeSingle();
      if (!u) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', u.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { data, error } = await supabase
        .from('unit_change_log')
        .select('id, event_type, payload, actor_id, occurred_at')
        .eq('unidad_id', input.unidadId)
        .order('occurred_at', { ascending: false })
        .limit(input.limit);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  inventarioGetReservas: authenticatedProcedure
    .input(inventarioReservasInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: u } = await supabase
        .from('unidades')
        .select('id, proyecto_id')
        .eq('id', input.unidadId)
        .maybeSingle();
      if (!u) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', u.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { data, error } = await supabase
        .from('operaciones')
        .select(
          'id, codigo, status, operacion_type, propiedad_id, propiedad_type, amount, amount_currency, fecha_cierre, closed_at, asesor_id, created_at',
        )
        .eq('propiedad_id', input.unidadId)
        .eq('propiedad_type', 'unidad')
        .in('status', ['apartado', 'reservada', 'oferta', 'pendiente', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        if ((error as { code?: string }).code === '42P01') return [];
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  // STUB ADR-018 — leads_dev no tiene interest_unit_id column shipped pre-FASE 15
  // L-NEW-LEADS-DEV-INTEREST-UNIT-ID — H2 agregar columna + UI per-unit precise
  // Por ahora: filtra por proyecto_id (scope project-level), banner "alcance proyecto".
  inventarioGetLeads: authenticatedProcedure
    .input(inventarioLeadsByUnidadInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: u } = await supabase
        .from('unidades')
        .select('id, proyecto_id')
        .eq('id', input.unidadId)
        .maybeSingle();
      if (!u) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', u.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { data, error } = await supabase
        .from('leads_dev')
        .select('id, contacto_name, contacto_email, contacto_phone, status, source, created_at')
        .eq('proyecto_id', u.proyecto_id)
        .order('created_at', { ascending: false })
        .limit(input.limit);
      if (error) {
        if (
          (error as { code?: string }).code === '42P01' ||
          (error as { code?: string }).code === '42703'
        ) {
          return { leads: [], scope: 'project_partial' as const };
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { leads: data ?? [], scope: 'project_partial' as const };
    }),

  inventarioAddPhoto: authenticatedProcedure
    .input(inventarioAddPhotoInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: u } = await supabase
        .from('unidades')
        .select('id, proyecto_id, photos')
        .eq('id', input.unidadId)
        .maybeSingle();
      if (!u) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', u.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const next = [...(u.photos ?? []), input.photoUrl];
      const { data, error } = await supabase
        .from('unidades')
        .update({ photos: next })
        .eq('id', input.unidadId)
        .select('id, photos')
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  inventarioReorderPhotos: authenticatedProcedure
    .input(inventarioReorderPhotosInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: u } = await supabase
        .from('unidades')
        .select('id, proyecto_id')
        .eq('id', input.unidadId)
        .maybeSingle();
      if (!u) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', u.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { data, error } = await supabase
        .from('unidades')
        .update({ photos: input.photos })
        .eq('id', input.unidadId)
        .select('id, photos')
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  inventarioRemovePhoto: authenticatedProcedure
    .input(inventarioRemovePhotoInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: u } = await supabase
        .from('unidades')
        .select('id, proyecto_id, photos')
        .eq('id', input.unidadId)
        .maybeSingle();
      if (!u) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', u.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const next = (u.photos ?? []).filter((p) => p !== input.photoUrl);
      const { data, error } = await supabase
        .from('unidades')
        .update({ photos: next })
        .eq('id', input.unidadId)
        .select('id, photos')
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  // Prototipos CRUD
  prototipoList: authenticatedProcedure.input(prototipoListInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
    const { data: proy } = await supabase
      .from('proyectos')
      .select('desarrolladora_id')
      .eq('id', input.proyectoId)
      .maybeSingle();
    if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    let q = supabase
      .from('prototipos')
      .select(
        'id, proyecto_id, nombre, description, recamaras, banos, m2_base, precio_base_mxn, amenidades, fotos_urls, planos_url, active, created_at, updated_at',
      )
      .eq('proyecto_id', input.proyectoId);
    if (input.activeOnly) q = q.eq('active', true);
    const { data, error } = await q.order('nombre', { ascending: true });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    return data ?? [];
  }),

  prototipoCreate: authenticatedProcedure
    .input(prototipoCreateInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', input.proyectoId)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const insertRow: PrototipoInsert = {
        proyecto_id: input.proyectoId,
        nombre: input.nombre,
        description: input.description ?? null,
        recamaras: input.recamaras,
        banos: input.banos,
        m2_base: input.m2Base,
        precio_base_mxn: input.precioBaseMxn,
        amenidades: (input.amenidades ?? {}) as Json,
        planos_url: input.planosUrl ?? null,
      };
      const { data, error } = await supabase
        .from('prototipos')
        .insert(insertRow)
        .select(
          'id, proyecto_id, nombre, description, recamaras, banos, m2_base, precio_base_mxn, amenidades, fotos_urls, planos_url, active, created_at, updated_at',
        )
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  prototipoUpdate: authenticatedProcedure
    .input(prototipoUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: existing } = await supabase
        .from('prototipos')
        .select('id, proyecto_id')
        .eq('id', input.prototipoId)
        .maybeSingle();
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', existing.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const update: PrototipoUpdate = {};
      if (input.patch.nombre !== undefined) update.nombre = input.patch.nombre;
      if (input.patch.description !== undefined) update.description = input.patch.description;
      if (input.patch.recamaras !== undefined) update.recamaras = input.patch.recamaras;
      if (input.patch.banos !== undefined) update.banos = input.patch.banos;
      if (input.patch.m2Base !== undefined) update.m2_base = input.patch.m2Base;
      if (input.patch.precioBaseMxn !== undefined)
        update.precio_base_mxn = input.patch.precioBaseMxn;
      if (input.patch.amenidades !== undefined) {
        update.amenidades = input.patch.amenidades as Json;
      }
      if (input.patch.planosUrl !== undefined) update.planos_url = input.patch.planosUrl;
      if (input.patch.active !== undefined) update.active = input.patch.active;
      const { data, error } = await supabase
        .from('prototipos')
        .update(update)
        .eq('id', input.prototipoId)
        .select(
          'id, proyecto_id, nombre, description, recamaras, banos, m2_base, precio_base_mxn, amenidades, fotos_urls, planos_url, active, created_at, updated_at',
        )
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  prototipoDelete: authenticatedProcedure
    .input(prototipoDeleteInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: existing } = await supabase
        .from('prototipos')
        .select('id, proyecto_id')
        .eq('id', input.prototipoId)
        .maybeSingle();
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', existing.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { error } = await supabase
        .from('prototipos')
        .update({ active: false })
        .eq('id', input.prototipoId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),

  // Esquemas pago CRUD
  esquemaPagoList: authenticatedProcedure
    .input(esquemaPagoListInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', input.proyectoId)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      let q = supabase
        .from('esquemas_pago')
        .select(
          'id, proyecto_id, nombre, enganche_pct, mensualidades_count, meses_gracia, contra_entrega_pct, comision_pct, iva_calc_logic, financing_partner, notes, active, created_at, updated_at',
        )
        .eq('proyecto_id', input.proyectoId);
      if (input.activeOnly) q = q.eq('active', true);
      const { data, error } = await q.order('nombre');
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  esquemaPagoCreate: authenticatedProcedure
    .input(esquemaPagoCreateInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', input.proyectoId)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { data, error } = await supabase
        .from('esquemas_pago')
        .insert({
          proyecto_id: input.proyectoId,
          nombre: input.nombre,
          enganche_pct: input.engancheePct,
          mensualidades_count: input.mensualidadesCount,
          meses_gracia: input.mesesGracia,
          contra_entrega_pct: input.contraEntregaPct,
          comision_pct: input.comisionPct,
          iva_calc_logic: input.ivaCalcLogic,
          financing_partner: input.financingPartner ?? null,
          notes: input.notes ?? null,
        })
        .select(
          'id, proyecto_id, nombre, enganche_pct, mensualidades_count, meses_gracia, contra_entrega_pct, comision_pct, iva_calc_logic, financing_partner, notes, active, created_at, updated_at',
        )
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  esquemaPagoUpdate: authenticatedProcedure
    .input(esquemaPagoUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: existing } = await supabase
        .from('esquemas_pago')
        .select('id, proyecto_id')
        .eq('id', input.esquemaId)
        .maybeSingle();
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', existing.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const update: EsquemaPagoUpdate = {};
      if (input.patch.nombre !== undefined) update.nombre = input.patch.nombre;
      if (input.patch.engancheePct !== undefined) update.enganche_pct = input.patch.engancheePct;
      if (input.patch.mensualidadesCount !== undefined)
        update.mensualidades_count = input.patch.mensualidadesCount;
      if (input.patch.mesesGracia !== undefined) update.meses_gracia = input.patch.mesesGracia;
      if (input.patch.contraEntregaPct !== undefined)
        update.contra_entrega_pct = input.patch.contraEntregaPct;
      if (input.patch.comisionPct !== undefined) update.comision_pct = input.patch.comisionPct;
      if (input.patch.ivaCalcLogic !== undefined) update.iva_calc_logic = input.patch.ivaCalcLogic;
      if (input.patch.financingPartner !== undefined)
        update.financing_partner = input.patch.financingPartner;
      if (input.patch.notes !== undefined) update.notes = input.patch.notes;
      if (input.patch.active !== undefined) update.active = input.patch.active;
      const { data, error } = await supabase
        .from('esquemas_pago')
        .update(update)
        .eq('id', input.esquemaId)
        .select(
          'id, proyecto_id, nombre, enganche_pct, mensualidades_count, meses_gracia, contra_entrega_pct, comision_pct, iva_calc_logic, financing_partner, notes, active, created_at, updated_at',
        )
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  esquemaPagoDelete: authenticatedProcedure
    .input(esquemaPagoDeleteInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: existing } = await supabase
        .from('esquemas_pago')
        .select('id, proyecto_id')
        .eq('id', input.esquemaId)
        .maybeSingle();
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', existing.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { error } = await supabase
        .from('esquemas_pago')
        .update({ active: false })
        .eq('id', input.esquemaId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),

  // Avance obra CRUD
  avanceObraList: authenticatedProcedure
    .input(avanceObraListInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', input.proyectoId)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { data, error } = await supabase
        .from('avance_obra')
        .select(
          'id, proyecto_id, fecha, etapa, porcentaje, fotos_urls, drone_photo_url, geo_location, notes, autor_id, created_at',
        )
        .eq('proyecto_id', input.proyectoId)
        .order('fecha', { ascending: false })
        .limit(input.limit);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  avanceObraCreate: authenticatedProcedure
    .input(avanceObraCreateInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', input.proyectoId)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { data, error } = await supabase
        .from('avance_obra')
        .insert({
          proyecto_id: input.proyectoId,
          fecha: input.fecha,
          etapa: input.etapa,
          porcentaje: input.porcentaje,
          fotos_urls: input.fotosUrls,
          drone_photo_url: input.dronePhotoUrl ?? null,
          geo_location: input.geoLocation ?? null,
          notes: input.notes ?? null,
          autor_id: ctx.user.id,
        })
        .select(
          'id, proyecto_id, fecha, etapa, porcentaje, fotos_urls, drone_photo_url, geo_location, notes, autor_id, created_at',
        )
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  avanceObraDelete: authenticatedProcedure
    .input(avanceObraDeleteInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const { data: existing } = await supabase
        .from('avance_obra')
        .select('id, proyecto_id')
        .eq('id', input.avanceId)
        .maybeSingle();
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: proy } = await supabase
        .from('proyectos')
        .select('desarrolladora_id')
        .eq('id', existing.proyecto_id)
        .maybeSingle();
      if (!proy || proy.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const { error } = await supabase.from('avance_obra').delete().eq('id', input.avanceId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),

  // FASE 15.A.1.3 — ProjectSwitcher
  listMyProjects: authenticatedProcedure
    .input(listMyProjectsInput)
    .query(async ({ ctx }): Promise<readonly MyProjectItem[]> => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) return [];
      const { data, error } = await supabase
        .from('proyectos')
        .select('id, nombre, status, units_total, units_available')
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('is_active', true)
        .order('nombre', { ascending: true });
      if (error) {
        sentry.captureException(error, {
          tags: { feature: 'developer', op: 'listMyProjects' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      type ProjectRow = {
        id: string;
        nombre: string;
        status: string;
        units_total: number | null;
        units_available: number | null;
      };
      return ((data ?? []) as ProjectRow[]).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        status: p.status,
        units_total: p.units_total ?? null,
        units_available: p.units_available ?? null,
      }));
    }),

  // FASE 15.A.2.6 — Weekly highlights carousel (M10 polish)
  // Returns top 5 score deltas last 7d across dev's projects
  getWeeklyHighlights: authenticatedProcedure
    .input(weeklyHighlightsInput)
    .query(async ({ ctx }): Promise<readonly WeeklyHighlightItem[]> => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) return [];

      const { data: proyectos, error: pErr } = await supabase
        .from('proyectos')
        .select('id, nombre')
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('is_active', true);
      if (pErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: pErr.message });
      }
      const proyectoIds = (proyectos ?? []).map((p) => p.id);
      if (proyectoIds.length === 0) return [];
      const proyectoNombres = new Map((proyectos ?? []).map((p) => [p.id, p.nombre]));

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from('project_scores')
        .select(
          'project_id, score_type, score_label, score_value, trend_direction, trend_vs_previous, period_date',
        )
        .in('project_id', proyectoIds)
        .gte('period_date', sevenDaysAgo)
        .not('trend_vs_previous', 'is', null)
        .order('period_date', { ascending: false })
        .limit(50);

      if (error) {
        sentry.captureException(error, {
          tags: { feature: 'developer', op: 'getWeeklyHighlights' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      type HighlightRow = {
        project_id: string;
        score_type: string;
        score_label: string | null;
        score_value: number | null;
        trend_direction: string | null;
        trend_vs_previous: number | null;
        period_date: string;
      };
      const sorted = ((data ?? []) as HighlightRow[])
        .filter((r) => r.trend_vs_previous !== null)
        .sort(
          (a, b) =>
            Math.abs(Number(b.trend_vs_previous ?? 0)) - Math.abs(Number(a.trend_vs_previous ?? 0)),
        )
        .slice(0, 5);

      return sorted.map((r) => ({
        project_id: r.project_id,
        project_nombre: proyectoNombres.get(r.project_id) ?? 'Proyecto',
        score_type: r.score_type,
        score_label: r.score_label,
        score_value: r.score_value === null ? null : Number(r.score_value),
        trend_direction: r.trend_direction,
        trend_vs_previous: r.trend_vs_previous === null ? null : Number(r.trend_vs_previous),
        period_date: r.period_date,
      }));
    }),

  // FASE 15.A.4 — Site Selection AI con CF.3 Atlas constellations (GC-81)
  // Cost tracked ~$0.50 USD/query. Feature gated dev.api_access (Pro+).
  // Persiste en site_selection_queries.
  siteSelectionAI: authenticatedProcedure
    .input(siteSelectionAIInput)
    .mutation(async ({ ctx, input }): Promise<SiteSelectionAIResult> => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Desarrolladora linkage required',
        });
      }

      const { data: features, error: featErr } = await supabase.rpc('resolve_features');
      if (featErr) {
        sentry.captureException(featErr, {
          tags: { feature: 'developer', op: 'siteSelectionAI.features' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: featErr.message });
      }
      const featureSet = new Set((features ?? []) as string[]);
      if (!featureSet.has('dev.api_access')) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'site_selection_ai_requires_pro_plus',
        });
      }

      const startedAt = Date.now();
      const aiOutput = await runSiteSelectionAI({
        query: input.query,
        userId: ctx.user.id,
        desarrolladoraId,
      });
      const durationMs = Date.now() - startedAt;

      const insertRow: Database['public']['Tables']['site_selection_queries']['Insert'] = {
        desarrolladora_id: desarrolladoraId,
        user_id: ctx.user.id,
        query_text: input.query,
        parsed_intent: aiOutput.parsedIntent as Json,
        output_zones: aiOutput.zones as unknown as Json,
        output_listings: aiOutput.listings as unknown as Json,
        ai_narrative: aiOutput.narrative,
        cost_usd: aiOutput.costUsd,
        duration_ms: durationMs,
        pdf_url: null,
      };
      const { data: row, error: insErr } = await supabase
        .from('site_selection_queries')
        .insert(insertRow)
        .select('id')
        .single();
      if (insErr) {
        sentry.captureException(insErr, {
          tags: { feature: 'developer', op: 'siteSelectionAI.insert' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insErr.message });
      }

      return {
        queryId: row.id,
        zones: [...aiOutput.zones],
        narrative: aiOutput.narrative,
        costUsd: aiOutput.costUsd,
        durationMs,
        isPlaceholder: aiOutput.isPlaceholder,
      };
    }),

  siteSelectionHistory: authenticatedProcedure
    .input(siteSelectionHistoryInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) return [];
      const { data, error } = await supabase
        .from('site_selection_queries')
        .select('id, query_text, ai_narrative, cost_usd, duration_ms, created_at')
        .eq('desarrolladora_id', desarrolladoraId)
        .order('created_at', { ascending: false })
        .limit(input.limit);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  // ─────────────────────────────────────────────────────────────
  // FASE 15.G — Documentos proyecto (project-documents bucket).
  // RLS shipped: 4 policies en bucket. desarrolladora_id derivado del profile.
  // ─────────────────────────────────────────────────────────────
  documentList: authenticatedProcedure
    .input(documentListInput)
    .query(async ({ ctx, input }): Promise<readonly DocumentRow[]> => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) return [];
      let query = supabase
        .from('documents')
        .select(
          'id, desarrolladora_id, proyecto_id, tipo, nombre, storage_path, status, approved_at, rejection_reason, expires_at, uploaded_by, created_at, updated_at',
        )
        .eq('desarrolladora_id', desarrolladoraId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (input.proyectoId) query = query.eq('proyecto_id', input.proyectoId);
      const { data, error } = await query;
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return (data ?? []).map((r) => ({
        id: r.id,
        desarrolladoraId: r.desarrolladora_id,
        proyectoId: r.proyecto_id,
        tipo: r.tipo,
        nombre: r.nombre,
        storagePath: r.storage_path,
        status: r.status,
        approvedAt: r.approved_at,
        rejectionReason: r.rejection_reason,
        expiresAt: r.expires_at,
        uploadedBy: r.uploaded_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }),

  documentCreate: authenticatedProcedure
    .input(documentCreateInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'desarrolladora_id required' });
      }
      const { data, error } = await supabase
        .from('documents')
        .insert({
          desarrolladora_id: desarrolladoraId,
          proyecto_id: input.proyectoId,
          tipo: input.tipo,
          nombre: input.nombre,
          storage_path: input.storagePath,
          status: 'uploaded',
          uploaded_by: ctx.user.id,
          meta: (input.meta ?? null) as Json,
        })
        .select('id, status')
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'documents insert failed',
        });
      }
      return { id: data.id, status: data.status };
    }),

  documentDelete: authenticatedProcedure
    .input(documentDeleteInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'desarrolladora_id required' });
      }
      const { data: doc, error: selErr } = await supabase
        .from('documents')
        .select('id, storage_path, desarrolladora_id')
        .eq('id', input.documentId)
        .maybeSingle();
      if (selErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: selErr.message });
      }
      if (!doc || doc.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'document_not_found' });
      }
      await supabase.storage.from('project-documents').remove([doc.storage_path]);
      const { error: delErr } = await supabase
        .from('documents')
        .delete()
        .eq('id', input.documentId);
      if (delErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: delErr.message });
      }
      return { ok: true };
    }),

  documentApprove: authenticatedProcedure
    .input(documentApproveInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'desarrolladora_id required' });
      }
      const { error } = await supabase
        .from('documents')
        .update({
          status: input.status,
          approved_by: input.status === 'approved' ? ctx.user.id : null,
          approved_at: input.status === 'approved' ? new Date().toISOString() : null,
          rejection_reason: input.status === 'rejected' ? (input.rejectionReason ?? null) : null,
        })
        .eq('id', input.documentId)
        .eq('desarrolladora_id', desarrolladoraId);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { ok: true };
    }),

  documentSignedUrl: authenticatedProcedure
    .input(documentSignedUrlInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'desarrolladora_id required' });
      }
      const { data: doc } = await supabase
        .from('documents')
        .select('storage_path, desarrolladora_id')
        .eq('id', input.documentId)
        .maybeSingle();
      if (!doc || doc.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'document_not_found' });
      }
      const { data, error } = await supabase.storage
        .from('project-documents')
        .createSignedUrl(doc.storage_path, input.expiresIn);
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'signed_url_failed',
        });
      }
      return { signedUrl: data.signedUrl };
    }),

  // ─────────────────────────────────────────────────────────────
  // FASE 15.H — Plans + feature gating
  // ─────────────────────────────────────────────────────────────
  listDevPlans: authenticatedProcedure.query(async (): Promise<readonly PlanRow[]> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('plans')
      .select(
        'id, code, name, audience, monthly_price_minor, yearly_price_minor, currency, trial_days, is_active, sort_order, features_summary',
      )
      .eq('audience', 'desarrolladora')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return (data ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      audience: r.audience,
      monthlyPriceMinor: r.monthly_price_minor,
      yearlyPriceMinor: r.yearly_price_minor,
      currency: r.currency,
      trialDays: r.trial_days,
      isActive: r.is_active,
      sortOrder: r.sort_order,
      featuresSummary: (r.features_summary ?? {}) as PlanRow['featuresSummary'],
    }));
  }),

  currentDevPlan: authenticatedProcedure.query(
    async ({ ctx }): Promise<{ planCode: string; isPlaceholder: boolean }> => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      const subjectIds = [ctx.user.id, ...(desarrolladoraId ? [desarrolladoraId] : [])];
      const { data } = await supabase
        .from('subscriptions')
        .select('plans!inner(code, audience), status')
        .in('subject_id', subjectIds)
        .in('status', ['active', 'trialing'])
        .eq('plans.audience', 'desarrolladora')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const planCode = (data as { plans?: { code?: string } } | null)?.plans?.code ?? null;
      if (planCode) return { planCode, isPlaceholder: false };
      // Placeholder: dev_free hasta Stripe Checkout en FASE 23
      return { planCode: 'dev_free', isPlaceholder: true };
    },
  ),

  // STUB ADR-018 — Stripe Checkout shipping FASE 23
  // L-NEW-FEATURE-GATE-STRIPE-CHECKOUT-WIRED — wire to /api/stripe/checkout-session
  switchDevPlan: authenticatedProcedure.input(switchPlanInput).mutation(({ input }) => {
    return {
      ok: true,
      stub: true,
      reason: 'stripe_checkout_pending_fase_23',
      requestedPlan: input.planCode,
    };
  }),
});
