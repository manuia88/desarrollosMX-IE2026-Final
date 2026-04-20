import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import h09, {
  computeH09Commute,
  fetchMapboxRoute,
  getLabelKey,
  methodology,
  version,
} from '../h09-commute-time';

vi.mock('@/shared/lib/ingest/cost-tracker', () => ({
  recordSpend: vi.fn(async () => undefined),
  preCheckBudget: vi.fn(async () => undefined),
}));

describe('H09 Commute Time calculator', () => {
  it('declara methodology Mapbox + validity 7d + pricing 0.005', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('mapbox_directions');
    expect(methodology.validity.value).toBe(7);
    expect(methodology.pricing_usd_per_request).toBe(0.005);
  });

  it('getLabelKey mapea umbrales', () => {
    expect(getLabelKey(85, 'high')).toBe('ie.score.h09.excelente');
    expect(getLabelKey(65, 'high')).toBe('ie.score.h09.bueno');
    expect(getLabelKey(45, 'high')).toBe('ie.score.h09.moderado');
    expect(getLabelKey(20, 'high')).toBe('ie.score.h09.extenso');
    expect(getLabelKey(50, 'insufficient_data')).toBe('ie.score.h09.insufficient');
  });

  it('computeH09Commute — 10min=100, 30min≈76, 60min≈40, 90min≈4', () => {
    expect(
      computeH09Commute({
        minutos_auto: 10,
        distancia_km: 5,
        destino_lat: 19.43,
        destino_lng: -99.2,
        profile: 'driving-traffic',
      }).value,
    ).toBe(100);
    expect(
      computeH09Commute({
        minutos_auto: 30,
        distancia_km: 15,
        destino_lat: 19.43,
        destino_lng: -99.2,
        profile: 'driving-traffic',
      }).value,
    ).toBeCloseTo(76, 0);
    expect(
      computeH09Commute({
        minutos_auto: 60,
        distancia_km: 20,
        destino_lat: 19.43,
        destino_lng: -99.2,
        profile: 'driving-traffic',
      }).value,
    ).toBeCloseTo(40, 0);
    expect(
      computeH09Commute({
        minutos_auto: 90,
        distancia_km: 25,
        destino_lat: 19.43,
        destino_lng: -99.2,
        profile: 'driving-traffic',
      }).value,
    ).toBeLessThan(10);
  });

  it('fetchMapboxRoute — parsea respuesta Mapbox correctamente', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [{ duration: 1800, distance: 12000 }], // 30min, 12km
      }),
    }) as unknown as typeof fetch;
    const route = await fetchMapboxRoute(
      19.3854,
      -99.1683,
      19.4336,
      -99.1981,
      'driving-traffic',
      'test-token',
      mockFetcher,
    );
    expect(route.minutos_auto).toBe(30);
    expect(route.distancia_km).toBe(12);
    const call = (mockFetcher as unknown as { mock: { calls: [string][] } }).mock.calls[0]?.[0];
    expect(call).toContain('driving-traffic');
    expect(call).toContain('test-token');
  });

  it('fetchMapboxRoute — throws en error HTTP', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as unknown as typeof fetch;
    await expect(
      fetchMapboxRoute(19.38, -99.17, 19.43, -99.2, 'driving-traffic', 'bad', mockFetcher),
    ).rejects.toThrow(/401/);
  });

  it('fetchMapboxRoute — throws si no hay routes', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [] }),
    }) as unknown as typeof fetch;
    await expect(
      fetchMapboxRoute(19.38, -99.17, 19.43, -99.2, 'driving-traffic', 'x', mockFetcher),
    ).rejects.toThrow(/no routes/);
  });

  describe('h09.run() on-demand', () => {
    beforeEach(() => {
      process.env.MAPBOX_SECRET_TOKEN = 'test-token-env';
    });
    afterEach(() => {
      delete process.env.MAPBOX_SECRET_TOKEN;
    });

    function fakeSupabaseWithNoCache(): SupabaseClient {
      return {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [] }),
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;
    }

    function fakeSupabaseWithCache(valid_until: string, score_value: number): SupabaseClient {
      return {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () =>
                    Promise.resolve({
                      data: [
                        {
                          score_value,
                          valid_until,
                          computed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                          components: {
                            destino_lat: 19.4336,
                            destino_lng: -99.1981,
                            minutos_auto: 35,
                            minutos_transporte: null,
                            distancia_km: 10,
                            profile: 'driving-traffic',
                          },
                        },
                      ],
                    }),
                }),
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;
    }

    it('sin params destino → insufficient_data', async () => {
      const sb = fakeSupabaseWithNoCache();
      const out = await h09.run(
        { zoneId: 'zone-1', countryCode: 'MX', periodDate: '2026-04-19' },
        sb,
      );
      expect(out.confidence).toBe('insufficient_data');
    });

    it('cache hit → retorna score cacheado sin llamar Mapbox', async () => {
      const validUntil = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const sb = fakeSupabaseWithCache(validUntil, 72);
      const mockFetcher = vi.fn() as unknown as typeof fetch;
      const out = await h09.run(
        {
          zoneId: 'zone-1',
          countryCode: 'MX',
          periodDate: '2026-04-19',
          params: {
            origin_lat: 19.38,
            origin_lng: -99.17,
            destino_lat: 19.4336,
            destino_lng: -99.1981,
            fetcher: mockFetcher,
          },
        },
        sb,
      );
      expect(out.score_value).toBe(72);
      expect((out.components as { cache_hit: boolean }).cache_hit).toBe(true);
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it('cache miss → llama Mapbox + trackExternalCost + valid_until 7d', async () => {
      const sb = fakeSupabaseWithNoCache();
      const mockFetcher = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [{ duration: 2100, distance: 11000 }] }), // 35min, 11km
      }) as unknown as typeof fetch;
      const costTracker = (await import('@/shared/lib/ingest/cost-tracker')) as unknown as {
        recordSpend: ReturnType<typeof vi.fn>;
      };
      costTracker.recordSpend.mockClear();

      const out = await h09.run(
        {
          zoneId: 'zone-1',
          countryCode: 'MX',
          periodDate: '2026-04-19',
          params: {
            origin_lat: 19.38,
            origin_lng: -99.17,
            destino_lat: 19.4336,
            destino_lng: -99.1981,
            fetcher: mockFetcher,
          },
        },
        sb,
      );
      expect(mockFetcher).toHaveBeenCalledOnce();
      expect(costTracker.recordSpend).toHaveBeenCalledWith('mapbox', 0.005);
      expect((out.components as { cache_hit: boolean }).cache_hit).toBe(false);
      expect(out.valid_until).toBeDefined();
      // 35min ≈ score 70
      expect(out.score_value).toBeGreaterThan(60);
      expect(out.score_value).toBeLessThan(80);
    });
  });
});
