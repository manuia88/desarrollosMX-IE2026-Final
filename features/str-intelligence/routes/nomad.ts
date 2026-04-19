import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import {
  computeNomadDemand,
  type NomadInput,
  nomadMentionsFromTopicCounts,
} from '../lib/scores/nomad-demand';

type AggregateZoneSentimentRow = {
  market_id: string;
  reviews_analyzed: number | string;
  topic_counts: Record<string, number>;
};

export const nomadRouter = router({
  get: authenticatedProcedure
    .input(
      z.object({
        market_id: z.string().uuid(),
        sentiment_lookback_days: z.number().int().min(30).max(730).default(365),
      }),
    )
    .query(async ({ input }) => {
      const supabase = createAdminClient();

      const { data: marketRow, error: marketErr } = await supabase
        .from('str_markets')
        .select('id, country_code, airroi_locality, display_name')
        .eq('id', input.market_id)
        .maybeSingle();
      if (marketErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: marketErr.message });
      }
      if (!marketRow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'market_not_found' });
      }

      // Sentiment topic counts (incluye topics nomad-related).
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

      // Length of stay desde aggregates más recientes (12m).
      const aggregatesPromise = supabase
        .from('str_market_monthly_aggregates')
        .select('avg_length_of_stay')
        .eq('market_id', input.market_id)
        .order('period', { ascending: false })
        .limit(12);

      // Google Trends por keywords nomad — query genérica desde macro_series.
      // FASE 07 stub: si no hay rows, trends_present=false.
      const trendsPromise = supabase
        .from('macro_series')
        .select('value, period_start')
        .eq('source', 'google_trends')
        .eq('country_code', marketRow.country_code)
        .ilike('series_id', `%${marketRow.airroi_locality}%`)
        .order('period_start', { ascending: false })
        .limit(12);

      const [{ data: sentRows }, { data: aggRows }, { data: trendsRows }] = await Promise.all([
        sentimentRpc,
        aggregatesPromise,
        trendsPromise,
      ]);

      const sentAgg = sentRows?.[0];
      const reviewsAnalyzed = Number(sentAgg?.reviews_analyzed ?? 0);
      const nomadMentions = nomadMentionsFromTopicCounts(sentAgg?.topic_counts ?? null);

      const losValues = (aggRows ?? [])
        .map((r) => r.avg_length_of_stay)
        .filter((v): v is number => v != null && Number.isFinite(v));
      const losAvg = losValues.length
        ? losValues.reduce((a, b) => a + b, 0) / losValues.length
        : null;

      const trendsValues = (trendsRows ?? [])
        .map((r) => r.value)
        .filter((v): v is number => v != null && Number.isFinite(v));
      const trendsAvg = trendsValues.length
        ? trendsValues.reduce((a, b) => a + b, 0) / trendsValues.length
        : null;

      const nomadInput: NomadInput = {
        trends_avg_interest: trendsAvg,
        trends_keywords_count: trendsValues.length,
        nomad_topic_mentions: nomadMentions,
        reviews_analyzed: reviewsAnalyzed,
        avg_length_of_stay: losAvg,
        length_of_stay_samples: losValues.length,
      };

      const result = computeNomadDemand(nomadInput);

      return {
        market_id: input.market_id,
        score_code: 'NOMAD' as const,
        ...result,
        debug: {
          trends_avg: trendsAvg,
          trends_samples: trendsValues.length,
          nomad_topic_mentions: nomadMentions,
          reviews_analyzed: reviewsAnalyzed,
          avg_length_of_stay: losAvg,
          los_samples: losValues.length,
        },
      };
    }),
});
