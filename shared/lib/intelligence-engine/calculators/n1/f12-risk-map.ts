// F12 Risk Map (N1) — score INVERSO agregado de riesgo zonal.
// Plan FASE 09 MÓDULO 9.A.2. Catálogo 03.8 §F12.
//
// Consolida 5 dimensiones de riesgo (mayor valor = MÁS riesgo):
//   H03_seismic        — score INVERSO (ya en escala "100=seguro"), se invierte a riesgo.
//   N07_water_security — score INVERSO (ya en escala "100=seguro"), se invierte a riesgo.
//   F01_safety         — score INVERSO (ya en escala "100=seguro"), se invierte a riesgo.
//   F06_land_use       — score 0-100 de uso de suelo compatible (INVERSO: alto = compatible).
//   N05_resilience     — score INVERSO de resiliencia infraestructura (100=resiliente).
//
// Todos los inputs N0/N1 están en escala "100=mejor" → invertimos cada uno:
//   risk_i = 100 - dim_i
// Luego promedio ponderado de riesgos → score_final = 100 − weighted_avg(riesgos).
// Output: score_value INVERSO (100 = sin riesgo, 0 = riesgo máximo).
//
// Default weights (FASE 09 spec): H03=0.30, N07=0.20, F01=0.20, F06=0.15, N05=0.15.
// D8 runtime override: score_weights por (score_id='F12', country_code).
// D9 fallback graceful: deps faltantes → weights redistribuidos + missing_dimensions logged.

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

export type RiesgoTipo = 'sismico' | 'hidrico' | 'social' | 'uso_suelo' | 'infraestructura';

export const DEFAULT_WEIGHTS: Readonly<Record<'H03' | 'N07' | 'F01' | 'F06' | 'N05', number>> = {
  H03: 0.3,
  N07: 0.2,
  F01: 0.2,
  F06: 0.15,
  N05: 0.15,
} as const;

const DIMENSION_TO_TIPO: Readonly<Record<string, RiesgoTipo>> = {
  H03: 'sismico',
  N07: 'hidrico',
  F01: 'social',
  F06: 'uso_suelo',
  N05: 'infraestructura',
} as const;

export const methodology = {
  formula:
    'risk_i = 100 − dim_i para cada dep (H03,N07,F01,F06,N05); score = 100 − Σ(w_i · risk_i). Score INVERSO: 100 = sin riesgo.',
  sources: ['atlas_riesgos', 'sacmex', 'conagua', 'fgj', 'suelo_urbano_cdmx', 'infraestructura'],
  weights: { ...DEFAULT_WEIGHTS },
  references: [
    {
      name: 'Catálogo 03.8 §F12 Risk Map',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#f12-risk-map',
    },
    {
      name: 'Atlas de Riesgos CDMX',
      url: 'https://www.atlas.cdmx.gob.mx/',
    },
  ],
  dependencies: [
    { score_id: 'H03', weight: 0.3, role: 'riesgo_sismico' },
    { score_id: 'N07', weight: 0.2, role: 'riesgo_hidrico' },
    { score_id: 'F01', weight: 0.2, role: 'riesgo_social_invertido' },
    { score_id: 'F06', weight: 0.15, role: 'riesgo_uso_suelo' },
    { score_id: 'N05', weight: 0.15, role: 'riesgo_infraestructura' },
  ],
  validity: { unit: 'days', value: 30 } as const,
} as const;

export const reasoning_template =
  'Risk Map de {zona_name} obtiene {score_value} (INVERSO: mayor = más seguro). Riesgo dominante: {riesgo_dominante} con severidad {severidad_max}. Basado en {dims_usadas}/{dims_total} dimensiones. Confianza {confidence}.';

export interface F12RiesgoPrincipal {
  readonly tipo: RiesgoTipo;
  readonly severity: number; // 0-100, mayor = más riesgo
}

export interface F12Components extends Record<string, unknown> {
  readonly riesgos_principales: readonly F12RiesgoPrincipal[];
  readonly weighted_risk: number;
  readonly weights_applied: Readonly<Record<string, number>>;
  readonly missing_dimensions: readonly string[];
  readonly dims_usadas: number;
  readonly dims_total: number;
  readonly riesgo_dominante: RiesgoTipo | null;
}

// Cada dimensión es el score N0/N1 del calculator referenciado, en su escala
// original "100=mejor" (100=seguro/disponible/resiliente). Si está faltante,
// pasar `null` y la dimensión se excluye del promedio (D9 renormalize).
export interface F12RawInput {
  readonly H03: number | null;
  readonly N07: number | null;
  readonly F01: number | null;
  readonly F06: number | null;
  readonly N05: number | null;
  // Confidence de cada dep (la peor manda en composición).
  readonly confidences?: Readonly<
    Partial<Record<'H03' | 'N07' | 'F01' | 'F06' | 'N05', Confidence>>
  >;
}

export interface F12ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: F12Components;
}

