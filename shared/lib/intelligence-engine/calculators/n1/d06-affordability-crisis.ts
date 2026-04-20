// D06 Affordability Crisis (macro) — score N1 que cuantifica presión de acceso
// a vivienda en una zona combinando A01 Affordability (N0) + sobrecosto_vivienda
// BBVA + gap salario vs renta local.
// Plan FASE 09 §9.C.7. Catálogo 03.8 §D06.
//
// INVERSIÓN de semántica: score_value alto = MÁS crisis.
//
// Fórmula:
//   salario_anual        = salario_mediano_zona (mensual × 12 si viene mensual)
//   renta_anual_x3       = renta_p50_zona × 12 × 3
//   salario_gap_score    = clamp((renta_anual_x3/salario_anual − 1) × 50 + 50, 0, 100)
//                            (score 50 → paridad; >50 → salario NO alcanza para 3x renta)
//   sobrecosto_score     = clamp(sobrecosto_vivienda_pct × 100, 0, 100)
//                            (BBVA entrega 0..1 ó 0..100; normalizamos a 0-100)
//   crisis_score = 100 − (0.50·A01 + 0.30·(100 − sobrecosto_score) + 0.20·(100 − salario_gap_score))
//
// Explicación de la inversión:
//   A01 alto = asequible → resta crisis
//   sobrecosto alto = crisis alta → (100 − sobrecosto) entra invertido → sobrecosto alto resta menos → crisis sube
//   salario_gap alto = crisis → (100 − gap) invertido igual
//
// Flags:
//   crisis_score ≥ 70 → crisis_flag='zona_en_crisis'
//   crisis_score 40-70 → 'zona_tensionada'
//   crisis_score < 40  → 'zona_estable'
//
// D8 runtime weights override: score_weights por (score_id='D06', country_code).
// D9 fallback graceful: A01 missing → renormaliza entre sobrecosto+salario_gap.
// Tier 2 (requiere al menos A01 + (salario O sobrecosto)).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { composeConfidence } from '../confidence';
import {
  loadWeights,
  type RenormalizedWeights,
  renormalizeWeights,
  type WeightsMap,
} from '../weights-loader';

export const version = '1.0.0';

export type D06DimensionId = 'A01' | 'sobrecosto' | 'salario_gap';

export const DEFAULT_WEIGHTS: Readonly<Record<D06DimensionId, number>> = {
  A01: 0.5,
  sobrecosto: 0.3,
  salario_gap: 0.2,
} as const;

export const D06_DIMENSIONS: readonly D06DimensionId[] = [
  'A01',
  'sobrecosto',
  'salario_gap',
] as const;

