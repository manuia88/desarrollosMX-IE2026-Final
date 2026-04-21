import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '@/server/trpc/init';
import {
  getAvailablePeriodsInput,
  getBacktestInput,
  getIndexDetailInput,
  getMethodologyInput,
  getMoversInput,
  getRankingInput,
} from '../schemas/index-queries';

// Políticas RLS en 20260421100000 ya restringen public select a period_date
// cerrado (< date_trunc('month', now())) y is_shadow=false. El router solo
// expone publicProcedure y deja que Supabase aplique el filtro a nivel BD.
//
// Todas las queries pasan por ctx.supabase (anon / SSR) — no service_role —
// para que RLS se ejecute. Los errores de acceso devuelven array vacío o
// null sin leak de metadata.

interface RankingRow {
  readonly scope_id: string;
  readonly scope_type: string;
  readonly index_code: string;
  readonly value: number;
  readonly score_band: string | null;
  readonly confidence: string;
  readonly confidence_score: number | null;
  readonly ranking_in_scope: number | null;
  readonly percentile: number | null;
  readonly trend_direction: string | null;
  readonly trend_vs_previous: number | null;
  readonly period_date: string;
  readonly methodology_version: string;
}

// Detail adds jsonb columns + audit fields. Cast explícito evita TS2589
// (type instantiation excessively deep) que dispara tRPC+supabase al expandir
// jsonb en client hooks — mismo patrón que RankingRow en getMovers.
interface IndexDetailRow extends RankingRow {
  readonly components: Record<string, unknown>;
  readonly inputs_used: Record<string, unknown>;
  readonly confidence_breakdown: Record<string, unknown> | null;
  readonly valid_until: string | null;
  readonly calculated_at: string;
  readonly period_type: string;
  readonly country_code: string;
}

const RANKING_COLUMNS =
  'scope_id,scope_type,index_code,value,score_band,confidence,confidence_score,ranking_in_scope,percentile,trend_direction,trend_vs_previous,period_date,methodology_version';

const DETAIL_COLUMNS = `${RANKING_COLUMNS},components,inputs_used,confidence_breakdown,valid_until,calculated_at,period_type,country_code`;

async function resolveLatestClosedPeriod(
  supabase: Parameters<typeof publicProcedure.query>[0] extends never ? never : never,
  _indexCode: string,
  _countryCode: string,
  _periodType: string,
): Promise<string | null> {
  void supabase;
  return null;
}
void resolveLatestClosedPeriod;

export const indicesPublicRouter = router({
  getRanking: publicProcedure.input(getRankingInput).query(async ({ input, ctx }) => {
    let query = ctx.supabase
      .from('dmx_indices')
      .select(RANKING_COLUMNS)
      .eq('index_code', input.indexCode)
      .eq('scope_type', input.scopeType)
      .eq('country_code', input.countryCode)
      .eq('period_type', input.periodType)
      .eq('is_shadow', false)
      .order('ranking_in_scope', { ascending: true, nullsFirst: false })
      .limit(input.limit);

    if (input.periodDate) {
      query = query.eq('period_date', input.periodDate);
    } else {
      query = query.order('period_date', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'indices_ranking_error' });
    }
    const rows = (data ?? []) as readonly RankingRow[];

    if (!input.periodDate && rows.length > 0) {
      const first = rows[0];
      const latestPeriod = first ? first.period_date : null;
      if (latestPeriod) {
        return rows.filter((r) => r.period_date === latestPeriod);
      }
    }
    return rows;
  }),

  getIndexDetail: publicProcedure.input(getIndexDetailInput).query(async ({ input, ctx }) => {
    let query = ctx.supabase
      .from('dmx_indices')
      .select(DETAIL_COLUMNS)
      .eq('index_code', input.indexCode)
      .eq('scope_type', input.scopeType)
      .eq('scope_id', input.scopeId)
      .eq('country_code', input.countryCode)
      .eq('is_shadow', false)
      .order('period_date', { ascending: false })
      .limit(1);

    if (input.periodDate) {
      query = query.eq('period_date', input.periodDate);
    }

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== 'PGRST116') {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'indices_detail_error' });
    }
    return (data ?? null) as IndexDetailRow | null;
  }),

  getMovers: publicProcedure.input(getMoversInput).query(async ({ input, ctx }) => {
    const ascending = input.direction === 'down';
    let query = ctx.supabase
      .from('dmx_indices')
      .select(RANKING_COLUMNS)
      .eq('scope_type', input.scopeType)
      .eq('country_code', input.countryCode)
      .eq('is_shadow', false)
      .eq('period_type', 'monthly')
      .order('trend_vs_previous', { ascending, nullsFirst: false })
      .limit(input.limit);

    if (input.periodDate) {
      query = query.eq('period_date', input.periodDate);
    }

    const { data, error } = await query;
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'indices_movers_error' });
    }
    return (data ?? []) as readonly RankingRow[];
  }),

  getBacktest: publicProcedure.input(getBacktestInput).query(async ({ input, ctx }) => {
    const { data, error } = await ctx.supabase
      .from('dmx_indices')
      .select('scope_id,period_date,value,methodology_version')
      .eq('index_code', input.indexCode)
      .eq('scope_type', input.scopeType)
      .in('scope_id', input.scopeIds)
      .eq('country_code', input.countryCode)
      .eq('is_shadow', false)
      .gte('period_date', input.from)
      .lte('period_date', input.to)
      .order('period_date', { ascending: true });

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'indices_backtest_error' });
    }
    return (data ?? []) as ReadonlyArray<{
      readonly scope_id: string;
      readonly period_date: string;
      readonly value: number;
      readonly methodology_version: string;
    }>;
  }),

  getMethodology: publicProcedure.input(getMethodologyInput).query(async ({ input, ctx }) => {
    let query = ctx.supabase
      .from('dmx_indices_methodology_versions')
      .select(
        'index_code,version,formula_md,weights_jsonb,effective_from,effective_to,changelog_notes,approved_at',
      )
      .order('effective_from', { ascending: false });

    if (input.indexCode) {
      query = query.eq('index_code', input.indexCode);
    }

    const { data, error } = await query;
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'methodology_error' });
    }
    return (data ?? []) as ReadonlyArray<{
      readonly index_code: string;
      readonly version: string;
      readonly formula_md: string;
      readonly weights_jsonb: unknown;
      readonly effective_from: string;
      readonly effective_to: string | null;
      readonly changelog_notes: string | null;
      readonly approved_at: string | null;
    }>;
  }),

  getAvailablePeriods: publicProcedure
    .input(getAvailablePeriodsInput)
    .query(async ({ input, ctx }) => {
      let query = ctx.supabase
        .from('dmx_indices')
        .select('period_date')
        .eq('country_code', input.countryCode)
        .eq('period_type', input.periodType)
        .eq('is_shadow', false)
        .order('period_date', { ascending: false })
        .limit(500);

      if (input.indexCode) {
        query = query.eq('index_code', input.indexCode);
      }

      const { data, error } = await query;
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'available_periods_error',
        });
      }
      const rows = (data ?? []) as ReadonlyArray<{ readonly period_date: string }>;
      const unique: string[] = [];
      const seen = new Set<string>();
      for (const row of rows) {
        if (!seen.has(row.period_date)) {
          seen.add(row.period_date);
          unique.push(row.period_date);
          if (unique.length >= input.limit) break;
        }
      }
      return unique;
    }),
});

export type IndicesPublicRouter = typeof indicesPublicRouter;
