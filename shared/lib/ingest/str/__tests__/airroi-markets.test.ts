import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpsert =
  vi.fn<(args: unknown) => Promise<{ data: unknown; error: unknown; count?: number }>>();
const mockFrom = vi.fn((_table: string) => ({
  upsert: (payload: unknown, opts: unknown) => mockUpsert({ payload, opts }),
}));

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock('../airroi-spend-logger', () => ({
  preCheckAirroiEndpoint: async () => undefined,
  logAirroiCall: async () => undefined,
}));

// biome-ignore lint/correctness/noUnusedImports: dynamic import after mock.
import type { AirroiClient } from '../airroi-client';
import type { AirroiMetricsResponse } from '../airroi-markets';
import { runAirroiMarketsIngest } from '../airroi-markets';
import { SEED_MARKETS_MX } from '../airroi-markets-seed';

describe('runAirroiMarketsIngest', () => {
  beforeEach(() => {
    mockUpsert.mockReset();
    mockFrom.mockClear();
  });

  function makeClient(responses: AirroiMetricsResponse[]): AirroiClient {
    let idx = 0;
    return {
      async marketMetricsAll() {
        const next = responses[idx++] ?? responses[0];
        return {
          data: next,
          requestId: 'req-test',
          httpStatus: 200,
          durationMs: 1,
        };
      },
    } as unknown as AirroiClient;
  }

  it('upsertea markets y aggregates por cada market del seed', async () => {
    // primero str_markets.upsert (returns {data:{id:'uuid-x'},error:null} via chained select).
    // segundo str_market_monthly_aggregates.upsert (returns {count: N, error: null}).
    let callIdx = 0;
    mockUpsert.mockImplementation(async () => {
      const current = callIdx++;
      // impar: markets (single) → mock chain expects .select('id').single()
      // Por simplicidad test: str_markets upsert returns success via select/single que simulamos
      // con un objeto que tiene .select().single() chainable.
      if (current % 2 === 0) {
        return {
          data: { id: `uuid-${current}` },
          error: null,
        };
      }
      return { data: null, error: null, count: 3 };
    });

    // Pero el código real hace: .upsert(...).select('id').single() → chain diferente.
    // Para mantener el test realista, sobreescribo mockFrom con chain correcto.
    mockFrom.mockImplementation((table: string) => {
      if (table === 'str_markets') {
        return {
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'market-uuid' }, error: null }),
            }),
          }),
        } as unknown as ReturnType<typeof mockFrom>;
      }
      return {
        upsert: async () => ({ data: null, error: null, count: 3 }),
      } as unknown as ReturnType<typeof mockFrom>;
    });

    const metrics: AirroiMetricsResponse = {
      market: {
        country: 'Mexico',
        region: 'Ciudad de México',
        locality: 'Mexico City',
        district: 'Roma Sur',
      },
      results: [
        {
          date: '2026-01-01',
          occupancy: { avg: 0.51, p25: 0.26, p50: 0.52, p75: 0.74, p90: 0.88 },
          average_daily_rate: { avg: 2007.5, p25: 881.6, p50: 1489.5, p75: 2409.3, p90: 3691.1 },
          revpar: { avg: 1075.2, p25: 336.6, p50: 681.3, p75: 1272.3, p90: 2370.3 },
          revenue: { avg: 33330.2, p25: 10433.2, p50: 21115.3, p75: 39443.6, p90: 73472.4 },
          booking_lead_time: { avg: 32.7, p25: 5, p50: 21, p75: 45, p90: 78 },
          length_of_stay: { avg: 6.3, p25: 3, p50: 4, p75: 7, p90: 12 },
          min_nights: { avg: 3.4, p25: 1, p50: 2, p75: 3, p90: 4 },
        },
        {
          date: '2026-02-01',
          occupancy: { avg: 0.55, p25: 0.3, p50: 0.55, p75: 0.78, p90: 0.9 },
          average_daily_rate: { avg: 2100, p25: 900, p50: 1500, p75: 2400, p90: 3700 },
          revpar: { avg: 1155, p25: 350, p50: 700, p75: 1300, p90: 2400 },
          revenue: { avg: 35000, p25: 11000, p50: 22000, p75: 40000, p90: 75000 },
          booking_lead_time: { avg: 30, p25: 5, p50: 20, p75: 45, p90: 78 },
          length_of_stay: { avg: 6.1, p25: 3, p50: 4, p75: 7, p90: 12 },
          min_nights: { avg: 3.2, p25: 1, p50: 2, p75: 3, p90: 4 },
        },
      ],
    };

    const client = makeClient([metrics]);
    const ctx = {
      runId: 'run-test',
      source: 'airroi',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };

    const result = await runAirroiMarketsIngest(ctx, {
      client,
      markets: SEED_MARKETS_MX.slice(0, 2), // CDMX + Roma Norte
      numMonths: 2,
    });

    expect(result.errors).toEqual([]);
    expect(result.cost_estimated_usd).toBe(1); // 2 markets × $0.50
    expect(result.rows_inserted).toBe(6); // count=3 per call, 2 markets
    const meta = result.meta as { markets_upserted: number };
    expect(meta.markets_upserted).toBe(2);
  });

  it('convierte avg floats MXN a minor units (centavos)', async () => {
    const capturedAggregates: Array<{ payload: unknown; opts: unknown }> = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'str_markets') {
        return {
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'market-uuid' }, error: null }),
            }),
          }),
        } as unknown as ReturnType<typeof mockFrom>;
      }
      return {
        upsert: (payload: unknown, opts: unknown) => {
          capturedAggregates.push({ payload, opts });
          return Promise.resolve({ data: null, error: null, count: 1 });
        },
      } as unknown as ReturnType<typeof mockFrom>;
    });

    const client = makeClient([
      {
        market: {
          country: 'Mexico',
          region: 'Ciudad de México',
          locality: 'Mexico City',
          district: 'Roma Sur',
        },
        results: [
          {
            date: '2026-03-01',
            occupancy: { avg: 0.5, p25: 0, p50: 0, p75: 0, p90: 0 },
            average_daily_rate: { avg: 2058.7, p25: 0, p50: 0, p75: 0, p90: 0 },
            revpar: { avg: 1064.1, p25: 0, p50: 0, p75: 0, p90: 0 },
            revenue: { avg: 268070, p25: 0, p50: 0, p75: 0, p90: 0 },
          },
        ],
      },
    ]);

    const ctx = {
      runId: 'r',
      source: 'airroi',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await runAirroiMarketsIngest(ctx, {
      client,
      markets: SEED_MARKETS_MX.slice(0, 1),
      numMonths: 1,
    });

    const row = (capturedAggregates[0]?.payload as Array<Record<string, unknown>>)[0];
    expect(row).toBeDefined();
    expect(row?.adr_minor).toBe(205870); // 2058.7 × 100 = 205870 centavos MXN
    expect(row?.revpar_minor).toBe(106410);
    expect(row?.revenue_minor).toBe(26807000);
    expect(row?.occupancy_rate).toBe(0.5);
  });

  it('captura error per-market sin abortar el run completo', async () => {
    let callCount = 0;
    const metrics: AirroiMetricsResponse = {
      market: { country: 'Mexico', region: 'Ciudad de México', locality: 'Mexico City' },
      results: [],
    };
    const client = {
      async marketMetricsAll() {
        callCount++;
        if (callCount === 1) throw new Error('AirROI HTTP 500');
        return { data: metrics, requestId: 'r', httpStatus: 200, durationMs: 1 };
      },
    } as unknown as AirroiClient;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'str_markets') {
        return {
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'm' }, error: null }),
            }),
          }),
        } as unknown as ReturnType<typeof mockFrom>;
      }
      return {
        upsert: async () => ({ data: null, error: null, count: 0 }),
      } as unknown as ReturnType<typeof mockFrom>;
    });

    const ctx = {
      runId: 'r',
      source: 'airroi',
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };

    const result = await runAirroiMarketsIngest(ctx, {
      client,
      markets: SEED_MARKETS_MX.slice(0, 2),
      numMonths: 1,
    });

    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('AirROI HTTP 500');
    const meta = result.meta as { per_market: Array<{ market: string; error?: string }> };
    expect(meta.per_market.filter((m) => m.error).length).toBe(1);
  });
});
