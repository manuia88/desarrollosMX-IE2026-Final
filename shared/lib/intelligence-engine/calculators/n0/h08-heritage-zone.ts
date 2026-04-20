// H08 Heritage Zone — score patrimonial basado en INAH polígonos.
// Plan 8.B.13. Catálogo 03.8 §H08.
//
// Fórmula (suma cap 100):
//   centro_score     = 40 si dentro Centro Histórico, 20 si buffer, 0 else
//   monumentos_score = min(40, monumentos_500m × 6)   // 7 → full 40
//   arq_score        = min(20, zonas_arqueologicas_2km × 10)   // 2 → full
//
// Confidence: high (polígonos INAH son shapefile deterministic).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula: 'score = centro(40|20|0) + min(40, monumentos_500m·6) + min(20, zonas_arq_2km·10)',
  sources: ['inah'],
  weights: { centro_historico: 40, monumentos: 40, zonas_arqueologicas: 20 },
  references: [{ name: 'INAH', url: 'https://www.inah.gob.mx/', period: 'shapefile_snapshot' }],
  confidence_thresholds: { high: 1, medium: 0, low: 0 },
  validity: { unit: 'months', value: 6 },
} as const;

export const reasoning_template =
  'Heritage Zone de {zona_name} obtiene {score_value} porque {in_centro} está {centro_status}, tiene {monumentos_500m} monumentos INAH a 500m y {zonas_arqueologicas_2km} zonas arqueológicas en 2km.';

export interface H08Components extends Record<string, unknown> {
  readonly centro_score: number;
  readonly monumentos_score: number;
  readonly arq_score: number;
  readonly dentro_centro_historico: boolean;
  readonly dentro_buffer_centro: boolean;
  readonly monumentos_500m: number;
  readonly zonas_arqueologicas_2km: number;
}

export interface H08RawInput {
  readonly dentro_centro_historico: boolean;
  readonly dentro_buffer_centro: boolean;
  readonly monumentos_500m: number;
  readonly zonas_arqueologicas_2km: number;
}

export interface H08ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H08Components;
}

export function computeH08Heritage(input: H08RawInput): H08ComputeResult {
  const centro_score = input.dentro_centro_historico ? 40 : input.dentro_buffer_centro ? 20 : 0;
  const monumentos_score = Math.min(40, input.monumentos_500m * 6);
  const arq_score = Math.min(20, input.zonas_arqueologicas_2km * 10);
  const value = Math.max(0, Math.min(100, Math.round(centro_score + monumentos_score + arq_score)));
  const confidence: Confidence = 'high';

  return {
    value,
    confidence,
    components: {
      centro_score,
      monumentos_score,
      arq_score,
      dentro_centro_historico: input.dentro_centro_historico,
      dentro_buffer_centro: input.dentro_buffer_centro,
      monumentos_500m: input.monumentos_500m,
      zonas_arqueologicas_2km: input.zonas_arqueologicas_2km,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h08.insufficient';
  if (value >= 75) return 'ie.score.h08.patrimonial';
  if (value >= 40) return 'ie.score.h08.con_heritage';
  if (value >= 15) return 'ie.score.h08.escaso';
  return 'ie.score.h08.sin_heritage';
}

export const h08HeritageZoneCalculator: Calculator = {
  scoreId: 'H08',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'INAH polígonos no ingested for zone' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [{ source: 'inah', url: 'https://www.inah.gob.mx/', period: 'pending_ingest' }],
      provenance: {
        sources: [{ name: 'inah', count: 0 }],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default h08HeritageZoneCalculator;
