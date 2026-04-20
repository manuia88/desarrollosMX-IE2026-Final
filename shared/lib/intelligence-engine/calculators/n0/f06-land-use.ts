// STUB — activar FASE 29 con ingestor SEDUVI (uso de suelo CDMX).
// F06 Land Use. Plan 8.B.6.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula:
    'Pesos por zonificación SEDUVI: mixto > habitacional_alta > corredor > industrial. STUB hasta FASE 29.',
  sources: ['seduvi'],
  weights: { mixto: 1.0, habitacional_alta: 0.8, corredor: 0.6, industrial: 0.3 },
  references: [
    {
      name: 'SEDUVI CDMX',
      url: 'https://www.seduvi.cdmx.gob.mx/',
      period: 'plan_desarrollo_urbano',
    },
  ],
  confidence_thresholds: { high: 1, medium: 0, low: 0 },
} as const;

export const reasoning_template =
  'Land Use para {zona_name} se activa en FASE 29 cuando SEDUVI tenga ingestor operativo (shape files uso de suelo por manzana).';

export function getLabelKey(_value: number, _confidence: Confidence): string {
  return 'ie.score.f06.pending_h2';
}

export const f06LandUseCalculator: Calculator = {
  scoreId: 'F06',
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
        reason: 'SEDUVI ingestor activa FASE 29',
        zonificacion: 'pending',
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'seduvi',
          url: 'https://www.seduvi.cdmx.gob.mx/',
          period: 'pending_h2',
        },
      ],
      provenance: {
        sources: [{ name: 'seduvi', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default f06LandUseCalculator;
