// STUB — activar FASE 29 con ingestor 0311 Locatel (API datos abiertos CDMX).
// H06 City Services. Plan 8.B.12.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula: 'score = reportes_atendidos / reportes_total × 100. STUB hasta FASE 29.',
  sources: ['locatel_0311'],
  weights: {},
  references: [
    {
      name: '0311 Locatel CDMX',
      url: 'https://datos.cdmx.gob.mx/dataset/reportes-locatel-0311',
      period: 'mensual',
    },
  ],
  confidence_thresholds: { high: 100, medium: 30, low: 5 },
} as const;

export const reasoning_template =
  'City Services para {zona_name} se activa en FASE 29 cuando 0311 Locatel tenga ingestor operativo (tasa reportes atendidos por alcaldía).';

export function getLabelKey(_value: number, _confidence: Confidence): string {
  return 'ie.score.h06.pending_h2';
}

export const h06CityServicesCalculator: Calculator = {
  scoreId: 'H06',
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
        reason: '0311 Locatel ingestor activa FASE 29',
        tasa_atendidos_pct: null,
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'locatel_0311',
          url: 'https://datos.cdmx.gob.mx/dataset/reportes-locatel-0311',
          period: 'pending_h2',
        },
      ],
      provenance: {
        sources: [{ name: 'locatel_0311', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default h06CityServicesCalculator;
