// F05 Water — score de acceso al agua basado en SACMEX (cortes + presión + tandeos).
// Plan 8.B.5. Catálogo 03.8 §F05.
//
// Fórmula: score = 100 − min(100, p_cortes + p_presion + p_tandeo)
//   p_cortes  = min(60, dias_sin_agua_anual)               // 60 días → tope 60
//   p_presion = clamp(0-20, (180 − presion_kpa)/180 × 20)  // <180kpa penaliza
//   p_tandeo  = min(20, tandeos_mes_promedio × 5)
//
// Confidence SACMEX (catálogo 03.8): high ≥6 meses, medium ≥3, low ≥1.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { CONFIDENCE_THRESHOLDS, detectConfidenceByVolume } from '../confidence';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = 100 − min(100, p_cortes + p_presion + p_tandeo). p_cortes=min(60, dias_sin_agua), p_presion=clamp(0-20, (180-kpa)/180·20), p_tandeo=min(20, tandeos·5).',
  sources: ['sacmex'],
  weights: { cortes: 60, presion: 20, tandeos: 20 },
  references: [
    {
      name: 'SACMEX CDMX',
      url: 'https://data.cdmx.gob.mx/dataset/servicio-hidraulico',
      period: 'mensual',
    },
  ],
  confidence_thresholds: { high: 6, medium: 3, low: 1 }, // meses de datos
} as const;

export const reasoning_template =
  'Water de {zona_name} obtiene {score_value} porque hubo {dias_sin_agua_anual} días sin agua, presión promedio {presion_kpa}kPa y {tandeos_mes} tandeos/mes. Confianza {confidence} ({meses_datos} meses observados).';

const REFERENCE_PRESSURE_KPA = 180;

export interface F05Components extends Record<string, unknown> {
  readonly dias_sin_agua_anual: number;
  readonly presion_promedio_kpa: number;
  readonly tandeos_mes_promedio: number;
  readonly p_cortes: number;
  readonly p_presion: number;
  readonly p_tandeo: number;
  readonly total_penalty: number;
  readonly meses_datos: number;
}

export interface F05RawInput {
  readonly meses_datos: number;
  readonly dias_sin_agua_anual: number;
  readonly presion_promedio_kpa: number;
  readonly tandeos_mes_promedio: number;
}

export interface F05ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: F05Components;
}

export function computeF05Water(input: F05RawInput): F05ComputeResult {
  const { meses_datos, dias_sin_agua_anual, presion_promedio_kpa, tandeos_mes_promedio } = input;

  const p_cortes = Math.min(60, dias_sin_agua_anual);
  const p_presion = Math.max(
    0,
    Math.min(20, ((REFERENCE_PRESSURE_KPA - presion_promedio_kpa) / REFERENCE_PRESSURE_KPA) * 20),
  );
  const p_tandeo = Math.min(20, tandeos_mes_promedio * 5);
  const total_penalty = Math.min(100, p_cortes + p_presion + p_tandeo);
  const value = Math.max(0, Math.min(100, Math.round(100 - total_penalty)));

  const confidence = detectConfidenceByVolume(meses_datos, CONFIDENCE_THRESHOLDS.sacmex);

  return {
    value,
    confidence,
    components: {
      dias_sin_agua_anual,
      presion_promedio_kpa,
      tandeos_mes_promedio,
      p_cortes,
      p_presion: Number(p_presion.toFixed(2)),
      p_tandeo,
      total_penalty: Number(total_penalty.toFixed(2)),
      meses_datos,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.f05.insufficient';
  if (value >= 80) return 'ie.score.f05.excelente';
  if (value >= 60) return 'ie.score.f05.bueno';
  if (value >= 40) return 'ie.score.f05.precario';
  return 'ie.score.f05.crisis';
}

export const f05WaterCalculator: Calculator = {
  scoreId: 'F05',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'SACMEX geo_data_points no ingested for zone+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'sacmex',
          url: 'https://data.cdmx.gob.mx/dataset/servicio-hidraulico',
          period: 'pending_ingest',
        },
      ],
      provenance: {
        sources: [{ name: 'sacmex', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default f05WaterCalculator;
