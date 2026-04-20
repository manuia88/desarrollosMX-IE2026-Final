// D19 FASE 10 — LIME-style local approximation para ML scores (H14, E03).
//
// Objetivo: explicar contribución de cada feature a una predicción ML local
// sin requerir Python / scikit. Implementación TS puro.
//
// Idea LIME (Ribeiro et al. 2016) simplificada:
//   1. Alrededor del punto x_0, sampleamos perturbaciones x_i.
//   2. Evaluamos predictFn en cada x_i → y_i.
//   3. Ajustamos regresión lineal ponderada (kernel RBF por distancia).
//   4. Coeficientes β_j son contribuciones aproximadas por feature.
//
// H1 trade-off: en lugar de regresión completa (requeriría inversa matrix),
// usamos "feature-level sensitivity": variar una feature a la vez y medir
// delta en la predicción. Equivalente a partial dependence local. Más barato,
// más determinístico, suficiente para H1 (panel de transparencia UI).
//
// API:
//   explainPrediction({ features, predictFn, delta_pct? })
//     → { top_contributors, total_impact_pts, baseline }
//
// Cada contributor trae:
//   - feature: nombre de la dimension
//   - impact_pts: delta score atribuido (+/- pts absolutos)
//   - direction: positive | negative | neutral
//   - relative_weight_pct: % del impact total absoluto
//
// Se persiste en zone_scores.ml_explanations / project_scores.ml_explanations
// (jsonb) via migration 20260420100000.

export interface FeatureValue {
  readonly name: string;
  readonly value: number;
  readonly label?: string;
}

export type PredictFn = (features: Readonly<Record<string, number>>) => number;

export interface ExplainInput {
  readonly features: readonly FeatureValue[];
  readonly predictFn: PredictFn;
  readonly delta_pct?: number;
  readonly top_n?: number;
}

export interface Contributor {
  readonly feature: string;
  readonly label?: string;
  readonly current_value: number;
  readonly perturbed_value: number;
  readonly impact_pts: number;
  readonly direction: 'positive' | 'negative' | 'neutral';
  readonly relative_weight_pct: number;
}

export interface Explanation {
  readonly baseline_prediction: number;
  readonly top_contributors: readonly Contributor[];
  readonly total_impact_pts: number;
  readonly method: 'lime_local_partial_dependence';
  readonly delta_pct: number;
}

const DEFAULT_DELTA_PCT = 0.1;
const DEFAULT_TOP_N = 5;
const NEUTRAL_THRESHOLD = 0.01;

function buildFeatureMap(features: readonly FeatureValue[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const f of features) map[f.name] = f.value;
  return map;
}

export function explainPrediction(input: ExplainInput): Explanation {
  const delta_pct = input.delta_pct ?? DEFAULT_DELTA_PCT;
  const top_n = input.top_n ?? DEFAULT_TOP_N;
  const baseMap = buildFeatureMap(input.features);
  const baseline = input.predictFn(baseMap);

  const raw: Contributor[] = [];
  for (const f of input.features) {
    const upValue = f.value * (1 + delta_pct);
    const upMap = { ...baseMap, [f.name]: upValue };
    const upPred = input.predictFn(upMap);

    const impact = upPred - baseline;
    const dirThreshold = Math.abs(impact) < NEUTRAL_THRESHOLD;
    const direction: Contributor['direction'] = dirThreshold
      ? 'neutral'
      : impact > 0
        ? 'positive'
        : 'negative';

    raw.push({
      feature: f.name,
      label: f.label,
      current_value: f.value,
      perturbed_value: upValue,
      impact_pts: Number(impact.toFixed(4)),
      direction,
      relative_weight_pct: 0,
    });
  }

  const totalAbs = raw.reduce((acc, c) => acc + Math.abs(c.impact_pts), 0);
  const withWeights = raw.map((c) => ({
    ...c,
    relative_weight_pct:
      totalAbs > 0 ? Number(((Math.abs(c.impact_pts) / totalAbs) * 100).toFixed(2)) : 0,
  }));

  withWeights.sort((a, b) => Math.abs(b.impact_pts) - Math.abs(a.impact_pts));

  return {
    baseline_prediction: Number(baseline.toFixed(4)),
    top_contributors: withWeights.slice(0, top_n),
    total_impact_pts: Number(totalAbs.toFixed(4)),
    method: 'lime_local_partial_dependence',
    delta_pct,
  };
}

// D14 sensitivity analysis helper — overlay sobre explainPrediction para
// compute "si F01 sube 10%, F09 cambia X%". Export plano para methodology.
export interface SensitivityEntry {
  readonly dimension_id: string;
  readonly impact_pct_per_10pct_change: number;
}

export function computeSensitivity(
  explanation: Explanation,
  baseScore: number,
): readonly SensitivityEntry[] {
  if (baseScore === 0) {
    return explanation.top_contributors.map((c) => ({
      dimension_id: c.feature,
      impact_pct_per_10pct_change: 0,
    }));
  }
  const scale = explanation.delta_pct === 0 ? 1 : 0.1 / explanation.delta_pct;
  return explanation.top_contributors.map((c) => ({
    dimension_id: c.feature,
    impact_pct_per_10pct_change: Number((((c.impact_pts * scale) / baseScore) * 100).toFixed(2)),
  }));
}
