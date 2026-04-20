// B07 Competitive Intel — score N1 dev que compara un proyecto vs top-5
// competidores de la zona en 8 dimensiones ponderadas (D8 runtime weights).
// Plan FASE 09 MÓDULO 9.C.4. Catálogo 03.8 §B07.
//
// 8 dimensiones + default weights:
//   precio_m2         0.15   (INVERSO: menor precio_m2 = ventaja)
//   amenidades_count  0.10   (mayor = ventaja)
//   tamano_promedio   0.10   (mayor = ventaja — proxy de producto)
//   absorcion_12m     0.15   (mayor = ventaja)
//   marketing_spend   0.10   (mayor = ventaja — proxy share of voice)
//   dom_days          0.10   (INVERSO: menor DOM = ventaja)
//   quality_score     0.15   (mayor = ventaja — score composite de calidad)
//   momentum          0.15   (N11 zona: mayor = ventaja)
//
// Normalización por dimensión: min-max dentro del universo mi_proyecto + competidores.
//   norm_i = (x_i - min_all) / (max_all - min_all) ∈ [0,1]  (o 0 si all iguales)
//   Para dimensiones INVERSAS (precio_m2, dom_days): norm_i = 1 - norm_i.
//
// Score final (centrado en 50, mayor = mi proyecto gana al promedio rivales):
//   score = Σ (norm(my) - avg(norm(competitors))) × weight × 50 + 50
//   clamp [0, 100].
//
// Similarity score vs cada competidor: 1 - mean(|norm(my) - norm(competitor)|) ∈ [0,1].
//   Top 5 ordenados por similarity_score DESC.
//
// Para cada competidor:
//   advantages[]    — dimensiones donde my_proyecto > competidor (≥0.10 norm)
//   disadvantages[] — dimensiones donde my_proyecto < competidor (≤ -0.10 norm)
//
// components.my_strengths / my_weaknesses — dimensiones donde mi proyecto está por
// encima/debajo del promedio competidores (delta ≥ 0.15 o ≤ -0.15 norm).
//
// Tier 2 — requiere ≥5 competitors. Si menos, D9 degrada a insufficient_data
// pero aún devuelve similarity y advantages/disadvantages informativos.
// Category: dev → persist en project_scores.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { loadWeights, type WeightsMap } from '../weights-loader';

export const version = '1.0.0';

export type B07DimensionId =
  | 'precio_m2'
  | 'amenidades'
  | 'tamano'
  | 'absorcion'
  | 'marketing_spend'
  | 'dom'
  | 'quality'
  | 'momentum';

export const B07_DIMENSIONS: readonly B07DimensionId[] = [
  'precio_m2',
  'amenidades',
  'tamano',
  'absorcion',
  'marketing_spend',
  'dom',
  'quality',
  'momentum',
] as const;

// Dimensiones donde MENOR valor = MEJOR para el proyecto.
const INVERSE_DIMENSIONS: ReadonlySet<B07DimensionId> = new Set(['precio_m2', 'dom']);

export const DEFAULT_WEIGHTS: Readonly<Record<B07DimensionId, number>> = {
  precio_m2: 0.15,
  amenidades: 0.1,
  tamano: 0.1,
  absorcion: 0.15,
  marketing_spend: 0.1,
  dom: 0.1,
  quality: 0.15,
  momentum: 0.15,
};

