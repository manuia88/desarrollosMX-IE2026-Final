// AVM MVP I01 — Modelo H1 regresión lineal.
// Ref: FASE_08 §BLOQUE 8.D.2 + 03.8 §I01.
//
// predict(features, ctx) consume vector z-scored (length 47) + context y
// devuelve { estimate, mae_estimated_pct, confidence_score }.
//
// Fórmula:
//   estimate = max(intercept + Σ weights[i] × features[i], price_floor)
//   mae_estimated_pct = mae_baseline + penalty_missing + penalty_variance
//   confidence_score = clamp(100 − 2 × mae_estimated_pct, 0, 100)
//
// Coeficientes seed H1 viven en avm/coefficients-h1.json — intercept + 47 pesos
// mismo orden que FEATURE_NAMES (features.ts). Reentrenar en H2 (gradient
// boosting) con dataset real operaciones + comparables market_prices_secondary.
//
// MAE baseline H1 ≈ 22% por literatura inmobiliaria MX + R² proxy 0.65.
// Penalties:
//   - missing_fields/47 × 30 (si 47/47 faltan → +30 pts mae).
//   - variance_comparables (stddev/mean × 20) cap 15 pts.

import coefficients from './coefficients-h1.json' with { type: 'json' };
import { FEATURE_NAMES } from './features';
import type { AvmPredictionResult } from './types';

export const MODEL_VERSION = (coefficients as { version: string }).version;

interface Coefficients {
  readonly version: string;
  readonly intercept: number;
  readonly price_floor: number;
  readonly r_squared: number;
  readonly mae_baseline_pct: number;
  readonly weights: Readonly<Record<string, number>>;
}

const C = coefficients as Coefficients;

export interface PredictContext {
  readonly missing_fields_count?: number;
  readonly comparables_price_m2?: readonly number[];
  readonly sup_m2?: number;
}

export function predict(
  features: readonly number[],
  ctx: PredictContext = {},
): AvmPredictionResult {
  if (features.length !== FEATURE_NAMES.length) {
    throw new Error(`predict: expected ${FEATURE_NAMES.length} features, got ${features.length}`);
  }

  let dot = 0;
  for (let i = 0; i < FEATURE_NAMES.length; i += 1) {
    const name = FEATURE_NAMES[i] as string;
    const w = C.weights[name] ?? 0;
    const x = features[i] ?? 0;
    dot += w * x;
  }

  const rawEstimate = C.intercept + dot;
  const estimate = Math.max(rawEstimate, C.price_floor);

  const missingRatio = (ctx.missing_fields_count ?? 0) / FEATURE_NAMES.length;
  const penaltyMissing = Math.min(missingRatio * 30, 30);

  const comps = ctx.comparables_price_m2 ?? [];
  let penaltyVariance = 0;
  if (comps.length >= 2) {
    const mean = comps.reduce((a, b) => a + b, 0) / comps.length;
    if (mean > 0) {
      const variance = comps.reduce((acc, v) => acc + (v - mean) ** 2, 0) / comps.length;
      const cv = Math.sqrt(variance) / mean;
      penaltyVariance = Math.min(cv * 20, 15);
    }
  }

  const mae = Number((C.mae_baseline_pct + penaltyMissing + penaltyVariance).toFixed(2));
  const confidence = Math.max(0, Math.min(100, Math.round(100 - 2 * mae)));

  return {
    estimate: Math.round(estimate),
    mae_estimated_pct: mae,
    confidence_score: confidence,
  };
}

export function getModelMetadata(): {
  version: string;
  r_squared: number;
  mae_baseline_pct: number;
  intercept: number;
  feature_count: number;
} {
  return {
    version: C.version,
    r_squared: C.r_squared,
    mae_baseline_pct: C.mae_baseline_pct,
    intercept: C.intercept,
    feature_count: FEATURE_NAMES.length,
  };
}
