// G01 Full Score 2.0 Público — wrapper N4 sobre E01 que expone la versión
// whitelisted al portal público. Comparte la lógica de compute de E01 pero
// filtra componentes sensitive (internal_margin, financial_raw, dev_cost)
// y agrupa los B_scores en 3 categorías UX-friendly: safety, quality, momentum.
// Plan FASE 10 §10.C.2. Catálogo 03.8 §G01. Tier 3. Categoría proyecto.
//
// D33 FASE 10: G01 NO requiere tenant_scope (público). H1 publicProcedure-eligible
// desde features/portal-publico/. Su output es safe-to-render en /proyectos/{id}.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';
import {
  B_SCORE_KEYS,
  computeE01FullProjectScore,
  DEFAULT_E01_WEIGHTS,
  type E01RawInput,
} from './e01-full-project-score';

export const version = '1.0.0';

// Categorías UX-friendly. Mapeo heurístico de B_scores a categoría pública.
// safety = reputación/construcción/post-venta. quality = diseño/amenities/pmf.
// momentum = demanda/velocity/absorption.
export const CATEGORY_MAPPING: Readonly<Record<string, 'safety' | 'quality' | 'momentum'>> = {
  B01: 'momentum',
  B02: 'momentum',
  B03: 'momentum',
  B04: 'quality',
  B05: 'safety',
  B06: 'quality',
  B07: 'safety',
  B08: 'quality',
  B09: 'quality',
  B10: 'safety',
  B11: 'momentum',
  B13: 'safety',
  B14: 'momentum',
  B15: 'safety',
} as const;

export const methodology = {
  formula:
    'G01 = wrapper público de E01. category_averages = mean(B_scores por categoría). trend_direction derivado de momentum vs 3m lookback.',
  sources: ['project_scores:E01_components', 'project_scores:B_series', 'project_scores:A12'],
  categories: ['safety', 'quality', 'momentum'] as const,
  dependencies: [{ score_id: 'E01', weight: 1.0, role: 'internal_full_score', critical: true }],
  references: [
    {
      name: 'Catálogo 03.8 §G01 Full Score 2.0 Público',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#g01-full-score-publico',
    },
    { name: 'Plan FASE 10 §10.C.2', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 85 },
} as const;

export const reasoning_template =
  'Full Score público proyecto {project_id}: {score_value}/100 ({rating}). Tendencia {trend_direction}.';

export type G01Rating = 'excelente' | 'bueno' | 'regular' | 'pobre';
export type TrendDirection = 'mejorando' | 'estable' | 'empeorando';

export interface G01PublicSummary {
  readonly rating: G01Rating;
  readonly confidence_label: Confidence;
}

export interface G01PublicBreakdown {
  readonly safety: number | null;
  readonly quality: number | null;
  readonly momentum: number | null;
}

export interface G01Components extends Record<string, unknown> {
  readonly public_summary: G01PublicSummary;
  readonly public_breakdown: G01PublicBreakdown;
  readonly category_averages: G01PublicBreakdown;
  readonly trend_direction: TrendDirection;
  readonly coverage_pct: number;
}

export interface G01RawInput extends E01RawInput {
  readonly previous_value?: number | null;
}

export interface G01ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: G01Components;
}

function ratingFor(value: number): G01Rating {
  if (value >= 90) return 'excelente';
  if (value >= 70) return 'bueno';
  if (value >= 50) return 'regular';
  return 'pobre';
}

function trendFor(current: number, previous: number | null | undefined): TrendDirection {
  if (previous === null || previous === undefined || !Number.isFinite(previous)) return 'estable';
  const delta = current - previous;
  if (delta > 3) return 'mejorando';
  if (delta < -3) return 'empeorando';
  return 'estable';
}

function computeCategoryAverages(b_scores: Readonly<Record<string, number>>): G01PublicBreakdown {
  const buckets: Record<'safety' | 'quality' | 'momentum', number[]> = {
    safety: [],
    quality: [],
    momentum: [],
  };
  for (const key of B_SCORE_KEYS) {
    const v = b_scores[key];
    const cat = CATEGORY_MAPPING[key];
    if (cat && typeof v === 'number' && Number.isFinite(v)) {
      buckets[cat].push(v);
    }
  }
  const avg = (arr: number[]): number | null =>
    arr.length > 0 ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)) : null;
  return {
    safety: avg(buckets.safety),
    quality: avg(buckets.quality),
    momentum: avg(buckets.momentum),
  };
}

export function computeG01FullScorePublico(input: G01RawInput): G01ComputeResult {
  const e01 = computeE01FullProjectScore(input);
  const coverage_pct = e01.components.coverage_pct;

  if (e01.confidence === 'insufficient_data') {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        public_summary: {
          rating: 'pobre',
          confidence_label: 'insufficient_data',
        },
        public_breakdown: { safety: null, quality: null, momentum: null },
        category_averages: { safety: null, quality: null, momentum: null },
        trend_direction: 'estable',
        coverage_pct,
      },
    };
  }

  const category_averages = computeCategoryAverages(input.b_scores);
  const trend_direction = trendFor(e01.value, input.previous_value ?? null);

  return {
    value: e01.value,
    confidence: e01.confidence,
    components: {
      public_summary: {
        rating: ratingFor(e01.value),
        confidence_label: e01.confidence,
      },
      public_breakdown: category_averages,
      category_averages,
      trend_direction,
      coverage_pct,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.g01.insufficient';
  if (value >= 90) return 'ie.score.g01.excelente';
  if (value >= 70) return 'ie.score.g01.bueno';
  if (value >= 50) return 'ie.score.g01.regular';
  return 'ie.score.g01.pobre';
}

export const g01FullScorePublicoCalculator: Calculator = {
  scoreId: 'G01',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    if (!input.projectId) throw new Error('G01 requires projectId');
    const computed_at = new Date();

    // Fetch B_series + A12 desde project_scores (mismo shape que E01).
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

    const result = computeG01FullScorePublico({ b_scores, a12_score });

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
      trend_direction: (result.components as G01Components).trend_direction,
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
        rating: (result.components as G01Components).public_summary.rating,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

// Re-export shared constants para tests/consumers.
export { B_SCORE_KEYS, DEFAULT_E01_WEIGHTS };

export default g01FullScorePublicoCalculator;