export const methodology = {
  formula:
    'score = Σ (norm(my_i) − avg(norm(competitors_i))) · weight_i · 50 + 50. Similarity(c) = 1 − mean(|norm(my) − norm(c)|). Top 5 competitors ordenados por similarity DESC.',
  sources: ['project_competitors', 'projects', 'zone_scores:N11'],
  weights: { ...DEFAULT_WEIGHTS },
  dependencies: [] as const,
  references: [
    {
      name: 'Catálogo 03.8 §B07 Competitive Intel',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b07-competitive-intel',
    },
    {
      name: 'Plan FASE 09 §9.C.4',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  tier_gate: { min_competitors: 5 },
} as const;

export const reasoning_template =
  'Competitive Intel de {project_id} obtiene {score_value} vs {competitors_count} competidores zona. Ventajas: {top_strengths}. Debilidades: {top_weaknesses}. Competidor más similar: {top_competitor}. Confianza {confidence}.';

export type B07Bucket = 'lider' | 'fuerte' | 'parejo' | 'rezagado' | 'insufficient';

export interface B07ProjectData {
  readonly project_id: string;
  readonly precio_m2: number;
  readonly amenidades: number;
  readonly tamano: number; // m2 promedio
  readonly absorcion: number; // unidades vendidas 12m
  readonly marketing_spend: number; // MXN/mes proxy
  readonly dom: number; // days on market promedio
  readonly quality: number; // 0-100
  readonly momentum: number; // N11 zona
}

export interface B07CompetitorEntry {
  readonly project_id: string;
  readonly similarity_score: number; // 0-1
  readonly advantages: readonly string[]; // dimensiones donde my > competitor
  readonly disadvantages: readonly string[];
}

export interface B07Components extends Record<string, unknown> {
  readonly competitors_top5: readonly B07CompetitorEntry[];
  readonly my_strengths: readonly string[];
  readonly my_weaknesses: readonly string[];
  readonly dimension_deltas: Readonly<Record<B07DimensionId, number>>;
  readonly weights_applied: Readonly<Record<string, number>>;
  readonly competitors_count: number;
  readonly bucket: B07Bucket;
}

export interface B07RawInput {
  readonly my_project: B07ProjectData;
  readonly competitors: readonly B07ProjectData[];
}

export interface B07ComputeOptions {
  readonly weightsOverride?: WeightsMap;
}

export interface B07ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B07Components;
}

function dimensionValue(p: B07ProjectData, dim: B07DimensionId): number {
  return p[dim];
}

function normalizeDimension(dim: B07DimensionId, all: readonly number[]): (v: number) => number {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const x of all) {
    if (!Number.isFinite(x)) continue;
    if (x < min) min = x;
    if (x > max) max = x;
  }
  const range = max - min;
  const inverse = INVERSE_DIMENSIONS.has(dim);
  return (v: number): number => {
    if (!Number.isFinite(v)) return 0;
    if (range <= 0) return 0.5; // tied: todos iguales
    const n = (v - min) / range; // [0,1]
    return inverse ? 1 - n : n;
  };
}

function bucketFor(value: number, competitors_count: number): B07Bucket {
  if (competitors_count < methodology.tier_gate.min_competitors) return 'insufficient';
  if (value >= 75) return 'lider';
  if (value >= 60) return 'fuerte';
  if (value >= 40) return 'parejo';
  return 'rezagado';
}

function confidenceFor(competitors_count: number): Confidence {
  if (competitors_count < methodology.tier_gate.min_competitors) return 'insufficient_data';
  if (competitors_count >= 10) return 'high';
  if (competitors_count >= 5) return 'medium';
  return 'low';
}

