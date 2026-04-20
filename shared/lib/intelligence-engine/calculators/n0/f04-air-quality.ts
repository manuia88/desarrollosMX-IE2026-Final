// STUB — activar FASE 29 con ingestor RAMA SINAICA.
// F04 Air Quality. Plan 8.B.4. Fase 29: AQI horario + interpolación desde
// 3 estaciones más cercanas ponderada por distancia inversa.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = 100 − AQI_percentil_zona. Interpolación inversa distancia si estación >5km. STUB hasta FASE 29.',
  sources: ['rama_sinaica'],
  weights: {},
  references: [
    { name: 'RAMA CDMX', url: 'https://aire.cdmx.gob.mx/', period: 'horario' },
    { name: 'SINAICA', url: 'https://sinaica.inecc.gob.mx/', period: 'horario' },
  ],
  confidence_thresholds: { high_km: 5, medium_km: 10, low_km: 15 },
} as const;

export const reasoning_template =
  'Air Quality para {zona_name} se activa en FASE 29 cuando RAMA SINAICA tenga ingestor operativo. Hasta entonces el score devuelve insufficient_data con disclaimer.';

export function getLabelKey(_value: number, _confidence: Confidence): string {
  return 'ie.score.f04.pending_h2';
}

export const f04AirQualityCalculator: Calculator = {
  scoreId: 'F04',
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
        reason: 'RAMA SINAICA ingestor activa FASE 29',
        aqi_placeholder: null,
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'rama_sinaica', url: 'https://aire.cdmx.gob.mx/', period: 'pending_h2' },
      ],
      provenance: {
        sources: [{ name: 'rama_sinaica', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        zona_name: input.zoneId ?? 'desconocida',
      },
    };
  },
};

export default f04AirQualityCalculator;
