import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canExecuteCascade,
  estimateCascadeCost,
  getCurrentMonthSpendUsd,
  getMonthlyBudgetUsd,
} from '../cost-guard';

function mockSupabase(rows: Array<{ spent_mtd_usd: number }>): SupabaseClient {
  const from = vi.fn(() => ({
    select: vi.fn(async () => ({ data: rows, error: null })),
  }));
  return { from } as unknown as SupabaseClient;
}

describe('estimateCascadeCost', () => {
  it('20 scores × 1000 zonas × $0.0005 = $10', () => {
    const est = estimateCascadeCost(20, 1000);
    expect(est.estimated_usd).toBe(10);
    expect(est.scores_count).toBe(20);
    expect(est.target_count).toBe(1000);
  });

  it('cost_per_score override respetado', () => {
    const est = estimateCascadeCost(10, 100, 0.01);
    expect(est.estimated_usd).toBe(10);
  });
});

describe('getMonthlyBudgetUsd', () => {
  const originalEnv = process.env.IE_MONTHLY_BUDGET_USD;
  afterEach(() => {
    process.env.IE_MONTHLY_BUDGET_USD = originalEnv;
  });

  it('default 100 si env missing', () => {
    delete process.env.IE_MONTHLY_BUDGET_USD;
    expect(getMonthlyBudgetUsd()).toBe(100);
  });

  it('lee env parseable', () => {
    process.env.IE_MONTHLY_BUDGET_USD = '250';
    expect(getMonthlyBudgetUsd()).toBe(250);
  });

  it('fallback a 100 si env inválido', () => {
    process.env.IE_MONTHLY_BUDGET_USD = 'abc';
    expect(getMonthlyBudgetUsd()).toBe(100);
  });
});

describe('getCurrentMonthSpendUsd', () => {
  it('suma valores spent_mtd_usd', async () => {
    const supabase = mockSupabase([
      { spent_mtd_usd: 5 },
      { spent_mtd_usd: 12 },
      { spent_mtd_usd: 0.5 },
    ]);
    expect(await getCurrentMonthSpendUsd(supabase)).toBe(17.5);
  });

  it('sin filas → 0', async () => {
    const supabase = mockSupabase([]);
    expect(await getCurrentMonthSpendUsd(supabase)).toBe(0);
  });
});

describe('canExecuteCascade', () => {
  beforeEach(() => {
    process.env.IE_MONTHLY_BUDGET_USD = '100';
  });
  afterEach(() => {
    delete process.env.IE_MONTHLY_BUDGET_USD;
  });

  it('cascade dentro del 10% restante → allowed', async () => {
    const supabase = mockSupabase([{ spent_mtd_usd: 10 }]);
    const estimate = estimateCascadeCost(1, 1000); // $0.5
    const result = await canExecuteCascade(supabase, estimate);
    expect(result.allowed).toBe(true);
    expect(result.remaining_usd).toBe(90);
    expect(result.max_allowed_usd).toBe(9);
  });

  it('cascade excede 10% restante → bloqueada + reason', async () => {
    const supabase = mockSupabase([{ spent_mtd_usd: 10 }]);
    // 20 scores × 5000 × $0.0005 = $50 > $9 (10% de 90 remaining)
    const estimate = estimateCascadeCost(20, 5000);
    const result = await canExecuteCascade(supabase, estimate);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('cascade_exceeds_budget');
  });

  it('budget totalmente gastado → max_allowed_usd = 0 → cualquier estimate > 0 bloquea', async () => {
    const supabase = mockSupabase([{ spent_mtd_usd: 100 }]);
    const estimate = estimateCascadeCost(1, 1);
    const result = await canExecuteCascade(supabase, estimate);
    expect(result.allowed).toBe(false);
    expect(result.remaining_usd).toBe(0);
  });
});
