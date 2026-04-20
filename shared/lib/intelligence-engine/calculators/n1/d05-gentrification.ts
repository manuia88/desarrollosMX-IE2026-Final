// D05 Gentrification (macro) — score N1 que combina velocidad de cambio socio-
// económico (N03) + diversidad de giros (N01) + arbitraje precios (A04) + delta
// price index zona 12m.
// Plan FASE 09 §9.C.6. Catálogo 03.8 §D05.
//
// Fórmula:
//   velocity_component  = 0.50·N03 + 0.25·A04 + 0.25·N01
//   price_delta_signal  = clamp(price_index_delta_12m × 500, 0, 100)
//   score_value         = clamp(velocity_component + price_delta_signal, 0, 100)
//
// Note: price_delta_signal SUMA como señal complementaria — no entra en weights
// runtime (D8 solo afecta N03/A04/N01). Un delta 12m de +20% → +100 señal.
//
// Bucket phase (components.velocity_signal):
//   <40  → 'estable'
//   40-60 → 'leve'
//   60-80 → 'media'
//   ≥80   → 'rapida'
//
// D8 runtime weights override: score_weights por (score_id='D05', country_code).
// D9 fallback graceful: deps faltantes → renormalizeWeights + missing_dimensions.
// Tier 3 (requiere N03 + A04 + N01 + price_index). Si <2 deps → insufficient.

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

export type D05DimensionId = 'N03' | 'A04' | 'N01';

export const DEFAULT_WEIGHTS: Readonly<Record<D05DimensionId, number>> = {
  N03: 0.5,
  A04: 0.25,
  N01: 0.25,
} as const;

export const PRICE_DELTA_SCALE = 500; // +20% delta → +100 señal
export const D05_DIMENSIONS: readonly D05DimensionId[] = ['N03', 'A04', 'N01'] as const;

