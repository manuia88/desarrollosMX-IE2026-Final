// F02 Transit — densidad de transporte público basado en GTFS CDMX.
// Plan 8.B.2. Catálogo 03.8 §F02.
//
// Fórmula (suma ponderada, tope 100):
//   metro_score     = min(40, estaciones_metro_1km × 20)         // 2 est → 40
//   metrobus_score  = min(20, paradas_metrobus_500m × 5)         // 4 par → 20
//   tren_score      = min(20, estaciones_tren_2km × 20)          // 1 est → 20
//   ecobici_score   = min(10, ecobici_400m × 2)                  // 5 est → 10
//   brt_score       = min(10, densidad_rutas_brt × 5)            // dens 2 → 10
//   total           = sum (cap 100)
//
// Confidence GTFS (catálogo 03.8): high ≥3 estaciones/paradas totales en
// 1km-2km, medium ≥1, else insufficient_data.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { CONFIDENCE_THRESHOLDS, detectConfidenceByVolume } from '../confidence';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = min(40, metro·20) + min(20, metrobus·5) + min(20, tren·20) + min(10, ecobici·2) + min(10, brt_dens·5)',
  sources: ['gtfs'],
  weights: { metro: 40, metrobus: 20, tren: 20, ecobici: 10, brt: 10 },
  references: [
    {
      name: 'Metro CDMX GTFS',
      url: 'https://metro.cdmx.gob.mx/',
      period: 'realtime',
    },
    {
      name: 'Metrobús GTFS',
      url: 'https://www.metrobus.cdmx.gob.mx/',
      period: 'realtime',
    },
  ],
  confidence_thresholds: { high: 3, medium: 1, low: 1 },
} as const;

export const reasoning_template =
  'Transit de {zona_name} obtiene {score_value} porque tiene {estaciones_metro_1km} estaciones Metro a 1km, {paradas_metrobus_500m} paradas Metrobús a 500m, {estaciones_tren_2km} tren y {ecobici_400m} EcoBici a 400m. Confianza {confidence}.';

export interface F02Components extends Record<string, unknown> {
  readonly metro_score: number;
  readonly metrobus_score: number;
  readonly tren_score: number;
  readonly ecobici_score: number;
  readonly brt_score: number;
  readonly estaciones_metro_1km: number;
  readonly paradas_metrobus_500m: number;
  readonly estaciones_tren_2km: number;
  readonly ecobici_400m: number;
  readonly densidad_rutas_brt: number;
  readonly total_transit_points: number;
}

export interface F02RawInput {
  readonly estaciones_metro_1km: number;
  readonly paradas_metrobus_500m: number;
  readonly estaciones_tren_2km: number;
  readonly ecobici_400m: number;
  readonly densidad_rutas_brt: number;
}

export interface F02ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: F02Components;
}

export function computeF02Transit(input: F02RawInput): F02ComputeResult {
  const metro_score = Math.min(40, input.estaciones_metro_1km * 20);
  const metrobus_score = Math.min(20, input.paradas_metrobus_500m * 5);
  const tren_score = Math.min(20, input.estaciones_tren_2km * 20);
  const ecobici_score = Math.min(10, input.ecobici_400m * 2);
  const brt_score = Math.min(10, input.densidad_rutas_brt * 5);
  const total = metro_score + metrobus_score + tren_score + ecobici_score + brt_score;
  const value = Math.max(0, Math.min(100, Math.round(total)));

  const total_transit_points =
    input.estaciones_metro_1km + input.paradas_metrobus_500m + input.estaciones_tren_2km;
  const confidence = detectConfidenceByVolume(total_transit_points, CONFIDENCE_THRESHOLDS.gtfs);

  return {
    value,
    confidence,
    components: {
      metro_score,
      metrobus_score,
      tren_score,
      ecobici_score,
      brt_score: Number(brt_score.toFixed(2)),
      estaciones_metro_1km: input.estaciones_metro_1km,
      paradas_metrobus_500m: input.paradas_metrobus_500m,
      estaciones_tren_2km: input.estaciones_tren_2km,
      ecobici_400m: input.ecobici_400m,
      densidad_rutas_brt: input.densidad_rutas_brt,
      total_transit_points,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.f02.insufficient';
  if (value >= 80) return 'ie.score.f02.excelente';
  if (value >= 60) return 'ie.score.f02.bueno';
  if (value >= 40) return 'ie.score.f02.moderado';
  return 'ie.score.f02.limitado';
}

export const f02TransitCalculator: Calculator = {
  scoreId: 'F02',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'GTFS geo_data_points no ingested for zone+period',
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [{ source: 'gtfs', url: 'https://metro.cdmx.gob.mx/', period: 'realtime' }],
      provenance: {
        sources: [{ name: 'gtfs', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default f02TransitCalculator;
