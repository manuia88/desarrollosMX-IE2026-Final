import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { computeComparableZones } from '../persist';

type MockRow = { zone_id: string; score_value: number };

function mockSupabase(rows: MockRow[] | null, error: { message: string } | null = null) {
  return {
    from(_table: string) {
      return {
        select(_q: string) {
          const query = {
            _score_type: '',
            _period_date: '',
            _exclude_zone_id: '',
            eq(col: string, val: string) {
              if (col === 'score_type') query._score_type = val;
              if (col === 'period_date') query._period_date = val;
              return query;
            },
            neq(col: string, val: string) {
              if (col === 'zone_id') query._exclude_zone_id = val;
              const filtered = rows?.filter((r) => r.zone_id !== val) ?? null;
              return Promise.resolve({ data: filtered, error });
            },
          };
          return query;
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe('computeComparableZones — U13', () => {
  it('devuelve [] si <3 zonas en data', async () => {
    const supabase = mockSupabase([
      { zone_id: 'zone-b', score_value: 70 },
      { zone_id: 'zone-c', score_value: 60 },
    ]);
    const result = await computeComparableZones(supabase, 'F01', '2026-04-01', 'zone-a', 75);
    expect(result).toEqual([]);
  });

  it('devuelve top 3 ordenadas por delta ASC', async () => {
    const supabase = mockSupabase([
      { zone_id: 'zone-b', score_value: 70 }, // delta 5
      { zone_id: 'zone-c', score_value: 60 }, // delta 15
      { zone_id: 'zone-d', score_value: 80 }, // delta 5
      { zone_id: 'zone-e', score_value: 40 }, // delta 35
      { zone_id: 'zone-f', score_value: 73 }, // delta 2 — más cercana
    ]);
    const result = await computeComparableZones(supabase, 'F01', '2026-04-01', 'zone-a', 75);
    expect(result).toHaveLength(3);
    expect(result[0]?.zone_id).toBe('zone-f');
    expect(result[0]?.delta).toBe(2);
    expect(result[1]?.delta).toBe(5);
    expect(result[2]?.delta).toBe(5);
  });

  it('excluye la propia zona (neq zone_id)', async () => {
    const supabase = mockSupabase([
      { zone_id: 'zone-a', score_value: 80 }, // self
      { zone_id: 'zone-b', score_value: 70 },
      { zone_id: 'zone-c', score_value: 60 },
      { zone_id: 'zone-d', score_value: 50 },
    ]);
    const result = await computeComparableZones(supabase, 'F01', '2026-04-01', 'zone-a', 75);
    expect(result.every((r) => r.zone_id !== 'zone-a')).toBe(true);
  });

  it('error → [] (graceful)', async () => {
    const supabase = mockSupabase(null, { message: 'db down' });
    const result = await computeComparableZones(supabase, 'F01', '2026-04-01', 'zone-a', 75);
    expect(result).toEqual([]);
  });

  it('filtra valores no-finitos', async () => {
    const supabase = mockSupabase([
      { zone_id: 'zone-b', score_value: 70 },
      { zone_id: 'zone-c', score_value: Number.NaN },
      { zone_id: 'zone-d', score_value: 80 },
      { zone_id: 'zone-e', score_value: 65 },
    ]);
    const result = await computeComparableZones(supabase, 'F01', '2026-04-01', 'zone-a', 75);
    expect(result.every((r) => Number.isFinite(r.value))).toBe(true);
    expect(result).toHaveLength(3);
  });
});
