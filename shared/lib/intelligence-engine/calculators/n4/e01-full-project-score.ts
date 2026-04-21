// E01 Full Project Score — agregado N4 INTERNO que consolida todos los scores
// B* del proyecto (B01..B15 excepto B12) + A12 como anchor de price fairness.
// Plan FASE 10 §10.C.1. Catálogo 03.8 §E01. Tier 3. Categoría proyecto.
//
// E01 es el "score maestro" institucional: incluye métricas sensitive
// (internal_margin, financial_raw, dev_cost_breakdown) que son filtradas por
// D18 score_visibility antes de exposición pública. Su wrapper público es G01.
//
// D33 FASE 10 SESIÓN 3/3: multi-tenant scoping. E01 requiere tenant_scope
// (institutional) porque los B_scores_breakdown contienen signal comercial
// propietario. run() valida input.tenant_id upstream en runScore.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

// Pesos default por B_score (suma 1.0 incluyendo A12 como anchor).
// Plan §10.C.1: B01/B04/B08 llevan mayor weight (demand, pmf, dev quality).
// A12 se incluye como price fairness check, peso moderado.
export const DEFAULT_E01_WEIGHTS: Readonly<Record<string, number>> = {
  B01: 0.12, // demand
  B02: 0.06, // velocity
  B03: 0.06, // absorption
  B04: 0.12, // pmf
  B05: 0.06, // dev_reputation
  B06: 0.08, // project_genesis
  B07: 0.06, // brand_equity
  B08: 0.1, // amenities
  B09: 0.06, // design_quality
  B10: 0.05, // construction_quality
  B11: 0.05, // channel_performance
  B13: 0.05, // post_sales
  B14: 0.04, // msg_resonance
  B15: 0.04, // brand_loyalty
  A12: 0.05, // price_fairness anchor
};

export const B_SCORE_KEYS: readonly string[] = [
  'B01',
  'B02',
  'B03',
  'B04',
  'B05',
  'B06',
  'B07',
  'B08',
  'B09',
  'B10',
  'B11',
  'B13',
  'B14',
  'B15',
] as const;

export const CRITICAL_DEPS: readonly string[] = ['B01', 'B04', 'B08'] as const;