export const methodology = {
  formula:
    'velocity = 0.50·N03 + 0.25·A04 + 0.25·N01; price_signal = clamp(price_delta_12m × 500, 0, 100); score = clamp(velocity + price_signal, 0, 100).',
  sources: ['zone_scores:N03', 'zone_scores:A04', 'zone_scores:N01', 'market_prices_secondary'],
  weights: { ...DEFAULT_WEIGHTS, price_index_delta_12m: 'complementary_signal' },
  dependencies: [
    { score_id: 'N03', weight: 0.5, role: 'gentrification_velocity' },
    { score_id: 'A04', weight: 0.25, role: 'arbitraje_precios' },
    { score_id: 'N01', weight: 0.25, role: 'diversidad_giros' },
  ],
  triggers_cascade: ['geo_data_updated:denue'],
  references: [
    {
      name: 'Catálogo 03.8 §D05 Gentrification',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#d05-gentrification',
    },
    {
      name: 'Plan FASE 09 §9.C.6',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_available_deps: 2,
  },
} as const;

export const reasoning_template =
  'Gentrificación {zona_name} obtiene {score_value} ({velocity_signal}). Drivers principales: velocity N03={N03}, arbitraje A04={A04}, diversidad N01={N01}. Delta precio 12m: {price_delta_12m_pct}%. Faltan: {missing_dimensions}. Confianza {confidence}.';

export type GentrificationPhase = 'estable' | 'leve' | 'media' | 'rapida';

export interface D05Driver {
  readonly factor: D05DimensionId | 'price_delta';
  readonly contribution_pct: number;
}

export interface D05Components extends Record<string, unknown> {
  readonly velocity_signal: GentrificationPhase;
  readonly velocity_component: number;
  readonly price_delta_12m_pct: number;
  readonly price_delta_signal: number;
  readonly drivers: readonly D05Driver[];
  readonly weights_applied: Readonly<Record<string, number>>;
  readonly missing_dimensions: readonly string[];
  readonly available_count: number;
  readonly total_count: number;
}

export interface D05RawInput {
  readonly N03_velocity: number | null;
  readonly A04_arbitrage: number | null;
  readonly N01_diversity: number | null;
  readonly price_index_zona_12m_delta_pct: number | null;
  readonly confidences?: Readonly<Partial<Record<D05DimensionId, Confidence>>>;
}

export interface D05ComputeOptions {
  readonly weightsOverride?: WeightsMap;
}

export interface D05ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: D05Components;
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function bucketPhase(value: number): GentrificationPhase {
  if (value >= 80) return 'rapida';
  if (value >= 60) return 'media';
  if (value >= 40) return 'leve';
  return 'estable';
}

export function computeD05Gentrification(
  input: D05RawInput,
  options: D05ComputeOptions = {},
): D05ComputeResult {
  const base: WeightsMap = options.weightsOverride ?? DEFAULT_WEIGHTS;

  const available: D05DimensionId[] = [];
  const dimValues: Partial<Record<D05DimensionId, number>> = {};

  for (const k of D05_DIMENSIONS) {
    const v =
      k === 'N03' ? input.N03_velocity : k === 'A04' ? input.A04_arbitrage : input.N01_diversity;
    if (v !== null && v !== undefined && Number.isFinite(v)) {
      available.push(k);
      dimValues[k] = v;
    }
  }

  const renorm: RenormalizedWeights = renormalizeWeights(base, available);

  // price_delta es señal complementaria — no va por renormalizeWeights.
  const deltaPct = Number.isFinite(input.price_index_zona_12m_delta_pct ?? NaN)
    ? (input.price_index_zona_12m_delta_pct as number)
    : 0;
  const price_delta_signal = clamp100(deltaPct * PRICE_DELTA_SCALE);

  let velocity_component = 0;
  const drivers: D05Driver[] = [];
  for (const dim of available) {
    const v = dimValues[dim];
    const w = renorm.weights[dim] ?? 0;
    if (v === undefined) continue;
    const contribution = v * w;
    velocity_component += contribution;
    drivers.push({
      factor: dim,
      contribution_pct: Number(contribution.toFixed(2)),
    });
  }

  if (price_delta_signal > 0) {
    drivers.push({
      factor: 'price_delta',
      contribution_pct: Number(price_delta_signal.toFixed(2)),
    });
  }

  const value =
    available.length === 0 && price_delta_signal === 0
      ? 0
      : Math.round(clamp100(velocity_component + price_delta_signal));

  const drivers_sorted = [...drivers].sort((a, b) => b.contribution_pct - a.contribution_pct);

  const velocity_signal = bucketPhase(value);

  // Confidence composition.
  const sub: Confidence[] = [];
  if (input.confidences) {
    for (const dim of available) {
      const c = input.confidences[dim];
      if (c) sub.push(c);
    }
  }

  const minDeps = methodology.confidence_thresholds.min_available_deps;
  let confidence: Confidence;
  if (renorm.available_count < minDeps) {
    confidence = 'insufficient_data';
  } else if (sub.length > 0) {
    confidence = composeConfidence(sub);
    if (renorm.missing_dimensions.length > 0 && confidence === 'high') {
      confidence = 'medium';
    }
  } else {
    confidence =
      renorm.missing_dimensions.length === 0
        ? 'high'
        : renorm.available_count >= minDeps
          ? 'medium'
          : 'low';
  }

  const weights_applied: Record<string, number> = {};
  for (const [dim, w] of Object.entries(renorm.weights)) {
    weights_applied[dim] = Number(w.toFixed(4));
  }

  return {
    value,
    confidence,
    components: {
      velocity_signal,
      velocity_component: Number(velocity_component.toFixed(2)),
      price_delta_12m_pct: Number(deltaPct.toFixed(4)),
      price_delta_signal: Number(price_delta_signal.toFixed(2)),
      drivers: drivers_sorted,
      weights_applied,
      missing_dimensions: renorm.missing_dimensions,
      available_count: renorm.available_count,
      total_count: renorm.total_count,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.d05.insufficient';
  if (value >= 80) return 'ie.score.d05.rapida';
  if (value >= 60) return 'ie.score.d05.media';
  if (value >= 40) return 'ie.score.d05.leve';
  return 'ie.score.d05.estable';
}

export const d05GentrificationCalculator: Calculator = {
  scoreId: 'D05',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const runtimeWeights = await loadWeights(supabase, 'D05', input.countryCode).catch(() => null);
    const weights = runtimeWeights ?? DEFAULT_WEIGHTS;
    const confidence: Confidence = 'insufficient_data';
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        velocity_signal: 'estable' as GentrificationPhase,
        velocity_component: 0,
        price_delta_12m_pct: 0,
        price_delta_signal: 0,
        drivers: [],
        weights_applied: weights,
        missing_dimensions: Object.keys(weights),
        available_count: 0,
        total_count: D05_DIMENSIONS.length,
        reason:
          'D05 requiere N03+A04+N01 persistidos en zone_scores + price_index delta. Use computeD05Gentrification(input) en tests.',
      },
      inputs_used: {
        periodDate: input.periodDate,
        zoneId: input.zoneId ?? null,
        weights_source: runtimeWeights ? 'score_weights' : 'methodology_default',
      },
      confidence,
      citations: [
        { source: 'zone_scores:N03', period: input.periodDate },
        { source: 'zone_scores:A04', period: input.periodDate },
        { source: 'zone_scores:N01', period: input.periodDate },
        { source: 'market_prices_secondary', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:N03', count: 0 },
          { name: 'zone_scores:A04', count: 0 },
          { name: 'zone_scores:N01', count: 0 },
          { name: 'market_prices_secondary', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        zona_name: input.zoneId ?? 'desconocida',
        velocity_signal: 'estable',
        N03: 'n/a',
        A04: 'n/a',
        N01: 'n/a',
        price_delta_12m_pct: 0,
        missing_dimensions: 'all',
      },
    };
  },
};

export default d05GentrificationCalculator;
