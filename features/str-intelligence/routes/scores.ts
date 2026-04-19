import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { computeStrBaseline } from '../lib/scores/str-baseline';
import { strScoresGetBaselineInput, strScoresGetZoneStatsInput } from '../schemas/scores';

export const strScoresRouter = router({
  getBaseline: authenticatedProcedure.input(strScoresGetBaselineInput).query(async ({ input }) => {
    const supabase = createAdminClient();

    // Resolve market_id si solo se pasa identifier AirROI.
    let marketId = input.market_id;
    if (!marketId && input.airroi) {
      const airroi = input.airroi;
      const query = supabase
        .from('str_markets')
        .select('id')
        .eq('airroi_country', airroi.country)
        .eq('airroi_region', airroi.region)
        .eq('airroi_locality', airroi.locality);
      const q = airroi.district
        ? query.eq('airroi_district', airroi.district)
        : query.is('airroi_district', null);
      const { data, error } = await q.maybeSingle();
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      marketId = data?.id;
    }
    if (!marketId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'market_not_found — provide market_id o airroi identifier existente.',
      });
    }

    // Benchmark: si el market es sub-market (district != null), usar el market
    // ciudad-level del mismo locality como referencia (Roma Sur vs CDMX ciudad).
    const { data: marketRow } = await supabase
      .from('str_markets')
      .select('airroi_country, airroi_region, airroi_locality, airroi_district')
      .eq('id', marketId)
      .single();

    let benchmarkAgg: {
      occupancy_rate_avg: number | null;
      revpar_minor_avg: number | null;
    } | null = null;
    if (marketRow?.airroi_district) {
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

    // Periodos para el market.
    const { data: rows, error: rowsErr } = await supabase
      .from('str_market_monthly_aggregates')
      .select('period, occupancy_rate, revpar_minor')
      .eq('market_id', marketId)
      .order('period', { ascending: false })
      .limit(input.num_months);
    if (rowsErr) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: rowsErr.message });
    }

    const baseline = computeStrBaseline({
      periods: (rows ?? []).map((r) => ({
        period: r.period,
        occupancy_rate: r.occupancy_rate,
        revpar_minor: r.revpar_minor,
      })),
      benchmark: benchmarkAgg,
    });

    return {
      market_id: marketId,
      score_code: 'STR-BASELINE' as const,
      ...baseline,
    };
  }),

  getZoneStats: authenticatedProcedure
    .input(strScoresGetZoneStatsInput)
    .query(async ({ input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('str_market_monthly_aggregates')
        .select(
          'period, occupancy_rate, adr_minor, revpar_minor, revenue_minor, active_listings, avg_length_of_stay, booking_lead_time_days, currency',
        )
        .eq('market_id', input.market_id)
        .eq('period', input.period)
        .maybeSingle();
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      if (!data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'no_data_for_period' });
      }
      return data;
    }),
});
