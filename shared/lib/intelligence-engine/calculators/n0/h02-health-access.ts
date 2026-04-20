// H02 Health Access — acceso a salud basado en DGIS/CLUES.
// Plan 8.B.9. Catálogo 03.8 §H02.
//
// Fórmula (suma ponderada cap 100):
//   dist_score      = max(0, 40 − distancia_hospital_2do_km × 10)  // 0km=40, 4km+=0
//   clinicas_score  = min(30, clues_1er_nivel × 5)                 // 6+ → full
//   urgencias_score = min(30, urgencias_24h × 15)                  // 2+ → full
//
// Confidence DGIS: high ≥3 CLUES en 2km, medium ≥1, else insufficient.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula: 'score = max(0, 40 − dist_km·10) + min(30, clues_1er·5) + min(30, urgencias24h·15)',
  sources: ['dgis_clues'],
  weights: { distancia: 40, clinicas: 30, urgencias: 30 },
  references: [
    {
      name: 'DGIS CLUES',
      url: 'http://www.dgis.salud.gob.mx/contenidos/sinais/s_clues.html',
      period: 'semestral',
    },
  ],
  confidence_thresholds: { high: 3, medium: 1, low: 1 },
} as const;

export const reasoning_template =
  'Health Access de {zona_name} obtiene {score_value} por {clues_1er_nivel} clínicas 1er nivel + {clues_2do_nivel} hospitales 2do nivel + {urgencias_24h} urgencias 24h. Distancia hospital 2do: {distancia_hospital_2do_km}km.';

export interface H02Components extends Record<string, unknown> {
  readonly dist_score: number;
  readonly clinicas_score: number;
  readonly urgencias_score: number;
  readonly total_2km: number;
  readonly clues_1er_nivel: number;
  readonly clues_2do_nivel: number;
  readonly urgencias_24h: number;
  readonly distancia_hospital_2do_km: number;
}

export interface H02RawInput {
  readonly total_2km: number;
  readonly clues_1er_nivel: number;
  readonly clues_2do_nivel: number;
  readonly urgencias_24h: number;
  readonly distancia_hospital_2do_km: number;
}

export interface H02ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H02Components;
}

function detectConfidence(total_2km: number): Confidence {
  if (total_2km >= 3) return 'high';
  if (total_2km >= 1) return 'medium';
  return 'insufficient_data';
}

export function computeH02Health(input: H02RawInput): H02ComputeResult {
  const dist_score = Math.max(0, 40 - input.distancia_hospital_2do_km * 10);
  const clinicas_score = Math.min(30, input.clues_1er_nivel * 5);
  const urgencias_score = Math.min(30, input.urgencias_24h * 15);
  const value = Math.max(
    0,
    Math.min(100, Math.round(dist_score + clinicas_score + urgencias_score)),
  );
  const confidence = detectConfidence(input.total_2km);

  return {
    value,
    confidence,
    components: {
      dist_score: Number(dist_score.toFixed(2)),
      clinicas_score,
      urgencias_score,
      total_2km: input.total_2km,
      clues_1er_nivel: input.clues_1er_nivel,
      clues_2do_nivel: input.clues_2do_nivel,
      urgencias_24h: input.urgencias_24h,
      distancia_hospital_2do_km: input.distancia_hospital_2do_km,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h02.insufficient';
  if (value >= 80) return 'ie.score.h02.excelente';
  if (value >= 60) return 'ie.score.h02.buena';
  if (value >= 40) return 'ie.score.h02.moderada';
  return 'ie.score.h02.limitada';
}

export const h02HealthAccessCalculator: Calculator = {
  scoreId: 'H02',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'DGIS CLUES geo_data_points no ingested for zone+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'dgis',
          url: 'http://www.dgis.salud.gob.mx/contenidos/sinais/s_clues.html',
          period: 'pending_ingest',
        },
      ],
      provenance: {
        sources: [{ name: 'dgis', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default h02HealthAccessCalculator;
