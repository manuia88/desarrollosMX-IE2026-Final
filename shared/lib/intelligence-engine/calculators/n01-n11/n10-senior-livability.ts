// N10 Senior Livability — IP propietaria DMX.
// Plan §8.C.10 + catálogo 03.8 §N10.
//
// Fórmula pesos catálogo (DGIS 0.25 + SIGED 0.15 + GTFS 0.30 + N01 diverso 0.30):
//   health_score     = clamp(100 − dist_hospital_km×10 + clues_2do×5 + urgencias×5, 0, 100)
//   edu_ext_score    = clamp(preparatoria_count × 20, 0, 100)
//   transit_esfuerzo = clamp(metrobus × 15 + ecobici × 3, 0, 100)
//   diversity_score  = (shannon/ln(12)) × 100
//   score = 0.25·health + 0.15·edu + 0.30·transit + 0.30·diversity
//
// Optimizado para perfil senior: bajo esfuerzo (metrobus/bici > escaleras metro),
// cercanía hospitales, universidad extensión, diversidad cotidiana.

import type { SupabaseClient } from '@supabase/supabase-js';
import { shannonDiversity } from '@/shared/lib/scian';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

const SHANNON_MAX = Math.log(12);

export const methodology = {
  formula:
    'score = 0.25·health_score + 0.15·edu_ext_score + 0.30·transit_esfuerzo + 0.30·diversity. Pesos DGIS/SIGED/GTFS/N01 per catálogo §N10.',
  sources: ['dgis', 'siged', 'gtfs', 'denue'],
  weights: { health: 0.25, edu_ext: 0.15, transit_esfuerzo: 0.3, diversity: 0.3 },
  references: [
    {
      name: 'Catálogo 03.8 §N10 Senior Livability',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n10-senior-livability',
    },
  ],
  validity: { unit: 'months', value: 3 } as const,
  recommendations: {
    low: ['ie.score.n10.recommendations.low.0', 'ie.score.n10.recommendations.low.1'],
    medium: ['ie.score.n10.recommendations.medium.0', 'ie.score.n10.recommendations.medium.1'],
    high: ['ie.score.n10.recommendations.high.0', 'ie.score.n10.recommendations.high.1'],
    insufficient_data: ['ie.score.n10.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'Senior livability de {zona_name} obtiene {score_value} combinando health {health}, educación extensión {edu}, transit bajo esfuerzo {transit}, diversidad {diversity}. Confianza {confidence}.';

export type SeniorLivabilityBucket = 'low' | 'medium' | 'high';

export interface N10Components extends Record<string, unknown> {
  readonly health_score: number;
  readonly edu_ext_score: number;
  readonly transit_esfuerzo: number;
  readonly diversity_score: number;
  readonly bucket: SeniorLivabilityBucket;
}

export interface N10RawInput {
  readonly dgis: {
    readonly clues_2do_nivel: number;
    readonly urgencias_24h: number;
    readonly distancia_hospital_2do_km: number;
  };
  readonly siged: {
    readonly nivel_preparatoria: number;
  };
  readonly gtfs: {
    readonly paradas_metrobus_500m: number;
    readonly ecobici_400m: number;
  };
  readonly by_macro_category: Readonly<Record<string, number>>;
}

export interface N10ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N10Components;
}

function bucketFor(value: number): SeniorLivabilityBucket {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

export function computeN10SeniorLivability(input: N10RawInput): N10ComputeResult {
  const health_score = Math.max(
    0,
    Math.min(
      100,
      100 -
        input.dgis.distancia_hospital_2do_km * 10 +
        input.dgis.clues_2do_nivel * 5 +
        input.dgis.urgencias_24h * 5,
    ),
  );
  const edu_ext_score = Math.max(0, Math.min(100, input.siged.nivel_preparatoria * 20));
  const transit_esfuerzo = Math.max(
    0,
    Math.min(100, input.gtfs.paradas_metrobus_500m * 15 + input.gtfs.ecobici_400m * 3),
  );
  const shannon = shannonDiversity(input.by_macro_category);
  const diversity_score = Math.max(0, Math.min(100, (shannon / SHANNON_MAX) * 100));

  const raw =
    methodology.weights.health * health_score +
    methodology.weights.edu_ext * edu_ext_score +
    methodology.weights.transit_esfuerzo * transit_esfuerzo +
    methodology.weights.diversity * diversity_score;
  const value = Math.max(0, Math.min(100, Math.round(raw)));

  // Confidence: high si hay clues_2do ≥1 + diversity shannon ≥1.5; else medium/low.
  const confidence: Confidence =
    input.dgis.clues_2do_nivel >= 1 && shannon >= 1.5
      ? 'high'
      : input.dgis.clues_2do_nivel >= 1 || shannon >= 1
        ? 'medium'
        : 'low';

  return {
    value,
    confidence,
    components: {
      health_score: Number(health_score.toFixed(2)),
      edu_ext_score: Number(edu_ext_score.toFixed(2)),
      transit_esfuerzo: Number(transit_esfuerzo.toFixed(2)),
      diversity_score: Number(diversity_score.toFixed(2)),
      bucket: bucketFor(value),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n10.insufficient';
  if (value >= 80) return 'ie.score.n10.ideal_senior';
  if (value >= 60) return 'ie.score.n10.apta_senior';
  if (value >= 40) return 'ie.score.n10.aceptable';
  return 'ie.score.n10.poco_apta';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') return methodology.recommendations.insufficient_data;
  return methodology.recommendations[bucketFor(value)];
}

export const n10SeniorLivabilityCalculator: Calculator = {
  scoreId: 'N10',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'DGIS + SIGED + GTFS + DENUE no ingested for zone+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'dgis', period: 'snapshot' },
        { source: 'siged', period: 'snapshot' },
        { source: 'gtfs', period: 'current' },
        { source: 'denue', period: 'snapshot' },
      ],
      provenance: {
        sources: [
          { name: 'dgis', count: 0 },
          { name: 'siged', count: 0 },
          { name: 'gtfs', count: 0 },
          { name: 'denue', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default n10SeniorLivabilityCalculator;
