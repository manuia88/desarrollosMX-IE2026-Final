// F08 Life Quality Index (LQI) — score N1 compuesto que combina 9 dimensiones
// N0 (seguridad, transporte, ecosistema, escuelas, salud, walkability,
// diversidad, trayectoria criminal, ambiente).
// Plan FASE 09 §9.A.1 + catálogo 03.8 §F08.
//
// Fórmula (weights default por catálogo 03.8 §F08):
//   LQI = 0.20·F01_safety + 0.15·F02_transit + 0.15·F03_ecosystem
//       + 0.10·H01_school + 0.10·H02_health + 0.10·N08_walkability
//       + 0.10·N01_diversity + 0.05·N04_crime_trajectory + 0.05·H07_environment
//
// D8 — weights runtime: loadWeights(score_weights) override per (score_id,
// country_code). Fallback a methodology.weights si tabla vacía.
//
// D9 — fallback graceful: si alguna dep N0 devuelve null (insufficient_data),
// renormalizeWeights redistribuye su peso proporcionalmente entre las deps
// disponibles. components.missing_dimensions enumera las faltantes.
//
// Coverage mínima: si <50% de dimensiones están disponibles → score_value=0
// y confidence='insufficient_data'. UI renderiza placeholder.
//
// Confidence cascade: composeConfidence(confidences de las deps disponibles)
// — el peor manda. Ver confidence.ts §CONFIDENCE_ORDER.
//
// Tier 2 (no tier gate data-volume, pero requiere al menos 50% deps N0 listas).
// Category: zona → persist en zone_scores.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { composeConfidence } from '../confidence';
import { loadWeights, renormalizeWeights, type WeightsMap } from '../weights-loader';

export const version = '1.0.0';

export const DEFAULT_WEIGHTS: WeightsMap = {
  F01: 0.2,
  F02: 0.15,
  F03: 0.15,
  H01: 0.1,
  H02: 0.1,
  N08: 0.1,
  N01: 0.1,
  N04: 0.05,
  H07: 0.05,
};

export const methodology = {
  formula:
    'LQI = 0.20·F01_safety + 0.15·F02_transit + 0.15·F03_ecosystem + 0.10·H01_school + 0.10·H02_health + 0.10·N08_walkability + 0.10·N01_diversity + 0.05·N04_crime_trajectory + 0.05·H07_environment.',
  sources: [
    'zone_scores:F01',
    'zone_scores:F02',
    'zone_scores:F03',
    'zone_scores:H01',
    'zone_scores:H02',
    'zone_scores:N08',
    'zone_scores:N01',
    'zone_scores:N04',
    'zone_scores:H07',
  ],
  weights: DEFAULT_WEIGHTS,
  dependencies: [
    { score_id: 'F01', weight: 0.2, role: 'seguridad' },
    { score_id: 'F02', weight: 0.15, role: 'transito_transporte' },
    { score_id: 'F03', weight: 0.15, role: 'ecosistema_local' },
    { score_id: 'H01', weight: 0.1, role: 'calidad_escolar' },
    { score_id: 'H02', weight: 0.1, role: 'acceso_salud' },
    { score_id: 'N08', weight: 0.1, role: 'walkability' },
    { score_id: 'N01', weight: 0.1, role: 'diversidad_giros' },
    { score_id: 'N04', weight: 0.05, role: 'trayectoria_criminal' },
    { score_id: 'H07', weight: 0.05, role: 'ambiente' },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §F08 Life Quality Index',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#f08-life-quality-index',
    },
    {
      name: 'Plan FASE 09 §9.A.1',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_coverage_pct: 50,
    high_coverage_pct: 90,
  },
} as const;

export const reasoning_template =
  'Calidad de vida de {zona_name} obtiene {score_value} por combinación de {available_count}/{total_count} dimensiones N0: seguridad {F01}, transporte {F02}, ecosistema {F03}, escuelas {H01}, salud {H02}, walkability {N08}, diversidad {N01}, trayectoria criminal {N04}, ambiente {H07}. Faltan: {missing_dimensions}. Confianza {confidence}.';

export type LqiBucket = 'muy_buena' | 'buena' | 'regular' | 'baja' | 'insufficient';

export type F08DimensionId = 'F01' | 'F02' | 'F03' | 'H01' | 'H02' | 'N08' | 'N01' | 'N04' | 'H07';

export const F08_DIMENSIONS: readonly F08DimensionId[] = [
  'F01',
  'F02',
  'F03',
  'H01',
  'H02',
  'N08',
  'N01',
  'N04',
  'H07',
] as const;

export type F08SubscoreMap = Readonly<{
  [K in F08DimensionId]: number | null;
}>;

export type F08ConfidenceMap = Readonly<{
  [K in F08DimensionId]?: Confidence;
}>;

export interface F08Components extends Record<string, unknown> {
  readonly subscores: F08SubscoreMap;
  readonly pesos_aplicados: Readonly<Record<string, number>>;
  readonly missing_dimensions: readonly string[];
  readonly available_count: number;
  readonly total_count: number;
  readonly coverage_pct: number;
  readonly bucket: LqiBucket;
}

export interface F08RawInput {
  readonly subscores: F08SubscoreMap;
  readonly confidences?: F08ConfidenceMap;
}

export interface F08ComputeOptions {
  readonly weightsOverride?: WeightsMap;
}

