// N09 Nightlife Economy — IP propietaria DMX.
// Plan §8.C.9 + catálogo 03.8 §N09.
//
// Fórmula:
//   venues          = gastronomia + cultura_entretenimiento
//   density_score   = clamp(log10(venues + 1) × 35, 0, 100)
//   safety_night    = clamp(100 − violentos_12m × 2, 0, 100)
//   score = density × (0.7 + 0.3 × safety_night/100)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { CONFIDENCE_THRESHOLDS, composeConfidence, detectConfidenceByVolume } from '../confidence';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = density × (0.7 + 0.3 · safety_night/100). density = clamp(log10(gastro+cultura+1)·35, 0, 100). safety_night = clamp(100 − violentos_12m × 2, 0, 100).',
  sources: ['denue', 'fgj'],
  weights: { density: 0.7, safety_night: 0.3 },
  references: [
    {
      name: 'Catálogo 03.8 §N09 Nightlife Economy',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n09-nightlife-economy',
    },
  ],
  validity: { unit: 'months', value: 3 } as const,
  recommendations: {
    low: ['ie.score.n09.recommendations.low.0', 'ie.score.n09.recommendations.low.1'],
    medium: ['ie.score.n09.recommendations.medium.0', 'ie.score.n09.recommendations.medium.1'],
    high: ['ie.score.n09.recommendations.high.0', 'ie.score.n09.recommendations.high.1'],
    insufficient_data: ['ie.score.n09.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'Nightlife de {zona_name} obtiene {score_value} por {venues} venues nocturnos (density {density}) y safety_night {safety_night}. Confianza {confidence}.';

export type NightlifeBucket = 'low' | 'medium' | 'high';

export interface N09Components extends Record<string, unknown> {
  readonly venues_count: number;
  readonly density_score: number;
  readonly safety_night: number;
  readonly violentos_12m: number;
  readonly hora_max_riesgo: string;
  readonly bucket: NightlifeBucket;
}

export interface N09RawInput {
  readonly by_macro_category: Readonly<Record<string, number>>;
  readonly total_denue: number;
  readonly violentos_12m: number;
  readonly count_12m_fgj: number;
  readonly hora_max_riesgo: string;
}

export interface N09ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N09Components;
}

function bucketFor(value: number): NightlifeBucket {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

export function computeN09Nightlife(input: N09RawInput): N09ComputeResult {
  const venues =
    (input.by_macro_category.gastronomia ?? 0) +
    (input.by_macro_category.cultura_entretenimiento ?? 0);
  const density_score = Math.max(0, Math.min(100, Math.log10(venues + 1) * 35));
  const safety_night = Math.max(0, Math.min(100, 100 - input.violentos_12m * 2));
  const value = Math.max(
    0,
    Math.min(100, Math.round(density_score * (0.7 + 0.3 * (safety_night / 100)))),
  );

  const denueConf = detectConfidenceByVolume(input.total_denue, CONFIDENCE_THRESHOLDS.denue);
  const fgjConf = detectConfidenceByVolume(input.count_12m_fgj, CONFIDENCE_THRESHOLDS.fgj);
  const confidence = composeConfidence([denueConf, fgjConf]);

  return {
    value,
    confidence,
    components: {
      venues_count: venues,
      density_score: Number(density_score.toFixed(2)),
      safety_night: Number(safety_night.toFixed(2)),
      violentos_12m: input.violentos_12m,
      hora_max_riesgo: input.hora_max_riesgo,
      bucket: bucketFor(value),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n09.insufficient';
  if (value >= 80) return 'ie.score.n09.hub_nocturno';
  if (value >= 60) return 'ie.score.n09.actividad_alta';
  if (value >= 40) return 'ie.score.n09.actividad_balanceada';
  return 'ie.score.n09.zona_dormitorio';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') return methodology.recommendations.insufficient_data;
  return methodology.recommendations[bucketFor(value)];
}

export const n09NightlifeCalculator: Calculator = {
  scoreId: 'N09',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'DENUE + FGJ no ingested for zone+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'denue', url: 'https://www.inegi.org.mx/app/mapa/denue/', period: 'snapshot' },
        { source: 'fgj', period: 'last 12m (nocturnos 20:00-04:00)' },
      ],
      provenance: {
        sources: [
          { name: 'denue', count: 0 },
          { name: 'fgj', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default n09NightlifeCalculator;
