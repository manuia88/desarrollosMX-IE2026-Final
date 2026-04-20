// F4 — Cost guard rails para cascades.
// Ref: plan §BLOQUE 8.F prompt v8 F4.
//
// Antes de enqueue jobs masivos de una cascade, estimar costo USD esperado
// y validar contra budget mensual restante. Si estimate > 10% restante del
// mes → BLOQUEAR + PostHog alert ie.cascade.budget_exceeded.

import type { SupabaseClient } from '@supabase/supabase-js';
import { posthog } from '@/shared/lib/telemetry/posthog';

// Costo estimado por ejecución calculator. Valores conservadores; tune con
// data real de cost-tracker cuando haya histórico. Referencia: AirDNA $0.001/call,
// Mapbox $0.0005/call, GPT-4o-mini $0.0001/score.
const DEFAULT_COST_PER_SCORE_USD = 0.0005;
const DEFAULT_MONTHLY_BUDGET_USD = 100;
const MAX_CASCADE_PCT_OF_REMAINING = 0.1; // cascade no puede gastar >10% del remaining mensual

export interface CascadeCostEstimate {
  readonly estimated_usd: number;
  readonly scores_count: number;
  readonly target_count: number;
  readonly cost_per_score_usd: number;
}

export function estimateCascadeCost(
  scoresCount: number,
  targetCount: number,
  costPerScoreUsd: number = DEFAULT_COST_PER_SCORE_USD,
): CascadeCostEstimate {
  const estimated_usd = scoresCount * targetCount * costPerScoreUsd;
  return {
    estimated_usd: Number(estimated_usd.toFixed(4)),
    scores_count: scoresCount,
    target_count: targetCount,
    cost_per_score_usd: costPerScoreUsd,
  };
}

export function getMonthlyBudgetUsd(): number {
  const v = process.env.IE_MONTHLY_BUDGET_USD;
  const parsed = v ? Number.parseFloat(v) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MONTHLY_BUDGET_USD;
  return parsed;
}

type LooseClient = SupabaseClient<Record<string, unknown>>;
function lax(s: SupabaseClient): LooseClient {
  return s as unknown as LooseClient;
}

export async function getCurrentMonthSpendUsd(supabase: SupabaseClient): Promise<number> {
  try {
    const { data } = await lax(supabase).from('api_budgets').select('spent_mtd_usd');
    if (!Array.isArray(data)) return 0;
    return (data as Array<{ spent_mtd_usd: number | string | null }>)
      .map((r) =>
        typeof r.spent_mtd_usd === 'string'
          ? Number.parseFloat(r.spent_mtd_usd)
          : (r.spent_mtd_usd ?? 0),
      )
      .reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  } catch {
    return 0;
  }
}

export interface GuardCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly estimate: CascadeCostEstimate;
  readonly budget_usd: number;
  readonly spent_mtd_usd: number;
  readonly remaining_usd: number;
  readonly max_allowed_usd: number;
}

export async function canExecuteCascade(
  supabase: SupabaseClient,
  estimate: CascadeCostEstimate,
): Promise<GuardCheckResult> {
  const budget_usd = getMonthlyBudgetUsd();
  const spent_mtd_usd = await getCurrentMonthSpendUsd(supabase);
  const remaining_usd = Math.max(0, budget_usd - spent_mtd_usd);
  const max_allowed_usd = remaining_usd * MAX_CASCADE_PCT_OF_REMAINING;

  if (estimate.estimated_usd > max_allowed_usd) {
    emitBudgetExceededEvent({ estimate, budget_usd, spent_mtd_usd, max_allowed_usd });
    return {
      allowed: false,
      reason: `cascade_exceeds_budget: est $${estimate.estimated_usd.toFixed(4)} > ${(MAX_CASCADE_PCT_OF_REMAINING * 100).toFixed(0)}% of $${remaining_usd.toFixed(2)} remaining = max $${max_allowed_usd.toFixed(4)}`,
      estimate,
      budget_usd,
      spent_mtd_usd,
      remaining_usd,
      max_allowed_usd,
    };
  }

  return {
    allowed: true,
    estimate,
    budget_usd,
    spent_mtd_usd,
    remaining_usd,
    max_allowed_usd,
  };
}

function emitBudgetExceededEvent(args: {
  estimate: CascadeCostEstimate;
  budget_usd: number;
  spent_mtd_usd: number;
  max_allowed_usd: number;
}): void {
  try {
    posthog.capture({
      distinctId: 'ie-cost-guard',
      event: 'ie.cascade.budget_exceeded',
      properties: {
        estimated_usd: args.estimate.estimated_usd,
        scores_count: args.estimate.scores_count,
        target_count: args.estimate.target_count,
        budget_usd: args.budget_usd,
        spent_mtd_usd: args.spent_mtd_usd,
        max_allowed_usd: args.max_allowed_usd,
      },
    });
  } catch {
    // best-effort
  }
}
