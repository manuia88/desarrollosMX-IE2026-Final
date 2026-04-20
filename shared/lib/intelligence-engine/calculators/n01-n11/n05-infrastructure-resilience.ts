// N05 Infrastructure Resilience — IP propietaria DMX.
// Plan §8.C.5 + catálogo 03.8 §N05.
//
// Fórmula:
//   seismic_score    = mapa zona_geotecnica (I=100, II=85, IIIa=60, IIIb=45, IIIc=30, IIId=15)
//   water_score      = clamp(100 − dias_sin_agua × 2, 0, 100)
//   transit_redund   = clamp(transit_mode_count × 20, 0, 100)
//   score = 0.4·seismic + 0.3·water + 0.3·transit_redund
//
// Capacidad de la zona para absorber shocks (sismos, cortes agua, paros).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

type ZonaGeotecnica = 'I' | 'II' | 'IIIa' | 'IIIb' | 'IIIc' | 'IIId';
const SEISMIC_MAP: Record<ZonaGeotecnica, number> = {
  I: 100,
  II: 85,
  IIIa: 60,
  IIIb: 45,
  IIIc: 30,
  IIId: 15,
};

export const methodology = {
  formula:
    'score = 0.4·seismic_map(zona_geotecnica) + 0.3·clamp(100 − dias_sin_agua × 2) + 0.3·clamp(transit_modes × 20). Capacidad de absorber shocks.',
  sources: ['atlas_riesgos', 'sacmex', 'gtfs'],
  weights: { seismic: 0.4, water: 0.3, transit: 0.3 },
  references: [
    {
      name: 'Catálogo 03.8 §N05 Infrastructure Resilience',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n05-infrastructure-resilience',
    },
  ],
  validity: { unit: 'months', value: 3 } as const,
  recommendations: {
    low: ['ie.score.n05.recommendations.low.0', 'ie.score.n05.recommendations.low.1'],
    medium: ['ie.score.n05.recommendations.medium.0', 'ie.score.n05.recommendations.medium.1'],
    high: ['ie.score.n05.recommendations.high.0', 'ie.score.n05.recommendations.high.1'],
    insufficient_data: ['ie.score.n05.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'Resiliencia de {zona_name} obtiene {score_value} combinando seismic {seismic_score}, water {water_score}, transit {transit_score}. Confianza {confidence}.';

export type ResilienceBucket = 'low' | 'medium' | 'high';

export interface N05Components extends Record<string, unknown> {
  readonly seismic_score: number;
  readonly water_score: number;
  readonly transit_score: number;
  readonly zona_geotecnica: ZonaGeotecnica;
  readonly dias_sin_agua_anual: number;
  readonly transit_mode_count: number;
  readonly bucket: ResilienceBucket;
}

export interface N05RawInput {
  readonly zona_geotecnica: ZonaGeotecnica;
  readonly dias_sin_agua_anual: number;
  readonly gtfs: {
    readonly estaciones_metro_1km: number;
    readonly paradas_metrobus_500m: number;
    readonly estaciones_tren_2km: number;
    readonly ecobici_400m: number;
    readonly densidad_rutas_brt: number;
  };
}

export interface N05ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N05Components;
}

function bucketFor(value: number): ResilienceBucket {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

function transitModeCount(gtfs: N05RawInput['gtfs']): number {
  return (
    gtfs.estaciones_metro_1km +
    gtfs.paradas_metrobus_500m +
    gtfs.estaciones_tren_2km +
    gtfs.ecobici_400m * 0.3 +
    gtfs.densidad_rutas_brt
  );
}

export function computeN05Resilience(input: N05RawInput): N05ComputeResult {
  const seismic_score = SEISMIC_MAP[input.zona_geotecnica];
  const water_score = Math.max(0, Math.min(100, 100 - input.dias_sin_agua_anual * 2));
  const transit_mode_count = transitModeCount(input.gtfs);
  const transit_score = Math.max(0, Math.min(100, transit_mode_count * 20));

  const raw =
    methodology.weights.seismic * seismic_score +
    methodology.weights.water * water_score +
    methodology.weights.transit * transit_score;
  const value = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    value,
    confidence: 'high',
    components: {
      seismic_score,
      water_score: Number(water_score.toFixed(2)),
      transit_score: Number(transit_score.toFixed(2)),
      zona_geotecnica: input.zona_geotecnica,
      dias_sin_agua_anual: input.dias_sin_agua_anual,
      transit_mode_count: Number(transit_mode_count.toFixed(2)),
      bucket: bucketFor(value),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n05.insufficient';
  if (value >= 80) return 'ie.score.n05.alta_resiliencia';
  if (value >= 60) return 'ie.score.n05.resiliencia_balanceada';
  if (value >= 40) return 'ie.score.n05.resiliencia_moderada';
  return 'ie.score.n05.baja_resiliencia';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') return methodology.recommendations.insufficient_data;
  return methodology.recommendations[bucketFor(value)];
}

export const n05ResilienceCalculator: Calculator = {
  scoreId: 'N05',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'Atlas + SACMEX + GTFS no ingested for zone+period' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'atlas_riesgos', url: 'https://atlas.cdmx.gob.mx' },
        { source: 'sacmex', period: 'last 12m' },
        { source: 'gtfs', period: 'current' },
      ],
      provenance: {
        sources: [
          { name: 'atlas_riesgos', count: 0 },
          { name: 'sacmex', count: 0 },
          { name: 'gtfs', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default n05ResilienceCalculator;
