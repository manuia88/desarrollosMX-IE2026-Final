import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { IngestCtx, IngestResult } from '../types';
import {
  type AirroiClient,
  type AirroiMarketIdentifier,
  createAirroiClient,
} from './airroi-client';
import { SEED_MARKETS_MX, type SeedMarket } from './airroi-markets-seed';

// FASE 07b / BLOQUE 7b.A / MÓDULO 7b.A.2 — AirROI markets ingestor.
//
// Responsable de:
//   1. Upsertear str_markets con cada market seedeado (country/region/locality/
//      district + native_currency + active_listings_count). No dispara más
//      de un searchMarkets por market nuevo (resolve-on-miss).
//   2. Llamar a markets/metrics/all para cada market y upsertear N rows en
//      str_market_monthly_aggregates (N = numMonths).
//
// El ingestor se diseña para correr dentro de runIngest({source:'airroi'}),
// heredando budget pre-check + ledger granular + ingest_runs row (U5).

export interface AirroiMetricsDistribution {
  readonly avg: number | null;
  readonly p25: number | null;
  readonly p50: number | null;
  readonly p75: number | null;
  readonly p90: number | null;
}

export interface AirroiMetricsPeriod {
  readonly date: string; // ISO "YYYY-MM-DD" (primer día del mes).
  readonly occupancy?: AirroiMetricsDistribution;
  readonly average_daily_rate?: AirroiMetricsDistribution;
  readonly revpar?: AirroiMetricsDistribution;
  readonly revenue?: AirroiMetricsDistribution;
  readonly booking_lead_time?: AirroiMetricsDistribution;
  readonly length_of_stay?: AirroiMetricsDistribution;
  readonly min_nights?: AirroiMetricsDistribution;
}

export interface AirroiMetricsResponse {
  readonly market: AirroiMarketIdentifier;
  readonly results: readonly AirroiMetricsPeriod[];
}

export interface IngestAirroiMarketsOptions {
  readonly client?: AirroiClient;
  readonly markets?: readonly SeedMarket[];
  readonly numMonths?: number;
  readonly currency?: 'native' | 'usd';
}

export interface IngestAirroiMarketsStats {
  markets_upserted: number;
  market_aggregates_upserted: number;
  errors: string[];
  per_market: Array<{ market: string; rows: number; error?: string }>;
}

function toMinor(value: number | null | undefined, currencyDecimals: number): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** currencyDecimals;
  return Math.round(value * factor);
}

function currencyDecimalsOf(code: string): number {
  // MXN/USD/EUR/CAD/COP/ARS/BRL son 2-decimal. JPY/CLP serían 0, pero
  // esos no están en scope H1 AirROI.
  switch (code.toUpperCase()) {
    case 'JPY':
    case 'CLP':
      return 0;
    default:
      return 2;
  }
}