export const methodology = {
  formula:
    'salario_gap_score = clamp((renta_p50·36/salario_anual − 1)·50 + 50, 0, 100); sobrecosto_score = clamp(pct·100, 0, 100); crisis_score = 100 − (0.50·A01 + 0.30·(100 − sobrecosto) + 0.20·(100 − salario_gap)). INVERSO: score alto = más crisis.',
  sources: [
    'zone_scores:A01',
    'bbva_sobrecosto_vivienda',
    'inegi_salarios_zona',
    'market_prices_secondary',
  ],
  weights: { ...DEFAULT_WEIGHTS },
  dependencies: [
    { score_id: 'A01', weight: 0.5, role: 'affordability_base' },
    { score_id: 'sobrecosto', weight: 0.3, role: 'sobrecosto_vivienda_bbva' },
    { score_id: 'salario_gap', weight: 0.2, role: 'gap_salario_local_vs_renta' },
  ],
  triggers_cascade: ['macro_updated'],
  references: [
    {
      name: 'Catálogo 03.8 §D06 Affordability Crisis',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#d06-affordability-crisis',
    },
    {
      name: 'Plan FASE 09 §9.C.7',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
    {
      name: 'BBVA Research — Situación Inmobiliaria México',
      url: 'https://www.bbvaresearch.com/publicaciones/situacion-inmobiliaria-mexico/',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_available_deps: 2,
  },
} as const;

export const reasoning_template =
  'Crisis de accesibilidad en {zona_name} obtiene {score_value} ({crisis_flag}). Salario mediano anual {salario_mediano}, renta P50 mensual {renta_p50}, precio m2 {precio_m2}. Ratio precio/salario {ratio_precio_salario}. A01 affordability {A01}. Faltan: {missing_dimensions}. Confianza {confidence}.';

export type CrisisFlag = 'zona_estable' | 'zona_tensionada' | 'zona_en_crisis';

export interface D06Components extends Record<string, unknown> {
  readonly salario_mediano: number | null;
  readonly renta_p50: number | null;
  readonly precio_m2: number | null;
  readonly ratio_precio_salario: number | null;
  readonly salario_gap_score: number;
  readonly sobrecosto_score: number;
  readonly a01_score: number | null;
  readonly crisis_flag: CrisisFlag;
  readonly weights_applied: Readonly<Record<string, number>>;
  readonly missing_dimensions: readonly string[];
  readonly available_count: number;
  readonly total_count: number;
}

export interface D06RawInput {
  readonly A01_affordability: number | null;
  readonly sobrecosto_vivienda_pct: number | null;
  readonly salario_mediano_zona: number | null;
  readonly renta_p50_zona: number | null;
  readonly precio_m2_zona_p50: number | null;
  readonly confidences?: Readonly<Partial<Record<D06DimensionId, Confidence>>>;
}

export interface D06ComputeOptions {
  readonly weightsOverride?: WeightsMap;
}

export interface D06ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: D06Components;
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function crisisFlag(value: number): CrisisFlag {
  if (value >= 70) return 'zona_en_crisis';
  if (value >= 40) return 'zona_tensionada';
  return 'zona_estable';
}

function computeSalarioGapScore(
  salario_mediano_zona: number | null,
  renta_p50_zona: number | null,
): number | null {
  if (
    salario_mediano_zona === null ||
    renta_p50_zona === null ||
    !Number.isFinite(salario_mediano_zona) ||
    !Number.isFinite(renta_p50_zona) ||
    salario_mediano_zona <= 0
  ) {
    return null;
  }
  // Si salario viene mensual (<50000), anualizar ×12. Heurística conservadora.
  const salario_anual =
    salario_mediano_zona < 50000 ? salario_mediano_zona * 12 : salario_mediano_zona;
  const renta_anual_x3 = renta_p50_zona * 12 * 3;
  const ratio = renta_anual_x3 / salario_anual;
  // ratio 1 (paridad) → 50; ratio 2 → 100; ratio 0.5 → 25
  return clamp100((ratio - 1) * 50 + 50);
}

function computeSobrecostoScore(sobrecosto_vivienda_pct: number | null): number | null {
  if (sobrecosto_vivienda_pct === null || !Number.isFinite(sobrecosto_vivienda_pct)) return null;
  // BBVA entrega 0..1 (fraccional) o 0..100 (pct). Normalizar:
  const val =
    sobrecosto_vivienda_pct <= 1 ? sobrecosto_vivienda_pct * 100 : sobrecosto_vivienda_pct;
  return clamp100(val);
}

export function computeD06AffordabilityCrisis(
  input: D06RawInput,
  options: D06ComputeOptions = {},
): D06ComputeResult {
  const base: WeightsMap = options.weightsOverride ?? DEFAULT_WEIGHTS;

  const a01 = input.A01_affordability;
  const sobrecosto_score = computeSobrecostoScore(input.sobrecosto_vivienda_pct);
  const salario_gap_score = computeSalarioGapScore(
    input.salario_mediano_zona,
    input.renta_p50_zona,
  );

  const available: D06DimensionId[] = [];
  if (a01 !== null && Number.isFinite(a01)) available.push('A01');
  if (sobrecosto_score !== null) available.push('sobrecosto');
  if (salario_gap_score !== null) available.push('salario_gap');

  const renorm: RenormalizedWeights = renormalizeWeights(base, available);

  const minDeps = methodology.confidence_thresholds.min_available_deps;
  if (available.length < minDeps) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        salario_mediano: input.salario_mediano_zona,
        renta_p50: input.renta_p50_zona,
        precio_m2: input.precio_m2_zona_p50,
        ratio_precio_salario: computeRatioPrecioSalario(
          input.precio_m2_zona_p50,
          input.salario_mediano_zona,
        ),
        salario_gap_score: salario_gap_score ?? 0,
        sobrecosto_score: sobrecosto_score ?? 0,
        a01_score: a01,
        crisis_flag: 'zona_estable',
        weights_applied: {},
        missing_dimensions: renorm.missing_dimensions,
        available_count: available.length,
        total_count: renorm.total_count,
      },
    };
  }

  // crisis_score = 100 − (w_A01·A01 + w_sobrecosto·(100 − sobrecosto) + w_salario·(100 − salario_gap))
  // Pero si una dep falta, no entra — la suma ponderada usa renorm.weights.
  let accesibilidad = 0;
  if (available.includes('A01') && a01 !== null) {
    accesibilidad += (renorm.weights['A01'] ?? 0) * clamp100(a01);
  }
  if (available.includes('sobrecosto') && sobrecosto_score !== null) {
    accesibilidad += (renorm.weights['sobrecosto'] ?? 0) * (100 - sobrecosto_score);
  }
  if (available.includes('salario_gap') && salario_gap_score !== null) {
    accesibilidad += (renorm.weights['salario_gap'] ?? 0) * (100 - salario_gap_score);
  }

  const value = Math.round(clamp100(100 - accesibilidad));

  const flag = crisisFlag(value);

  const sub: Confidence[] = [];
  if (input.confidences) {
    for (const dim of available) {
      const c = input.confidences[dim];
      if (c) sub.push(c);
    }
  }

  let confidence: Confidence;
  if (sub.length > 0) {
    confidence = composeConfidence(sub);
    if (renorm.missing_dimensions.length > 0 && confidence === 'high') {
      confidence = 'medium';
    }
  } else {
    confidence = renorm.missing_dimensions.length === 0 ? 'high' : 'medium';
  }

  const weights_applied: Record<string, number> = {};
  for (const [dim, w] of Object.entries(renorm.weights)) {
    weights_applied[dim] = Number(w.toFixed(4));
  }

  return {
    value,
    confidence,
    components: {
      salario_mediano: input.salario_mediano_zona,
      renta_p50: input.renta_p50_zona,
      precio_m2: input.precio_m2_zona_p50,
      ratio_precio_salario: computeRatioPrecioSalario(
        input.precio_m2_zona_p50,
        input.salario_mediano_zona,
      ),
      salario_gap_score: Number((salario_gap_score ?? 0).toFixed(2)),
      sobrecosto_score: Number((sobrecosto_score ?? 0).toFixed(2)),
      a01_score: a01,
      crisis_flag: flag,
      weights_applied,
      missing_dimensions: renorm.missing_dimensions,
      available_count: renorm.available_count,
      total_count: renorm.total_count,
    },
  };
}

