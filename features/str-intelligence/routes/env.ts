import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { computeEnvScore, type EnvInput, noiseShareFromTopicCounts } from '../lib/scores/env-score';

type AggregateZoneSentimentRow = {
  market_id: string;
  reviews_analyzed: number | string;
  topic_counts: Record<string, number>;
};

type ZoneAqiSummaryRow = {
  market_id: string;
  aqi_avg: number | string | null;
  aqi_max: number | string | null;
  aqi_min: number | string | null;
  samples: number | string;
  stations_count: number | string;
};

export const envRouter = router({
  get: authenticatedProcedure
    .input(
      z.object({
        market_id: z.string().uuid(),
        aqi_radius_m: z.number().int().min(500).max(50_000).default(10_000),
        aqi_lookback_days: z.number().int().min(1).max(365).default(30),
        sentiment_lookback_days: z.number().int().min(30).max(730).default(365),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();

      const { data: marketRow, error: marketErr } = await supabase
        .from('str_markets')
        .select('id, country_code')
        .eq('id', input.market_id)
        .maybeSingle();
      if (marketErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: marketErr.message });
      }
      if (!marketRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'market_not_found' });
      }

      const aqiRpc = (
        supabase.rpc as unknown as (
          fn: 'zone_aqi_summary',
          args: {
            p_market_id: string;
            p_radius_m: number;
            p_lookback_days: number;
          },
        ) => Promise<{ data: ZoneAqiSummaryRow[] | null; error: { message: string } | null }>
      )('zone_aqi_summary', {
        p_market_id: input.market_id,
        p_radius_m: input.aqi_radius_m,
        p_lookback_days: input.aqi_lookback_days,
      });

      const sentimentRpc = (
        supabase.rpc as unknown as (
          fn: 'aggregate_zone_sentiment',
          args: {
            p_market_id: string;
            p_lookback_days: number;
            p_decay_half_life_days: number;
          },
        ) => Promise<{
          data: AggregateZoneSentimentRow[] | null;
          error: { message: string } | null;
        }>
      )('aggregate_zone_sentiment', {
        p_market_id: input.market_id,
        p_lookback_days: input.sentiment_lookback_days,
        p_decay_half_life_days: 90,
      });

      const [{ data: aqiRows }, { data: sentRows }] = await Promise.all([aqiRpc, sentimentRpc]);

      const aqiAgg = aqiRows?.[0];
      const sentAgg = sentRows?.[0];

      const aqiAvg = aqiAgg?.aqi_avg != null ? Number(aqiAgg.aqi_avg) : null;
      const aqiSamples = Number(aqiAgg?.samples ?? 0);
      const reviewsAnalyzed = Number(sentAgg?.reviews_analyzed ?? 0);
      const noiseShare = noiseShareFromTopicCounts(sentAgg?.topic_counts ?? null, reviewsAnalyzed);

      const envInput: EnvInput = {
        aqi_avg_30d: aqiAvg,
        aqi_samples_30d: aqiSamples,
        noise_share: noiseShare,
        reviews_analyzed: reviewsAnalyzed,
      };

      const result = computeEnvScore(envInput);

      return {
        market_id: input.market_id,
        score_code: 'ENV' as const,
        ...result,
        debug: {
          aqi_avg: aqiAvg,
          aqi_samples_30d: aqiSamples,
          aqi_stations_count: Number(aqiAgg?.stations_count ?? 0),
          noise_share: noiseShare,
          reviews_analyzed: reviewsAnalyzed,
        },
      };
    }),
});
