// N06 School Premium — premio m² por proximidad a escuelas top 20% (derivado H01).
// Plan §8.C.6 + catálogo 03.8 §N06.
//
// Fórmula H1:
//   premium_signal = clamp(premium_pct × 3, 0, 85)
//   signal_strength = min(15, top_20_count × 5)
//   score = clamp(premium_signal + signal_strength, 0, 100)
//
// Tier 1 (no requiere ≥50 proyectos H1). H2 refinará con market_prices_secondary
// estadístico.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = clamp(premium_pct × 3, 0, 85) + min(15, top_20_count × 5). premium_pct = (premium_near_top_m2 / baseline_m2 − 1) × 100.',
  sources: ['siged', 'market_prices_secondary'],
  weights: { premium: 85, signal_strength: 15 },
  references: [
    {
      name: 'Catálogo 03.8 §N06 School Premium',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n06-school-premium',
    },
  ],
  validity: { unit: 'months', value: 6 } as const,
  recommendations: {
    low: ['ie.score.n06.recommendations.low.0', 'ie.score.n06.recommendations.low.1'],
    medium: ['ie.score.n06.recommendations.medium.0', 'ie.score.n06.recommendations.medium.1'],
    high: ['ie.score.n06.recommendations.high.0', 'ie.score.n06.recommendations.high.1'],
    insufficient_data: ['ie.score.n06.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'School premium de {zona_name} obtiene {score_value} por premium {premium_pct}% y {top_20_count} escuelas top. Confianza {confidence}.';

export type SchoolPremiumBucket = 'low' | 'medium' | 'high';

export interface N06Components extends Record<string, unknown> {
  readonly premium_pct: number;
  readonly baseline_m2_mxn: number;
  readonly premium_near_top_m2_mxn: number;
  readonly top_20_count: number;
  readonly bucket: SchoolPremiumBucket;
}

export interface N06RawInput {
  readonly premium_pct: number;
  readonly baseline_m2_mxn: number;
  readonly premium_near_top_m2_mxn: number;
  readonly top_20_count: number;
}

export interface N06ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N06Components;
}

function bucketFor(value: number): SchoolPremiumBucket {
  if (value >= 60) return 'high';
  if (value >= 30) return 'medium';
  return 'low';
}

export function computeN06SchoolPremium(input: N06RawInput): N06ComputeResult {
  const { premium_pct, top_20_count } = input;
  const premium_signal = Math.max(0, Math.min(85, premium_pct * 3));
  const signal_strength = Math.min(15, top_20_count * 5);
  const value = Math.max(0, Math.min(100, Math.round(premium_signal + signal_strength)));

  // Confidence: high si hay top_20 ≥1 + premium detectado, medium si uno de los dos.
  const confidence: Confidence =
    top_20_count >= 1 && premium_pct > 0
      ? 'high'
      : top_20_count >= 1 || premium_pct > 0
        ? 'medium'
        : 'low';

  return {
    value,
    confidence,
    components: {
      premium_pct,
      baseline_m2_mxn: input.baseline_m2_mxn,
      premium_near_top_m2_mxn: input.premium_near_top_m2_mxn,
      top_20_count,
      bucket: bucketFor(value),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n06.insufficient';
  if (value >= 80) return 'ie.score.n06.premium_prime';
  if (value >= 50) return 'ie.score.n06.premium_alto';
  if (value >= 25) return 'ie.score.n06.premium_moderado';
  return 'ie.score.n06.sin_premium';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') return methodology.recommendations.insufficient_data;
  return methodology.recommendations[bucketFor(value)];
}

export const n06SchoolPremiumCalculator: Calculator = {
  scoreId: 'N06',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'SIGED + market_prices_secondary no ingested' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'siged', url: 'https://www.siged.sep.gob.mx' },
        { source: 'market_prices_secondary', period: 'last 12m' },
      ],
      provenance: {
        sources: [
          { name: 'siged', count: 0 },
          { name: 'market_prices_secondary', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default n06SchoolPremiumCalculator;
