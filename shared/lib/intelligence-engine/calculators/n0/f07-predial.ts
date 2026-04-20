// STUB — activar FASE 29 con ingestor Catastro CDMX (endpoints /api/admin/catastro/*).
// F07 Predial. Plan 8.B.7.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula: 'score = valor_catastral_pct_mercado — brecha fiscal. STUB hasta FASE 29.',
  sources: ['catastro_cdmx'],
  weights: {},
  references: [
    {
      name: 'Catastro CDMX',
      url: 'https://catastro.cdmx.gob.mx/',
      period: 'snapshot_anual',
    },
  ],
  confidence_thresholds: { high: 1, medium: 0, low: 0 },
} as const;

export const reasoning_template =
  'Predial para {zona_name} se activa en FASE 29 cuando el scraper oficial Catastro CDMX (/api/admin/catastro/*) ingeste shape files de valor catastral por manzana.';

export function getLabelKey(_value: number, _confidence: Confidence): string {
  return 'ie.score.f07.pending_h2';
}

export const f07PredialCalculator: Calculator = {
  scoreId: 'F07',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        stub: true,
        reason: 'Catastro CDMX ingestor activa FASE 29',
        valor_catastral_pct_mercado: null,
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'catastro_cdmx',
          url: 'https://catastro.cdmx.gob.mx/',
          period: 'pending_h2',
        },
      ],
      provenance: {
        sources: [{ name: 'catastro_cdmx', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default f07PredialCalculator;
