// C06 Commission Forecast — score N3 de proyección de comisiones del asesor
// en horizontes 3m/6m/12m usando pipeline búsquedas × C01 lead scores × B08
// absorption proyectos.
// Plan FASE 10 §10.B.9. Catálogo 03.8 §C06. Tier 3. Categoría dev.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula:
    'forecast_Xm = Σ (pipeline_value × lead_probability × absorption_factor × commission_pct)',
  sources: ['pipeline', 'operaciones', 'zone_scores:C01', 'zone_scores:B08'],
  dependencies: [
    { score_id: 'C01', weight: 0.5, role: 'lead_probability', critical: false },
    { score_id: 'B08', weight: 0.3, role: 'absorption', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §C06 Commission Forecast',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#c06-commission-forecast',
    },
    { name: 'Plan FASE 10 §10.B.9', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'C01', impact_pct_per_10pct_change: 4.0 },
    { dimension_id: 'B08', impact_pct_per_10pct_change: 2.5 },
  ],
} as const;

export const reasoning_template =
  'Commission Forecast asesor {advisor_id}: 3m ${forecast_3m_mxn}, 6m ${forecast_6m_mxn}, 12m ${forecast_12m_mxn}. Leads pipeline {pipeline_count}.';

export interface PipelineLead {
  readonly leadId: string;
  readonly value_mxn: number;
  readonly lead_score: number; // 0-100 (C01)
  readonly absorption_pct: number; // B08 project absorption 0-100
  readonly commission_pct: number; // 0-1 (0.03 = 3%)
}

export interface C06Components extends Record<string, unknown> {
  readonly pipeline_count: number;
  readonly pipeline_total_mxn: number;
  readonly forecast_3m_mxn: number;
  readonly forecast_6m_mxn: number;
  readonly forecast_12m_mxn: number;
  readonly forecast_quality_pct: number;
  readonly avg_lead_score: number;
}

export interface C06RawInput {
  readonly pipeline: readonly PipelineLead[];
  readonly horizon_3m_factor?: number; // default 0.3
  readonly horizon_6m_factor?: number; // default 0.6
  readonly horizon_12m_factor?: number; // default 1.0
}

export interface C06ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: C06Components;
}

export function computeC06Commission(input: C06RawInput): C06ComputeResult {
  if (input.pipeline.length === 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        pipeline_count: 0,
        pipeline_total_mxn: 0,
        forecast_3m_mxn: 0,
        forecast_6m_mxn: 0,
        forecast_12m_mxn: 0,
        forecast_quality_pct: 0,
        avg_lead_score: 0,
      },
    };
  }

  const factor3 = input.horizon_3m_factor ?? 0.3;
  const factor6 = input.horizon_6m_factor ?? 0.6;
  const factor12 = input.horizon_12m_factor ?? 1.0;

  let total = 0;
  let leadScoreSum = 0;
  let forecast3 = 0;
  let forecast6 = 0;
  let forecast12 = 0;

  for (const l of input.pipeline) {
    const prob = Math.max(0, Math.min(1, l.lead_score / 100));
    const absorption = Math.max(0, Math.min(1, l.absorption_pct / 100));
    const commission = l.value_mxn * l.commission_pct;
    forecast3 += commission * prob * absorption * factor3;
    forecast6 += commission * prob * absorption * factor6;
    forecast12 += commission * prob * absorption * factor12;
    total += l.value_mxn;
    leadScoreSum += l.lead_score;
  }

  const avgLead = Math.round(leadScoreSum / input.pipeline.length);
  const qualityPct = Math.min(
    100,
    Math.round(
      (input.pipeline.filter((l) => l.lead_score >= 60).length / input.pipeline.length) * 100,
    ),
  );

  const score = Math.min(100, Math.round(qualityPct * 0.5 + (avgLead / 100) * 100 * 0.5));

  const enough = input.pipeline.length >= 5;
  const confidence: Confidence = enough ? (qualityPct >= 50 ? 'high' : 'medium') : 'low';

  return {
    value: score,
    confidence,
    components: {
      pipeline_count: input.pipeline.length,
      pipeline_total_mxn: Math.round(total),
      forecast_3m_mxn: Math.round(forecast3),
      forecast_6m_mxn: Math.round(forecast6),
      forecast_12m_mxn: Math.round(forecast12),
      forecast_quality_pct: qualityPct,
      avg_lead_score: avgLead,
    },
  };
}

export function getLabelKey(score: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.c06.insufficient';
  if (score >= 75) return 'ie.score.c06.forecast_alto';
  if (score >= 50) return 'ie.score.c06.forecast_medio';
  if (score >= 25) return 'ie.score.c06.forecast_bajo';
  return 'ie.score.c06.forecast_nulo';
}

export const c06CommissionForecastCalculator: Calculator = {
  scoreId: 'C06',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence = Array.isArray(params.pipeline) ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'prod path stub — invocar computeC06Commission directo' },
      inputs_used: { periodDate: input.periodDate, userId: input.userId ?? null },
      confidence,
      citations: [
        { source: 'pipeline', period: input.periodDate },
        { source: 'zone_scores:C01', period: input.periodDate },
        { source: 'zone_scores:B08', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'pipeline', count: 0 },
          { name: 'zone_scores:C01', count: 0 },
          { name: 'zone_scores:B08', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { advisor_id: input.userId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default c06CommissionForecastCalculator;
