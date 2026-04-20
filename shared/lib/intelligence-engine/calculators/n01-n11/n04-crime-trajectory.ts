// N04 Crime Trajectory — IP propietaria DMX (tier 3).
// Plan §8.C.4 + catálogo 03.8 §N04.
//
// Fórmula:
//   delta_violentos_pct     = (v_actual − v_prev) / max(1, v_prev)
//   delta_patrimoniales_pct = (p_actual − p_prev) / max(1, p_prev)
//   score = clamp(50 − 100·delta_violentos − 100·delta_patrimoniales, 0, 100)
//
// Mejora (negativo Δ) → +score; empeora (positivo Δ) → −score.
// Tier 3 (tendencia requiere ventana 12m particionada en 6m/6m).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { CONFIDENCE_THRESHOLDS, detectConfidenceByVolume } from '../confidence';

export const version = '1.0.0';

const WEIGHT_VIOLENTOS = 100;
const WEIGHT_PATRIMONIALES = 100;

export const methodology = {
  formula:
    'score = 50 − 100·Δvioletos_pct − 100·Δpatrimoniales_pct. Δ = (6m_actual − 6m_prev)/max(1, 6m_prev).',
  sources: ['fgj'],
  weights: { violentos: WEIGHT_VIOLENTOS, patrimoniales: WEIGHT_PATRIMONIALES },
  references: [
    {
      name: 'Catálogo 03.8 §N04 Crime Trajectory',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n04-crime-trajectory',
    },
  ],
  validity: { unit: 'months', value: 1 } as const,
  recommendations: {
    low: ['ie.score.n04.recommendations.low.0', 'ie.score.n04.recommendations.low.1'],
    medium: ['ie.score.n04.recommendations.medium.0', 'ie.score.n04.recommendations.medium.1'],
    high: ['ie.score.n04.recommendations.high.0', 'ie.score.n04.recommendations.high.1'],
    insufficient_data: ['ie.score.n04.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'Trayectoria criminal de {zona_name} obtiene {score_value} por Δvioletos {delta_violentos}% y Δpatrimoniales {delta_patrimoniales}% (últimos 6m vs 6m anteriores). Confianza {confidence}.';

export type CrimeTrajectoryBucket = 'low' | 'medium' | 'high';

export interface N04Components extends Record<string, unknown> {
  readonly count_6m_actual: number;
  readonly count_6m_prev: number;
  readonly violentos_6m_actual: number;
  readonly violentos_6m_prev: number;
  readonly patrimoniales_6m_actual: number;
  readonly patrimoniales_6m_prev: number;
  readonly delta_violentos_pct: number;
  readonly delta_patrimoniales_pct: number;
  readonly delta_total_pct: number;
  readonly bucket: CrimeTrajectoryBucket;
}

export interface N04RawInput {
  readonly count_6m_actual: number;
  readonly count_6m_prev: number;
  readonly violentos_6m_actual: number;
  readonly violentos_6m_prev: number;
  readonly patrimoniales_6m_actual: number;
  readonly patrimoniales_6m_prev: number;
}

export interface N04ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N04Components;
}

function bucketFor(value: number): CrimeTrajectoryBucket {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

function safeDelta(actual: number, prev: number): number {
  return (actual - prev) / Math.max(1, prev);
}

export function computeN04CrimeTrajectory(input: N04RawInput): N04ComputeResult {
  const {
    count_6m_actual,
    count_6m_prev,
    violentos_6m_actual,
    violentos_6m_prev,
    patrimoniales_6m_actual,
    patrimoniales_6m_prev,
  } = input;

  const delta_violentos_pct = safeDelta(violentos_6m_actual, violentos_6m_prev);
  const delta_patrimoniales_pct = safeDelta(patrimoniales_6m_actual, patrimoniales_6m_prev);
  const delta_total_pct = safeDelta(count_6m_actual, count_6m_prev);

  const raw =
    50 - WEIGHT_VIOLENTOS * delta_violentos_pct - WEIGHT_PATRIMONIALES * delta_patrimoniales_pct;
  const value = Math.max(0, Math.min(100, Math.round(raw)));

  const windowTotal = count_6m_actual + count_6m_prev;
  const confidence = detectConfidenceByVolume(windowTotal, CONFIDENCE_THRESHOLDS.fgj);

  return {
    value,
    confidence,
    components: {
      count_6m_actual,
      count_6m_prev,
      violentos_6m_actual,
      violentos_6m_prev,
      patrimoniales_6m_actual,
      patrimoniales_6m_prev,
      delta_violentos_pct: Number((delta_violentos_pct * 100).toFixed(2)),
      delta_patrimoniales_pct: Number((delta_patrimoniales_pct * 100).toFixed(2)),
      delta_total_pct: Number((delta_total_pct * 100).toFixed(2)),
      bucket: bucketFor(value),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n04.insufficient';
  if (value >= 75) return 'ie.score.n04.mejorando_fuerte';
  if (value >= 55) return 'ie.score.n04.mejorando';
  if (value >= 35) return 'ie.score.n04.estable';
  return 'ie.score.n04.empeorando';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') return methodology.recommendations.insufficient_data;
  return methodology.recommendations[bucketFor(value)];
}

export const n04CrimeTrajectoryCalculator: Calculator = {
  scoreId: 'N04',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'FGJ trajectory ventana 12m no ingested' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'fgj',
          url: 'https://datos.cdmx.gob.mx/dataset/carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico',
          period: 'last 12m (6m/6m window)',
        },
      ],
      provenance: {
        sources: [{ name: 'fgj', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default n04CrimeTrajectoryCalculator;
