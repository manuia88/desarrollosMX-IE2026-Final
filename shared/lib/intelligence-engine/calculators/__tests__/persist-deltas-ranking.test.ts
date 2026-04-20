import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { computeDeltas, computeRanking } from '../persist';

// ============================================================
// Mock supabase chainable para score_history lookback queries (D2).
// ============================================================
type HistoryRow = { score_value: number; period_date: string };

function mockHistorySupabase(rows: HistoryRow[]) {
  return {
    from(_table: string) {
      const q = {
        _entity_type: '',
        _entity_id: '',
        _score_type: '',
        _gte: '',
        _lte: '',
        select(_c: string) {
          return q;
        },
        eq(col: string, val: string) {
          if (col === 'entity_type') q._entity_type = val;
          if (col === 'entity_id') q._entity_id = val;
          if (col === 'score_type') q._score_type = val;
          return q;
        },
        gte(_col: string, val: string) {
          q._gte = val;
          return q;
        },
        lte(_col: string, val: string) {
          q._lte = val;
          return q;
        },
        order(_c: string, _o: unknown) {
          return q;
        },
        limit(_n: number) {
          const filtered = rows.filter((r) => r.period_date >= q._gte && r.period_date <= q._lte);
          return Promise.resolve({ data: filtered.slice(0, _n), error: null });
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

describe('computeDeltas — D2 lookback 3m/6m/12m', () => {
  it('computa deltas vs score_history ±15d lookback', async () => {
    const rows: HistoryRow[] = [
      { score_value: 70, period_date: '2026-01-15' }, // ~3m antes de 2026-04-15
      { score_value: 65, period_date: '2025-10-15' }, // ~6m antes
      { score_value: 60, period_date: '2025-04-15' }, // 12m antes
    ];
    const supabase = mockHistorySupabase(rows);
    const deltas = await computeDeltas(supabase, 'zone', 'zone-a', 'N01', '2026-04-15', 75);
    expect(deltas['3m']).toBe(5); // 75 - 70
    expect(deltas['6m']).toBe(10); // 75 - 65
    expect(deltas['12m']).toBe(15); // 75 - 60
  });

  it('retorna null si no hay data en ventana', async () => {
    const supabase = mockHistorySupabase([]);
    const deltas = await computeDeltas(supabase, 'zone', 'zone-a', 'N01', '2026-04-15', 75);
    expect(deltas['3m']).toBeNull();
    expect(deltas['6m']).toBeNull();
    expect(deltas['12m']).toBeNull();
  });

  it('delta negativo si el score bajó', async () => {
    const rows: HistoryRow[] = [{ score_value: 85, period_date: '2026-01-15' }];
    const supabase = mockHistorySupabase(rows);
    const deltas = await computeDeltas(supabase, 'zone', 'zone-a', 'N01', '2026-04-15', 70);
    expect(deltas['3m']).toBe(-15);
    expect(deltas['6m']).toBeNull();
    expect(deltas['12m']).toBeNull();
  });

  it('devuelve null gracefully si score_value no es número', async () => {
    const rows: HistoryRow[] = [
      { score_value: Number.NaN as unknown as number, period_date: '2026-01-15' },
    ];
    const supabase = mockHistorySupabase(rows);
    const deltas = await computeDeltas(supabase, 'zone', 'zone-a', 'N01', '2026-04-15', 70);
    expect(deltas['3m']).toBeNull();
  });
});

// ============================================================
// Mock supabase para ranking queries (D3) — total via no-filter, higher via .gt.
// El builder base (SELECT eq eq eq) es awaitable devolviendo totalCount. La
// rama .gt devuelve higherCount (query distinta que filtra value > currentValue).
// ============================================================
function mockRankingSupabase(totalCount: number, higherCount: number, errorMsg?: string) {
  function makeTotalPromise() {
    return Promise.resolve({
      data: [],
      count: errorMsg ? null : totalCount,
      error: errorMsg ? { message: errorMsg } : null,
    });
  }
  return {
    from(_table: string) {
      const q = {
        select(_c: string, _opts?: { count?: string; head?: boolean }) {
          return q;
        },
        eq(_c: string, _v: string) {
          return q;
        },
        gt(_c: string, _v: number) {
          return Promise.resolve({
            data: [],
            count: errorMsg ? null : higherCount,
            error: errorMsg ? { message: errorMsg } : null,
          });
        },
        // biome-ignore lint/suspicious/noThenProperty: emulating Supabase PostgrestBuilder thenable.
        then(onfulfilled: (res: unknown) => unknown, onrejected?: (reason: unknown) => unknown) {
          return makeTotalPromise().then(onfulfilled, onrejected);
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

describe('computeRanking — D3 position vs país', () => {
  it('computa position + total + percentile', async () => {
    // 1799 existentes, 11 con value mayor → position 12 de 1800 total.
    const supabase = mockRankingSupabase(1799, 11);
    const ranking = await computeRanking(supabase, 'zone_scores', 'N08', '2026-04-01', 'MX', 88);
    expect(ranking).toMatchObject({ position: 12, total: 1800 });
    if ('percentile' in ranking) {
      expect(ranking.percentile).toBeCloseTo(((1800 - 12) / 1800) * 100, 1);
    }
  });

  it('retorna {} si error en query', async () => {
    const supabase = mockRankingSupabase(0, 0, 'db down');
    const ranking = await computeRanking(supabase, 'zone_scores', 'N08', '2026-04-01', 'MX', 88);
    expect(ranking).toEqual({});
  });

  it('retorna {} si total <= 1 (sin ranking significativo)', async () => {
    const supabase = mockRankingSupabase(0, 0);
    const ranking = await computeRanking(supabase, 'zone_scores', 'N08', '2026-04-01', 'MX', 88);
    expect(ranking).toEqual({});
  });

  it('percentile 0 si es la zona peor posicionada', async () => {
    // 99 existentes, 99 con value mayor → position 100 de 100 → percentile 0.
    const supabase = mockRankingSupabase(99, 99);
    const ranking = await computeRanking(supabase, 'zone_scores', 'N08', '2026-04-01', 'MX', 30);
    expect(ranking).toMatchObject({ position: 100, total: 100 });
    if ('percentile' in ranking) {
      expect(ranking.percentile).toBe(0);
    }
  });

  it('percentile 99+ si es la zona mejor posicionada', async () => {
    // 99 existentes, 0 con value mayor → position 1 de 100 → percentile 99.
    const supabase = mockRankingSupabase(99, 0);
    const ranking = await computeRanking(supabase, 'zone_scores', 'N08', '2026-04-01', 'MX', 99);
    expect(ranking).toMatchObject({ position: 1, total: 100 });
    if ('percentile' in ranking) {
      expect(ranking.percentile).toBeCloseTo(99, 0);
    }
  });
});
