// D09 Ecosystem Health — score N4 agregado de salud del ecosistema zonal.
// Formula catálogo 03.8: N01×0.3 + N04×0.2 + N07×0.2 + F08×0.3.
// Público (sin tenant_scope_required). Tier 2. Categoría zona.
// Renormaliza pesos si alguna dimensión falta. Coverage <50% → insufficient.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const DEFAULT_WEIGHTS = {
  N01: 0.3,
  N04: 0.2,
  N07: 0.2,
  F08: 0.3,
} as const;

export const methodology = {
  formula:
    'D09 = N01×0.3 + N04×0.2 + N07×0.2 + F08×0.3. Renormaliza pesos si falta alguna dimensión. Coverage <50% → insufficient_data.',
  sources: ['zone_scores:N01', 'zone_scores:N04', 'zone_scores:N07', 'zone_scores:F08'],
  dependencies: [
    { score_id: 'N01', weight: 0.3, role: 'diversity', critical: true },
    { score_id: 'N04', weight: 0.2, role: 'community_cohesion', critical: false },
    { score_id: 'N07', weight: 0.2, role: 'amenities_density', critical: false },
    { score_id: 'F08', weight: 0.3, role: 'livability_baseline', critical: true },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §D09 Ecosystem Health',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#d09-ecosystem-health',
    },
    { name: 'Plan FASE 10 §10.C.D09', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'N01', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'F08', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'N04', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'N07', impact_pct_per_10pct_change: 2.0 },
  ],
} as const;

export const reasoning_template =
  'Ecosystem Health zona {zone_id}: {score_value}/100. Coverage {coverage_pct}%. Weights normalizados: {weights_applied}.';

export interface D09RawInput {
  readonly n01: number | null;
  readonly n04: number | null;
  readonly n07: number | null;
  readonly f08: number | null;
}

export interface D09Components extends Record<string, unknown> {
  readonly subscores: Readonly<Record<string, number | null>>;
  readonly weights_applied: Readonly<Record<string, number>>;
  readonly missing_dimensions: readonly string[];
  readonly coverage_pct: number;
}

export interface D09ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: D09Components;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeD09EcosystemHealth(input: D09RawInput): D09ComputeResult {
  const subscores: Record<string, number | null> = {
    N01: input.n01,
    N04: input.n04,
    N07: input.n07,
    F08: input.f08,
  };

  const defaultWeights: Record<string, number> = { ...DEFAULT_WEIGHTS };
  const missing: string[] = [];
  const availableWeights: Record<string, number> = {};
  let sumAvailableWeights = 0;

  for (const [dim, weight] of Object.entries(defaultWeights)) {
    const raw = subscores[dim];
    if (raw === null || raw === undefined || !Number.isFinite(raw)) {
      missing.push(dim);
    } else {
      availableWeights[dim] = weight;
      sumAvailableWeights += weight;
    }
  }

  const total_dims = Object.keys(defaultWeights).length;
  const available = total_dims - missing.length;
  const coverage_pct = Math.round((available / total_dims) * 100);

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        subscores,
        weights_applied: {},
        missing_dimensions: missing,
        coverage_pct,
      },
    };
  }

  // Renormalizar pesos disponibles a Σ=1.
  const weights_applied: Record<string, number> = {};
  if (sumAvailableWeights > 0) {
    for (const [k, w] of Object.entries(availableWeights)) {
      weights_applied[k] = Number((w / sumAvailableWeights).toFixed(6));
    }
  }

  let weighted_sum = 0;
  for (const [dim, w] of Object.entries(weights_applied)) {
    const raw = subscores[dim];
    if (raw !== null && raw !== undefined && Number.isFinite(raw)) {
      weighted_sum += raw * w;
    }
  }

  const value = Math.round(clamp100(weighted_sum));

  const confidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';

  return {
    value,
    confidence,
    components: {
      subscores,
      weights_applied,
      missing_dimensions: missing,
      coverage_pct,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.d09.insufficient';
  if (value >= 80) return 'ie.score.d09.excelente';
  if (value >= 60) return 'ie.score.d09.bueno';
  if (value >= 40) return 'ie.score.d09.regular';
  return 'ie.score.d09.pobre';
}

export const d09EcosystemHealthCalculator: Calculator = {
  scoreId: 'D09',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const confidence: Confidence = 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'prod path stub — invocar computeD09EcosystemHealth directo',
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'zone_scores:N01', period: input.periodDate },
        { source: 'zone_scores:N04', period: input.periodDate },
        { source: 'zone_scores:N07', period: input.periodDate },
        { source: 'zone_scores:F08', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:N01', count: 0 },
          { name: 'zone_scores:N04', count: 0 },
          { name: 'zone_scores:N07', count: 0 },
          { name: 'zone_scores:F08', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zone_id: input.zoneId ?? 'desconocido', coverage_pct: 0 },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default d09EcosystemHealthCalculator;
