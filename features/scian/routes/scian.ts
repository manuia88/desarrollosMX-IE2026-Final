import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import {
  computeZoneScianStats,
  type MacroCategoryCounts,
  macroCategoryForScian,
  SCIAN_MACRO_CATEGORY_KEYS,
  type ScianMacroCategoryKey,
  type ScianTier,
  type TierCounts,
  tierForScian,
} from '@/shared/lib/scian';

const zoneStatsInput = z.object({
  zone_id: z.string().uuid(),
  ratio_pb_twelve_months_ago: z.number().min(0).optional(),
});

function emptyCounts(): { tier: TierCounts; macro: MacroCategoryCounts } {
  const tier: TierCounts = { high: 0, standard: 0, basic: 0 };
  const macro: MacroCategoryCounts = {};
  for (const key of SCIAN_MACRO_CATEGORY_KEYS) {
    macro[key] = 0;
  }
  return { tier, macro };
}

export const scianRouter = router({
  zoneStats: authenticatedProcedure.input(zoneStatsInput).query(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase
      .from('geo_data_points')
      .select('scian_code')
      .eq('source', 'denue')
      .eq('zone_id', input.zone_id)
      .is('valid_to', null)
      .not('scian_code', 'is', null)
      .limit(50000);

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }

    const counts = emptyCounts();
    for (const row of data ?? []) {
      const code = row.scian_code;
      if (!code) continue;
      const tier: ScianTier | null = tierForScian(code);
      const macro: ScianMacroCategoryKey | null = macroCategoryForScian(code);
      if (tier) counts.tier[tier] += 1;
      if (macro) counts.macro[macro] = (counts.macro[macro] ?? 0) + 1;
    }

    const stats = computeZoneScianStats({
      tier_counts: counts.tier,
      macro_counts: counts.macro,
      ...(input.ratio_pb_twelve_months_ago !== undefined
        ? { ratio_pb_twelve_months_ago: input.ratio_pb_twelve_months_ago }
        : {}),
    });

    return {
      zone_id: input.zone_id,
      ...stats,
    };
  }),
});
