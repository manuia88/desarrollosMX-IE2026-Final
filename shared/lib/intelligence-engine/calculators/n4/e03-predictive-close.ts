// E03 Predictive Close (ML) — probabilidad de cierre de un deal específico.
// Plan FASE 10 §10.C (N4). Catálogo 03.8 §E03. Tier 4 (calibrada H2), Tier 3
// heurística H1. Categoría proyecto.
//
// FÓRMULA H1 (heurística, fallback sin modelo calibrado):
//   P(close) = sigmoid(
//       0.30 × (lead_score / 100)
//     + 0.20 × normalized_visits
//     + 0.20 × positive_feedback_ratio
//     + 0.15 × (momentum_zona / 100)
//     − 0.15 × (days_in_funnel > 60 ? 1 : 0)
//   )
//   donde normalized_visits = min(visits_count / 5, 1)
//   price_fit_index multiplica final por (0.6 + 0.4 × fit) [0..1] como bonus.
//
// D19 FASE 10 — ml_explanations LIME-style:
//   top_features[] con feature, weight, direction.
//   confidence_interval [low, high] al 90% usando desviación heurística ±8pp.
//
// D33 FASE 10 SESIÓN 3/3 — tenant_scope_required: true. run-score.ts valida
// tenant_id (institucional N4).
//
// Tier gate (Tier 4): requiere modelo calibrado en BD para upgrade H2. H1
// expone heurística con confidence = medium y la misma shape ml_explanations.
//
// Components sensitive (raw): close_probability, top_features,
// confidence_interval, days_to_close_estimate, lead_scores_raw, pii_signals.
// RLS institucional filtra por tenant_id.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

// Feature weights heurística H1 (suma = 1, bias signo explícito).
export const HEURISTIC_WEIGHTS = {
  lead_score: 0.3,
  visits_count: 0.2,
  feedback_positive_ratio: 0.2,
  momentum_zona: 0.15,
  days_penalty: -0.15,
} as const;

// Umbrales.
export const DAYS_IN_FUNNEL_PENALTY_THRESHOLD = 60;
export const VISITS_SATURATION = 5;
export const CONFIDENCE_INTERVAL_HALF_WIDTH = 0.08; // ±8pp heurística H1.

// Estimador días a cierre: base 30d − boost por hot lead.
export const BASE_DAYS_TO_CLOSE = 30;

export const methodology = {
  formula:
    'P(close) = sigmoid(0.3·leadN + 0.2·visitsN + 0.2·fb+ + 0.15·momentumN − 0.15·stalled) · price_fit_adj. H1 heurística; H2 logistic regression calibrada.',
  sources: ['contactos', 'operaciones', 'interaction_feedback', 'zone_scores:N11'],
  dependencies: [
    { score_id: 'C01', weight: 0.3, role: 'lead_score', critical: true } as const,
    { score_id: 'N11', weight: 0.15, role: 'momentum_zona', critical: false } as const,
    { score_id: 'B04', weight: 0.1, role: 'price_fit', critical: false } as const,
    { score_id: 'B08', weight: 0.05, role: 'absorption_context', critical: false } as const,
  ] as const,
  references: [
    {
      name: 'Catálogo 03.8 §E03 Predictive Close',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#e03-predictive-close',
    },
    { name: 'Plan FASE 10 §10.C', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
    {
      name: 'D19 LIME explanations',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md#d19-ml-explanations',
    },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_features_present: 3, high_features_present: 5 },
  tenant_scope_required: true,
  heuristic_weights: HEURISTIC_WEIGHTS,
  days_in_funnel_penalty_threshold: DAYS_IN_FUNNEL_PENALTY_THRESHOLD,
  visits_saturation: VISITS_SATURATION,
  confidence_interval_half_width: CONFIDENCE_INTERVAL_HALF_WIDTH,
} as const;

export const reasoning_template =
  'Predictive Close: P(cierre)={close_probability}. Top features: {top_features}. Días a cierre estimado {days_to_close_estimate}. Confianza {confidence}.';

export type E03FeatureId =
  | 'lead_score'
  | 'visits_count'
  | 'feedback_positive_ratio'
  | 'momentum_zona'
  | 'days_in_funnel'
  | 'price_fit_index';

export interface E03TopFeature {
  readonly feature: E03FeatureId;
  readonly weight: number;
  readonly direction: 'positive' | 'negative';
  readonly contribution: number;
}

export interface E03MLExplanations extends Record<string, unknown> {
  readonly top_features: readonly E03TopFeature[];
  readonly confidence_interval: { readonly low: number; readonly high: number };
  readonly model_type: 'heuristic_h1' | 'logistic_h2';
}

export interface E03Components extends Record<string, unknown> {
  readonly close_probability: number;
  readonly top_features: readonly E03TopFeature[];
  readonly confidence_interval: { readonly low: number; readonly high: number };
  readonly days_to_close_estimate: number;
  readonly lead_scores_raw: Readonly<Record<string, number | null>>;
  readonly pii_signals: Readonly<Record<string, number | null>>;
  readonly features_used: readonly E03FeatureId[];
  readonly missing_features: readonly E03FeatureId[];
}

export interface E03RawInput {
  readonly lead_score: number | null; // C01 0-100
  readonly visits_count: number | null;
  readonly feedback_positive_ratio: number | null; // 0-1
  readonly momentum_zona: number | null; // N11 0-100
  readonly days_in_funnel: number | null;
  readonly price_fit_index: number | null; // 0-1 (B04 proxy)
}

export interface E03ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: E03Components;
  readonly ml_explanations: E03MLExplanations;
}