export function computeB07CompetitiveIntel(
  input: B07RawInput,
  options: B07ComputeOptions = {},
): B07ComputeResult {
  const { my_project, competitors } = input;
  const competitors_count = competitors.length;

  const baseWeights: Readonly<Record<B07DimensionId, number>> =
    (options.weightsOverride as Readonly<Record<B07DimensionId, number>> | undefined) ??
    DEFAULT_WEIGHTS;

  // Normalizadores por dimensión sobre universo my + competitors.
  const normalizers: Record<B07DimensionId, (v: number) => number> = {
    precio_m2: (v: number) => v,
    amenidades: (v: number) => v,
    tamano: (v: number) => v,
    absorcion: (v: number) => v,
    marketing_spend: (v: number) => v,
    dom: (v: number) => v,
    quality: (v: number) => v,
    momentum: (v: number) => v,
  };
  for (const dim of B07_DIMENSIONS) {
    const all = [
      dimensionValue(my_project, dim),
      ...competitors.map((c) => dimensionValue(c, dim)),
    ];
    normalizers[dim] = normalizeDimension(dim, all);
  }

  // Norm de my_project y competitors.
  const myNorm: Record<B07DimensionId, number> = {
    precio_m2: 0,
    amenidades: 0,
    tamano: 0,
    absorcion: 0,
    marketing_spend: 0,
    dom: 0,
    quality: 0,
    momentum: 0,
  };
  for (const dim of B07_DIMENSIONS) {
    myNorm[dim] = normalizers[dim](dimensionValue(my_project, dim));
  }
  const compNorms: Array<Record<B07DimensionId, number>> = competitors.map((c) => {
    const n: Record<B07DimensionId, number> = {
      precio_m2: 0,
      amenidades: 0,
      tamano: 0,
      absorcion: 0,
      marketing_spend: 0,
      dom: 0,
      quality: 0,
      momentum: 0,
    };
    for (const dim of B07_DIMENSIONS) {
      n[dim] = normalizers[dim](dimensionValue(c, dim));
    }
    return n;
  });

  // Promedio competitors por dimensión.
  const avgComp: Record<B07DimensionId, number> = {
    precio_m2: 0,
    amenidades: 0,
    tamano: 0,
    absorcion: 0,
    marketing_spend: 0,
    dom: 0,
    quality: 0,
    momentum: 0,
  };
  if (compNorms.length > 0) {
    for (const dim of B07_DIMENSIONS) {
      let sum = 0;
      for (const n of compNorms) sum += n[dim];
      avgComp[dim] = sum / compNorms.length;
    }
  }

  // Score: Σ (my - avg) × weight × 50 + 50.
  const deltas: Record<B07DimensionId, number> = {
    precio_m2: 0,
    amenidades: 0,
    tamano: 0,
    absorcion: 0,
    marketing_spend: 0,
    dom: 0,
    quality: 0,
    momentum: 0,
  };
  let weighted_sum = 0;
  for (const dim of B07_DIMENSIONS) {
    const delta = myNorm[dim] - avgComp[dim];
    deltas[dim] = Number(delta.toFixed(4));
    weighted_sum += delta * (baseWeights[dim] ?? 0);
  }
  const rawScore = weighted_sum * 50 + 50;
  const value = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Similarity + advantages/disadvantages por competidor.
  const competitors_top5: B07CompetitorEntry[] = compNorms
    .map((cn, idx) => {
      let absDiff = 0;
      const advantages: string[] = [];
      const disadvantages: string[] = [];
      for (const dim of B07_DIMENSIONS) {
        const diff = myNorm[dim] - cn[dim];
        absDiff += Math.abs(diff);
        if (diff >= 0.1) advantages.push(dim);
        else if (diff <= -0.1) disadvantages.push(dim);
      }
      const similarity_score = Math.max(0, 1 - absDiff / B07_DIMENSIONS.length);
      const competitor = competitors[idx];
      return {
        project_id: competitor ? competitor.project_id : `competitor_${idx}`,
        similarity_score: Number(similarity_score.toFixed(4)),
        advantages,
        disadvantages,
      };
    })
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 5);

  const my_strengths: string[] = [];
  const my_weaknesses: string[] = [];
  for (const dim of B07_DIMENSIONS) {
    if (deltas[dim] >= 0.15) my_strengths.push(dim);
    else if (deltas[dim] <= -0.15) my_weaknesses.push(dim);
  }

  const weights_applied: Record<string, number> = {};
  for (const dim of B07_DIMENSIONS) {
    weights_applied[dim] = Number((baseWeights[dim] ?? 0).toFixed(4));
  }

  return {
    value,
    confidence: confidenceFor(competitors_count),
    components: {
      competitors_top5,
      my_strengths,
      my_weaknesses,
      dimension_deltas: deltas,
      weights_applied,
      competitors_count,
      bucket: bucketFor(value, competitors_count),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b07.insufficient';
  if (value >= 75) return 'ie.score.b07.lider';
  if (value >= 60) return 'ie.score.b07.fuerte';
  if (value >= 40) return 'ie.score.b07.parejo';
  return 'ie.score.b07.rezagado';
}

export const b07CompetitiveIntelCalculator: Calculator = {
  scoreId: 'B07',
  version,
  tier: 2,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    // Prod path: fetch my_project + top 5 competitors (project_competitors) y zona N11.
    // H1 degrada a insufficient_data si projectId ausente o no hay competitors.
    // D8 runtime weights override vía score_weights.
    const computed_at = new Date().toISOString();
    const runtimeWeights = await loadWeights(supabase, 'B07', input.countryCode).catch(() => null);
    const projectId = input.projectId;
    const confidence: Confidence = 'insufficient_data';
    const weights_applied: Record<string, number> = {};
    for (const [dim, w] of Object.entries(runtimeWeights ?? DEFAULT_WEIGHTS)) {
      weights_applied[dim] = Number(Number(w).toFixed(4));
    }
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: projectId
          ? 'B07 requiere ≥5 competitors en project_competitors. Use computeB07CompetitiveIntel(rawInput) en tests.'
          : 'B07 requiere projectId para fetch competitors.',
        competitors_top5: [],
        my_strengths: [],
        my_weaknesses: [],
        dimension_deltas: {},
        weights_applied,
        competitors_count: 0,
        bucket: 'insufficient' as B07Bucket,
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: projectId ?? null,
        weights_source: runtimeWeights ? 'score_weights' : 'methodology_default',
      },
      confidence,
      citations: [
        { source: 'project_competitors', period: input.periodDate },
        { source: 'projects', period: input.periodDate },
        { source: 'zone_scores:N11', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'project_competitors', count: 0 },
          { name: 'projects', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        project_id: projectId ?? 'desconocido',
        competitors_count: 0,
        top_strengths: 'n/a',
        top_weaknesses: 'n/a',
        top_competitor: 'n/a',
      },
    };
  },
};

export default b07CompetitiveIntelCalculator;
