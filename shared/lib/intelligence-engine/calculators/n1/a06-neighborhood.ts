// A06 Neighborhood — score N1 personalizado por buyer_persona que blend-ea 5
// dimensiones de zona (F08 LQI, H01 escuelas, H02 salud, N08 walkability,
// N10 senior livability).
// Plan FASE 09 §9.B.3 + catálogo 03.8 §A06.
//
// Fórmula (weights default por catálogo 03.8 §A06):
//   A06 = 0.30·F08 + 0.20·H01 + 0.15·H02 + 0.20·N08 + 0.15·N10
//
// Persona re-weight (criterio de done plan §9.B.3):
//   family        → H01 = 0.30, resto prorrateado proporcional.
//   digital_nomad → H01 = 0.05, N08 = 0.30, resto prorrateado.
//   investor      → defaults.
//   senior        → N10 = 0.30, resto prorrateado.
//   (otras)       → defaults.
//
// D8 — weights runtime: loadWeights(score_weights) override per (score_id,
// country_code) actúa como base ANTES de aplicar ajuste por persona.
//
// D9 — fallback graceful: si alguna dep devuelve null, renormalizeWeights
// redistribuye proporcionalmente entre disponibles. components.missing_dimensions
// enumera las faltantes. Si <50% cobertura → insufficient_data.
//
// Confidence cascade: composeConfidence(confidences de deps disponibles).
//
// Tier 1. Category: comprador — output va a user_scores si userId presente;
// si solo zoneId → se persiste como zona (zone_scores) representando el
// neighborhood "promedio persona-agnóstico".
//
// R1 safeguard: tests NO importan compute F08 real. F08 se recibe como
// subscore pre-computado (number|null) igual que los demás N0.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { composeConfidence } from '../confidence';
import { loadWeights, renormalizeWeights, type WeightsMap } from '../weights-loader';

export const version = '1.0.0';

export const DEFAULT_WEIGHTS: WeightsMap = {
  F08: 0.3,
  H01: 0.2,
  H02: 0.15,
  N08: 0.2,
  N10: 0.15,
};

export type BuyerPersona =
  | 'family'
  | 'digital_nomad'
  | 'investor'
  | 'senior'
  | 'primera_compra'
  | 'downsizer'
  | 'second_home';

export const PERSONA_WEIGHTS: Readonly<Record<BuyerPersona, WeightsMap>> = {
  family: normalize({ F08: 0.3, H01: 0.3, H02: 0.15, N08: 0.15, N10: 0.1 }),
  digital_nomad: normalize({ F08: 0.3, H01: 0.05, H02: 0.1, N08: 0.3, N10: 0.25 }),
  investor: normalize({ F08: 0.3, H01: 0.2, H02: 0.15, N08: 0.2, N10: 0.15 }),
  senior: normalize({ F08: 0.25, H01: 0.1, H02: 0.2, N08: 0.15, N10: 0.3 }),
  primera_compra: normalize({ F08: 0.3, H01: 0.2, H02: 0.15, N08: 0.2, N10: 0.15 }),
  downsizer: normalize({ F08: 0.3, H01: 0.15, H02: 0.15, N08: 0.2, N10: 0.2 }),
  second_home: normalize({ F08: 0.3, H01: 0.2, H02: 0.15, N08: 0.2, N10: 0.15 }),
};

function normalize(w: Record<string, number>): WeightsMap {
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  if (sum === 0) return w;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(w)) out[k] = v / sum;
  return out;
}

