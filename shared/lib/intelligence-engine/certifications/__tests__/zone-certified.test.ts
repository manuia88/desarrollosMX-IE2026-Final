import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { evaluateZoneCertification } from '../zone-certified';

interface MockRow {
  readonly score_value?: number;
  readonly period_date?: string;
  readonly stability_index?: number | null;
}

function mockSupabase(opts: { e01History?: MockRow[]; n11Row?: MockRow[] }): SupabaseClient {
  const from = vi.fn((table: string) => {
    if (table === 'score_history') {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        gte: vi.fn(() => builder),
        order: vi.fn(async () => ({ data: opts.e01History ?? [], error: null })),
      };
      return builder;
    }
    if (table === 'zone_scores') {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(async () => ({ data: opts.n11Row ?? [], error: null })),
      };
      return builder;
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { from } as unknown as SupabaseClient;
}

describe('evaluateZoneCertification', () => {
  it('zona con E01 ≥ 90 x 12m consecutive + stability ≥ 0.85 → qualifies', async () => {
    const twelveMonthsE01 = Array.from({ length: 12 }, () => ({ score_value: 92 }));
    const supabase = mockSupabase({
      e01History: twelveMonthsE01,
      n11Row: [{ stability_index: 0.88 }],
    });
    const result = await evaluateZoneCertification(supabase, 'zone-1', 'MX');
    expect(result.qualifies).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.criteria.e01_months_above_90).toBe(12);
    expect(result.criteria.n11_stability_12m).toBe(0.88);
  });

  it('zona con solo 11m E01 ≥ 90 → no qualifies', async () => {
    const elevenMonths = Array.from({ length: 11 }, () => ({ score_value: 92 }));
    const supabase = mockSupabase({
      e01History: [...elevenMonths, { score_value: 85 }],
      n11Row: [{ stability_index: 0.9 }],
    });
    const result = await evaluateZoneCertification(supabase, 'zone-2', 'MX');
    expect(result.qualifies).toBe(false);
    expect(result.reasons.some((r) => r.includes('E01 insuficiente'))).toBe(true);
  });

  it('zona con E01 ok pero stability baja → no qualifies', async () => {
    const twelveMonths = Array.from({ length: 12 }, () => ({ score_value: 95 }));
    const supabase = mockSupabase({
      e01History: twelveMonths,
      n11Row: [{ stability_index: 0.7 }],
    });
    const result = await evaluateZoneCertification(supabase, 'zone-3', 'MX');
    expect(result.qualifies).toBe(false);
    expect(result.reasons.some((r) => r.includes('stability'))).toBe(true);
  });

  it('zona sin history → no qualifies con reasons múltiples', async () => {
    const supabase = mockSupabase({ e01History: [], n11Row: [] });
    const result = await evaluateZoneCertification(supabase, 'zone-empty', 'MX');
    expect(result.qualifies).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    expect(result.criteria.e01_avg_12m).toBeNull();
    expect(result.criteria.n11_stability_12m).toBeNull();
  });
});
