// D04 Cross Correlation — score N3 agregado que calcula correlaciones
// Pearson entre pares de scores IE (ej. F01 vs precio_m2, N08 vs ventas).
// Matriz NxN publicada a admin observatory FASE 19.
// Plan FASE 10 §10.B.10. Catálogo 03.8 §D04. Tier 3. Categoría mercado.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula:
    'correlation Pearson(score_a, score_b) sobre N zonas. Score final = |correlaciones fuertes| / pairs.',
  sources: ['zone_scores:*', 'operaciones'],
  dependencies: [],
  references: [
    {
      name: 'Catálogo 03.8 §D04 Cross Correlation',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#d04-cross-correlation',
    },
    { name: 'Plan FASE 10 §10.B.10', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 100 },
  sensitivity_analysis: [],
  min_pairs_for_confidence: 30,
} as const;

export const reasoning_template =
  'Cross Correlation Matrix: {matrix_size}×{matrix_size}. Correlaciones fuertes |r|≥0.4: {strong_count}. Score {score_value}.';

export type CorrelationDirection = 'positive' | 'negative' | 'none';

export interface CorrelationEntry {
  readonly score_a: string;
  readonly score_b: string;
  readonly pearson_r: number;
  readonly abs_r: number;
  readonly direction: CorrelationDirection;
  readonly n_observations: number;
}

export interface D04Components extends Record<string, unknown> {
  readonly matrix: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly score_ids: readonly string[];
  readonly pairs: readonly CorrelationEntry[];
  readonly strong_pairs_count: number; // |r| ≥ 0.4
  readonly total_pairs_count: number;
  readonly pairs_density_pct: number;
}

export interface D04RawInput {
  // Observations indexed by zone_id; each zone provides values for N score_ids.
  readonly observations: Readonly<Record<string, Readonly<Record<string, number | null>>>>;
  readonly score_ids: readonly string[];
}

export interface D04ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: D04Components;
}

export function computePearson(xs: readonly number[], ys: readonly number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const xv = xs[i];
    const yv = ys[i];
    if (xv === undefined || yv === undefined) return null;
    const dx = xv - meanX;
    const dy = yv - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  if (denomX === 0 || denomY === 0) return 0;
  const r = num / Math.sqrt(denomX * denomY);
  return Number(r.toFixed(4));
}

export function computeD04Correlation(input: D04RawInput): D04ComputeResult {
  const ids = input.score_ids;
  const zones = Object.keys(input.observations);

  if (ids.length < 2 || zones.length < 3) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        matrix: {},
        score_ids: ids,
        pairs: [],
        strong_pairs_count: 0,
        total_pairs_count: 0,
        pairs_density_pct: 0,
      },
    };
  }

  const matrix: Record<string, Record<string, number>> = {};
  for (const a of ids) matrix[a] = {};

  const pairs: CorrelationEntry[] = [];

  for (let i = 0; i < ids.length; i++) {
    const a = ids[i];
    if (!a) continue;
    for (let j = i + 1; j < ids.length; j++) {
      const b = ids[j];
      if (!b) continue;
      const xs: number[] = [];
      const ys: number[] = [];
      for (const z of zones) {
        const obs = input.observations[z];
        if (!obs) continue;
        const va = obs[a];
        const vb = obs[b];
        if (
          typeof va === 'number' &&
          typeof vb === 'number' &&
          Number.isFinite(va) &&
          Number.isFinite(vb)
        ) {
          xs.push(va);
          ys.push(vb);
        }
      }
      const r = computePearson(xs, ys);
      if (r === null) continue;
      const matrixA = matrix[a];
      const matrixB = matrix[b];
      if (matrixA) matrixA[b] = r;
      if (matrixB) matrixB[a] = r;
      pairs.push({
        score_a: a,
        score_b: b,
        pearson_r: r,
        abs_r: Math.abs(r),
        direction: r > 0.1 ? 'positive' : r < -0.1 ? 'negative' : 'none',
        n_observations: xs.length,
      });
    }
    const mA = matrix[a];
    if (mA) mA[a] = 1;
  }

  const strong = pairs.filter((p) => p.abs_r >= 0.4).length;
  const total = (ids.length * (ids.length - 1)) / 2;
  const density = total > 0 ? Math.round((pairs.length / total) * 100) : 0;
  const score = total > 0 ? Math.round((strong / total) * 100) : 0;

  const avgN =
    pairs.length > 0 ? pairs.reduce((s, p) => s + p.n_observations, 0) / pairs.length : 0;
  const confidence: Confidence =
    avgN >= methodology.min_pairs_for_confidence ? 'high' : avgN >= 15 ? 'medium' : 'low';

  return {
    value: score,
    confidence,
    components: {
      matrix,
      score_ids: ids,
      pairs,
      strong_pairs_count: strong,
      total_pairs_count: total,
      pairs_density_pct: density,
    },
  };
}

export function getLabelKey(score: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.d04.insufficient';
  if (score >= 50) return 'ie.score.d04.fuertemente_correlacionado';
  if (score >= 25) return 'ie.score.d04.parcialmente_correlacionado';
  return 'ie.score.d04.independiente';
}

export const d04CrossCorrelationCalculator: Calculator = {
  scoreId: 'D04',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence = Array.isArray(params.score_ids) ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'prod path stub — invocar computeD04Correlation directo' },
      inputs_used: { periodDate: input.periodDate },
      confidence,
      citations: [{ source: 'zone_scores:*', period: input.periodDate }],
      provenance: {
        sources: [{ name: 'zone_scores:*', count: 0 }],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { matrix_size: '0' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default d04CrossCorrelationCalculator;