export const methodology = {
  formula:
    'A06 = 0.30·F08 + 0.20·H01 + 0.15·H02 + 0.20·N08 + 0.15·N10. Weights adaptados a buyer_persona (family→H01 0.30; digital_nomad→N08 0.30; senior→N10 0.30).',
  sources: [
    'zone_scores:F08',
    'zone_scores:H01',
    'zone_scores:H02',
    'zone_scores:N08',
    'zone_scores:N10',
  ],
  weights: DEFAULT_WEIGHTS,
  dependencies: [
    { score_id: 'F08', weight: 0.3, role: 'life_quality' },
    { score_id: 'H01', weight: 0.2, role: 'calidad_escolar' },
    { score_id: 'H02', weight: 0.15, role: 'acceso_salud' },
    { score_id: 'N08', weight: 0.2, role: 'walkability' },
    { score_id: 'N10', weight: 0.15, role: 'senior_livability' },
  ],
  persona_adjustments: {
    family: 'H01 boost',
    digital_nomad: 'N08 boost, H01 down',
    senior: 'N10 boost',
  },
  references: [
    {
      name: 'Catálogo 03.8 §A06 Neighborhood',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#a06-neighborhood',
    },
    {
      name: 'Plan FASE 09 §9.B.3',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_coverage_pct: 50,
    high_coverage_pct: 80,
  },
} as const;

export const reasoning_template =
  'Neighborhood fit de {zona_name} para persona "{buyer_persona}" obtiene {score_value} combinando {available_count}/{total_count} dimensiones: LQI {F08}, escuelas {H01}, salud {H02}, walkability {N08}, senior {N10}. Faltan: {missing_dimensions}. Confianza {confidence}.';

export type NeighborhoodBucket = 'excelente' | 'buena' | 'regular' | 'baja' | 'insufficient';

export type A06DimensionId = 'F08' | 'H01' | 'H02' | 'N08' | 'N10';

export const A06_DIMENSIONS: readonly A06DimensionId[] = [
  'F08',
  'H01',
  'H02',
  'N08',
  'N10',
] as const;

export type A06SubscoreMap = Readonly<{
  [K in A06DimensionId]: number | null;
}>;

export type A06ConfidenceMap = Readonly<{
  [K in A06DimensionId]?: Confidence;
}>;

export interface A06Components extends Record<string, unknown> {
  readonly subscores: A06SubscoreMap;
  readonly pesos_aplicados: Readonly<Record<string, number>>;
  readonly buyer_persona: BuyerPersona | 'default';
  readonly missing_dimensions: readonly string[];
  readonly available_count: number;
  readonly total_count: number;
  readonly coverage_pct: number;
  readonly bucket: NeighborhoodBucket;
}

export interface A06RawInput {
  readonly subscores: A06SubscoreMap;
  readonly confidences?: A06ConfidenceMap;
  readonly buyer_persona?: BuyerPersona;
}

export interface A06ComputeOptions {
  readonly weightsOverride?: WeightsMap;
}

export interface A06ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A06Components;
}

function bucketFor(value: number, coverage_pct: number): NeighborhoodBucket {
  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) return 'insufficient';
  if (value >= 80) return 'excelente';
  if (value >= 60) return 'buena';
  if (value >= 40) return 'regular';
  return 'baja';
}

function resolvePersonaWeights(
  base: WeightsMap,
  buyer_persona: BuyerPersona | undefined,
): WeightsMap {
  if (!buyer_persona) return base;
  const personaMap = PERSONA_WEIGHTS[buyer_persona];
  if (!personaMap) return base;
  // Persona pesos reemplazan base (ya están normalizados a 1).
  return personaMap;
}

export function computeA06Neighborhood(
  input: A06RawInput,
  options: A06ComputeOptions = {},
): A06ComputeResult {
  const { subscores, confidences, buyer_persona } = input;
  const baseWeights: WeightsMap = options.weightsOverride ?? DEFAULT_WEIGHTS;
  const personaWeights = resolvePersonaWeights(baseWeights, buyer_persona);

  const availableDims: A06DimensionId[] = [];
  for (const dim of A06_DIMENSIONS) {
    const v = subscores[dim];
    if (v !== null && Number.isFinite(v)) availableDims.push(dim);
  }

  const total_count = A06_DIMENSIONS.length;
  const available_count = availableDims.length;
  const coverage_pct = Math.round((available_count / total_count) * 100);

  const { weights, missing_dimensions } = renormalizeWeights(personaWeights, availableDims);

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        subscores: buildSubscoreMap(subscores),
        pesos_aplicados: {},
        buyer_persona: buyer_persona ?? 'default',
        missing_dimensions,
        available_count,
        total_count,
        coverage_pct,
        bucket: 'insufficient',
      },
    };
  }

  let weighted = 0;
  for (const dim of availableDims) {
    const v = subscores[dim];
    const w = weights[dim] ?? 0;
    if (v !== null && Number.isFinite(v)) {
      weighted += v * w;
    }
  }
  const value = Math.max(0, Math.min(100, Math.round(weighted)));

  const availableConfidences: Confidence[] = [];
  if (confidences) {
    for (const dim of availableDims) {
      const c = confidences[dim];
      if (c) availableConfidences.push(c);
    }
  }
  let confidence: Confidence;
  if (availableConfidences.length === 0) {
    confidence =
      coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';
  } else {
    confidence = composeConfidence(availableConfidences);
    if (
      coverage_pct < methodology.confidence_thresholds.high_coverage_pct &&
      confidence === 'high'
    ) {
      confidence = 'medium';
    }
  }

  const pesos_aplicados: Record<string, number> = {};
  for (const [dim, w] of Object.entries(weights)) {
    pesos_aplicados[dim] = Number(w.toFixed(4));
  }

  return {
    value,
    confidence,
    components: {
      subscores: buildSubscoreMap(subscores),
      pesos_aplicados,
      buyer_persona: buyer_persona ?? 'default',
      missing_dimensions,
      available_count,
      total_count,
      coverage_pct,
      bucket: bucketFor(value, coverage_pct),
    },
  };
}

