import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { adminProcedure, authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { computeStrBaseline } from '../lib/scores/str-baseline';
import { computeLtrStrOpportunity, type LtrStrRegime } from '../lib/scores/str-ltr-opportunity';
import { computeZoneInvestmentScore } from '../lib/scores/zone-investment-score';
import { processSentimentBatch } from '../lib/sentiment/sentiment-worker';
import { sentimentBatchInput, zoneInvestmentGetInput } from '../schemas/zone-investment';

const VALID_REGIMES: readonly LtrStrRegime[] = [
  'str_strongly_outperforms',
  'str_outperforms',
  'parity',
  'ltr_outperforms',
  'unknown',
];

function isRegime(v: string): v is LtrStrRegime {
  return (VALID_REGIMES as readonly string[]).includes(v);
}

export const zoneInvestmentRouter = router({
  get: authenticatedProcedure.input(zoneInvestmentGetInput).query(async ({ input }) => {
    const supabase = createAdminClient();

    const { data: marketRow, error: marketErr } = await supabase
      .from('str_markets')
      .select(
        'id, country_code, zone_id, airroi_country, airroi_region, airroi_locality, airroi_district',
      )
      .eq('id', input.market_id)
      .maybeSingle();
    if (marketErr) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: marketErr.message });
    }
    if (!marketRow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'market_not_found' });
    }

    // Baseline (reusa lógica 7b.A — periods + benchmark si es sub-market).
    const { data: aggregates } = await supabase
      .from('str_market_monthly_aggregates')
      .select('period, occupancy_rate, revpar_minor')
      .eq('market_id', input.market_id)
      .order('period', { ascending: false })
      .limit(input.num_months);

    let benchmarkAgg: {
      occupancy_rate_avg: number | null;
      revpar_minor_avg: number | null;
    } | null = null;
    if (marketRow.airroi_district) {
      const { data: cityMarket } = await supabase
        .from('str_markets')
        .select('id')
        .eq('airroi_country', marketRow.airroi_country)
        .eq('airroi_region', marketRow.airroi_region)
        .eq('airroi_locality', marketRow.airroi_locality)
        .is('airroi_district', null)
        .maybeSingle();
      if (cityMarket?.id) {
        const { data: cityAggs } = await supabase
          .from('str_market_monthly_aggregates')
          .select('occupancy_rate, revpar_minor')
          .eq('market_id', cityMarket.id)
          .order('period', { ascending: false })
          .limit(input.num_months);
        if (cityAggs && cityAggs.length > 0) {
          const occs = cityAggs.map((r) => r.occupancy_rate).filter((v): v is number => v != null);
          const revs = cityAggs.map((r) => r.revpar_minor).filter((v): v is number => v != null);
          benchmarkAgg = {
            occupancy_rate_avg: occs.length ? occs.reduce((a, b) => a + b, 0) / occs.length : null,
            revpar_minor_avg: revs.length ? revs.reduce((a, b) => a + b, 0) / revs.length : null,
          };
        }
      }
    }

    const baseline = computeStrBaseline({
      periods: (aggregates ?? []).map((r) => ({
        period: r.period,
        occupancy_rate: r.occupancy_rate,
        revpar_minor: r.revpar_minor,
      })),
      benchmark: benchmarkAgg,
    });

    // LTR-STR opportunity (si hay zone_id puenteada y row en view).
    let ltrOpportunityScore: number | null = null;
    let ltrConfidence: 'high' | 'medium' | 'low' | 'insufficient_data' = 'insufficient_data';
    if (marketRow.zone_id) {
      const { data: ltrRow } = await supabase
        .from('v_ltr_str_connection')
        .select('str_ltr_ratio, regime, str_sample_months, ltr_sample_listings')
        .eq('zone_id', marketRow.zone_id)
        .maybeSingle();
      if (ltrRow) {
        const regime = ltrRow.regime && isRegime(ltrRow.regime) ? ltrRow.regime : 'unknown';
        const ltr = computeLtrStrOpportunity({
          str_ltr_ratio: ltrRow.str_ltr_ratio != null ? Number(ltrRow.str_ltr_ratio) : null,
          regime,
          str_sample_months: Number(ltrRow.str_sample_months ?? 0),
          ltr_sample_listings: Number(ltrRow.ltr_sample_listings ?? 0),
        });
        ltrOpportunityScore = ltr.score;
        ltrConfidence = ltr.confidence;
      }
    }

    // Cap rate proxy: median ADR × occupancy desde periods recientes contra
    // un property_price_minor estimado por colonia. En FASE 07b el price
    // medio por colonia vendrá de FASE 10. Sin price disponible: cap_rate=null.
    // Para no sobre-acoplar a tablas FASE 10, exponemos cap_rate=null aquí
    // y el caller (UI/copilot) puede pedir strViability.getForProperty con
    // su price input.
    const capRate: number | null = null;

    // Sentiment agregado vía función SQL (decay 90d half-life).
    // RPC types pendientes de regenerar tras migration 087000 — cast tipado
    // sin perder el shape público.
    type AggregateZoneSentimentRow = {
      market_id: string;
      reviews_analyzed: number | string;
      sentiment_weighted_avg: number | string | null;
      sentiment_simple_avg: number | string | null;
      positive_share: number | string | null;
      negative_share: number | string | null;
      topic_counts: Record<string, number>;
    };
    const sentimentRpc = (
      supabase.rpc as unknown as (
        fn: 'aggregate_zone_sentiment',
        args: {
          p_market_id: string;
          p_lookback_days: number;
          p_decay_half_life_days: number;
        },
      ) => Promise<{ data: AggregateZoneSentimentRow[] | null; error: unknown }>
    )('aggregate_zone_sentiment', {
      p_market_id: input.market_id,
      p_lookback_days: input.sentiment_lookback_days,
      p_decay_half_life_days: 90,
    });
    const { data: sentimentRows } = await sentimentRpc;
    const sentimentAgg = sentimentRows?.[0];
    const sentimentWeightedAvg =
      sentimentAgg?.sentiment_weighted_avg != null
        ? Number(sentimentAgg.sentiment_weighted_avg)
        : null;
    const reviewsAnalyzed = Number(sentimentAgg?.reviews_analyzed ?? 0);

    // Momentum: yoy% del revpar median entre el mes más reciente y -12.
    let momentumYoyPct: number | null = null;
    if (aggregates && aggregates.length >= 12) {
      const recent = aggregates[0]?.revpar_minor ?? null;
      const yearAgo = aggregates[Math.min(11, aggregates.length - 1)]?.revpar_minor ?? null;
      if (recent != null && yearAgo != null && yearAgo > 0) {
        momentumYoyPct = (recent - yearAgo) / yearAgo;
      }
    }

    const zis = computeZoneInvestmentScore({
      baseline_score: baseline.score,
      baseline_confidence: baseline.confidence,
      cap_rate: capRate,
      ltr_opportunity_score: ltrOpportunityScore,
      ltr_confidence: ltrConfidence,
      sentiment_weighted_avg: sentimentWeightedAvg,
      reviews_analyzed: reviewsAnalyzed,
      momentum_yoy_pct: momentumYoyPct,
    });

    return {
      market_id: input.market_id,
      score_code: 'ZIS' as const,
      reviews_analyzed: reviewsAnalyzed,
      ...zis,
    };
  }),

  // Worker tRPC trigger — admin-only. Cron Trigger.dev también puede invocar
  // processSentimentBatch directamente sin pasar por este route. Mantenemos
  // este endpoint para debug + bootstrapping manual.
  runSentimentBatch: adminProcedure.input(sentimentBatchInput).mutation(async ({ input }) => {
    try {
      const result = await processSentimentBatch({
        batchSize: input.batch_size,
        dryRun: input.dry_run,
      });
      return result;
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'sentiment_batch_failed',
      });
    }
  }),
});