export const methodology = {
  formula:
    'E01 = Σ(B_score × weight) + A12 × weight_A12. Re-normalizado por pesos presentes cuando hay missing.',
  sources: [
    'project_scores:B01',
    'project_scores:B02',
    'project_scores:B03',
    'project_scores:B04',
    'project_scores:B05',
    'project_scores:B06',
    'project_scores:B07',
    'project_scores:B08',
    'project_scores:B09',
    'project_scores:B10',
    'project_scores:B11',
    'project_scores:B13',
    'project_scores:B14',
    'project_scores:B15',
    'project_scores:A12',
  ],
  dependencies: [
    { score_id: 'B01', weight: 0.12, role: 'demand', critical: true },
    { score_id: 'B02', weight: 0.06, role: 'velocity', critical: false },
    { score_id: 'B03', weight: 0.06, role: 'absorption', critical: false },
    { score_id: 'B04', weight: 0.12, role: 'pmf', critical: true },
    { score_id: 'B05', weight: 0.06, role: 'dev_reputation', critical: false },
    { score_id: 'B06', weight: 0.08, role: 'project_genesis', critical: false },
    { score_id: 'B07', weight: 0.06, role: 'brand_equity', critical: false },
    { score_id: 'B08', weight: 0.1, role: 'amenities', critical: true },
    { score_id: 'B09', weight: 0.06, role: 'design_quality', critical: false },
    { score_id: 'B10', weight: 0.05, role: 'construction_quality', critical: false },
    { score_id: 'B11', weight: 0.05, role: 'channel_performance', critical: false },
    { score_id: 'B13', weight: 0.05, role: 'post_sales', critical: false },
    { score_id: 'B14', weight: 0.04, role: 'msg_resonance', critical: false },
    { score_id: 'B15', weight: 0.04, role: 'brand_loyalty', critical: false },
    { score_id: 'A12', weight: 0.05, role: 'price_fairness', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §E01 Full Project Score',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#e01-full-project-score',
    },
    { name: 'Plan FASE 10 §10.C.1', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 85 },
  sensitivity_analysis: [
    { dimension_id: 'B01', impact_pct_per_10pct_change: 1.2 },
    { dimension_id: 'B04', impact_pct_per_10pct_change: 1.2 },
    { dimension_id: 'B08', impact_pct_per_10pct_change: 1.0 },
  ],
} as const;

export const reasoning_template =
  'Full Project Score {project_id}: {score_value}/100. Cobertura B* {coverage_pct}%. Confianza {confidence}.';

export interface E01Components extends Record<string, unknown> {
  readonly b_scores_breakdown: Readonly<Record<string, number>>;
  readonly a12_component: number | null;
  readonly ponderado_total: number;
  readonly coverage_pct: number;
  readonly score_count: number;
  readonly missing_scores: readonly string[];
  readonly weights_used: Readonly<Record<string, number>>;
  // Sensitive — filtrados por D18 score_visibility antes de exposición pública.
  readonly internal_margin: number | null;
  readonly financial_raw: Readonly<Record<string, number>> | null;
  readonly dev_cost_breakdown: Readonly<Record<string, number>> | null;
}

export interface E01RawInput {
  readonly b_scores: Readonly<Record<string, number>>;
  readonly a12_score: number | null;
  readonly project_weights?: Readonly<Record<string, number>>;
  readonly internal_margin?: number | null;
  readonly financial_raw?: Readonly<Record<string, number>> | null;
  readonly dev_cost_breakdown?: Readonly<Record<string, number>> | null;
}

export interface E01ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: E01Components;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeE01FullProjectScore(input: E01RawInput): E01ComputeResult {
  const weights = { ...DEFAULT_E01_WEIGHTS, ...(input.project_weights ?? {}) };
  const missing: string[] = [];
  const breakdown: Record<string, number> = {};

  let weighted_sum = 0;
  let weight_sum_used = 0;
  let score_count = 0;

  for (const key of B_SCORE_KEYS) {
    const raw = input.b_scores[key];
    const w = weights[key] ?? 0;
    if (raw === undefined || raw === null || !Number.isFinite(raw)) {
      missing.push(key);
      continue;
    }
    breakdown[key] = raw;
    weighted_sum += raw * w;
    weight_sum_used += w;
    score_count += 1;
  }

  const a12_weight = weights.A12 ?? 0;
  const a12_component =
    input.a12_score !== null && input.a12_score !== undefined && Number.isFinite(input.a12_score)
      ? input.a12_score
      : null;

  if (a12_component !== null) {
    weighted_sum += a12_component * a12_weight;
    weight_sum_used += a12_weight;
  } else {
    missing.push('A12');
  }

  const total_possible = B_SCORE_KEYS.length + 1; // +1 por A12
  const available = total_possible - missing.length;
  const coverage_pct = Math.round((available / total_possible) * 100);

  // Critical deps missing → insufficient_data.
  const hasCriticalMissing = CRITICAL_DEPS.some((dep) => missing.includes(dep));
  if (hasCriticalMissing || coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        b_scores_breakdown: breakdown,
        a12_component,
        ponderado_total: 0,
        coverage_pct,
        score_count,
        missing_scores: missing,
        weights_used: weights,
        internal_margin: input.internal_margin ?? null,
        financial_raw: input.financial_raw ?? null,
        dev_cost_breakdown: input.dev_cost_breakdown ?? null,
      },
    };
  }

  // Re-normalizar por pesos realmente usados.
  const ponderado_total = weight_sum_used > 0 ? weighted_sum / weight_sum_used : 0;
  const value = Math.round(clamp100(ponderado_total));

  const confidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';

  return {
    value,
    confidence,
    components: {
      b_scores_breakdown: breakdown,
      a12_component,
      ponderado_total: Number(ponderado_total.toFixed(3)),
      coverage_pct,
      score_count,
      missing_scores: missing,
      weights_used: weights,
      internal_margin: input.internal_margin ?? null,
      financial_raw: input.financial_raw ?? null,
      dev_cost_breakdown: input.dev_cost_breakdown ?? null,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.e01.insufficient';
  if (value >= 90) return 'ie.score.e01.excelente';
  if (value >= 70) return 'ie.score.e01.bueno';
  if (value >= 50) return 'ie.score.e01.regular';
  return 'ie.score.e01.pobre';
}

export const e01FullProjectScoreCalculator: Calculator = {
  scoreId: 'E01',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    if (!input.projectId) throw new Error('E01 requires projectId');
    const computed_at = new Date();

    // Fetch B* + A12 desde project_scores. Tipado laxo hasta que db:types regenere.
    const { data, error } = await (supabase as unknown as SupabaseClient<Record<string, unknown>>)
      .from('project_scores' as never)
      .select('score_type, score_value')
      .eq('project_id', input.projectId)
      .eq('country_code', input.countryCode)
      .eq('period_date', input.periodDate);

    const b_scores: Record<string, number> = {};
    let a12_score: number | null = null;
    let fetched_count = 0;

    if (!error && data) {
      const rows = data as unknown as Array<{ score_type: string; score_value: number }>;
      for (const row of rows) {
        if (typeof row.score_value !== 'number' || !Number.isFinite(row.score_value)) continue;
        if (row.score_type === 'A12') {
          a12_score = row.score_value;
          fetched_count += 1;
        } else if (B_SCORE_KEYS.includes(row.score_type)) {
          b_scores[row.score_type] = row.score_value;
          fetched_count += 1;
        }
      }
    }

    const result = computeE01FullProjectScore({ b_scores, a12_score });

    return {
      score_value: result.value,
      score_label: getLabelKey(result.value, result.confidence),
      components: result.components,
      inputs_used: {
        b_scores_count: Object.keys(b_scores).length,
        a12_present: a12_score !== null,
        periodDate: input.periodDate,
        projectId: input.projectId,
      },
      confidence: result.confidence,
      citations: [
        { source: 'project_scores:B_series', period: input.periodDate, count: fetched_count },
        { source: 'project_scores:A12', period: input.periodDate },
      ],
      provenance: {
        sources: [
          {
            name: 'project_scores',
            period: input.periodDate,
            count: fetched_count,
          },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        project_id: input.projectId,
        coverage_pct: result.components.coverage_pct,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default e01FullProjectScoreCalculator;
