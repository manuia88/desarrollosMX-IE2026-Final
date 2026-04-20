// A09 Risk Score Comprador — score N3 personalizado de riesgos al comprar
// un proyecto específico. Combina H03 (sísmico), N04 (crime trajectory),
// H10 (desastres), F12 (risk map), N09 (noise/amenities).
// Plan FASE 10 §10.B.3. Catálogo 03.8 §A09. Tier 3. Categoría comprador.
//
// FÓRMULA (base):
//   risk = H03 × 0.30 + N04 × 0.25 + H10 × 0.20 + F12 × 0.15 + N09 × 0.10
//
// D29 scenarios: { optimistic, base, pessimistic } con pesos distintos.
// optimistic baja sísmico/crime; pessimistic sube ambos.
// Invertido: score alto = RIESGO alto (NO calidad).

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

export const WEIGHTS = {
  sismico: 0.3,
  crime: 0.25,
  desastres: 0.2,
  risk_map: 0.15,
  ruido: 0.1,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['H03'] as const;

export const methodology = {
  formula: 'risk = H03 · 0.30 + N04 · 0.25 + H10 · 0.20 + F12 · 0.15 + N09 · 0.10',
  sources: [
    'zone_scores:H03',
    'zone_scores:N04',
    'zone_scores:H10',
    'zone_scores:F12',
    'zone_scores:N09',
  ],
  weights: WEIGHTS,
  dependencies: [
    { score_id: 'H03', weight: 0.3, role: 'sismico', critical: true },
    { score_id: 'N04', weight: 0.25, role: 'crime_trajectory', critical: false },
    { score_id: 'H10', weight: 0.2, role: 'desastres', critical: false },
    { score_id: 'F12', weight: 0.15, role: 'risk_map', critical: false },
    { score_id: 'N09', weight: 0.1, role: 'ruido_ambiente', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §A09 Risk Score Comprador',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#a09-risk-score-comprador',
    },
    { name: 'Plan FASE 10 §10.B.3', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_coverage_pct: 60, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'H03', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'N04', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'H10', impact_pct_per_10pct_change: 2.0 },
  ],
} as const;

export const reasoning_template =
  'Risk Score Comprador {project_id}: risk {score_value} ({bucket}). Sísmico {sismico}, crime {crime}, desastres {desastres}. Confianza {confidence}.';

export type A09RiskBucket = 'bajo' | 'moderado' | 'alto' | 'muy_alto';

export interface A09Components extends Record<string, unknown> {
  readonly sismico: number | null;
  readonly crime: number | null;
  readonly desastres: number | null;
  readonly risk_map: number | null;
  readonly ruido: number | null;
  readonly bucket: A09RiskBucket;
  readonly missing_dimensions: readonly string[];
  readonly coverage_pct: number;
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface A09RawInput {
  readonly sismico: number | null;
  readonly crime: number | null;
  readonly desastres: number | null;
  readonly risk_map: number | null;
  readonly ruido: number | null;
  readonly deps?: readonly DepConfidence[];
}

export interface A09ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A09Components;
  readonly scenarios: Readonly<Record<string, ScenarioOutput>>;
}

function bucketFor(value: number): A09RiskBucket {
  if (value >= 75) return 'muy_alto';
  if (value >= 55) return 'alto';
  if (value >= 35) return 'moderado';
  return 'bajo';
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

// D29 — escenarios macro. optimistic baja factores inestables; pessimistic sube.
const SCENARIOS_CONFIG = defineScenarios({
  optimistic: {
    weights: { sismico: 0.25, crime: 0.15, desastres: 0.15, risk_map: 0.25, ruido: 0.2 },
    rationale: 'Escenario optimista: mitigación activa + tendencia crime negativa.',
  },
  base: {
    weights: { sismico: 0.3, crime: 0.25, desastres: 0.2, risk_map: 0.15, ruido: 0.1 },
    rationale: 'Escenario base: pesos H03×0.30 + N04×0.25 + H10×0.20 + F12×0.15 + N09×0.10.',
  },
  pessimistic: {
    weights: { sismico: 0.35, crime: 0.35, desastres: 0.2, risk_map: 0.05, ruido: 0.05 },
    rationale: 'Escenario pesimista: crime acelera + evento sísmico relevante.',
  },
});

export function computeA09Risk(input: A09RawInput): A09ComputeResult {
  const missing: string[] = [];
  if (input.sismico === null || !Number.isFinite(input.sismico)) missing.push('H03_sismico');
  if (input.crime === null || !Number.isFinite(input.crime)) missing.push('N04_crime');
  if (input.desastres === null || !Number.isFinite(input.desastres)) missing.push('H10_desastres');
  if (input.risk_map === null || !Number.isFinite(input.risk_map)) missing.push('F12_risk_map');
  if (input.ruido === null || !Number.isFinite(input.ruido)) missing.push('N09_ruido');

  const total = 5;
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

  if (input.sismico === null || !Number.isFinite(input.sismico)) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        sismico: null,
        crime: input.crime,
        desastres: input.desastres,
        risk_map: input.risk_map,
        ruido: input.ruido,
        bucket: 'bajo',
        missing_dimensions: missing,
        coverage_pct,
        capped_by: ['H03'],
        cap_reason: 'critical_dependency_missing',
      },
      scenarios: {},
    };
  }

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        sismico: input.sismico,
        crime: input.crime,
        desastres: input.desastres,
        risk_map: input.risk_map,
        ruido: input.ruido,
        bucket: 'bajo',
        missing_dimensions: missing,
        coverage_pct,
        capped_by: [],
        cap_reason: 'coverage_below_min',
      },
      scenarios: {},
    };
  }

  const s = input.sismico ?? 0;
  const c = input.crime ?? 0;
  const d = input.desastres ?? 0;
  const r = input.risk_map ?? 0;
  const n = input.ruido ?? 0;

  const scenarios = runWithScenarios({
    config: SCENARIOS_CONFIG,
    computeFn: (weights) => {
      const v = clamp100(
        s * weights.sismico +
          c * weights.crime +
          d * weights.desastres +
          r * weights.risk_map +
          n * weights.ruido,
      );
      return { value: Math.round(v), confidence: propagation.confidence };
    },
  });

  const baselineVal = scenarios.base?.value ?? 0;

  const baselineConfidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';
  const confidence: Confidence = deps.length > 0 ? propagation.confidence : baselineConfidence;

  return {
    value: baselineVal,
    confidence,
    components: {
      sismico: s,
      crime: c,
      desastres: d,
      risk_map: r,
      ruido: n,
      bucket: bucketFor(baselineVal),
      missing_dimensions: missing,
      coverage_pct,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
    scenarios,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a09.insufficient';
  if (value >= 75) return 'ie.score.a09.muy_alto';
  if (value >= 55) return 'ie.score.a09.alto';
  if (value >= 35) return 'ie.score.a09.moderado';
  return 'ie.score.a09.bajo';
}

export const a09RiskScoreCompradorCalculator: Calculator = {
  scoreId: 'A09',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence =
      typeof params.sismico === 'number' ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'prod path stub — invocar computeA09Risk directo' },
      inputs_used: { periodDate: input.periodDate, userId: input.userId ?? null },
      confidence,
      citations: [
        { source: 'zone_scores:H03', period: input.periodDate },
        { source: 'zone_scores:N04', period: input.periodDate },
        { source: 'zone_scores:H10', period: input.periodDate },
        { source: 'zone_scores:F12', period: input.periodDate },
        { source: 'zone_scores:N09', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:H03', count: 0 },
          { name: 'zone_scores:N04', count: 0 },
          { name: 'zone_scores:H10', count: 0 },
          { name: 'zone_scores:F12', count: 0 },
          { name: 'zone_scores:N09', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { project_id: input.projectId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a09RiskScoreCompradorCalculator;
