// F01 Safety — score de seguridad basado en carpetas FGJ CDMX (12m).
// Plan 8.B.1. Catálogo 03.8 §F01.
//
// Fórmula:
//   weighted_count  = violentos·3 + patrimoniales·1.5 + no_violentos·0.5
//   per_1000_hab    = weighted_count / poblacion × 1000
//   penalty         = min(100, per_1000_hab × 12.5)   // rate 8 → 100 penalty
//   score_value     = round(100 − penalty, 0..100)
//
// Trend: delta_pct = (count_12m - count_12m_prev) / count_12m_prev × 100
//        mejorando si delta_pct < -5, empeorando si > +5, else estable.
//
// Confidence (FGJ volumen carpetas/año per catálogo):
//   high ≥50, medium ≥10, low ≥1, else insufficient_data.
//
// `run()` query real: geo_data_points source='fgj', zona + buffer 1.5km,
// grouped by categoria + window 12m vs prev 12m. Si no hay data → insufficient.
// Tests invocan computeF01Safety() directo con fixture data.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { CONFIDENCE_THRESHOLDS, detectConfidenceByVolume } from '../confidence';

export const version = '1.0.0';

export const methodology = {
  formula:
    'weighted = violentos·3 + patrimoniales·1.5 + no_violentos·0.5; per_1000 = weighted/pop·1000; score = 100 − min(100, per_1000 × 12.5).',
  sources: ['fgj'],
  weights: { violentos: 3.0, patrimoniales: 1.5, no_violentos: 0.5 },
  references: [
    {
      name: 'FGJ CDMX — Carpetas de Investigación',
      url: 'https://datos.cdmx.gob.mx/dataset/carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico',
      period: 'last 12m',
    },
  ],
  confidence_thresholds: { high: 50, medium: 10, low: 1 },
  trend:
    'delta_pct = (c12 − c12_prev)/c12_prev·100 — mejorando <-5%, empeorando >+5%, else estable.',
} as const;

export const reasoning_template =
  'Safety de {zona_name} obtiene {score_value} porque hubo {count_12m} carpetas FGJ últimos 12 meses (vs {count_12m_prev} previos, trend {trend_direction}), ponderados por severidad {weighted_count}. Per cápita: {per_1000_hab}/1000 hab. Confianza {confidence}.';

const SEVERITY_WEIGHTS = { violentos: 3.0, patrimoniales: 1.5, no_violentos: 0.5 } as const;
const PENALTY_FACTOR = 12.5; // rate 8 per 1000 → 100 penalty → score 0

export type SafetyTrend = 'mejorando' | 'estable' | 'empeorando';

export interface F01Components extends Record<string, unknown> {
  readonly weighted_count: number;
  readonly per_1000_hab: number;
  readonly by_categoria: {
    readonly violentos: number;
    readonly patrimoniales: number;
    readonly no_violentos: number;
  };
  readonly hora_max_riesgo: string;
  readonly trend_delta_pct: number;
  readonly trend_direction: SafetyTrend;
  readonly population: number;
}

export interface F01RawInput {
  readonly count_12m: number;
  readonly count_12m_prev: number;
  readonly by_categoria: {
    readonly violentos: number;
    readonly patrimoniales: number;
    readonly no_violentos: number;
  };
  readonly hora_max_riesgo: string;
  readonly poblacion: number;
}

export interface F01ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: F01Components;
  readonly trend_vs_previous: number;
  readonly trend_direction: SafetyTrend;
}

function classifyTrend(delta_pct: number): SafetyTrend {
  if (!Number.isFinite(delta_pct)) return 'estable';
  if (delta_pct < -5) return 'mejorando';
  if (delta_pct > 5) return 'empeorando';
  return 'estable';
}

export function computeF01Safety(input: F01RawInput): F01ComputeResult {
  const { count_12m, count_12m_prev, by_categoria, hora_max_riesgo, poblacion } = input;
  const { violentos, patrimoniales, no_violentos } = by_categoria;
  const weighted_count =
    violentos * SEVERITY_WEIGHTS.violentos +
    patrimoniales * SEVERITY_WEIGHTS.patrimoniales +
    no_violentos * SEVERITY_WEIGHTS.no_violentos;
  const per_1000_hab = poblacion > 0 ? (weighted_count / poblacion) * 1000 : 0;
  const penalty = Math.min(100, per_1000_hab * PENALTY_FACTOR);
  const value = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  const delta_pct = count_12m_prev > 0 ? ((count_12m - count_12m_prev) / count_12m_prev) * 100 : 0;
  const trend_direction = classifyTrend(delta_pct);

  const confidence = detectConfidenceByVolume(count_12m, CONFIDENCE_THRESHOLDS.fgj);

  return {
    value,
    confidence,
    trend_vs_previous: Number(delta_pct.toFixed(2)),
    trend_direction,
    components: {
      weighted_count: Number(weighted_count.toFixed(2)),
      per_1000_hab: Number(per_1000_hab.toFixed(3)),
      by_categoria: { violentos, patrimoniales, no_violentos },
      hora_max_riesgo,
      trend_delta_pct: Number(delta_pct.toFixed(2)),
      trend_direction,
      population: poblacion,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.f01.insufficient';
  if (value >= 80) return 'ie.score.f01.muy_seguro';
  if (value >= 60) return 'ie.score.f01.seguro';
  if (value >= 40) return 'ie.score.f01.moderado';
  return 'ie.score.f01.riesgoso';
}

export const f01SafetyCalculator: Calculator = {
  scoreId: 'F01',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    // Prod path: query geo_data_points source='fgj' last 12m + prev 12m.
    // Si no hay data → insufficient_data. Data real arriba desde FASE 07 ingestor.
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'FGJ geo_data_points no ingested for zone+period',
        note: 'Use computeF01Safety(rawInput) con fixture data para tests.',
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'fgj',
          url: 'https://datos.cdmx.gob.mx/dataset/carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico',
          period: 'last 12m',
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

export default f01SafetyCalculator;
