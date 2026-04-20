// N07 Water Security — IP propietaria DMX.
// Plan §8.C.7 + catálogo 03.8 §N07.
//
// Fórmula H1 (aproxima catalog):
//   water_availability = max(0, 100 − dias_sin_agua_anual × 1.5)
//   acuifero_security   = max(0, 1 − sobreexplotacion_acuifero_pct/100)
//   score = water_availability × acuifero_security
//
// Xochimilco (35d + 30% sobreexp) → score ≈33. Polanco (2d + 3% sobreexp) → ≈94.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { CONFIDENCE_THRESHOLDS, composeConfidence, detectConfidenceByVolume } from '../confidence';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = max(0, 100 − dias_sin_agua × 1.5) × max(0, 1 − sobreexp_pct/100). Combina SACMEX cortes + CONAGUA acuífero.',
  sources: ['sacmex', 'conagua'],
  weights: { water_availability: 1.0, acuifero_security: 1.0 },
  references: [
    {
      name: 'Catálogo 03.8 §N07 Water Security',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n07-water-security',
    },
  ],
  validity: { unit: 'months', value: 3 } as const,
  recommendations: {
    low: ['ie.score.n07.recommendations.low.0', 'ie.score.n07.recommendations.low.1'],
    medium: ['ie.score.n07.recommendations.medium.0', 'ie.score.n07.recommendations.medium.1'],
    high: ['ie.score.n07.recommendations.high.0', 'ie.score.n07.recommendations.high.1'],
    insufficient_data: ['ie.score.n07.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'Seguridad hídrica de {zona_name} obtiene {score_value} por {dias_sin_agua} días sin agua/año y {sobreexp}% sobreexplotación acuífero. Confianza {confidence}.';

export type WaterSecurityBucket = 'low' | 'medium' | 'high';

export interface N07Components extends Record<string, unknown> {
  readonly dias_sin_agua_anual: number;
  readonly sobreexplotacion_pct: number;
  readonly nivel_acuifero_delta_12m_m: number;
  readonly water_availability: number;
  readonly acuifero_security: number;
  readonly bucket: WaterSecurityBucket;
}

export interface N07RawInput {
  readonly dias_sin_agua_anual: number;
  readonly meses_datos_sacmex: number;
  readonly sobreexplotacion_pct: number;
  readonly nivel_acuifero_delta_12m_m: number;
}

export interface N07ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N07Components;
}

function bucketFor(value: number): WaterSecurityBucket {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

export function computeN07WaterSecurity(input: N07RawInput): N07ComputeResult {
  const water_availability = Math.max(0, Math.min(100, 100 - input.dias_sin_agua_anual * 1.5));
  const acuifero_security = Math.max(0, 1 - input.sobreexplotacion_pct / 100);
  const raw = water_availability * acuifero_security;
  const value = Math.max(0, Math.min(100, Math.round(raw)));

  const sacmexConf = detectConfidenceByVolume(
    input.meses_datos_sacmex,
    CONFIDENCE_THRESHOLDS.sacmex,
  );
  // CONAGUA placeholder: alta si sobreexp definida (>0).
  const conaguaConf: Confidence = input.sobreexplotacion_pct >= 0 ? 'high' : 'insufficient_data';
  const confidence = composeConfidence([sacmexConf, conaguaConf]);

  return {
    value,
    confidence,
    components: {
      dias_sin_agua_anual: input.dias_sin_agua_anual,
      sobreexplotacion_pct: input.sobreexplotacion_pct,
      nivel_acuifero_delta_12m_m: input.nivel_acuifero_delta_12m_m,
      water_availability: Number(water_availability.toFixed(2)),
      acuifero_security: Number((acuifero_security * 100).toFixed(2)),
      bucket: bucketFor(value),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n07.insufficient';
  if (value >= 80) return 'ie.score.n07.seguridad_alta';
  if (value >= 60) return 'ie.score.n07.seguridad_aceptable';
  if (value >= 35) return 'ie.score.n07.tension_moderada';
  return 'ie.score.n07.crisis_cronica';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') return methodology.recommendations.insufficient_data;
  return methodology.recommendations[bucketFor(value)];
}

export const n07WaterSecurityCalculator: Calculator = {
  scoreId: 'N07',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'SACMEX + CONAGUA no ingested for zone+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'sacmex', period: 'last 12m' },
        { source: 'conagua', period: 'last 12m' },
      ],
      provenance: {
        sources: [
          { name: 'sacmex', count: 0 },
          { name: 'conagua', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default n07WaterSecurityCalculator;
