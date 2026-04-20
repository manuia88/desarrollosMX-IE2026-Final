// D07 STR vs LTR — wrapper sobre features/str-intelligence/lib/scores/str-ltr-opportunity.ts
// (FASE 07b). NO duplica lógica — reusa computeLtrStrOpportunity. AirROI como
// fuente de STR metrics (ADR-019, NO AirDNA). Plan 8.B.19. Catálogo 03.8 §D07.
// Tier 2.
//
// Input: row v_ltr_str_connection o equivalente con str_ltr_ratio + regime +
// sample counts. Output: score 0-100 que premia regimes STR>LTR con confianza
// suficiente.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeLtrStrOpportunity,
  type LtrStrConnectionRow,
  type LtrStrRegime,
} from '@/features/str-intelligence/lib/scores/str-ltr-opportunity';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula:
    'Reusa features/str-intelligence/lib/scores computeLtrStrOpportunity: regime (str_outperforms/parity/ltr_outperforms) · sample_confidence_multiplier. Fuente STR: AirROI (ADR-019).',
  sources: ['airroi', 'v_ltr_str_connection'],
  weights: {
    str_strongly_outperforms: 90,
    str_outperforms: 70,
    parity: 50,
    ltr_outperforms: 20,
  },
  references: [
    { name: 'AirROI', url: 'https://airroi.com/', period: 'mensual' },
    {
      name: 'features/str-intelligence/lib/scores (FASE 07b)',
      url: 'internal',
      period: 'realtime',
    },
  ],
  confidence_thresholds: { high: 12, medium: 6, low: 1 }, // str_sample_months
  validity: { unit: 'months', value: 1 },
} as const;

export const reasoning_template =
  'STR vs LTR {zona_name}: regime {regime} (ratio {ratio}). STR sample: {str_sample_months}m. LTR sample: {ltr_sample_listings} listings.';

export interface D07Components extends Record<string, unknown> {
  readonly regime: LtrStrRegime;
  readonly ratio: number | null;
  readonly str_sample_months: number;
  readonly ltr_sample_listings: number;
}

export interface D07RawInput extends LtrStrConnectionRow {}

export interface D07ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: D07Components;
}

export function computeD07StrLtr(input: D07RawInput): D07ComputeResult {
  // Reuso puro — NO duplicar cálculo.
  const upstream = computeLtrStrOpportunity(input);
  return {
    value: Math.max(0, Math.min(100, Math.round(upstream.score))),
    confidence: upstream.confidence,
    components: {
      regime: upstream.regime,
      ratio: upstream.ratio,
      str_sample_months: input.str_sample_months,
      ltr_sample_listings: input.ltr_sample_listings,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.d07.insufficient';
  if (value >= 80) return 'ie.score.d07.str_favorece';
  if (value >= 50) return 'ie.score.d07.str_moderado';
  if (value >= 25) return 'ie.score.d07.paridad';
  return 'ie.score.d07.ltr_favorece';
}

export const d07StrLtrCalculator: Calculator = {
  scoreId: 'D07',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    return {
      score_value: 0,
      score_label: getLabelKey(0, 'insufficient_data'),
      components: { reason: 'v_ltr_str_connection view no populated for zone' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence: 'insufficient_data',
      citations: [{ source: 'airroi', url: 'https://airroi.com/', period: 'pending' }],
      provenance: {
        sources: [{ name: 'airroi', count: 0 }],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default d07StrLtrCalculator;