function computeRatioPrecioSalario(
  precio_m2: number | null,
  salario_mediano: number | null,
): number | null {
  if (
    precio_m2 === null ||
    salario_mediano === null ||
    !Number.isFinite(precio_m2) ||
    !Number.isFinite(salario_mediano) ||
    salario_mediano <= 0
  ) {
    return null;
  }
  const salario_anual = salario_mediano < 50000 ? salario_mediano * 12 : salario_mediano;
  // Precio m² vs salario anual — cuántos años de salario bruto 1m²
  return Number((precio_m2 / salario_anual).toFixed(3));
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.d06.insufficient';
  if (value >= 70) return 'ie.score.d06.zona_en_crisis';
  if (value >= 40) return 'ie.score.d06.zona_tensionada';
  return 'ie.score.d06.zona_estable';
}

export const d06AffordabilityCrisisCalculator: Calculator = {
  scoreId: 'D06',
  version,
  tier: 2,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const runtimeWeights = await loadWeights(supabase, 'D06', input.countryCode).catch(() => null);
    const weights = runtimeWeights ?? DEFAULT_WEIGHTS;
    const confidence: Confidence = 'insufficient_data';
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        salario_mediano: null,
        renta_p50: null,
        precio_m2: null,
        ratio_precio_salario: null,
        salario_gap_score: 0,
        sobrecosto_score: 0,
        a01_score: null,
        crisis_flag: 'zona_estable' as CrisisFlag,
        weights_applied: weights,
        missing_dimensions: Object.keys(weights),
        available_count: 0,
        total_count: D06_DIMENSIONS.length,
        reason:
          'D06 requiere A01 + BBVA sobrecosto + INEGI salarios zona. Use computeD06AffordabilityCrisis(input) en tests.',
      },
      inputs_used: {
        periodDate: input.periodDate,
        zoneId: input.zoneId ?? null,
        weights_source: runtimeWeights ? 'score_weights' : 'methodology_default',
      },
      confidence,
      citations: [
        { source: 'zone_scores:A01', period: input.periodDate },
        { source: 'bbva_sobrecosto_vivienda', period: input.periodDate },
        { source: 'inegi_salarios_zona', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:A01', count: 0 },
          { name: 'bbva_sobrecosto_vivienda', count: 0 },
          { name: 'inegi_salarios_zona', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        zona_name: input.zoneId ?? 'desconocida',
        crisis_flag: 'zona_estable',
        salario_mediano: 'n/a',
        renta_p50: 'n/a',
        precio_m2: 'n/a',
        ratio_precio_salario: 'n/a',
        A01: 'n/a',
        missing_dimensions: 'all',
      },
    };
  },
};

export default d06AffordabilityCrisisCalculator;