export interface F08ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: F08Components;
}

function bucketFor(value: number, coverage_pct: number): LqiBucket {
  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) return 'insufficient';
  if (value >= 80) return 'muy_buena';
  if (value >= 60) return 'buena';
  if (value >= 40) return 'regular';
  return 'baja';
}

export function computeF08LifeQualityIndex(
  input: F08RawInput,
  options: F08ComputeOptions = {},
): F08ComputeResult {
  const { subscores, confidences } = input;
  const baseWeights: WeightsMap = options.weightsOverride ?? DEFAULT_WEIGHTS;

  const availableDims: F08DimensionId[] = [];
  for (const dim of F08_DIMENSIONS) {
    const v = subscores[dim];
    if (v !== null && Number.isFinite(v)) availableDims.push(dim);
  }

  const total_count = F08_DIMENSIONS.length;
  const available_count = availableDims.length;
  const coverage_pct = Math.round((available_count / total_count) * 100);

  const { weights, missing_dimensions } = renormalizeWeights(baseWeights, availableDims);

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    const insufficientSubscores = buildSubscoreMap(subscores);
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        subscores: insufficientSubscores,
        pesos_aplicados: {},
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
      missing_dimensions,
      available_count,
      total_count,
      coverage_pct,
      bucket: bucketFor(value, coverage_pct),
    },
  };
}

function buildSubscoreMap(subscores: F08SubscoreMap): F08SubscoreMap {
  const out: Record<F08DimensionId, number | null> = {
    F01: subscores.F01,
    F02: subscores.F02,
    F03: subscores.F03,
    H01: subscores.H01,
    H02: subscores.H02,
    N08: subscores.N08,
    N01: subscores.N01,
    N04: subscores.N04,
    H07: subscores.H07,
  };
  return out;
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.f08.insufficient';
  if (value >= 80) return 'ie.score.f08.muy_buena';
  if (value >= 60) return 'ie.score.f08.buena';
  if (value >= 40) return 'ie.score.f08.regular';
  return 'ie.score.f08.baja';
}

interface ZoneScoreRow {
  readonly score_type: string;
  readonly score_value: number | null;
  readonly confidence: Confidence | null;
  readonly computed_at: string | null;
  readonly valid_until: string | null;
}

type LooseClient = SupabaseClient<Record<string, unknown>>;

async function fetchZoneDependencies(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<{
  subscores: F08SubscoreMap;
  confidences: F08ConfidenceMap;
  sources: Array<{ name: string; count: number }>;
}> {
  const subscores: Record<F08DimensionId, number | null> = {
    F01: null,
    F02: null,
    F03: null,
    H01: null,
    H02: null,
    N08: null,
    N01: null,
    N04: null,
    H07: null,
  };
  const confidences: { [K in F08DimensionId]?: Confidence } = {};
  const sources: Array<{ name: string; count: number }> = [];

  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_type, score_value, confidence, computed_at, valid_until')
      .eq('zone_id', zoneId)
      .eq('period_date', periodDate)
      .in('score_type', F08_DIMENSIONS as readonly string[]);
    if (!data) {
      return { subscores, confidences, sources };
    }
    const rows = data as unknown as readonly ZoneScoreRow[];
    for (const row of rows) {
      const dim = row.score_type as F08DimensionId;
      if (!F08_DIMENSIONS.includes(dim)) continue;
      if (row.score_value !== null && Number.isFinite(row.score_value)) {
        subscores[dim] = row.score_value;
        sources.push({ name: `zone_scores:${dim}`, count: 1 });
      }
      if (row.confidence) confidences[dim] = row.confidence;
    }
  } catch {
    // swallow — upstream run() degrades to insufficient_data
  }

  return {
    subscores,
    confidences,
    sources,
  };
}

export const f08LifeQualityIndexCalculator: Calculator = {
  scoreId: 'F08',
  version,
  tier: 2,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const zoneId = input.zoneId;
    if (!zoneId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: {
          reason: 'F08 requiere zoneId para fetch dependencias zone_scores.',
        },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'zone_scores', count: 0 }],
          computed_at,
          calculator_version: version,
        },
        template_vars: { zona_name: 'desconocida' },
      };
    }

    const runtimeWeights = await loadWeights(supabase, 'F08', input.countryCode);
    const weightsOverride = runtimeWeights ?? DEFAULT_WEIGHTS;

    const { subscores, confidences, sources } = await fetchZoneDependencies(
      supabase,
      zoneId,
      input.periodDate,
    );

    const result = computeF08LifeQualityIndex({ subscores, confidences }, { weightsOverride });

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
        available_count: result.components.available_count,
        total_count: result.components.total_count,
        F01: String(subscores.F01 ?? 'n/a'),
        F02: String(subscores.F02 ?? 'n/a'),
        F03: String(subscores.F03 ?? 'n/a'),
        H01: String(subscores.H01 ?? 'n/a'),
        H02: String(subscores.H02 ?? 'n/a'),
        N08: String(subscores.N08 ?? 'n/a'),
        N01: String(subscores.N01 ?? 'n/a'),
        N04: String(subscores.N04 ?? 'n/a'),
        H07: String(subscores.H07 ?? 'n/a'),
        missing_dimensions: result.components.missing_dimensions.join(',') || 'none',
      },
    };
  },
};

export default f08LifeQualityIndexCalculator;
