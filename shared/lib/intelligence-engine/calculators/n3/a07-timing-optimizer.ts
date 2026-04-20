// A07 Timing Optimizer — score N3 que recomienda al comprador comprar_ahora
// vs esperar (3m, 6m, 12m) basado en B05 Market Cycle + A01 Affordability
// trend + tasa hipotecaria forecast + N11 Momentum zona.
// Plan FASE 10 §10.B.1. Catálogo 03.8 §A07. Tier 3. Categoría comprador.
//
// FÓRMULA por escenario:
//   score_scenario = market_cycle_signal × 0.35 + affordability_trend × 0.25
//                  + rate_forecast_signal × 0.25 + momentum × 0.15
//
// D29 native — scenarios { buy_now, wait_3m, wait_6m, wait_12m } con distinto
// peso temporal. Recommendation es el escenario con valor más alto.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import type {
  Calculator,
  CalculatorInput,
  CalculatorOutput,
  Confidence,
  ScenarioOutput,
} from '../base';
import { computeValidUntil } from '../persist';
import { defineScenarios, runWithScenarios } from '../scenarios';

export const version = '1.0.0';

export const CRITICAL_DEPS: readonly string[] = ['B05'] as const;

export const WEIGHTS = {
  market_cycle: 0.35,
  affordability: 0.25,
  rate_forecast: 0.25,
  momentum: 0.15,
} as const;

export const methodology = {
  formula:
    'score = market_cycle · 0.35 + affordability · 0.25 + rate_forecast · 0.25 + momentum · 0.15',
  sources: ['zone_scores:B05', 'zone_scores:A02', 'macro_series:tiie', 'zone_scores:N11'],
  weights: WEIGHTS,
  dependencies: [
    { score_id: 'B05', weight: 0.35, role: 'market_cycle', critical: true },
    { score_id: 'A02', weight: 0.25, role: 'affordability', critical: false },
    { score_id: 'N11', weight: 0.15, role: 'momentum', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §A07 Timing Optimizer',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#a07-timing-optimizer',
    },
    { name: 'Plan FASE 10 §10.B.1', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 14 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'B05', impact_pct_per_10pct_change: 3.5 },
    { dimension_id: 'A02', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'N11', impact_pct_per_10pct_change: 1.5 },
  ],
} as const;

export const reasoning_template =
  'Timing Optimizer zona {zone_id}: recommendation {recommendation} (score {score_value}). Cycle {market_cycle}, rate {rate_forecast_signal}, momentum {momentum}. Confianza {confidence}.';

export type TimingRecommendation = 'buy_now' | 'wait_3m' | 'wait_6m' | 'wait_12m';

