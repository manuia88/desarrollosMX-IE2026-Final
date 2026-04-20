// N01 Ecosystem Diversity (Shannon-Wiener) — IP propietaria DMX.
// Plan §8.C.1 + catálogo 03.8 §N01.
//
// Fórmula:
//   H = -Σ(p_i × ln(p_i)) sobre 12 macro_categories DENUE
//   score = (H / ln(12)) × 100
//
// Components: shannon_H, premium_ratio, total_establecimientos, top_3_categorias.
// Confidence DENUE (catálogo 03.8): high ≥100, medium ≥20, low ≥1.

import type { SupabaseClient } from '@supabase/supabase-js';
import { SCIAN_MACRO_CATEGORY_KEYS, shannonDiversity } from '@/shared/lib/scian';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { CONFIDENCE_THRESHOLDS, detectConfidenceByVolume } from '../confidence';

export const version = '1.0.0';

const SHANNON_MAX = Math.log(12);

export const methodology = {
  formula:
    'score = (H / ln(12)) × 100 donde H = -Σ(p_i × ln(p_i)) sobre 12 macro_categories DENUE.',
  sources: ['denue'],
  weights: { shannon: 1.0 },
  references: [
    { name: 'DENUE INEGI', url: 'https://www.inegi.org.mx/app/mapa/denue/', period: 'snapshot' },
    {
      name: 'Catálogo 03.8 §N01 Ecosystem Diversity (Shannon-Wiener)',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n01-ecosystem-diversity-shannon-wiener',
    },
  ],
  validity: { unit: 'months', value: 3 } as const,
  confidence_thresholds: { high: 100, medium: 20, low: 1 },
  scian_mapping: 'shared/lib/scian — 12 macro categorías',
  recommendations: {
    low: ['ie.score.n01.recommendations.low.0', 'ie.score.n01.recommendations.low.1'],
    medium: ['ie.score.n01.recommendations.medium.0', 'ie.score.n01.recommendations.medium.1'],
    high: ['ie.score.n01.recommendations.high.0', 'ie.score.n01.recommendations.high.1'],
    insufficient_data: ['ie.score.n01.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'Diversidad de {zona_name} obtiene {score_value} con Shannon H={shannon_H} sobre {total} establecimientos DENUE (ratio premium/basic={premium_ratio}). Top 3 categorías: {top_3_categorias}. Confianza {confidence}.';

export type DiversityBucket = 'low' | 'medium' | 'high';

export interface N01Components extends Record<string, unknown> {
  readonly shannon_H: number;
  readonly premium_ratio: number;
  readonly total_establecimientos: number;
  readonly top_3_categorias: readonly string[];
  readonly bucket: DiversityBucket;
}

export interface N01RawInput {
  readonly total: number;
  readonly tier_counts: {
    readonly high: number;
    readonly standard: number;
    readonly basic: number;
  };
  readonly by_macro_category: Readonly<Record<string, number>>;
}

export interface N01ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N01Components;
}

function topCategories(counts: Readonly<Record<string, number>>, n: number): readonly string[] {
  return [...SCIAN_MACRO_CATEGORY_KEYS]
    .map((k) => ({ key: k as string, count: counts[k] ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .filter((x) => x.count > 0)
    .map((x) => x.key);
}

function bucketFor(value: number): DiversityBucket {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

export function computeN01Diversity(input: N01RawInput): N01ComputeResult {
  const { total, tier_counts, by_macro_category } = input;

  const shannon_H = shannonDiversity(by_macro_category);
  const value = Math.max(0, Math.min(100, Math.round((shannon_H / SHANNON_MAX) * 100)));

  const premium_ratio = tier_counts.basic > 0 ? tier_counts.high / tier_counts.basic : 0;

  const confidence = detectConfidenceByVolume(total, CONFIDENCE_THRESHOLDS.denue);

  return {
    value,
    confidence,
    components: {
      shannon_H: Number(shannon_H.toFixed(3)),
      premium_ratio: Number(premium_ratio.toFixed(3)),
      total_establecimientos: total,
      top_3_categorias: topCategories(by_macro_category, 3),
      bucket: bucketFor(value),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n01.insufficient';
  if (value >= 80) return 'ie.score.n01.hiperdiverso';
  if (value >= 60) return 'ie.score.n01.diverso';
  if (value >= 40) return 'ie.score.n01.moderado';
  return 'ie.score.n01.homogeneo';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') return methodology.recommendations.insufficient_data;
  return methodology.recommendations[bucketFor(value)];
}

export const n01EcosystemDiversityCalculator: Calculator = {
  scoreId: 'N01',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'DENUE geo_data_points no ingested for zone+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'denue', url: 'https://www.inegi.org.mx/app/mapa/denue/', period: 'snapshot' },
      ],
      provenance: {
        sources: [{ name: 'denue', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default n01EcosystemDiversityCalculator;
