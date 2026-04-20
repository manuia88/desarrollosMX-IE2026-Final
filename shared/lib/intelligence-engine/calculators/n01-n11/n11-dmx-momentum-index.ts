// N11 DMX Momentum Index — killer asset IP propietaria DMX (alimenta DMX-MOM B2B).
// Plan §8.C.11 + catálogo 03.8 §N11. TODO #12 CONTRATO §8: primer commit 8.C.
//
// Fórmula combinada per catálogo 03.8:
//   momentum_raw = 0.3 × map(ΔF08_12m)
//                + 0.2 × map(ΔA12_12m)
//                + 0.2 × map(Δsearch_trends_3m)
//                + 0.15 × map(ΔN01_12m)
//                + 0.15 × map(N03_velocity × 4)
//   score = clamp(round(momentum_raw), 0, 100)
//
// Mapping por componente (centro 50 = sin cambio):
//   ΔF08_12m         → 50 + 10 × v        (rango esperado -5..+5)
//   ΔA12_12m         → 50 + 10 × v        (rango -5..+5)
//   Δsearch_trends_3m → 50 + 2.5 × v      (rango -20..+20%)
//   ΔN01_12m          → 50 + 500 × v      (rango -0.1..+0.1 Shannon)
//   N03_velocity      → v × 4 (cap 100)  (0-25 → 0-100)
//
// Tier 3 GATE: requiere ≥50 proyectos zona + ≥6 meses data. Si no cumple,
// tier-gate devuelve gated sin persistir. Fallback H1: stub search_trends = 0
// hasta FASE 27 (Google Trends ingestor). N03 requiere ≥2 DENUE snapshots.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = 0.3·map(ΔF08_12m) + 0.2·map(ΔA12_12m) + 0.2·map(Δsearch_trends) + 0.15·map(ΔN01_12m) + 0.15·map(N03_velocity × 4). Centrado en 50.',
  sources: ['denue', 'fgj', 'market_prices_secondary', 'search_logs'],
  weights: { f08: 0.3, a12: 0.2, search_trends: 0.2, n01: 0.15, n03: 0.15 },
  references: [
    {
      name: 'Catálogo 03.8 §N11 DMX Momentum Index',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n11-dmx-momentum-index',
    },
    {
      name: 'FASE 11 DMX-MOM índices licenciables',
      url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md',
    },
  ],
  validity: { unit: 'months', value: 1 } as const,
  tier_gate: { min_proyectos: 50, min_meses_data: 6 },
  recommendations: {
    low: ['ie.score.n11.recommendations.low.0', 'ie.score.n11.recommendations.low.1'],
    medium: ['ie.score.n11.recommendations.medium.0', 'ie.score.n11.recommendations.medium.1'],
    high: ['ie.score.n11.recommendations.high.0', 'ie.score.n11.recommendations.high.1'],
    insufficient_data: ['ie.score.n11.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'Momentum de {zona_name} obtiene {score_value} por combinación ΔF08_12m={f08_delta}, ΔA12_12m={a12_delta}, Δsearch_trends_3m={search_trends_delta}%, ΔN01_12m={n01_delta}, N03_velocity={n03_velocity}. Z-score relativo CDMX. Confianza {confidence}. {tier_gated_note}';

export type MomentumBucket = 'low' | 'medium' | 'high';

export interface N11Components extends Record<string, unknown> {
  readonly momentum_components: {
    readonly f08_delta_12m: number;
    readonly a12_delta_12m: number;
    readonly search_trends_delta_3m: number;
    readonly n01_delta_12m: number;
    readonly n03_velocity: number;
  };
  readonly component_scores: {
    readonly f08: number;
    readonly a12: number;
    readonly search_trends: number;
    readonly n01: number;
    readonly n03: number;
  };
  readonly z_score: number;
  readonly bucket: MomentumBucket;
  readonly tier_gate_passed: boolean;
  readonly proyectos_zona: number;
  readonly meses_data_disponible: number;
}

export interface N11RawInput {
  readonly f08_delta_12m: number;
  readonly a12_delta_12m: number;
  readonly search_trends_delta_3m: number;
  readonly n01_delta_12m: number;
  readonly n03_velocity: number;
  readonly proyectos_zona: number;
  readonly meses_data_disponible: number;
  /** Media CDMX de ΔF08_12m para computar z-score (default 1.0 si no se pasa). */
  readonly cdmx_mean_f08?: number;
  /** Desviación estándar CDMX (default 1.5). */
  readonly cdmx_std_f08?: number;
}

export interface N11ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N11Components;
  readonly tier_gated: boolean;
  readonly tier_gated_reason: string | null;
}

function mapLinear(value: number, scale: number): number {
  return Math.max(0, Math.min(100, 50 + value * scale));
}

function mapN03(velocity: number): number {
  return Math.max(0, Math.min(100, velocity * 4));
}

function bucketFor(value: number): MomentumBucket {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

export function computeN11Momentum(input: N11RawInput): N11ComputeResult {
  const {
    f08_delta_12m,
    a12_delta_12m,
    search_trends_delta_3m,
    n01_delta_12m,
    n03_velocity,
    proyectos_zona,
    meses_data_disponible,
    cdmx_mean_f08 = 1.0,
    cdmx_std_f08 = 1.5,
  } = input;

  // Tier 3 gate: requiere ≥50 proyectos + ≥6 meses data.
  const tierGatePassed = proyectos_zona >= 50 && meses_data_disponible >= 6;
  if (!tierGatePassed) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      tier_gated: true,
      tier_gated_reason: `Tier 3 gated: ${proyectos_zona}/50 proyectos, ${meses_data_disponible}/6 meses data.`,
      components: {
        momentum_components: {
          f08_delta_12m,
          a12_delta_12m,
          search_trends_delta_3m,
          n01_delta_12m,
          n03_velocity,
        },
        component_scores: { f08: 0, a12: 0, search_trends: 0, n01: 0, n03: 0 },
        z_score: 0,
        bucket: 'low',
        tier_gate_passed: false,
        proyectos_zona,
        meses_data_disponible,
      },
    };
  }

  const f08_score = mapLinear(f08_delta_12m, 10);
  const a12_score = mapLinear(a12_delta_12m, 10);
  const search_score = mapLinear(search_trends_delta_3m, 2.5);
  const n01_score = mapLinear(n01_delta_12m, 500);
  const n03_score = mapN03(n03_velocity);

  const weighted =
    methodology.weights.f08 * f08_score +
    methodology.weights.a12 * a12_score +
    methodology.weights.search_trends * search_score +
    methodology.weights.n01 * n01_score +
    methodology.weights.n03 * n03_score;

  const value = Math.max(0, Math.min(100, Math.round(weighted)));
  const z_score = cdmx_std_f08 > 0 ? (f08_delta_12m - cdmx_mean_f08) / cdmx_std_f08 : 0;

  // Confidence: high cuando ≥6 componentes reales. Medium con ≥3. Low otherwise.
  // Stub search_trends (=0) baja confidence.
  const realComponents = [f08_delta_12m, a12_delta_12m, n01_delta_12m, n03_velocity].filter(
    (v) => Number.isFinite(v) && v !== 0,
  ).length;
  const confidence: Confidence =
    realComponents >= 4 ? 'high' : realComponents >= 2 ? 'medium' : 'low';

  return {
    value,
    confidence,
    tier_gated: false,
    tier_gated_reason: null,
    components: {
      momentum_components: {
        f08_delta_12m,
        a12_delta_12m,
        search_trends_delta_3m,
        n01_delta_12m,
        n03_velocity,
      },
      component_scores: {
        f08: Number(f08_score.toFixed(2)),
        a12: Number(a12_score.toFixed(2)),
        search_trends: Number(search_score.toFixed(2)),
        n01: Number(n01_score.toFixed(2)),
        n03: Number(n03_score.toFixed(2)),
      },
      z_score: Number(z_score.toFixed(3)),
      bucket: bucketFor(value),
      tier_gate_passed: true,
      proyectos_zona,
      meses_data_disponible,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n11.insufficient';
  if (value >= 70) return 'ie.score.n11.aceleracion';
  if (value >= 40) return 'ie.score.n11.estable';
  return 'ie.score.n11.desaceleracion';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') {
    return methodology.recommendations.insufficient_data;
  }
  const bucket = bucketFor(value);
  return methodology.recommendations[bucket];
}

export const n11DmxMomentumCalculator: Calculator = {
  scoreId: 'N11',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    // Prod path: query zone_scores for F08/A12/N01 deltas (deltas column D2 post
    // BLOQUE 8.C pre-step) + denue_snapshots for N03 velocity + search_logs
    // aggregations for search_trends. H1 stub: sin data → insufficient.
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason:
          'N11 requires F08/A12/N01 deltas via zone_scores.deltas + N03 velocity + search_trends (FASE 27 stub).',
        note: 'Use computeN11Momentum(rawInput) con fixture CDMX_MOMENTUM_INPUTS.',
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'denue',
          url: 'https://www.inegi.org.mx/app/mapa/denue/',
          period: 'snapshots ≥2',
        },
        { source: 'market_prices_secondary', period: 'last 12m' },
        { source: 'search_logs', period: 'last 3m (FASE 27 stub)' },
      ],
      provenance: {
        sources: [
          { name: 'denue', count: 0 },
          { name: 'fgj', count: 0 },
          { name: 'market_prices_secondary', count: 0 },
          { name: 'search_logs', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default n11DmxMomentumCalculator;