export interface A07Components extends Record<string, unknown> {
  readonly market_cycle: number | null;
  readonly affordability_trend: number | null;
  readonly rate_forecast_signal: number | null;
  readonly momentum: number | null;
  readonly recommendation: TimingRecommendation;
  readonly confidence_pct: number;
  readonly missing_dimensions: readonly string[];
  readonly coverage_pct: number;
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface A07RawInput {
  readonly market_cycle: number | null;
  readonly affordability_trend: number | null;
  readonly rate_forecast_signal: number | null;
  readonly momentum: number | null;
  readonly deps?: readonly DepConfidence[];
}

export interface A07ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A07Components;
  readonly scenarios: Readonly<Record<string, ScenarioOutput>>;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

// D29 — scenarios con weights distintos. buy_now pondera momentum alto y
// rate_forecast negativo; wait_Xm pondera rate trend futuro.
const SCENARIOS_CONFIG = defineScenarios({
  buy_now: {
    weights: { market_cycle: 0.35, affordability: 0.25, rate_forecast: 0.25, momentum: 0.15 },
    rationale: 'Pondera el presente; recomienda ejecutar si score>70.',
  },
  wait_3m: {
    weights: { market_cycle: 0.3, affordability: 0.35, rate_forecast: 0.25, momentum: 0.1 },
    rationale: 'Espera a caída cercana de tasa (3m).',
  },
  wait_6m: {
    weights: { market_cycle: 0.25, affordability: 0.4, rate_forecast: 0.3, momentum: 0.05 },
    rationale: 'Espera a ciclo inferior (6m).',
  },
  wait_12m: {
    weights: { market_cycle: 0.2, affordability: 0.45, rate_forecast: 0.35, momentum: 0.0 },
    rationale: 'Horizonte 12m: prioriza affordability + rate path.',
  },
});

export function computeA07Timing(input: A07RawInput): A07ComputeResult {
  const missing: string[] = [];
  if (input.market_cycle === null || !Number.isFinite(input.market_cycle))
    missing.push('B05_market_cycle');
  if (input.affordability_trend === null || !Number.isFinite(input.affordability_trend))
    missing.push('A02_affordability');
  if (input.rate_forecast_signal === null || !Number.isFinite(input.rate_forecast_signal))
    missing.push('tiie_forecast');
  if (input.momentum === null || !Number.isFinite(input.momentum)) missing.push('N11_momentum');

  const total = 4;
  const available = total - missing.length;
  const coverage_pct = Math.round((available / total) * 100);

  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({
    critical,
    supporting,
    coverage_pct,
    min_coverage_pct: methodology.confidence_thresholds.min_coverage_pct,
    high_coverage_pct: methodology.confidence_thresholds.high_coverage_pct,
  });

  const insufCritical = input.market_cycle === null || !Number.isFinite(input.market_cycle);

  if (insufCritical || coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        market_cycle: input.market_cycle,
        affordability_trend: input.affordability_trend,
        rate_forecast_signal: input.rate_forecast_signal,
        momentum: input.momentum,
        recommendation: 'wait_6m',
        confidence_pct: 0,
        missing_dimensions: missing,
        coverage_pct,
        capped_by: insufCritical ? ['B05'] : [],
        cap_reason: insufCritical ? 'critical_dependency_missing' : 'coverage_below_min',
      },
      scenarios: {},
    };
  }

  const mc = input.market_cycle ?? 0;
  const af = input.affordability_trend ?? 0;
  const rf = input.rate_forecast_signal ?? 0;
  const mo = input.momentum ?? 0;

  const scenarios = runWithScenarios({
    config: SCENARIOS_CONFIG,
    computeFn: (weights) => {
      const v = clamp100(
        mc * weights.market_cycle +
          af * weights.affordability +
          rf * weights.rate_forecast +
          mo * weights.momentum,
      );
      return {
        value: Math.round(v),
        confidence: propagation.confidence,
      };
    },
  });

  // Recommendation = escenario con mayor valor
  let bestName: TimingRecommendation = 'buy_now';
  let bestValue = -1;
  for (const [name, out] of Object.entries(scenarios)) {
    if (out.value > bestValue) {
      bestValue = out.value;
      bestName = name as TimingRecommendation;
    }
  }

  const baseline = scenarios.buy_now?.value ?? 0;

  const baselineConfidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';
  const confidence: Confidence = deps.length > 0 ? propagation.confidence : baselineConfidence;

  return {
    value: baseline,
    confidence,
    components: {
      market_cycle: mc,
      affordability_trend: af,
      rate_forecast_signal: rf,
      momentum: mo,
      recommendation: bestName,
      confidence_pct: bestValue,
      missing_dimensions: missing,
      coverage_pct,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
    scenarios,
  };
}

export function getLabelKey(recommendation: TimingRecommendation, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a07.insufficient';
  return `ie.score.a07.${recommendation}`;
}

export const a07TimingOptimizerCalculator: Calculator = {
  scoreId: 'A07',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence =
      typeof params.market_cycle === 'number' ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey('wait_6m', confidence),
      components: {
        reason:
          'prod path stub — invocar computeA07Timing directo con { market_cycle, affordability_trend, rate_forecast_signal, momentum }',
      },
      inputs_used: {
        periodDate: input.periodDate,
        userId: input.userId ?? null,
        zoneId: input.zoneId ?? null,
      },
      confidence,
      citations: [
        { source: 'zone_scores:B05', period: input.periodDate },
        { source: 'zone_scores:A02', period: input.periodDate },
        { source: 'macro_series:tiie', period: input.periodDate },
        { source: 'zone_scores:N11', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:B05', count: 0 },
          { name: 'zone_scores:A02', count: 0 },
          { name: 'macro_series:tiie', count: 0 },
          { name: 'zone_scores:N11', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zone_id: input.zoneId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a07TimingOptimizerCalculator;
