// N08 Walkability MX — IP propietaria DMX (adaptado MX, no Walk Score US).
// Plan §8.C.8 + catálogo 03.8 §N08.
//
// Fórmula:
//   density_score      = clamp(log10(total_denue + 1) × 25, 0, 100)
//   diversity_score    = (shannon/ln(12)) × 100
//   connectivity_score = clamp((metro + metrobus + ecobici×0.5) × 15, 0, 100)
//   amenities_score    = clamp((gastro + retail + salud×2 + educacion×2) / 3, 0, 100)
//   score = 0.25·density + 0.25·diversity + 0.20·connectivity + 0.30·amenities

import type { SupabaseClient } from '@supabase/supabase-js';
import { shannonDiversity } from '@/shared/lib/scian';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { CONFIDENCE_THRESHOLDS, composeConfidence, detectConfidenceByVolume } from '../confidence';

export const version = '1.0.0';

const SHANNON_MAX = Math.log(12);

export const methodology = {
  formula:
    'score = 0.25·log10(total+1)·25 + 0.25·(shannon/ln12)·100 + 0.20·(metro+metrobus+ecobici·0.5)·15 + 0.30·(gastro+retail+2·salud+2·educ)/3.',
  sources: ['denue', 'gtfs'],
  weights: { density: 0.25, diversity: 0.25, connectivity: 0.2, amenities: 0.3 },
  references: [
    {
      name: 'Catálogo 03.8 §N08 Walkability MX',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n08-walkability-mx',
    },
  ],
  validity: { unit: 'months', value: 3 } as const,
  recommendations: {
    low: ['ie.score.n08.recommendations.low.0', 'ie.score.n08.recommendations.low.1'],
    medium: ['ie.score.n08.recommendations.medium.0', 'ie.score.n08.recommendations.medium.1'],
    high: ['ie.score.n08.recommendations.high.0', 'ie.score.n08.recommendations.high.1'],
    insufficient_data: ['ie.score.n08.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'Walkability de {zona_name} obtiene {score_value} por densidad {density}, diversidad {diversity}, conectividad {connectivity}, amenidades {amenities}. Confianza {confidence}.';

export type WalkabilityBucket = 'low' | 'medium' | 'high';

export interface N08Components extends Record<string, unknown> {
  readonly densidad_manzanas: number;
  readonly diversidad_usos: number;
  readonly conectividad: number;
  readonly amenidades_400m: number;
  readonly total_denue: number;
  readonly bucket: WalkabilityBucket;
}

export interface N08RawInput {
  readonly total_denue: number;
  readonly by_macro_category: Readonly<Record<string, number>>;
  readonly gtfs: {
    readonly estaciones_metro_1km: number;
    readonly paradas_metrobus_500m: number;
    readonly ecobici_400m: number;
  };
}

export interface N08ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N08Components;
}

function bucketFor(value: number): WalkabilityBucket {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

export function computeN08Walkability(input: N08RawInput): N08ComputeResult {
  const { total_denue, by_macro_category, gtfs } = input;
  const density_score = Math.max(0, Math.min(100, Math.log10(total_denue + 1) * 25));
  const shannon = shannonDiversity(by_macro_category);
  const diversity_score = Math.max(0, Math.min(100, (shannon / SHANNON_MAX) * 100));
  const connectivity_score = Math.max(
    0,
    Math.min(
      100,
      (gtfs.estaciones_metro_1km + gtfs.paradas_metrobus_500m + gtfs.ecobici_400m * 0.5) * 15,
    ),
  );
  const amenities_raw =
    (by_macro_category.gastronomia ?? 0) +
    (by_macro_category.retail ?? 0) +
    (by_macro_category.salud ?? 0) * 2 +
    (by_macro_category.educacion ?? 0) * 2;
  const amenities_score = Math.max(0, Math.min(100, amenities_raw / 3));

  const raw =
    methodology.weights.density * density_score +
    methodology.weights.diversity * diversity_score +
    methodology.weights.connectivity * connectivity_score +
    methodology.weights.amenities * amenities_score;
  const value = Math.max(0, Math.min(100, Math.round(raw)));

  const denueConf = detectConfidenceByVolume(total_denue, CONFIDENCE_THRESHOLDS.denue);
  const gtfsCount = gtfs.estaciones_metro_1km + gtfs.paradas_metrobus_500m + gtfs.ecobici_400m;
  const gtfsConf = detectConfidenceByVolume(gtfsCount, CONFIDENCE_THRESHOLDS.gtfs);
  const confidence = composeConfidence([denueConf, gtfsConf]);

  return {
    value,
    confidence,
    components: {
      densidad_manzanas: Number(density_score.toFixed(2)),
      diversidad_usos: Number(diversity_score.toFixed(2)),
      conectividad: Number(connectivity_score.toFixed(2)),
      amenidades_400m: Number(amenities_score.toFixed(2)),
      total_denue,
      bucket: bucketFor(value),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n08.insufficient';
  if (value >= 80) return 'ie.score.n08.muy_walkable';
  if (value >= 60) return 'ie.score.n08.walkable';
  if (value >= 40) return 'ie.score.n08.mixto';
  return 'ie.score.n08.requiere_auto';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') return methodology.recommendations.insufficient_data;
  return methodology.recommendations[bucketFor(value)];
}

export const n08WalkabilityCalculator: Calculator = {
  scoreId: 'N08',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'DENUE + GTFS no ingested for zone+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'denue', url: 'https://www.inegi.org.mx/app/mapa/denue/', period: 'snapshot' },
        { source: 'gtfs', period: 'current' },
      ],
      provenance: {
        sources: [
          { name: 'denue', count: 0 },
          { name: 'gtfs', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default n08WalkabilityCalculator;
