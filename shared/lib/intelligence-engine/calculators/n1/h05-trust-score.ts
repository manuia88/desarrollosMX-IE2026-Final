// H05 Trust Score (desarrolladora) — score N1 Tier 2 de confianza de un
// desarrollador basado en reviews históricas + cumplimiento de entregas + volumen
// de operaciones cerradas (3 años). PROFECO quejas se incorporan cuando haya
// data real (H2).
// Plan FASE 09 §9.A.4. Catálogo 03.8 §H05.
//
// Fórmula:
//   reviews_normalized   = (reviews_avg / 5) × 100                 (reviews 1-5 → 0-100)
//   volumen_normalized   = clamp(volumen_ops_3y_count × 2, 0, 100) (50 ops = 100)
//   score_raw            = 0.40·reviews_norm + 0.30·cumplimiento_entrega_pct + 0.30·volumen_norm
//   penalty_applied      = profeco_quejas_count > 3 → score_raw × 0.8, else 1.0
//   score                = clamp(score_raw × penalty_multiplier, 0, 100)
//
// Gate Tier 2: la desarrolladora DEBE tener ≥10 proyectos y ≥1 entrega histórica.
// Si no cumple → placeholder: score_value=0, confidence='insufficient_data',
// components.gated=true.
//
// D8 runtime weights override: score_weights por (score_id='H05', country_code).
// D9 fallback graceful: si una señal falta (reviews O cumplimiento O volumen),
// se redistribuye peso. Pero si <2 señales → insufficient.

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

export type H05DimensionId = 'reviews_avg' | 'cumplimiento' | 'volumen';

export const DEFAULT_WEIGHTS: Readonly<Record<H05DimensionId, number>> = {
  reviews_avg: 0.4,
  cumplimiento: 0.3,
  volumen: 0.3,
} as const;

export const H05_DIMENSIONS: readonly H05DimensionId[] = [
  'reviews_avg',
  'cumplimiento',
  'volumen',
] as const;

export const GATE_MIN_PROJECTS = 10;
export const GATE_MIN_DELIVERIES = 1;
export const PROFECO_PENALTY_THRESHOLD = 3;
export const PROFECO_PENALTY_MULTIPLIER = 0.8;
export const VOLUMEN_OPS_SCALE = 2; // 50 ops = 100 score

