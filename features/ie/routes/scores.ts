import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { filterRowsForPublic } from '@/shared/lib/intelligence-engine/calculators/score-visibility';
import { tierGate } from '@/shared/lib/intelligence-engine/calculators/tier-gate';
import { getScoreLineage } from '@/shared/lib/intelligence-engine/cascades/score-lineage';
import { SCORE_REGISTRY } from '@/shared/lib/intelligence-engine/score-registry';
import {
  computeLeadScore,
  type LeadScoreFactors,
  persistLeadScore,
} from '@/shared/lib/scores/c01-lead-score';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const ADMIN_ROLES: ReadonlySet<string> = new Set(['superadmin', 'mb_admin']);

import {
  ieScoresGetByZoneInput,
  ieScoresGetDependenciesInput,
  ieScoresGetHistoryInput,
  ieScoresGetLeadScoreInput,
  ieScoresGetTierGateInput,
  ieScoresListInput,
  ieScoresRecomputeLeadScoreInput,
} from '../schemas/scores';

type ZoneScoreRow = {
  zone_id: string;
  country_code: string;
  score_type: string;
  score_value: number;
  score_label: string | null;
  level: number;
  tier: number;
  confidence: string;
  components: unknown;
  inputs_used: unknown;
  citations: unknown;
  provenance: unknown;
  deltas: unknown;
  ranking: unknown;
  comparable_zones: unknown;
  trend_direction: string | null;
  trend_vs_previous: number | null;
  valid_until: string | null;
  period_date: string;
  computed_at: string;
};

const SELECT_COLUMNS =
  'zone_id, country_code, score_type, score_value, score_label, level, tier, confidence, components, inputs_used, citations, provenance, deltas, ranking, comparable_zones, trend_direction, trend_vs_previous, valid_until, period_date, computed_at' as const;

export const ieScoresRouter = router({
  list: authenticatedProcedure.input(ieScoresListInput).query(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('zone_scores')
      .select(SELECT_COLUMNS)
      .eq('zone_id', input.zone_id)
      .eq('country_code', input.country_code);

    if (input.score_codes && input.score_codes.length > 0) {
      query = query.in('score_type', input.score_codes);
    }
    if (input.period_date) {
      query = query.eq('period_date', input.period_date);
    }

    const { data, error } = await query.order('score_type', { ascending: true });
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    const rows = (data ?? []) as readonly ZoneScoreRow[];

    // D18 — si el caller NO es admin, filtra campos sensibles según
    // ie_score_visibility_rules. Internal scores (E01/E02/E03) desaparecen
    // de la respuesta; public scores (G01/D02/D09) se filtran a allowed_fields.
    const isAdmin = ctx.profile ? ADMIN_ROLES.has(ctx.profile.rol) : false;
    if (!isAdmin) {
      const filtered = await filterRowsForPublic(
        supabase,
        rows as unknown as ReadonlyArray<Record<string, unknown>>,
      );
      return filtered as unknown as readonly ZoneScoreRow[];
    }
    return rows;
  }),

  getByZone: authenticatedProcedure.input(ieScoresGetByZoneInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    let query = supabase
      .from('zone_scores')
      .select(SELECT_COLUMNS)
      .eq('zone_id', input.zone_id)
      .eq('country_code', input.country_code);

    if (input.levels && input.levels.length > 0) {
      query = query.in('level', input.levels);
    }
    if (input.period_date) {
      query = query.eq('period_date', input.period_date);
    }

    const { data, error } = await query
      .order('level', { ascending: true })
      .order('score_type', { ascending: true });
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return (data ?? []) as readonly ZoneScoreRow[];
  }),

  getDependencies: authenticatedProcedure
    .input(ieScoresGetDependenciesInput)
    .query(async ({ input }) => {
      const entry = SCORE_REGISTRY.find((e) => e.score_id === input.score_id);
      if (!entry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `score_id ${input.score_id} not registered`,
        });
      }
      const lineage = getScoreLineage(input.score_id);
      if (!lineage) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `lineage missing for ${input.score_id}`,
        });
      }
      return lineage;
    }),

  getTierGate: authenticatedProcedure.input(ieScoresGetTierGateInput).query(async ({ input }) => {
    const entry = SCORE_REGISTRY.find((e) => e.score_id === input.score_id);
    if (!entry) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `score_id ${input.score_id} not registered`,
      });
    }
    const supabase = createAdminClient();
    const gate = await tierGate(entry.tier, input.country_code, supabase);
    return {
      score_id: entry.score_id,
      tier: entry.tier,
      ...gate,
    };
  }),

  // B.6 Lead Score C01 — FASE 15 v3 onyx-benchmarked.
  // RLS: lead_scores SELECT policy uses lead_belongs_to_dev_or_asesor(lead_id).
  // No additional auth filter needed beyond authenticatedProcedure.
  getLeadScore: authenticatedProcedure.input(ieScoresGetLeadScoreInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('lead_scores')
      .select('lead_id, score, factors, model_version, computed_at, ttl_until')
      .eq('lead_id', input.leadId)
      .maybeSingle();

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }

    if (!data) {
      const result = await computeLeadScore(input.leadId, { supabase });
      await persistLeadScore(result, { supabase });
      return {
        leadId: result.lead_id,
        score: result.score,
        tier: result.tier,
        factors: result.factors,
        modelVersion: result.model_version,
        computedAt: result.factors.computed_at,
        ttlUntil: result.ttl_until,
        freshlyComputed: true as const,
      };
    }

    const factors = (data.factors ?? {}) as Partial<LeadScoreFactors>;
    const tier =
      data.score >= 75
        ? ('hot' as const)
        : data.score >= 40
          ? ('warm' as const)
          : ('cold' as const);

    return {
      leadId: data.lead_id,
      score: data.score,
      tier,
      factors,
      modelVersion: data.model_version,
      computedAt: data.computed_at,
      ttlUntil: data.ttl_until,
      freshlyComputed: false as const,
    };
  }),

  recomputeLeadScore: authenticatedProcedure
    .input(ieScoresRecomputeLeadScoreInput)
    .mutation(async ({ input }) => {
      const supabase = createAdminClient();
      const result = await computeLeadScore(input.leadId, { supabase });
      await persistLeadScore(result, { supabase });
      return {
        leadId: result.lead_id,
        score: result.score,
        tier: result.tier,
        factors: result.factors,
        modelVersion: result.model_version,
        computedAt: result.factors.computed_at,
        ttlUntil: result.ttl_until,
      };
    }),

  getHistory: authenticatedProcedure.input(ieScoresGetHistoryInput).query(async ({ input }) => {
    if (input.from > input.to) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'from must be ≤ to',
      });
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('score_history')
      .select(
        'entity_id, entity_type, score_type, score_value, score_label, level, tier, confidence, components, period_date, valid_from, valid_until, archived_at, country_code',
      )
      .eq('entity_type', 'zone')
      .eq('entity_id', input.zone_id)
      .eq('country_code', input.country_code)
      .eq('score_type', input.score_code)
      .gte('period_date', input.from)
      .lte('period_date', input.to)
      .order('period_date', { ascending: true });

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return data ?? [];
  }),
});
