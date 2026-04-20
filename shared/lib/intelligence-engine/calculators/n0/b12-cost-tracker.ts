// B12 Cost Tracker — índice rolling 12m INPP construcción (INEGI) + materiales
// + mano de obra para alertar sobre presión inflacionaria en costos desarrollo.
// Plan 8.B.18. Catálogo 03.8 §B12.
//
// Fórmula:
//   weighted_delta = inpp·0.5 + materiales·0.3 + mano_obra·0.2
//   score          = max(0, 100 − weighted_delta·5)    // delta 20% → score 0
//
// alertLevel:
//   normal   → delta ≤ 10%
//   warning  → 10% < delta ≤ 15%
//   critical → delta > 15%
//
// Confidence: high si los 3 componentes presentes; medium 2/3; low 1/3.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { InppLevel } from '../../__fixtures__/cdmx-zones';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula:
    'weighted_delta = inpp·0.5 + materiales·0.3 + mano_obra·0.2; score = max(0, 100 − weighted_delta·5).',
  sources: ['inegi_inpp'],
  weights: { inpp_construccion: 0.5, materiales: 0.3, mano_obra: 0.2 },
  references: [
    {
      name: 'INEGI INPP — Índice Nacional de Precios al Productor',
      url: 'https://www.inegi.org.mx/temas/inpp/',
      period: 'mensual',
    },
  ],
  confidence_thresholds: { high: 3, medium: 2, low: 1 },
  alert_thresholds: {
    normal_max_pct: 10,
    warning_max_pct: 15,
  },
} as const;

export const reasoning_template =
  'Cost Tracker {zona_name} obtiene {score_value} con delta construcción {inpp_construccion_delta_12m}%, materiales {materiales_delta_12m}%, mano de obra {mano_obra_delta_12m}%. Weighted delta: {weighted_delta}%. AlertLevel: {alert_level}.';

export interface B12Components extends Record<string, unknown> {
  readonly inpp_construccion_delta_12m: number;
  readonly materiales_delta_12m: number;
  readonly mano_obra_delta_12m: number;
  readonly weighted_delta: number;
  readonly alert_level: InppLevel;
}

export interface B12RawInput {
  readonly inpp_construccion_delta_12m: number;
  readonly materiales_delta_12m: number;
  readonly mano_obra_delta_12m: number;
}

export interface B12ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B12Components;
}

function classifyAlert(weighted_delta: number): InppLevel {
  if (weighted_delta > 15) return 'critical';
  if (weighted_delta > 10) return 'warning';
  return 'normal';
}

function detectConfidence(input: B12RawInput): Confidence {
  const count = [
    input.inpp_construccion_delta_12m,
    input.materiales_delta_12m,
    input.mano_obra_delta_12m,
  ].filter((v) => Number.isFinite(v)).length;
  if (count >= 3) return 'high';
  if (count >= 2) return 'medium';
  if (count >= 1) return 'low';
  return 'insufficient_data';
}

export function computeB12Cost(input: B12RawInput): B12ComputeResult {
  const weighted_delta =
    input.inpp_construccion_delta_12m * 0.5 +
    input.materiales_delta_12m * 0.3 +
    input.mano_obra_delta_12m * 0.2;
  const value = Math.max(0, Math.min(100, Math.round(100 - weighted_delta * 5)));
  const alert_level = classifyAlert(weighted_delta);

  return {
    value,
    confidence: detectConfidence(input),
    components: {
      inpp_construccion_delta_12m: input.inpp_construccion_delta_12m,
      materiales_delta_12m: input.materiales_delta_12m,
      mano_obra_delta_12m: input.mano_obra_delta_12m,
      weighted_delta: Number(weighted_delta.toFixed(2)),
      alert_level,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b12.insufficient';
  if (value >= 80) return 'ie.score.b12.normal';
  if (value >= 50) return 'ie.score.b12.warning';
  return 'ie.score.b12.critical';
}

export const b12CostTrackerCalculator: Calculator = {
  scoreId: 'B12',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'INEGI INPP macro_series no ingested for period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'inegi_inpp', url: 'https://www.inegi.org.mx/temas/inpp/', period: 'mensual' },
      ],
      provenance: {
        sources: [{ name: 'inegi_inpp', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default b12CostTrackerCalculator;
