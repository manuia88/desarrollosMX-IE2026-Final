import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { triggerGeoDataUpdatedCascade } from '../geo-data-updated';
import { triggerMacroUpdatedCascade } from '../macro-updated';

function mockRpcSuccess(): SupabaseClient {
  const rpc = vi.fn(async () => ({ data: { enqueued: true, id: 'q-1' }, error: null }));
  return { rpc } as unknown as SupabaseClient;
}

describe('triggerGeoDataUpdatedCascade', () => {
  it('fgj → enqueue F01, N04, N09 (3 jobs)', async () => {
    const supabase = mockRpcSuccess();
    const result = await triggerGeoDataUpdatedCascade(supabase, {
      source: 'fgj',
      zoneId: '11111111-1111-1111-1111-111111111111',
      countryCode: 'MX',
    });
    expect(result.scoresEnqueued).toEqual(['F01', 'N04', 'N09']);
    expect(result.failed).toEqual([]);
  });

  it('source unknown → no-op', async () => {
    const supabase = mockRpcSuccess();
    const result = await triggerGeoDataUpdatedCascade(supabase, {
      source: 'nonexistent',
      zoneId: '11111111-1111-1111-1111-111111111111',
      countryCode: 'MX',
    });
    expect(result.scoresEnqueued).toEqual([]);
  });

  it('denue enqueue multiple scores', async () => {
    const supabase = mockRpcSuccess();
    const result = await triggerGeoDataUpdatedCascade(supabase, {
      source: 'denue',
      zoneId: '11111111-1111-1111-1111-111111111111',
      countryCode: 'MX',
    });
    expect(result.scoresEnqueued.length).toBeGreaterThanOrEqual(5);
    expect(result.scoresEnqueued).toContain('F03');
    expect(result.scoresEnqueued).toContain('N01');
  });
});

describe('triggerMacroUpdatedCascade', () => {
  it('N zonas × 8 scores = totalEnqueued', async () => {
    const supabase = mockRpcSuccess();
    const result = await triggerMacroUpdatedCascade(supabase, {
      countryCode: 'MX',
      zoneIds: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
    });
    expect(result.scoresPerZone).toBe(8);
    expect(result.totalEnqueued).toBe(16);
  });
});
