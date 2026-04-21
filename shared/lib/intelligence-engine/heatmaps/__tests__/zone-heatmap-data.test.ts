import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearHeatmapCacheForTesting, getHeatmapData } from '../zone-heatmap-data';

type HeatmapMockRow = {
  readonly score_id: string;
  readonly zone_id: string;
  readonly country_code: string;
  readonly value: number;
  readonly confidence: string;
  readonly period_date: string;
};

function mockSupabase(rows: HeatmapMockRow[] | null): SupabaseClient {
  const terminal = async () => ({
    data: rows,
    error: rows ? null : new Error('boom'),
  });
  const eq2 = { eq: vi.fn(terminal) };
  const eq1 = { eq: vi.fn(() => eq2) };
  const builder = { select: vi.fn(() => eq1) };
  const from = vi.fn(() => builder);
  return { from } as unknown as SupabaseClient;
}

afterEach(() => {
  clearHeatmapCacheForTesting();
});

describe('getHeatmapData', () => {
  it('retorna puntos válidos del MV', async () => {
    const rows: HeatmapMockRow[] = [
      {
        score_id: 'F08',
        zone_id: 'z1',
        country_code: 'MX',
        value: 85,
        confidence: 'high',
        period_date: '2026-04-20',
      },
      {
        score_id: 'F08',
        zone_id: 'z2',
        country_code: 'MX',
        value: 72,
        confidence: 'medium',
        period_date: '2026-04-20',
      },
    ];
    const supabase = mockSupabase(rows);
    const result = await getHeatmapData(supabase, { score_id: 'F08', country_code: 'MX' });
    expect(result).toHaveLength(2);
    expect(result[0]?.score_id).toBe('F08');
    expect(result[0]?.value).toBe(85);
  });

  it('filtra rows con campos inválidos', async () => {
    const rows = [
      {
        score_id: 'F08',
        zone_id: 'z1',
        country_code: 'MX',
        value: 85,
        confidence: 'high',
        period_date: '2026-04-20',
      },
      {
        score_id: 'F08',
        country_code: 'MX',
        value: 85,
        confidence: 'high',
        period_date: '2026-04-20',
      } as unknown as HeatmapMockRow,
    ];
    const supabase = mockSupabase(rows);
    const result = await getHeatmapData(supabase, { score_id: 'F08', country_code: 'MX' });
    expect(result).toHaveLength(1);
  });

  it('retorna array vacío si query falla', async () => {
    const supabase = mockSupabase(null);
    const result = await getHeatmapData(supabase, { score_id: 'F08', country_code: 'MX' });
    expect(result).toEqual([]);
  });
});
