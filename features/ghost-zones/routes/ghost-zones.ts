// BLOQUE 11.Q.2 — Ghost Zones tRPC router.
//
// authenticated only (feature Pro+ gated) — landing pública vive en
// app/[locale]/(public)/indices/ghost-zones/page.tsx (marketing sin data).
// Ranking real + timeline solo bajo /(authenticated)/.
//
// Endpoints:
//   - ranking({periodDate?, topN, countryCode}) → GhostZoneRanking[]
//   - timeline12m({coloniaId, countryCode, months}) → GhostTimelinePoint[]

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { rankingInputSchema, timelineInputSchema } from '@/features/ghost-zones/schemas/ghost';
import type {
  GhostScoreBreakdown,
  GhostTimelinePoint,
  GhostZoneRanking,
  HypeLevel,
} from '@/features/ghost-zones/types';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import {
  computeGhostScorePure,
  deriveHypeLevel,
} from '@/shared/lib/intelligence-engine/ghost-zones/ghost-engine';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';

const DEFAULT_PERIOD_FALLBACK_DAYS = 60;

function mostRecentFallbackPeriod(now: Date): string {
  const fallback = new Date(now.getTime());
  fallback.setUTCDate(fallback.getUTCDate() - DEFAULT_PERIOD_FALLBACK_DAYS);
  return fallback.toISOString().slice(0, 10);
}

function shiftMonths(periodISO: string, months: number): string {
  const d = new Date(`${periodISO}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

interface GhostRankingRow {
  readonly colonia_id: string;
  readonly country_code: string;
  readonly period_date: string;
  readonly ghost_score: number;
  readonly rank: number | null;
  readonly search_volume: number;
  readonly press_mentions: number;
  readonly score_total: number | null;
  readonly calculated_at: string;
}

function enrichWithBreakdown(row: GhostRankingRow, label: string | null): GhostZoneRanking {
  const comp = computeGhostScorePure({
    searchVolume: row.search_volume,
    pressMentions: row.press_mentions,
    dmxAvg: row.score_total,
  });
  const hypeLevel: HypeLevel = deriveHypeLevel(row.ghost_score, comp.hype_halving_warning);
  const breakdown: GhostScoreBreakdown = comp.breakdown;
  return {
    colonia_id: row.colonia_id,
    colonia_label: label,
    country_code: row.country_code,
    period_date: row.period_date,
    ghost_score: row.ghost_score,
    rank: row.rank,
    search_volume: row.search_volume,
    press_mentions: row.press_mentions,
    score_total: row.score_total,
    breakdown,
    hype_level: hypeLevel,
    hype_halving_warning: comp.hype_halving_warning,
    calculated_at: row.calculated_at,
  };
}

export const ghostZonesRouter = router({
  ranking: authenticatedProcedure.input(rankingInputSchema).query(async ({ ctx, input }) => {
    const now = new Date();
    const periodDate = input.periodDate ?? mostRecentFallbackPeriod(now);

    const { data, error } = await ctx.supabase
      .from('ghost_zones_ranking')
      .select(
        'colonia_id, country_code, period_date, ghost_score, rank, search_volume, press_mentions, score_total, calculated_at',
      )
      .eq('country_code', input.countryCode)
      .lte('period_date', periodDate)
      .order('period_date', { ascending: false })
      .order('ghost_score', { ascending: false })
      .limit(input.topN * 4); // oversample: may include multiple period_dates

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    if (!data || data.length === 0) return [] as readonly GhostZoneRanking[];

    // Pick most recent period among rows, then restrict to that period.
    const maxPeriod = data.reduce<string>((acc, r) => {
      const p = typeof r.period_date === 'string' ? r.period_date : '';
      return p > acc ? p : acc;
    }, '');

    const latest = data
      .filter((r) => r.period_date === maxPeriod)
      .slice(0, input.topN) as GhostRankingRow[];

    const labels = await Promise.all(
      latest.map((r) =>
        resolveZoneLabel({
          scopeType: 'colonia',
          scopeId: r.colonia_id,
          countryCode: input.countryCode,
          supabase: ctx.supabase,
        }).catch(() => null),
      ),
    );

    return latest.map((row, idx) => enrichWithBreakdown(row, labels[idx] ?? null));
  }),

  // U14 cross-function helper — top N over_hyped colonia ids para Ghost×LifePath badge.
  // Separado de ranking para mantener profile query chica.
  topOverHypedIds: authenticatedProcedure
    .input(
      z.object({
        topN: z.number().int().min(1).max(50).default(20),
        countryCode: z.string().min(2).max(3).default('MX'),
      }),
    )
    .query(async ({ ctx, input }): Promise<readonly string[]> => {
      const { data, error } = await ctx.supabase
        .from('ghost_zones_ranking')
        .select('colonia_id, ghost_score, period_date')
        .eq('country_code', input.countryCode)
        .order('period_date', { ascending: false })
        .order('ghost_score', { ascending: false })
        .limit(input.topN * 3);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      if (!data || data.length === 0) return [];

      const maxPeriod = data.reduce<string>((acc, r) => {
        const p = typeof r.period_date === 'string' ? r.period_date : '';
        return p > acc ? p : acc;
      }, '');

      return data
        .filter((r) => r.period_date === maxPeriod)
        .slice(0, input.topN)
        .map((r) => r.colonia_id)
        .filter((x): x is string => typeof x === 'string');
    }),

  timeline12m: authenticatedProcedure
    .input(timelineInputSchema)
    .query(async ({ ctx, input }): Promise<readonly GhostTimelinePoint[]> => {
      const now = new Date();
      const to = now.toISOString().slice(0, 10);
      const from = shiftMonths(to, -input.months);

      const { data, error } = await ctx.supabase
        .from('ghost_zones_ranking')
        .select('period_date, ghost_score, search_volume, press_mentions, score_total')
        .eq('colonia_id', input.coloniaId)
        .eq('country_code', input.countryCode)
        .gte('period_date', from)
        .lte('period_date', to)
        .order('period_date', { ascending: true });

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      if (!data) return [];

      return data.map((row) => {
        const comp = computeGhostScorePure({
          searchVolume: row.search_volume,
          pressMentions: row.press_mentions,
          dmxAvg: row.score_total,
        });
        return {
          period_date: row.period_date,
          ghost_score: row.ghost_score,
          search_volume: row.search_volume,
          press_mentions: row.press_mentions,
          breakdown: comp.breakdown,
        };
      });
    }),
});
