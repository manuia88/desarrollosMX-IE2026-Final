// N02 Employment Accessibility — empleos alcanzables 45min transit + DENUE.
// Plan §8.C.2 + catálogo 03.8 §N02.
//
// Fórmula MVP H1:
//   empleos_base  = Σ(oficina/retail/gastronomia/servicios/etc. categorías DENUE)
//   transit_reach = 1 + 0.5·metro_1km + 0.2·metrobus_500m + 0.1·ecobici_400m
//                       + 0.3·tren_2km + 0.1·brt_density
//   empleos_accesibles = empleos_base × transit_reach
//   score = clamp(log10(empleos_accesibles + 1) × 25, 0, 100)
//
// Proxy H1 hasta GTFS isócronas reales H2. Confidence compuesto DENUE+GTFS.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { CONFIDENCE_THRESHOLDS, composeConfidence, detectConfidenceByVolume } from '../confidence';

export const version = '1.0.0';

const EMPLOYMENT_CATEGORIES = [
  'servicios_profesionales',
  'retail',
  'gastronomia',
  'fitness_wellness',
  'cultura_entretenimiento',
  'financiero',
  'salud',
  'manufacturas',
  'logistica',
  'educacion',
] as const;

export const methodology = {
  formula:
    'empleos_accesibles = empleos_base × transit_reach. score = clamp(log10(empleos+1) × 25, 0, 100). transit_reach = 1 + 0.5·metro + 0.2·metrobus + 0.3·tren + 0.1·ecobici + 0.1·brt_density.',
  sources: ['denue', 'gtfs'],
  weights: { metro: 0.5, metrobus: 0.2, tren: 0.3, ecobici: 0.1, brt: 0.1 },
  references: [
    {
      name: 'Catálogo 03.8 §N02 Employment Accessibility',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n02-employment-accessibility',
    },
  ],
  validity: { unit: 'months', value: 3 } as const,
  recommendations: {
    low: ['ie.score.n02.recommendations.low.0', 'ie.score.n02.recommendations.low.1'],
    medium: ['ie.score.n02.recommendations.medium.0', 'ie.score.n02.recommendations.medium.1'],
    high: ['ie.score.n02.recommendations.high.0', 'ie.score.n02.recommendations.high.1'],
    insufficient_data: ['ie.score.n02.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'Accesibilidad laboral de {zona_name} obtiene {score_value} por {empleos_accesibles} empleos accesibles en 45min (base {empleos_base} × transit_reach {transit_reach}). Confianza {confidence}.';

export type EmploymentBucket = 'low' | 'medium' | 'high';

export interface N02Components extends Record<string, unknown> {
  readonly empleos_base: number;
  readonly transit_reach: number;
  readonly empleos_accesibles: number;
  readonly bucket: EmploymentBucket;
}

export interface N02RawInput {
  readonly by_macro_category: Readonly<Record<string, number>>;
  readonly total_denue: number;
  readonly gtfs: {
    readonly estaciones_metro_1km: number;
    readonly paradas_metrobus_500m: number;
    readonly estaciones_tren_2km: number;
    readonly ecobici_400m: number;
    readonly densidad_rutas_brt: number;
  };
}

export interface N02ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N02Components;
}

function bucketFor(value: number): EmploymentBucket {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

function computeEmpleosBase(byMacro: Readonly<Record<string, number>>): number {
  let total = 0;
  for (const k of EMPLOYMENT_CATEGORIES) total += byMacro[k] ?? 0;
  return total;
}

export function computeN02Employment(input: N02RawInput): N02ComputeResult {
  const empleos_base = computeEmpleosBase(input.by_macro_category);
  const {
    estaciones_metro_1km,
    paradas_metrobus_500m,
    estaciones_tren_2km,
    ecobici_400m,
    densidad_rutas_brt,
  } = input.gtfs;
  const transit_reach =
    1 +
    0.5 * estaciones_metro_1km +
    0.2 * paradas_metrobus_500m +
    0.3 * estaciones_tren_2km +
    0.1 * ecobici_400m +
    0.1 * densidad_rutas_brt;

  const empleos_accesibles = Math.round(empleos_base * transit_reach);
  const value = Math.max(0, Math.min(100, Math.round(Math.log10(empleos_accesibles + 1) * 25)));

  const denueConf = detectConfidenceByVolume(input.total_denue, CONFIDENCE_THRESHOLDS.denue);
  const gtfsCount = estaciones_metro_1km + paradas_metrobus_500m + estaciones_tren_2km;
  const gtfsConf = detectConfidenceByVolume(gtfsCount, CONFIDENCE_THRESHOLDS.gtfs);
  const confidence = composeConfidence([denueConf, gtfsConf]);

  return {
    value,
    confidence,
    components: {
      empleos_base,
      transit_reach: Number(transit_reach.toFixed(2)),
      empleos_accesibles,
      bucket: bucketFor(value),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n02.insufficient';
  if (value >= 80) return 'ie.score.n02.hub_laboral';
  if (value >= 60) return 'ie.score.n02.acceso_bueno';
  if (value >= 40) return 'ie.score.n02.acceso_moderado';
  return 'ie.score.n02.aislada';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') return methodology.recommendations.insufficient_data;
  return methodology.recommendations[bucketFor(value)];
}

export const n02EmploymentCalculator: Calculator = {
  scoreId: 'N02',
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

export default n02EmploymentCalculator;