export interface F12ComputeOptions {
  readonly weightsOverride?: WeightsMap;
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function inverseToRisk(score: number): number {
  // Input: 100=mejor → risk = 100 − score
  return clamp100(100 - clamp100(score));
}

export function computeF12RiskMap(
  input: F12RawInput,
  options: F12ComputeOptions = {},
): F12ComputeResult {
  const base: WeightsMap = options.weightsOverride ?? DEFAULT_WEIGHTS;
  const available: string[] = [];
  const dimValues: Partial<Record<string, number>> = {};

  for (const k of ['H03', 'N07', 'F01', 'F06', 'N05'] as const) {
    const v = input[k];
    if (v !== null && v !== undefined && Number.isFinite(v)) {
      available.push(k);
      dimValues[k] = v;
    }
  }

  const renorm: RenormalizedWeights = renormalizeWeights(base, available);

  // Componer risk_i = 100 − dim_i y agregar ponderado.
  let weighted_risk = 0;
  const riesgos: F12RiesgoPrincipal[] = [];
  for (const dim of available) {
    const v = dimValues[dim];
    if (v === undefined) continue;
    const severity = inverseToRisk(v);
    const w = renorm.weights[dim] ?? 0;
    weighted_risk += severity * w;
    const tipo = DIMENSION_TO_TIPO[dim];
    if (tipo) riesgos.push({ tipo, severity: Number(severity.toFixed(2)) });
  }

  // Ordenar riesgos por severidad descendente (el dominante primero).
  const riesgos_sorted = [...riesgos].sort((a, b) => b.severity - a.severity);
  const riesgo_dominante = riesgos_sorted.length > 0 ? (riesgos_sorted[0]?.tipo ?? null) : null;

  const value =
    renorm.available_count === 0 ? 0 : Math.max(0, Math.min(100, Math.round(100 - weighted_risk)));

  // Confidence: compose per-dep; si hay dims faltantes, downgrade.
  const sub: Confidence[] = [];
  if (input.confidences) {
    for (const dim of available) {
      const c = input.confidences[dim as 'H03' | 'N07' | 'F01' | 'F06' | 'N05'];
      if (c) sub.push(c);
    }
  }
  // Si no tenemos info de confidence por dep, usamos high por default (caller responsable).
  let confidence: Confidence =
    sub.length > 0 ? composeConfidence(sub) : renorm.available_count >= 3 ? 'high' : 'medium';

  if (renorm.available_count === 0) {
    confidence = 'insufficient_data';
  } else if (renorm.missing_dimensions.length > 0 && confidence === 'high') {
    // penalización por deps faltantes — si falta cualquiera, baja a medium.
    confidence = 'medium';
  }

  return {
    value,
    confidence,
    components: {
      riesgos_principales: riesgos_sorted,
      weighted_risk: Number(weighted_risk.toFixed(2)),
      weights_applied: renorm.weights,
      missing_dimensions: renorm.missing_dimensions,
      dims_usadas: renorm.available_count,
      dims_total: renorm.total_count,
      riesgo_dominante,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.f12.insufficient';
  if (value >= 80) return 'ie.score.f12.muy_seguro';
  if (value >= 60) return 'ie.score.f12.seguro';
  if (value >= 40) return 'ie.score.f12.moderado';
  if (value >= 20) return 'ie.score.f12.alto';
  return 'ie.score.f12.extremo';
}

export const f12RiskMapCalculator: Calculator = {
  scoreId: 'F12',
  version,
  tier: 1,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    // D8 runtime weights override. Si no hay row activa → fallback defaults hardcoded.
    const runtimeWeights = await loadWeights(supabase, 'F12', input.countryCode).catch(() => null);
    const weights = runtimeWeights ?? DEFAULT_WEIGHTS;
    // renormalizeWeights con lista vacía = D9 escenario cero deps → insufficient_data.
    const renorm = renormalizeWeights(weights, []);
    const computed_at = new Date().toISOString();
    const confidence: Confidence = 'insufficient_data';
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        riesgos_principales: [],
        weighted_risk: 0,
        weights_applied: renorm.weights,
        missing_dimensions: Object.keys(weights),
        dims_usadas: 0,
        dims_total: renorm.total_count,
        riesgo_dominante: null,
        reason:
          'F12 requiere H03+N07+F01+F06+N05 persistidos en zone_scores. Use computeF12RiskMap(input) en tests.',
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'atlas_riesgos', url: 'https://www.atlas.cdmx.gob.mx/' },
        { source: 'sacmex' },
        { source: 'conagua' },
        { source: 'fgj' },
      ],
      provenance: {
        sources: [
          { name: 'atlas_riesgos', count: 0 },
          { name: 'sacmex', count: 0 },
          { name: 'conagua', count: 0 },
          { name: 'fgj', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        zona_name: input.zoneId ?? 'desconocida',
        riesgo_dominante: 'n/a',
        severidad_max: 0,
        dims_usadas: 0,
        dims_total: renorm.total_count,
      },
    };
  },
};

export default f12RiskMapCalculator;
