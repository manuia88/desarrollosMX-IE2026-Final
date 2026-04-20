// H04 Credit Demand — demanda crediticia saludable CNBV/Infonavit por municipio.
// Plan 8.B.11. Catálogo 03.8 §H04.
//
// Score premia demanda crediticia saludable (3-6% hogares con crédito activo)
// y penaliza tanto subdemanda (<1% mercado estancado) como sobrecalentamiento
// (>10% burbuja).
//
// Fórmula piecewise linear sobre ratio = creditos_12m / hogares_municipio × 100:
//   ratio < 1%     → score = ratio × 30           (0–30)
//   1% ≤ r < 3%    → score = 30 + (r−1) × 25      (30–80)
//   3% ≤ r ≤ 6%    → score = 80 + (r−3) × 6.67    (80–100) — sweet spot
//   6% < r ≤ 10%   → score = 100 − (r−6) × 5      (100–80)
//   r > 10%        → score = 80 − (r−10) × 4      (decrece overheating)
//
// Confidence CNBV: high ≥100 créditos/año, medium ≥30, low ≥5.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula:
    'Piecewise linear en ratio = creditos_12m/hogares·100. Sweet spot 3-6% (score 80-100). Subdemanda <1% score 0-30. Sobrecalentamiento >10% score decrece.',
  sources: ['cnbv', 'infonavit'],
  weights: { sweet_spot_range: [3, 6], overheat_threshold: 10 },
  references: [
    {
      name: 'CNBV Créditos Hipotecarios',
      url: 'https://portafolioinfo.cnbv.gob.mx/',
      period: 'mensual',
    },
    { name: 'Infonavit', url: 'https://portalmx.infonavit.org.mx/', period: 'mensual' },
  ],
  confidence_thresholds: { high: 100, medium: 30, low: 5 },
  validity: { unit: 'days', value: 30 },
} as const;

export const reasoning_template =
  'Credit Demand de {zona_name} obtiene {score_value} con {creditos_hipotecarios_12m} créditos hipotecarios últimos 12m sobre {hogares_municipio} hogares (ratio {ratio_pct}%). Trend 6m: {trend_direction}.';

export type CreditTrend = 'creciendo' | 'estable' | 'decreciendo';

export interface H04Components extends Record<string, unknown> {
  readonly ratio_pct: number;
  readonly creditos_hipotecarios_12m: number;
  readonly hogares_municipio: number;
  readonly creditos_6m_anteriores: number;
  readonly creditos_6m_actual: number;
  readonly trend_ratio: number;
  readonly trend_direction: CreditTrend;
}

export interface H04RawInput {
  readonly creditos_hipotecarios_12m: number;
  readonly hogares_municipio: number;
  readonly creditos_6m_anteriores: number;
  readonly creditos_6m_actual: number;
}

export interface H04ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H04Components;
}

function scoreFromRatio(ratio: number): number {
  if (ratio < 1) return ratio * 30;
  if (ratio < 3) return 30 + (ratio - 1) * 25;
  if (ratio <= 6) return 80 + (ratio - 3) * 6.67;
  if (ratio <= 10) return 100 - (ratio - 6) * 5;
  return Math.max(0, 80 - (ratio - 10) * 4);
}

function classifyTrend(ratio: number): CreditTrend {
  if (!Number.isFinite(ratio)) return 'estable';
  if (ratio > 1.05) return 'creciendo';
  if (ratio < 0.95) return 'decreciendo';
  return 'estable';
}

function detectConfidence(count: number): Confidence {
  if (count >= 100) return 'high';
  if (count >= 30) return 'medium';
  if (count >= 5) return 'low';
  return 'insufficient_data';
}

export function computeH04Credit(input: H04RawInput): H04ComputeResult {
  const ratio =
    input.hogares_municipio > 0
      ? (input.creditos_hipotecarios_12m / input.hogares_municipio) * 100
      : 0;
  const raw = scoreFromRatio(ratio);
  const value = Math.max(0, Math.min(100, Math.round(raw)));
  const trend_ratio =
    input.creditos_6m_anteriores > 0 ? input.creditos_6m_actual / input.creditos_6m_anteriores : 1;
  const trend_direction = classifyTrend(trend_ratio);
  const confidence = detectConfidence(input.creditos_hipotecarios_12m);

  return {
    value,
    confidence,
    components: {
      ratio_pct: Number(ratio.toFixed(3)),
      creditos_hipotecarios_12m: input.creditos_hipotecarios_12m,
      hogares_municipio: input.hogares_municipio,
      creditos_6m_anteriores: input.creditos_6m_anteriores,
      creditos_6m_actual: input.creditos_6m_actual,
      trend_ratio: Number(trend_ratio.toFixed(3)),
      trend_direction,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h04.insufficient';
  if (value >= 80) return 'ie.score.h04.saludable';
  if (value >= 60) return 'ie.score.h04.moderada';
  if (value >= 40) return 'ie.score.h04.debil';
  return 'ie.score.h04.estancada';
}

export const h04CreditDemandCalculator: Calculator = {
  scoreId: 'H04',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'CNBV/Infonavit macro_series no ingested for municipio+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'cnbv',
          url: 'https://portafolioinfo.cnbv.gob.mx/',
          period: 'pending_ingest',
        },
      ],
      provenance: {
        sources: [{ name: 'cnbv', count: 0 }],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default h04CreditDemandCalculator;
