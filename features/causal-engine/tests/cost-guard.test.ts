import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import { CAUSAL_DAILY_BUDGET_USD, checkDailyCostLimit } from '../lib/cost-guard';

interface FakeResponse {
  readonly count: number | null;
  readonly error: { message: string } | null;
}

function makeFakeSupabase(response: FakeResponse): SupabaseClient<Database> {
  const gte = vi.fn().mockResolvedValue(response);
  const select = vi.fn().mockReturnValue({ gte });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as SupabaseClient<Database>;
}

describe('checkDailyCostLimit', () => {
  it('returns allowed=true when row count is below the budget/avg ratio', async () => {
    const supabase = makeFakeSupabase({ count: 5, error: null });
    const result = await checkDailyCostLimit({ supabase });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.currentSpendUsd).toBe(0.05);
    expect(result.budgetUsd).toBe(CAUSAL_DAILY_BUDGET_USD);
  });

  it('returns allowed=false with daily_budget_exceeded when spend meets the budget', async () => {
    // With default avg $0.01 per generation, 1000 rows reach the $10 budget.
    const supabase = makeFakeSupabase({ count: 1000, error: null });
    const result = await checkDailyCostLimit({ supabase });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('daily_budget_exceeded');
    expect(result.currentSpendUsd).toBe(10);
    expect(result.budgetUsd).toBe(CAUSAL_DAILY_BUDGET_USD);
  });

  it('returns allowed=true with cost_check_skipped prefix when supabase returns an error', async () => {
    const supabase = makeFakeSupabase({ count: null, error: { message: 'db unreachable' } });
    const result = await checkDailyCostLimit({ supabase });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('cost_check_skipped:db unreachable');
    expect(result.currentSpendUsd).toBe(0);
  });

  it('respects the budgetUsd override', async () => {
    // 5 rows * 0.01 = $0.05; with an override budget of $0.01 we must block.
    const supabase = makeFakeSupabase({ count: 5, error: null });
    const result = await checkDailyCostLimit({ supabase, budgetUsd: 0.01 });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('daily_budget_exceeded');
    expect(result.budgetUsd).toBe(0.01);
    expect(result.currentSpendUsd).toBe(0.05);
  });

  it('respects the averageCostUsdPerGeneration override', async () => {
    // 10 rows * 1.0 = $10 budget exactly → must block.
    const supabase = makeFakeSupabase({ count: 10, error: null });
    const result = await checkDailyCostLimit({
      supabase,
      averageCostUsdPerGeneration: 1.0,
    });

    expect(result.allowed).toBe(false);
    expect(result.currentSpendUsd).toBe(10);
  });

  it('queries causal_explanations scoped from UTC start-of-day', async () => {
    const gte = vi.fn().mockResolvedValue({ count: 0, error: null });
    const select = vi.fn().mockReturnValue({ gte });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as unknown as SupabaseClient<Database>;

    await checkDailyCostLimit({
      supabase,
      nowIso: '2026-04-21T15:30:00.000Z',
    });

    expect(from).toHaveBeenCalledWith('causal_explanations');
    expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(gte).toHaveBeenCalledWith('generated_at', '2026-04-21T00:00:00.000Z');
  });
});