export const methodology = {
  formula:
    'reviews_norm = (reviews_avg/5)·100; volumen_norm = clamp(volumen·2, 0, 100); score_raw = 0.40·reviews_norm + 0.30·cumplimiento + 0.30·volumen_norm; penalty×0.8 si profeco>3.',
  sources: ['developer_reviews', 'ops_cerradas', 'profeco_quejas', 'projects'],
  weights: { ...DEFAULT_WEIGHTS },
  dependencies: [{ score_id: 'H14', weight: 0, role: 'buyer_persona_context' }],
  triggers_cascade: ['feedback_registered'],
  references: [
    {
      name: 'Catálogo 03.8 §H05 Trust Score',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#h05-trust-score',
    },
    {
      name: 'Plan FASE 09 §9.A.4',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
  ],
  validity: { unit: 'days', value: 90 } as const,
  tier_gate: {
    min_projects: GATE_MIN_PROJECTS,
    min_deliveries: GATE_MIN_DELIVERIES,
  },
  confidence_thresholds: {
    min_available_deps: 2,
  },
} as const;

export const reasoning_template =
  'Trust score de {developer_name} obtiene {score_value}. Reviews promedio {reviews_avg}/5, cumplimiento entregas {cumplimiento_pct}%, volumen ops 3y {volumen_ops}. PROFECO quejas: {profeco_quejas}. Penalty aplicada: {penalty_applied}. Gated: {gated}. Confianza {confidence}.';

export interface H05Components extends Record<string, unknown> {
  readonly reviews_avg: number | null;
  readonly cumplimiento_pct: number | null;
  readonly volumen_ops: number | null;
  readonly profeco_quejas: number;
  readonly penalty_applied: boolean;
  readonly score_raw: number;
  readonly gated: boolean;
  readonly gate_reason: string | null;
  readonly projects_count: number;
  readonly deliveries_count: number;
  readonly weights_applied: Readonly<Record<string, number>>;
  readonly missing_dimensions: readonly string[];
  readonly available_count: number;
  readonly total_count: number;
}

export interface H05RawInput {
  readonly desarrolladora_id: string;
  readonly reviews_avg: number | null;
  readonly cumplimiento_entrega_pct: number | null;
  readonly volumen_ops_3y_count: number | null;
  readonly projects_count: number;
  readonly deliveries_count: number;
  readonly profeco_quejas_count?: number;
  readonly confidences?: Readonly<Partial<Record<H05DimensionId, Confidence>>>;
}

export interface H05ComputeOptions {
  readonly weightsOverride?: WeightsMap;
  readonly bypassGate?: boolean;
}

export interface H05ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H05Components;
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function computeH05TrustScore(
  input: H05RawInput,
  options: H05ComputeOptions = {},
): H05ComputeResult {
  const base: WeightsMap = options.weightsOverride ?? DEFAULT_WEIGHTS;

  // Tier 2 gating
  const projects_count = input.projects_count;
  const deliveries_count = input.deliveries_count;
  const gated =
    !options.bypassGate &&
    (projects_count < GATE_MIN_PROJECTS || deliveries_count < GATE_MIN_DELIVERIES);
  const gate_reason = gated
    ? projects_count < GATE_MIN_PROJECTS
      ? `desarrolladora con ${projects_count} proyectos (min=${GATE_MIN_PROJECTS})`
      : `desarrolladora sin entregas históricas (min=${GATE_MIN_DELIVERIES})`
    : null;

  if (gated) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        reviews_avg: input.reviews_avg,
        cumplimiento_pct: input.cumplimiento_entrega_pct,
        volumen_ops: input.volumen_ops_3y_count,
        profeco_quejas: input.profeco_quejas_count ?? 0,
        penalty_applied: false,
        score_raw: 0,
        gated: true,
        gate_reason,
        projects_count,
        deliveries_count,
        weights_applied: {},
        missing_dimensions: Object.keys(base),
        available_count: 0,
        total_count: H05_DIMENSIONS.length,
      },
    };
  }

  // Normalizaciones
  const reviews_avg = input.reviews_avg;
  const reviews_normalized =
    reviews_avg !== null && Number.isFinite(reviews_avg) && reviews_avg >= 0
      ? clamp100((reviews_avg / 5) * 100)
      : null;

  const cumplimiento_pct = input.cumplimiento_entrega_pct;
  const cumplimiento_value =
    cumplimiento_pct !== null && Number.isFinite(cumplimiento_pct)
      ? clamp100(cumplimiento_pct)
      : null;

  const volumen_raw = input.volumen_ops_3y_count;
  const volumen_normalized =
    volumen_raw !== null && Number.isFinite(volumen_raw) && volumen_raw >= 0
      ? clamp100(volumen_raw * VOLUMEN_OPS_SCALE)
      : null;

  const available: H05DimensionId[] = [];
  if (reviews_normalized !== null) available.push('reviews_avg');
  if (cumplimiento_value !== null) available.push('cumplimiento');
  if (volumen_normalized !== null) available.push('volumen');

  const renorm: RenormalizedWeights = renormalizeWeights(base, available);

  const minDeps = methodology.confidence_thresholds.min_available_deps;
  if (available.length < minDeps) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        reviews_avg,
        cumplimiento_pct,
        volumen_ops: volumen_raw,
        profeco_quejas: input.profeco_quejas_count ?? 0,
        penalty_applied: false,
        score_raw: 0,
        gated: false,
        gate_reason: null,
        projects_count,
        deliveries_count,
        weights_applied: {},
        missing_dimensions: renorm.missing_dimensions,
        available_count: available.length,
        total_count: renorm.total_count,
      },
    };
  }

  let score_raw = 0;
  if (reviews_normalized !== null) {
    score_raw += (renorm.weights['reviews_avg'] ?? 0) * reviews_normalized;
  }
  if (cumplimiento_value !== null) {
    score_raw += (renorm.weights['cumplimiento'] ?? 0) * cumplimiento_value;
  }
  if (volumen_normalized !== null) {
    score_raw += (renorm.weights['volumen'] ?? 0) * volumen_normalized;
  }

  const profeco_quejas = input.profeco_quejas_count ?? 0;
  const penalty_applied = profeco_quejas > PROFECO_PENALTY_THRESHOLD;
  const penalty_multiplier = penalty_applied ? PROFECO_PENALTY_MULTIPLIER : 1.0;
  const final_score = Math.round(clamp100(score_raw * penalty_multiplier));

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
    value: final_score,
    confidence,
    components: {
      reviews_avg,
      cumplimiento_pct,
      volumen_ops: volumen_raw,
      profeco_quejas,
      penalty_applied,
      score_raw: Number(score_raw.toFixed(2)),
      gated: false,
      gate_reason: null,
      projects_count,
      deliveries_count,
      weights_applied,
      missing_dimensions: renorm.missing_dimensions,
      available_count: renorm.available_count,
      total_count: renorm.total_count,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h05.insufficient';
  if (value >= 85) return 'ie.score.h05.excelente';
  if (value >= 70) return 'ie.score.h05.alto';
  if (value >= 50) return 'ie.score.h05.aceptable';
  if (value >= 30) return 'ie.score.h05.bajo';
  return 'ie.score.h05.critico';
}

export const h05TrustScoreCalculator: Calculator = {
  scoreId: 'H05',
  version,
  tier: 2,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const runtimeWeights = await loadWeights(supabase, 'H05', input.countryCode).catch(() => null);
    const weights = runtimeWeights ?? DEFAULT_WEIGHTS;
    const confidence: Confidence = 'insufficient_data';
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reviews_avg: null,
        cumplimiento_pct: null,
        volumen_ops: null,
        profeco_quejas: 0,
        penalty_applied: false,
        score_raw: 0,
        gated: true,
        gate_reason: 'desarrolladora_id no provisto o sin histórico en DB',
        projects_count: 0,
        deliveries_count: 0,
        weights_applied: weights,
        missing_dimensions: Object.keys(weights),
        available_count: 0,
        total_count: H05_DIMENSIONS.length,
        reason:
          'H05 requiere histórico developer_reviews + ops_cerradas + projects. Use computeH05TrustScore(input) en tests.',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
        weights_source: runtimeWeights ? 'score_weights' : 'methodology_default',
      },
      confidence,
      citations: [
        { source: 'developer_reviews' },
        { source: 'ops_cerradas' },
        { source: 'projects' },
      ],
      provenance: {
        sources: [
          { name: 'developer_reviews', count: 0 },
          { name: 'ops_cerradas', count: 0 },
          { name: 'projects', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        developer_name: 'desconocida',
        reviews_avg: 'n/a',
        cumplimiento_pct: 'n/a',
        volumen_ops: 'n/a',
        profeco_quejas: 0,
        penalty_applied: 'false',
        gated: 'true',
      },
    };
  },
};

export default h05TrustScoreCalculator;
