import { TRPCError } from '@trpc/server';
import {
  dashboardInput,
  inventorySnapshotInput,
  kpisInput,
  morningBriefingDevInput,
  pendientesInput,
  trustScoreInput,
} from '@/features/developer/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import * as runtimeCache from '@/shared/lib/runtime-cache';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

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
});
