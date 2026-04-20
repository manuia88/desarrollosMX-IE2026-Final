// H10 Water Crisis — severidad de crisis hídrica SACMEX + CONAGUA acuíferos.
// Plan 8.B.15. Catálogo 03.8 §H10.
//
// Score INVERSO (mayor = menos crisis):
//   p_cortes       = min(40, dias_sin_agua_anual / 2)
//   p_sobreexplot  = min(30, sobreexplotacion_acuifero_pct)
//   p_nivel_decline= min(30, |nivel_acuifero_delta_m| × 10)
//   score = 100 − min(100, p_cortes + p_sobreexplot + p_nivel)
//
// Confidence: high si meses_datos ≥6, medium ≥3 (same SACMEX threshold).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = 100 − min(100, p_cortes(40) + p_sobreexplot(30) + p_nivel_decline(30)). Score INVERSO — mayor = menos crisis.',
  sources: ['sacmex', 'conagua'],
  weights: { cortes: 40, sobreexplotacion: 30, nivel_decline: 30 },
  references: [
    {
      name: 'SACMEX',
      url: 'https://data.cdmx.gob.mx/dataset/servicio-hidraulico',
      period: 'mensual',
    },
    { name: 'CONAGUA Acuíferos', url: 'https://sigagis.conagua.gob.mx/gas1/', period: 'anual' },
  ],
  confidence_thresholds: { high: 6, medium: 3, low: 1 },
  validity: { unit: 'months', value: 1 },
} as const;

export const reasoning_template =
  'Water Crisis de {zona_name} obtiene {score_value} con {dias_sin_agua_anual} días sin agua, sobreexplotación acuífero {sobreexplotacion_pct}%, nivel acuífero {nivel_delta_m}m. Severidad {severidad}.';

export interface H10Components extends Record<string, unknown> {
  readonly dias_sin_agua_anual: number;
  readonly sobreexplotacion_acuifero_pct: number;
  readonly nivel_acuifero_delta_m: number;
  readonly p_cortes: number;
  readonly p_sobreexplotacion: number;
  readonly p_nivel_decline: number;
  readonly total_penalty: number;
  readonly severidad: 'leve' | 'moderada' | 'grave' | 'critica';
  readonly meses_datos: number;
}

export interface H10RawInput {
  readonly meses_datos: number;
  readonly dias_sin_agua_anual: number;
  readonly sobreexplotacion_acuifero_pct: number;
  readonly nivel_acuifero_delta_m: number;
}

export interface H10ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H10Components;
}

function detectConfidence(meses: number): Confidence {
  if (meses >= 6) return 'high';
  if (meses >= 3) return 'medium';
  if (meses >= 1) return 'low';
  return 'insufficient_data';
}

function classifySeveridad(total: number): H10Components['severidad'] {
  if (total >= 70) return 'critica';
  if (total >= 45) return 'grave';
  if (total >= 20) return 'moderada';
  return 'leve';
}

export function computeH10Water(input: H10RawInput): H10ComputeResult {
  const p_cortes = Math.min(40, input.dias_sin_agua_anual / 2);
  const p_sobreexplotacion = Math.min(30, input.sobreexplotacion_acuifero_pct);
  const p_nivel_decline = Math.min(30, Math.abs(input.nivel_acuifero_delta_m) * 10);
  const total_penalty = Math.min(100, p_cortes + p_sobreexplotacion + p_nivel_decline);
  const value = Math.max(0, Math.min(100, Math.round(100 - total_penalty)));

  return {
    value,
    confidence: detectConfidence(input.meses_datos),
    components: {
      dias_sin_agua_anual: input.dias_sin_agua_anual,
      sobreexplotacion_acuifero_pct: input.sobreexplotacion_acuifero_pct,
      nivel_acuifero_delta_m: input.nivel_acuifero_delta_m,
      p_cortes: Number(p_cortes.toFixed(2)),
      p_sobreexplotacion,
      p_nivel_decline: Number(p_nivel_decline.toFixed(2)),
      total_penalty: Number(total_penalty.toFixed(2)),
      severidad: classifySeveridad(total_penalty),
      meses_datos: input.meses_datos,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h10.insufficient';
  if (value >= 75) return 'ie.score.h10.sin_crisis';
  if (value >= 50) return 'ie.score.h10.estres_moderado';
  if (value >= 25) return 'ie.score.h10.crisis_activa';
  return 'ie.score.h10.crisis_severa';
}

export const h10WaterCrisisCalculator: Calculator = {
  scoreId: 'H10',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'SACMEX+CONAGUA geo_data_points no ingested for zone' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'sacmex',
          url: 'https://data.cdmx.gob.mx/dataset/servicio-hidraulico',
          period: 'pending',
        },
        { source: 'conagua', url: 'https://sigagis.conagua.gob.mx/gas1/', period: 'pending' },
      ],
      provenance: {
        sources: [
          { name: 'sacmex', count: 0 },
          { name: 'conagua', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default h10WaterCrisisCalculator;
