import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computePeriodDate, rankIndexScope } from '../06_compute-dmx-indices.ts';

type RankRow = { id: string; value: number };

function makeSelectChain(rows: RankRow[]) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eqShadow = vi.fn(() => ({ order }));
  const eqPeriodType = vi.fn(() => ({ eq: eqShadow }));
  const eqPeriodDate = vi.fn(() => ({ eq: eqPeriodType }));
  const eqCountry = vi.fn(() => ({ eq: eqPeriodDate }));
  const eqIndex = vi.fn(() => ({ eq: eqCountry }));
  const select = vi.fn(() => ({ eq: eqIndex }));
  return { select, order };
}

function makeUpdateChain() {
  const updates: Array<{ patch: Record<string, unknown>; id: string }> = [];
  const eq = vi.fn((_col: string, id: string) => {
    return Promise.resolve({ error: null }).then((r) => {
      const last = updates[updates.length - 1];
      if (last) last.id = id;
      return r;
    });
  });
  const update = vi.fn((patch: Record<string, unknown>) => {
    updates.push({ patch, id: '' });
    return { eq };
  });
  return { update, updates };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('computePeriodDate', () => {
  it('formato YYYY-MM-01 con padding de mes', () => {
    const d = new Date(Date.UTC(2026, 2, 15));
    expect(computePeriodDate(d)).toBe('2026-03-01');
  });

  it('padding mes single-digit', () => {
    const d = new Date(Date.UTC(2026, 0, 31));
    expect(computePeriodDate(d)).toBe('2026-01-01');
  });

  it('diciembre sin overflow', () => {
    const d = new Date(Date.UTC(2025, 11, 1));
    expect(computePeriodDate(d)).toBe('2025-12-01');
  });
});

describe('rankIndexScope — position + percentile', () => {
  it('3 rows → positions 1,2,3 → percentiles 66.67, 33.33, 0', async () => {
    const rows: RankRow[] = [
      { id: 'a', value: 90 },
      { id: 'b', value: 60 },
      { id: 'c', value: 30 },
    ];
    const sel = makeSelectChain(rows);
    const upd = makeUpdateChain();
    const from = vi.fn((table: string) => {
      if (table === 'dmx_indices') {
        return { select: sel.select, update: upd.update };
      }
      throw new Error(`unexpected table ${table}`);
    });
    const supabase = { from } as unknown as SupabaseClient;

    const updated = await rankIndexScope(supabase, 'IPV', '2026-04-01', 'MX', 'monthly');

    expect(updated).toBe(3);
    expect(upd.updates).toHaveLength(3);
    expect(upd.updates[0]?.patch).toEqual({ ranking_in_scope: 1, percentile: 66.67 });
    expect(upd.updates[1]?.patch).toEqual({ ranking_in_scope: 2, percentile: 33.33 });
    expect(upd.updates[2]?.patch).toEqual({ ranking_in_scope: 3, percentile: 0 });
    expect(upd.updates[0]?.id).toBe('a');
    expect(upd.updates[2]?.id).toBe('c');
  });

  it('zero rows devuelve 0 sin update calls', async () => {
    const sel = makeSelectChain([]);
    const upd = makeUpdateChain();
    const from = vi.fn(() => ({ select: sel.select, update: upd.update }));
    const supabase = { from } as unknown as SupabaseClient;

    const updated = await rankIndexScope(supabase, 'IAB', '2026-04-01', 'MX', 'monthly');

    expect(updated).toBe(0);
    expect(upd.update).not.toHaveBeenCalled();
  });

  it('error en select devuelve 0', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const chain = { eq: vi.fn(() => chain), order };
    const select = vi.fn(() => chain);
    const from = vi.fn(() => ({ select }));
    const supabase = { from } as unknown as SupabaseClient;

    const updated = await rankIndexScope(supabase, 'IDS', '2026-04-01', 'MX', 'monthly');
    expect(updated).toBe(0);
  });

  it('percentile de 1 sola row = 0 (position 1 de 1)', async () => {
    const sel = makeSelectChain([{ id: 'solo', value: 77 }]);
    const upd = makeUpdateChain();
    const from = vi.fn(() => ({ select: sel.select, update: upd.update }));
    const supabase = { from } as unknown as SupabaseClient;

    const updated = await rankIndexScope(supabase, 'STA', '2026-04-01', 'MX', 'monthly');
    expect(updated).toBe(1);
    expect(upd.updates[0]?.patch).toEqual({ ranking_in_scope: 1, percentile: 0 });
  });
});