function sigmoid(x: number): number {
  // Stable sigmoid para evitar overflow en extremos.
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function computeE03PredictiveClose(input: E03RawInput): E03ComputeResult {
  const featuresPresent: E03FeatureId[] = [];
  const featuresMissing: E03FeatureId[] = [];
  const rawLead: Record<string, number | null> = {};
  const piiSignals: Record<string, number | null> = {};

  const has = (v: number | null | undefined): v is number =>
    typeof v === 'number' && Number.isFinite(v);

  // Construye vector feature por feature con handling de nulls.
  const leadN = has(input.lead_score) ? clamp01(input.lead_score / 100) : null;
  const visitsN = has(input.visits_count) ? clamp01(input.visits_count / VISITS_SATURATION) : null;
  const fbRatio = has(input.feedback_positive_ratio)
    ? clamp01(input.feedback_positive_ratio)
    : null;
  const momentumN = has(input.momentum_zona) ? clamp01(input.momentum_zona / 100) : null;
  const daysPenalty = has(input.days_in_funnel)
    ? input.days_in_funnel > DAYS_IN_FUNNEL_PENALTY_THRESHOLD
      ? 1
      : 0
    : null;
  const priceFit = has(input.price_fit_index) ? clamp01(input.price_fit_index) : null;

  (
    [
      'lead_score',
      'visits_count',
      'feedback_positive_ratio',
      'momentum_zona',
      'days_in_funnel',
    ] as const
  ).forEach((k) => {
    const v = input[k];
    if (has(v)) {
      featuresPresent.push(k);
    } else {
      featuresMissing.push(k);
    }
  });
  if (has(input.price_fit_index)) featuresPresent.push('price_fit_index');
  else featuresMissing.push('price_fit_index');

  rawLead.lead_score = has(input.lead_score) ? input.lead_score : null;
  rawLead.momentum_zona = has(input.momentum_zona) ? input.momentum_zona : null;
  piiSignals.visits_count = has(input.visits_count) ? input.visits_count : null;
  piiSignals.days_in_funnel = has(input.days_in_funnel) ? input.days_in_funnel : null;
  piiSignals.feedback_positive_ratio = has(input.feedback_positive_ratio)
    ? input.feedback_positive_ratio
    : null;

  const minPresent = methodology.confidence_thresholds.min_features_present;
  if (featuresPresent.length < minPresent) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        close_probability: 0,
        top_features: [],
        confidence_interval: { low: 0, high: 0 },
        days_to_close_estimate: 0,
        lead_scores_raw: rawLead,
        pii_signals: piiSignals,
        features_used: featuresPresent,
        missing_features: featuresMissing,
      },
      ml_explanations: {
        top_features: [],
        confidence_interval: { low: 0, high: 0 },
        model_type: 'heuristic_h1',
      },
    };
  }

  // Aporte lineal de cada feature al logit. Ausentes contribuyen 0.
  const contributions: Array<{ feature: E03FeatureId; value: number; weight: number }> = [];
  let logit = 0;

  if (leadN !== null) {
    const c = HEURISTIC_WEIGHTS.lead_score * leadN;
    logit += c;
    contributions.push({ feature: 'lead_score', value: c, weight: HEURISTIC_WEIGHTS.lead_score });
  }
  if (visitsN !== null) {
    const c = HEURISTIC_WEIGHTS.visits_count * visitsN;
    logit += c;
    contributions.push({
      feature: 'visits_count',
      value: c,
      weight: HEURISTIC_WEIGHTS.visits_count,
    });
  }
  if (fbRatio !== null) {
    const c = HEURISTIC_WEIGHTS.feedback_positive_ratio * fbRatio;
    logit += c;
    contributions.push({
      feature: 'feedback_positive_ratio',
      value: c,
      weight: HEURISTIC_WEIGHTS.feedback_positive_ratio,
    });
  }
  if (momentumN !== null) {
    const c = HEURISTIC_WEIGHTS.momentum_zona * momentumN;
    logit += c;
    contributions.push({
      feature: 'momentum_zona',
      value: c,
      weight: HEURISTIC_WEIGHTS.momentum_zona,
    });
  }
  if (daysPenalty !== null) {
    const c = HEURISTIC_WEIGHTS.days_penalty * daysPenalty;
    logit += c;
    contributions.push({
      feature: 'days_in_funnel',
      value: c,
      weight: HEURISTIC_WEIGHTS.days_penalty,
    });
  }

  // Sigmoid con bias centrado (restamos 0.5 para que logit=0.5 ≈ p≈0.5 en
  // escala 0-1). El escalado ×4 agranda el rango del sigmoid operativo.
  const centered = (logit - 0.5) * 4;
  let probability = sigmoid(centered);

  // Price fit adjustment multiplicativo (boost [0.6, 1.0]).
  if (priceFit !== null) {
    const adj = 0.6 + 0.4 * priceFit;
    probability = probability * adj;
  }

  probability = clamp01(probability);

  // Top features ordenados por |contribution| desc.
  const top_features: E03TopFeature[] = contributions
    .map((c) => ({
      feature: c.feature,
      weight: Number(c.weight.toFixed(4)),
      direction: (c.value >= 0 ? 'positive' : 'negative') as 'positive' | 'negative',
      contribution: Number(c.value.toFixed(4)),
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3);

  // Confidence interval heurística ±8pp sobre probability, clamp [0,1].
  const ci_low = clamp01(probability - CONFIDENCE_INTERVAL_HALF_WIDTH);
  const ci_high = clamp01(probability + CONFIDENCE_INTERVAL_HALF_WIDTH);

  // Days to close: BASE × (1 − probability × 0.6). Hot leads → más rápido.
  const days_to_close_estimate = Math.round(BASE_DAYS_TO_CLOSE * (1 - probability * 0.6));

  const confidence: Confidence =
    featuresPresent.length >= methodology.confidence_thresholds.high_features_present
      ? 'high'
      : 'medium';

  const ml_explanations: E03MLExplanations = {
    top_features,
    confidence_interval: {
      low: Number(ci_low.toFixed(4)),
      high: Number(ci_high.toFixed(4)),
    },
    model_type: 'heuristic_h1',
  };

  return {
    value: Math.round(probability * 100),
    confidence,
    components: {
      close_probability: Number(probability.toFixed(4)),
      top_features,
      confidence_interval: ml_explanations.confidence_interval,
      days_to_close_estimate,
      lead_scores_raw: rawLead,
      pii_signals: piiSignals,
      features_used: featuresPresent,
      missing_features: featuresMissing,
    },
    ml_explanations,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.e03.insufficient';
  if (value >= 70) return 'ie.score.e03.hot';
  if (value >= 45) return 'ie.score.e03.warm';
  if (value >= 20) return 'ie.score.e03.cold';
  return 'ie.score.e03.stalled';
}

export const e03PredictiveCloseCalculator: Calculator = {
  scoreId: 'E03',
  version,
  tier: 4,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const confidence: Confidence = 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'prod path stub — invocar computeE03PredictiveClose directo',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
        tenant_id: input.tenant_id ?? null,
      },
      confidence,
      citations: [
        { source: 'contactos', period: input.periodDate },
        { source: 'operaciones', period: input.periodDate },
        { source: 'interaction_feedback', period: input.periodDate },
        { source: 'zone_scores:N11', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'contactos', count: 0 },
          { name: 'operaciones', count: 0 },
          { name: 'interaction_feedback', count: 0 },
          { name: 'zone_scores:N11', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      ml_explanations: {
        top_features: [],
        confidence_interval: { low: 0, high: 0 },
        model_type: 'heuristic_h1',
      },
      template_vars: {
        close_probability: 0,
        days_to_close_estimate: 0,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default e03PredictiveCloseCalculator;
