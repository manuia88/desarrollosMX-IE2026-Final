// F14.F.11 Sprint 10 BIBLIA Tarea 10.2 — Break-even calculator (real H1).
// Calcula cuántos usuarios pagantes necesitan un plan para cubrir costos fijos
// fundadores DMX Studio (salarios MVP H1 omitidos — modelo lean founder-only).
//
// Contexto: H1 piloto founder-led, sin payroll. Break-even mide cuándo el plan
// cubre costos infra Studio + costos variables APIs. Usa typical usage profile
// como baseline.

import type { StudioPlanKey } from '@/features/dmx-studio/lib/stripe-products';
import { STUDIO_PLANS } from '@/features/dmx-studio/lib/stripe-products';
import {
  PER_VIDEO_BASE_COST_USD,
  projectMonthlyCosts,
  USAGE_PROFILE_VIDEOS,
  type UsageProfile,
} from './projections';

// Baseline operativo H1: infra fija atribuible a Studio + tooling externos.
// Si subimos a $50/mes con admin tooling activado H2 esto se ajusta.
const STUDIO_OPERATIONAL_FIXED_USD_PER_MONTH = 100;

export interface BreakEvenAnalysis {
  readonly planKey: StudioPlanKey;
  readonly assumedUsageProfile: UsageProfile;
  readonly costPerUserUsd: number;
  readonly contributionMarginPerUserUsd: number;
  readonly contributionMarginPct: number;
  readonly usersNeeded: number;
  readonly mrrTargetUsd: number;
  readonly profitableAtUsage: boolean;
}

/**
 * Calculate break-even threshold for a Studio plan.
 *
 * Returns:
 *   - usersNeeded: # paying subscribers required to cover STUDIO_OPERATIONAL_FIXED.
 *   - mrrTargetUsd: monthly recurring revenue at break-even.
 *   - costsPerUser: total cost (variable + amortized fixed) per user.
 *   - marginPct: contribution margin pct (price - variable) / price.
 *
 * Uses 'typical' usage profile by default (asesor activo, 20 videos/mes).
 * profitableAtUsage flag = true when contribution margin > 0 (plan covers
 * variable costs); false signals plan is unprofitable per-user even before
 * fixed cost amortization.
 */
export function calculateBreakEven(
  planKey: StudioPlanKey,
  assumedUsageProfile: UsageProfile = 'typical',
): BreakEvenAnalysis {
  const plan = STUDIO_PLANS[planKey];
  const projection = projectMonthlyCosts(planKey, assumedUsageProfile);
  // Variable cost per user = projection.variableCosts (which is per-user cost)
  const costPerUserUsd = round2(projection.variableCosts);
  const contributionMarginPerUserUsd = round2(plan.priceUsd - costPerUserUsd);
  const contributionMarginPct =
    plan.priceUsd > 0 ? round2((contributionMarginPerUserUsd / plan.priceUsd) * 100) : 0;

  // If contribution margin <= 0, plan unprofitable — usersNeeded = Infinity
  // semantically but we cap at 9999 to keep type Number serializable (JSON safe).
  let usersNeeded: number;
  if (contributionMarginPerUserUsd <= 0) {
    usersNeeded = 9999;
  } else {
    usersNeeded = Math.ceil(STUDIO_OPERATIONAL_FIXED_USD_PER_MONTH / contributionMarginPerUserUsd);
  }
  const mrrTargetUsd = round2(usersNeeded * plan.priceUsd);

  return {
    planKey,
    assumedUsageProfile,
    costPerUserUsd,
    contributionMarginPerUserUsd,
    contributionMarginPct,
    usersNeeded: usersNeeded === 9999 ? 9999 : usersNeeded,
    mrrTargetUsd,
    profitableAtUsage: contributionMarginPerUserUsd > 0,
  };
}

export interface BreakEvenSummary {
  readonly perPlan: ReadonlyArray<BreakEvenAnalysis>;
  readonly operationalFixedUsd: number;
  readonly perVideoBaseCostUsd: number;
  readonly profileVideos: typeof USAGE_PROFILE_VIDEOS;
}

/**
 * Compute break-even for all 3 plans (typical usage). Used by
 * PerformanceDashboard + UNIT_ECONOMICS.md doc.
 */
export function calculateBreakEvenAllPlans(): BreakEvenSummary {
  const planKeys: ReadonlyArray<StudioPlanKey> = ['pro', 'foto', 'agency'];
  return {
    perPlan: planKeys.map((p) => calculateBreakEven(p, 'typical')),
    operationalFixedUsd: STUDIO_OPERATIONAL_FIXED_USD_PER_MONTH,
    perVideoBaseCostUsd: PER_VIDEO_BASE_COST_USD,
    profileVideos: USAGE_PROFILE_VIDEOS,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
