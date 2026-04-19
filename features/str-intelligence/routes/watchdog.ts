import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { adminProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import {
  type AnomalyMarketSnapshot,
  scanMarketsForAnomalies,
} from '../lib/watchdog/anomaly-detector';

export const strWatchdogRouter = router({
  scanMarkets: adminProcedure
    .input(
      z.object({
        country_code: z.string().length(2),
        markets_limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();

      // Fetch los 2 periodos más recientes para cada market top-N por listings.
      const { data: markets, error: marketsErr } = await supabase
        .from('str_markets')
        .select('id')
        .eq('country_code', input.country_code)
        .order('active_listings_count', { ascending: false, nullsFirst: false })
        .limit(input.markets_limit);
      if (marketsErr) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: marketsErr.message,
        });
      }

      const marketIds = (markets ?? []).map((m) => m.id);
      if (marketIds.length === 0) {
        return { country_code: input.country_code, anomalies: [], scanned_markets: 0 };
      }

      const { data: rows, error: aggErr } = await supabase
        .from('str_market_monthly_aggregates')
        .select('market_id, period, adr_minor, occupancy_rate, active_listings')
        .in('market_id', marketIds)
        .order('market_id', { ascending: true })
        .order('period', { ascending: false });
      if (aggErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: aggErr.message });
      }

      const byMarket = new Map<string, AnomalyMarketSnapshot[]>();
      for (const row of rows ?? []) {
        const arr = byMarket.get(row.market_id);
        const snapshot: AnomalyMarketSnapshot = {
          market_id: row.market_id,
          period: row.period,
          adr_minor: row.adr_minor,
          occupancy_rate: row.occupancy_rate,
          active_listings: row.active_listings,
        };
        if (arr) {
          if (arr.length < 2) arr.push(snapshot);
        } else {
          byMarket.set(row.market_id, [snapshot]);
        }
      }

      const anomalies = scanMarketsForAnomalies(byMarket);

      return {
        country_code: input.country_code,
        scanned_markets: byMarket.size,
        anomalies,
      };
    }),
});
