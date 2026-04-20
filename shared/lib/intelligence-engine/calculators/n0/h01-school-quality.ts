// H01 School Quality — calidad educativa basado en SIGED SEP.
// Plan 8.B.8. Catálogo 03.8 §H01.
//
// Fórmula (suma ponderada cap 100):
//   densidad_score = min(40, total_1km × 5)      // 8 escuelas → full 40
//   premium_score  = min(30, top_20_count × 10)  // 3 top 20 → full 30
//   enlace_score   = enlace_percentil × 0.3      // 100 pct → 30
//
// Confidence SIGED: high ≥5 escuelas en 1km, medium ≥1, else insufficient.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula: 'score = min(40, total_1km·5) + min(30, top_20·10) + enlace_percentil·0.3',
  sources: ['siged'],
  weights: { densidad: 40, premium: 30, enlace: 30 },
  references: [
    {
      name: 'SIGED SEP',
      url: 'https://www.siged.sep.gob.mx/SIGED/',
      period: 'ciclo_escolar',
    },
    {
      name: 'ENLACE/PLANEA',
      url: 'https://www.planea.sep.gob.mx/',
      period: 'anual',
    },
  ],
  confidence_thresholds: { high: 5, medium: 1, low: 1 },
} as const;

export const reasoning_template =
  'School Quality de {zona_name} obtiene {score_value} por {total_1km} escuelas en 1km ({publicas} públicas, {privadas} privadas, {top_20_count} top-20 nacional), ENLACE percentil {enlace_percentil}.';

export interface H01Components extends Record<string, unknown> {
  readonly densidad_score: number;
  readonly premium_score: number;
  readonly enlace_score: number;
  readonly total_1km: number;
  readonly publicas: number;
  readonly privadas: number;
  readonly top_20_count: number;
  readonly nivel_primaria: number;
  readonly nivel_secundaria: number;
  readonly nivel_preparatoria: number;
  readonly enlace_percentil: number;
}

export interface H01RawInput {
  readonly total_1km: number;
  readonly publicas: number;
  readonly privadas: number;
  readonly top_20_count: number;
  readonly nivel_primaria: number;
  readonly nivel_secundaria: number;
  readonly nivel_preparatoria: number;
  readonly enlace_percentil: number;
}

export interface H01ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H01Components;
}

function detectConfidence(total_1km: number): Confidence {
  if (total_1km >= 5) return 'high';
  if (total_1km >= 1) return 'medium';
  return 'insufficient_data';
}

export function computeH01School(input: H01RawInput): H01ComputeResult {
  const densidad_score = Math.min(40, input.total_1km * 5);
  const premium_score = Math.min(30, input.top_20_count * 10);
  const enlace_score = Math.min(30, input.enlace_percentil * 0.3);
  const value = Math.max(
    0,
    Math.min(100, Math.round(densidad_score + premium_score + enlace_score)),
  );
  const confidence = detectConfidence(input.total_1km);

  return {
    value,
    confidence,
    components: {
      densidad_score,
      premium_score,
      enlace_score: Number(enlace_score.toFixed(2)),
      total_1km: input.total_1km,
      publicas: input.publicas,
      privadas: input.privadas,
      top_20_count: input.top_20_count,
      nivel_primaria: input.nivel_primaria,
      nivel_secundaria: input.nivel_secundaria,
      nivel_preparatoria: input.nivel_preparatoria,
      enlace_percentil: input.enlace_percentil,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h01.insufficient';
  if (value >= 80) return 'ie.score.h01.excelente';
  if (value >= 60) return 'ie.score.h01.buena';
  if (value >= 40) return 'ie.score.h01.moderada';
  return 'ie.score.h01.limitada';
}

export const h01SchoolQualityCalculator: Calculator = {
  scoreId: 'H01',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'SIGED geo_data_points no ingested for zone+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'siged',
          url: 'https://www.siged.sep.gob.mx/SIGED/',
          period: 'pending_ingest',
        },
      ],
      provenance: {
        sources: [{ name: 'siged', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default h01SchoolQualityCalculator;