function buildSubscoreMap(subscores: A06SubscoreMap): A06SubscoreMap {
  const out: Record<A06DimensionId, number | null> = {
    F08: subscores.F08,
    H01: subscores.H01,
    H02: subscores.H02,
    N08: subscores.N08,
    N10: subscores.N10,
  };
  return out;
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a06.insufficient';
  if (value >= 80) return 'ie.score.a06.excelente';
  if (value >= 60) return 'ie.score.a06.buena';
  if (value >= 40) return 'ie.score.a06.regular';
  return 'ie.score.a06.baja';
}

interface ZoneScoreRow {
  readonly score_type: string;
  readonly score_value: number | null;
  readonly confidence: Confidence | null;
}

interface UserBuyerPersonaRow {
  readonly components: { readonly buyer_persona?: BuyerPersona } | null;
}

type LooseClient = SupabaseClient<Record<string, unknown>>;

async function fetchZoneDependencies(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<{
  subscores: A06SubscoreMap;
  confidences: A06ConfidenceMap;
  sources: Array<{ name: string; count: number }>;
}> {
  const subscores: Record<A06DimensionId, number | null> = {
    F08: null,
    H01: null,
    H02: null,
    N08: null,
    N10: null,
  };
  const confidences: { [K in A06DimensionId]?: Confidence } = {};
  const sources: Array<{ name: string; count: number }> = [];

  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_type, score_value, confidence')
      .eq('zone_id', zoneId)
      .eq('period_date', periodDate)
      .in('score_type', A06_DIMENSIONS as readonly string[]);
    if (!data) return { subscores, confidences, sources };
    const rows = data as unknown as readonly ZoneScoreRow[];
    for (const row of rows) {
      const dim = row.score_type as A06DimensionId;
      if (!A06_DIMENSIONS.includes(dim)) continue;
      if (row.score_value !== null && Number.isFinite(row.score_value)) {
        subscores[dim] = row.score_value;
        sources.push({ name: `zone_scores:${dim}`, count: 1 });
      }
      if (row.confidence) confidences[dim] = row.confidence;
    }
  } catch {
    // swallow
  }

  return { subscores, confidences, sources };
}

async function fetchBuyerPersona(
  supabase: SupabaseClient,
  userId: string,
): Promise<BuyerPersona | undefined> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('user_scores' as never)
      .select('components')
      .eq('user_id', userId)
      .eq('score_type', 'H14')
      .order('computed_at', { ascending: false })
      .limit(1);
    if (!data) return undefined;
    const rows = data as unknown as readonly UserBuyerPersonaRow[];
    const first = rows[0];
    return first?.components?.buyer_persona;
  } catch {
    return undefined;
  }
}

export const a06NeighborhoodCalculator: Calculator = {
  scoreId: 'A06',
  version,
  tier: 1,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const zoneId = input.zoneId;
    if (!zoneId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: {
          reason: 'A06 requiere zoneId para fetch dependencias zone_scores.',
        },
        inputs_used: { periodDate: input.periodDate, zoneId: null, userId: input.userId ?? null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'zone_scores', count: 0 }],
          computed_at,
          calculator_version: version,
        },
        template_vars: { zona_name: 'desconocida', buyer_persona: 'default' },
      };
    }

    const runtimeWeights = await loadWeights(supabase, 'A06', input.countryCode);
    const weightsOverride = runtimeWeights ?? DEFAULT_WEIGHTS;

    const { subscores, confidences, sources } = await fetchZoneDependencies(
      supabase,
      zoneId,
      input.periodDate,
    );

    const buyer_persona = input.userId
      ? await fetchBuyerPersona(supabase, input.userId)
      : undefined;

    const result = computeA06Neighborhood(
      { subscores, confidences, ...(buyer_persona ? { buyer_persona } : {}) },
      { weightsOverride },
    );

    const citations = methodology.dependencies.map((d) => ({
      source: `zone_scores:${d.score_id}`,
      period: input.periodDate,
    }));

    return {
      score_value: result.value,
      score_label: getLabelKey(result.value, result.confidence),
      components: result.components,
      inputs_used: {
        periodDate: input.periodDate,
        zoneId,
        userId: input.userId ?? null,
        buyer_persona: buyer_persona ?? 'default',
        weights_source: runtimeWeights ? 'score_weights' : 'methodology_default',
      },
      confidence: result.confidence,
      citations,
      provenance: {
        sources:
          sources.length > 0
            ? sources
            : [{ name: 'zone_scores', count: result.components.available_count }],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        zona_name: zoneId,
        buyer_persona: buyer_persona ?? 'default',
        available_count: result.components.available_count,
        total_count: result.components.total_count,
        F08: String(subscores.F08 ?? 'n/a'),
        H01: String(subscores.H01 ?? 'n/a'),
        H02: String(subscores.H02 ?? 'n/a'),
        N08: String(subscores.N08 ?? 'n/a'),
        N10: String(subscores.N10 ?? 'n/a'),
        missing_dimensions: result.components.missing_dimensions.join(',') || 'none',
      },
    };
  },
};

export default a06NeighborhoodCalculator;
