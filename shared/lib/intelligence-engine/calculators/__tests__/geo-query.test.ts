import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearCache } from '@/shared/lib/runtime-cache';
import { fetchGeoDataPointsCached } from '../helpers/geo-query';

function mockSupabase(rows: unknown[]) {
  const select = vi.fn(() => ({
    eq: vi.fn(() => ({
      gte: vi.fn(() => ({
        lte: vi.fn(async () => ({ data: rows, error: null })),
      })),
    })),
  }));
  const from = vi.fn(() => ({ select }));
  return {
    client: { from } as unknown as SupabaseClient,
    from,
  };
}

afterEach(() => {
  clearCache();
});

describe('fetchGeoDataPointsCached (U8)', () => {
  it('primera llamada hace query a BD; segunda es cache hit', async () => {
    const { client, from } = mockSupabase([
      {
        id: '1',
        source: 'fgj',
        source_id: 'carpeta-1',
        period_date: '2026-04-01',
        metadata: {},
        latitude: 19.4,
        longitude: -99.1,
      },
    ]);
    const args = {
      source: 'fgj',
      zoneId: 'cdmx-del-valle',
      periodStart: '2025-04-01',
      periodEnd: '2026-04-01',
      radiusKm: 1.5,
    };
    const rows1 = await fetchGeoDataPointsCached(client, args);
    const rows2 = await fetchGeoDataPointsCached(client, args);
    expect(rows1).toHaveLength(1);
    expect(rows2).toHaveLength(1);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it('distintos zoneId generan distintas cache entries', async () => {
    const { client, from } = mockSupabase([]);
    await fetchGeoDataPointsCached(client, {
      source: 'fgj',
      zoneId: 'A',
      periodStart: '2026-01-01',
      periodEnd: '2026-04-01',
      radiusKm: 1.5,
    });
    await fetchGeoDataPointsCached(client, {
      source: 'fgj',
      zoneId: 'B',
      periodStart: '2026-01-01',
      periodEnd: '2026-04-01',
      radiusKm: 1.5,
    });
    expect(from).toHaveBeenCalledTimes(2);
  });
});
