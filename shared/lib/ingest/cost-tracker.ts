import { createAdminClient } from '@/shared/lib/supabase/admin';
import { BudgetExceededError } from './types';

// Upgrade #5 §5.A FASE 07. Cost tracker pre-emptive: bloquea si el call
// próximo empujaría el spend > hard_limit_pct del budget mensual.

export interface BudgetCheckResult {
  allowed: boolean;
  spentMtdUsd: number;
  budgetUsd: number;
  pct: number;
  alertThresholdReached: boolean;
}

export async function preCheckBudget(
  source: string,
  estimatedCostUsd: number,
): Promise<BudgetCheckResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('api_budgets')
    .select('monthly_budget_usd, spent_mtd_usd, alert_threshold_pct, hard_limit_pct, is_paused')
    .eq('source', source)
    .maybeSingle();

  // Sin budget configurado → permitir (sources sin costo). Decisión documentada.
  if (error || !data) {
    return {
      allowed: true,
      spentMtdUsd: 0,
      budgetUsd: 0,
      pct: 0,
      alertThresholdReached: false,
    };
  }

  if (data.is_paused) {
    throw new BudgetExceededError(source, data.spent_mtd_usd, data.monthly_budget_usd);
  }

  const projected = data.spent_mtd_usd + Math.max(0, estimatedCostUsd);
  const pct = data.monthly_budget_usd > 0 ? (projected / data.monthly_budget_usd) * 100 : 0;
  const hardLimit = data.hard_limit_pct;

  if (data.monthly_budget_usd > 0 && pct > hardLimit) {
    throw new BudgetExceededError(source, data.spent_mtd_usd, data.monthly_budget_usd);
  }

  return {
    allowed: true,
    spentMtdUsd: data.spent_mtd_usd,
    budgetUsd: data.monthly_budget_usd,
    pct,
    alertThresholdReached: pct >= data.alert_threshold_pct,
  };
}

export async function recordSpend(source: string, costUsd: number): Promise<void> {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return;
  const supabase = createAdminClient();
  // Atomic increment via RPC. Si la RPC no existe (v0), fallback a select+update.
  const { error } = await supabase.rpc('increment_api_budget_spend', {
    p_source: source,
    p_amount: costUsd,
  });
  if (error) {
    const { data } = await supabase
      .from('api_budgets')
      .select('spent_mtd_usd')
      .eq('source', source)
      .maybeSingle();
    if (!data) return;
    await supabase
      .from('api_budgets')
      .update({ spent_mtd_usd: data.spent_mtd_usd + costUsd })
      .eq('source', source);
  }
}