export async function upsertStrMarket(
  market: SeedMarket,
  activeListingsCount: number | null,
  nativeCurrency: string,
): Promise<string> {
  const supabase = createAdminClient();
  const payload = {
    country_code: market.countryCode,
    airroi_country: market.airroi.country,
    airroi_region: market.airroi.region,
    airroi_locality: market.airroi.locality,
    airroi_district: market.airroi.district ?? null,
    display_name: market.displayName,
    native_currency: nativeCurrency,
    active_listings_count: activeListingsCount,
    last_refreshed_at: new Date().toISOString(),
    meta: {
      priority: market.priority,
      is_sub_market: market.isSubMarket,
      seed_expected_active_listings: market.expectedActiveListings ?? null,
    },
  };

  // Conflict target matches idx_str_markets_airroi_unique.
  const { data, error } = await supabase
    .from('str_markets')
    .upsert(payload, {
      onConflict: 'airroi_country,airroi_region,airroi_locality,airroi_district',
      ignoreDuplicates: false,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(
      `upsertStrMarket failed for ${market.displayName}: ${error?.message ?? 'no id returned'}`,
    );
  }
  return data.id;
}

export async function upsertMarketMetrics(
  marketId: string,
  countryCode: string,
  currency: string,
  metrics: AirroiMetricsResponse,
  runId: string | null,
): Promise<number> {
  if (metrics.results.length === 0) return 0;
  const supabase = createAdminClient();
  const decimals = currencyDecimalsOf(currency);

  const rows = metrics.results.map((period) => ({
    market_id: marketId,
    country_code: countryCode,
    currency,
    period: period.date,
    occupancy_rate: period.occupancy?.avg ?? null,
    adjusted_occupancy_rate: period.occupancy?.p50 ?? null,
    adr_minor: toMinor(period.average_daily_rate?.avg, decimals),
    revpar_minor: toMinor(period.revpar?.avg, decimals),
    adjusted_revpar_minor: toMinor(period.revpar?.p50, decimals),
    revenue_minor: toMinor(period.revenue?.avg, decimals),
    active_listings: null as number | null,
    avg_length_of_stay: period.length_of_stay?.avg ?? null,
    booking_lead_time_days: period.booking_lead_time?.avg ?? null,
    run_id: runId,
    meta: {
      distribution: {
        occupancy: period.occupancy ?? null,
        adr: period.average_daily_rate ?? null,
        revpar: period.revpar ?? null,
        revenue: period.revenue ?? null,
        booking_lead_time: period.booking_lead_time ?? null,
        length_of_stay: period.length_of_stay ?? null,
        min_nights: period.min_nights ?? null,
      },
    } as never,
  }));

  const { error, count } = await supabase
    .from('str_market_monthly_aggregates')
    .upsert(rows, { onConflict: 'market_id,period', count: 'exact' });

  if (error) {
    throw new Error(`upsertMarketMetrics failed: ${error.message}`);
  }
  return count ?? rows.length;
}

export async function runAirroiMarketsIngest(
  ctx: IngestCtx,
  options: IngestAirroiMarketsOptions = {},
): Promise<IngestResult & { rawPayload?: IngestAirroiMarketsStats }> {
  const client =
    options.client ?? createAirroiClient({ runId: ctx.runId, countryCode: ctx.countryCode });
  const markets = options.markets ?? SEED_MARKETS_MX;
  const numMonths = options.numMonths ?? 12;
  const currency = options.currency ?? 'native';

  const stats: IngestAirroiMarketsStats = {
    markets_upserted: 0,
    market_aggregates_upserted: 0,
    errors: [],
    per_market: [],
  };

  // El costo estimado se reporta al orchestrator al final; preCheck per-call
  // lo maneja el client internamente vía airroi-spend-logger.
  let estimatedSpend = 0;

  for (const market of markets) {
    const label = market.displayName;
    try {
      // Resolve native currency via markets/summary (si está ausente en seed).
      const metricsCall = await client.marketMetricsAll(market.airroi, {
        numMonths,
        currency,
      });
      estimatedSpend += 0.5; // cost per metrics/all call (pricing table).
      const metrics = metricsCall.data as AirroiMetricsResponse;

      const nativeCurrency = market.countryCode === 'MX' ? 'MXN' : 'USD';

      const marketId = await upsertStrMarket(market, null, nativeCurrency);
      stats.markets_upserted += 1;

      const rows = await upsertMarketMetrics(
        marketId,
        market.countryCode,
        nativeCurrency,
        metrics,
        ctx.runId,
      );
      stats.market_aggregates_upserted += rows;
      stats.per_market.push({ market: label, rows });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`${label}: ${msg}`);
      stats.per_market.push({ market: label, rows: 0, error: msg });
    }
  }

  return {
    rows_inserted: stats.market_aggregates_upserted,
    rows_updated: 0,
    rows_skipped: 0,
    rows_dlq: 0,
    cost_estimated_usd: estimatedSpend,
    errors: stats.errors,
    meta: {
      markets_upserted: stats.markets_upserted,
      per_market: stats.per_market,
    },
    rawPayload: stats,
  };
}
