import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export const CAUSAL_DAILY_BUDGET_USD = 10;
export const CAUSAL_AVG_COST_USD_PER_GENERATION = 0.01;

export interface CostGuardResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly currentSpendUsd: number;
  readonly budgetUsd: number;
}

export interface CheckDailyCostArgs {
  readonly supabase: SupabaseClient<Database>;
  readonly budgetUsd?: number;
  readonly nowIso?: string;
  readonly averageCostUsdPerGeneration?: number;
}

export async function checkDailyCostLimit(args: CheckDailyCostArgs): Promise<CostGuardResult> {
  const budget = args.budgetUsd ?? CAUSAL_DAILY_BUDGET_USD;
  const avg = args.averageCostUsdPerGeneration ?? CAUSAL_AVG_COST_USD_PER_GENERATION;
  const now = args.nowIso ? new Date(args.nowIso) : new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await args.supabase
    .from('causal_explanations')
    .select('id', { count: 'exact', head: true })
    .gte('generated_at', startOfDay.toISOString());

  if (error) {
    return {
      allowed: true,
      reason: `cost_check_skipped:${error.message}`,
      currentSpendUsd: 0,
      budgetUsd: budget,
    };
  }

  const rows = count ?? 0;
  const currentSpend = Number((rows * avg).toFixed(4));

  if (currentSpend >= budget) {
    return {
      allowed: false,
      reason: 'daily_budget_exceeded',
      currentSpendUsd: currentSpend,
      budgetUsd: budget,
    };
  }

  return {
    allowed: true,
    currentSpendUsd: currentSpend,
    budgetUsd: budget,
  };
}
