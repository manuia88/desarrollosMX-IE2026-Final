// A01 Affordability — % del ingreso mediano que puede afrontar una propiedad
// promedio de la zona. Plan 8.B.17.1. Catálogo 03.8 §A01. Tier 2.
//
// Fórmula simplificada (median property 80 m²):
//   capacidad_mensual   = ingreso_mensual × 0.30
//   capacidad_20y       = capacidad_mensual × 12 × 20
//   precio_property     = precio_m2 × 80
//   ratio               = capacidad_20y / precio_property
//   score               = min(100, round(ratio · 100))
//
// Score alto = accesible (ingreso alcanza para 100%+). Bajo = no alcanza.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula:
    'capacidad_20y = ingreso · 0.30 · 12 · 20; property = precio_m2 · 80; score = min(100, capacidad/property · 100).',
  sources: ['market_prices_secondary', 'census_income', 'macro_series'],
  weights: { ingreso_porcion: 0.3, anos_financiamiento: 20, median_m2: 80 },
  references: [
    {
      name: 'INEGI Censo Ingresos',
      url: 'https://www.inegi.org.mx/programas/ccpv/',
      period: 'anual',
    },
  ],
  confidence_thresholds: { high: 1, medium: 0, low: 0 },
  validity: { unit: 'months', value: 1 },
} as const;

export const reasoning_template =
  'Affordability {zona_name}: ingreso {ingreso_mediano_mensual_mxn} MXN/mes financia {capacidad_20y_mxn} MXN a 20 años. Propiedad mediana cuesta {precio_property_mxn} MXN. Ratio {ratio_pct}%.';

export interface A01Components extends Record<string, unknown> {
  readonly ingreso_mediano_mensual_mxn: number;
  readonly capacidad_mensual_mxn: number;
  readonly capacidad_20y_mxn: number;
  readonly precio_m2_primaria_mxn: number;
  readonly precio_property_mxn: number;
  readonly ratio_pct: number;
}

export interface A01RawInput {
  readonly ingreso_mediano_mensual_mxn: number;
  readonly precio_m2_primaria_mxn: number;
}

export interface A01ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A01Components;
}

export function computeA01Affordability(input: A01RawInput): A01ComputeResult {
  const capacidad_mensual = input.ingreso_mediano_mensual_mxn * 0.3;
  const capacidad_20y = capacidad_mensual * 12 * 20;
  const precio_property = input.precio_m2_primaria_mxn * 80;
  const ratio = precio_property > 0 ? capacidad_20y / precio_property : 0;
  const value = Math.max(0, Math.min(100, Math.round(ratio * 100)));

  return {
    value,
    confidence:
      input.ingreso_mediano_mensual_mxn > 0 && input.precio_m2_primaria_mxn > 0
        ? 'high'
        : 'insufficient_data',
    components: {
      ingreso_mediano_mensual_mxn: input.ingreso_mediano_mensual_mxn,
      capacidad_mensual_mxn: Math.round(capacidad_mensual),
      capacidad_20y_mxn: Math.round(capacidad_20y),
      precio_m2_primaria_mxn: input.precio_m2_primaria_mxn,
      precio_property_mxn: Math.round(precio_property),
      ratio_pct: Number((ratio * 100).toFixed(2)),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a01.insufficient';
  if (value >= 80) return 'ie.score.a01.accesible';
  if (value >= 50) return 'ie.score.a01.medio_esfuerzo';
  if (value >= 25) return 'ie.score.a01.tensionada';
  return 'ie.score.a01.inaccesible';
}

export const a01AffordabilityCalculator: Calculator = {
  scoreId: 'A01',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    return {
      score_value: 0,
      score_label: getLabelKey(0, 'insufficient_data'),
      components: { reason: 'market_prices_secondary + census_income no ingested' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence: 'insufficient_data',
      citations: [
        {
          source: 'market_prices_secondary',
          url: 'https://www.inegi.org.mx/programas/ccpv/',
          period: 'pending',
        },
      ],
      provenance: {
        sources: [{ name: 'market_prices_secondary', count: 0 }],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a01AffordabilityCalculator;
