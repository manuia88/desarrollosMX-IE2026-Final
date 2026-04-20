// C01 Lead Score — por contacto, score 0-100 probabilidad cierre basado en
// heurística H1 (sin ML — Tier 4 no activo). Output temperatura + siguiente
// mejor acción para asesor.
// Plan FASE 10 §10.A.10. Catálogo 03.8 §C01. Tier 2 (heuristic fallback de
// Tier 4 calibrado con ≥100 ventas).
//
// FÓRMULA:
//   score = 0.30 · feedback + 0.40 · behavior_score + 0.30 · match_score
//
//   feedback          = avg_sentimiento_interactions (0-100; 50=neutro, 90=hot, 10=cold)
//   behavior_score    = clamp100(
//                          interactions_count · 5 +
//                          visitas_agendadas · 15 +
//                          visitas_realizadas · 20 +
//                          affordability_bonus
//                        )
//   affordability     = min(presupuesto_declarado / precio_objetivo, 1) · 30
//   match_score       = promedio match_score top 3 proyectos matcheados (C03). Fallback 50.
//
// TEMPERATURA:
//   ≥70 caliente · 40-69 tibio · <40 frío
//
// SIGUIENTE MEJOR ACCIÓN:
//   caliente + visitas_agendadas=0           → agendar_visita
//   caliente + visitas_agendadas>0           → llamar
//   tibio    + interactions < 3              → enviar_dossier
//   tibio    + interactions ≥ 3              → agendar_visita
//   frio                                      → esperar
//
// Tier gate: requiere ≥2 señales válidas (de {feedback, behavior, match}).
// No critical deps (H1 heurístico). D13 supporting only.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export type LeadTemperatura = 'frio' | 'tibio' | 'caliente';
export type NextAction = 'llamar' | 'agendar_visita' | 'enviar_dossier' | 'esperar';

export const WEIGHTS = {
  feedback: 0.3,
  behavior: 0.4,
  match: 0.3,
} as const;

export const BEHAVIOR_WEIGHTS = {
  per_interaction: 5,
  per_visita_agendada: 15,
  per_visita_realizada: 20,
  affordability_max_bonus: 30,
} as const;

export const MIN_SIGNALS_TIER_2 = 2;

export const CRITICAL_DEPS: readonly string[] = [] as const;

export const methodology = {
  formula:
    'score = 0.30·feedback + 0.40·behavior_score + 0.30·match_score; behavior = interactions·5 + visitas_ag·15 + visitas_real·20 + affordability_bonus',
  sources: ['interactions', 'visitas', 'busqueda_match_cache', 'contactos'],
  weights: WEIGHTS,
  dependencies: [
    { score_id: 'A01', weight: 0.1, role: 'affordability_support', critical: false },
    { score_id: 'C03', weight: 0.3, role: 'match_score_support', critical: false },
  ],
  triggers_cascade: ['feedback_registered'],
  references: [
    {
      name: 'Catálogo 03.8 §C01 Lead Score',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#c01-lead-score',
    },
    {
      name: 'Plan FASE 10 §10.A.10',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: {
    min_coverage_pct: 50,
    high_coverage_pct: 100,
  },
  sensitivity_analysis: [
    { dimension_id: 'feedback', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'behavior', impact_pct_per_10pct_change: 4.0 },
    { dimension_id: 'match', impact_pct_per_10pct_change: 3.0 },
  ],
  tier_gate: {
    min_signals: MIN_SIGNALS_TIER_2,
  },
} as const;

export const reasoning_template =
  'Lead {contacto_id} score {score_value} temperatura {temperatura}: feedback {feedback}, behavior {behavior}, match {match}. Sugerencia: {next_action}. Confianza {confidence}.';

export interface C01RawInput {
  readonly contactoId: string;
  readonly feedback_sentimiento: number | null; // 0-100 (50=neutro)
  readonly interactions_count: number;
  readonly visitas_agendadas: number;
  readonly visitas_realizadas: number;
  readonly presupuesto_declarado: number | null; // MXN
  readonly precio_objetivo: number | null; // MXN
  readonly match_scores_top3?: readonly number[]; // 0-100 por proyecto
  readonly deps?: readonly DepConfidence[];
}

export interface C01Components extends Record<string, unknown> {
  readonly contactoId: string;
  readonly feedback: number;
  readonly behavior: number;
  readonly match: number;
  readonly affordability_bonus: number;
  readonly temperatura: LeadTemperatura;
  readonly next_action: NextAction;
  readonly available_signals: readonly ('feedback' | 'behavior' | 'match')[];
  readonly coverage_pct: number;
  readonly missing_dimensions: readonly string[];
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
  readonly gated: boolean;
  readonly gate_reason: string | null;
}

export interface C01ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: C01Components;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function computeAffordabilityBonus(presupuesto: number | null, precio: number | null): number {
  if (
    presupuesto === null ||
    precio === null ||
    !Number.isFinite(presupuesto) ||
    !Number.isFinite(precio)
  ) {
    return 0;
  }
  if (precio <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, presupuesto / precio));
  return ratio * BEHAVIOR_WEIGHTS.affordability_max_bonus;
}

function computeBehaviorScore(input: C01RawInput): { score: number; affordability: number } {
  const affordability = computeAffordabilityBonus(
    input.presupuesto_declarado,
    input.precio_objetivo,
  );
  const raw =
    input.interactions_count * BEHAVIOR_WEIGHTS.per_interaction +
    input.visitas_agendadas * BEHAVIOR_WEIGHTS.per_visita_agendada +
    input.visitas_realizadas * BEHAVIOR_WEIGHTS.per_visita_realizada +
    affordability;
  return {
    score: clamp100(raw),
    affordability: Number(affordability.toFixed(2)),
  };
}

function computeMatchScore(input: C01RawInput): number | null {
  if (!input.match_scores_top3 || input.match_scores_top3.length === 0) return null;
  const valid = input.match_scores_top3.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return null;
  const avg = valid.reduce((s, v) => s + v, 0) / valid.length;
  return clamp100(avg);
}

function temperaturaFor(score: number): LeadTemperatura {
  if (score >= 70) return 'caliente';
  if (score >= 40) return 'tibio';
  return 'frio';
}

function nextActionFor(
  temp: LeadTemperatura,
  interactions: number,
  visitasAgendadas: number,
): NextAction {
  if (temp === 'caliente') {
    return visitasAgendadas === 0 ? 'agendar_visita' : 'llamar';
  }
  if (temp === 'tibio') {
    return interactions < 3 ? 'enviar_dossier' : 'agendar_visita';
  }
  return 'esperar';
}

export function computeC01LeadScore(input: C01RawInput): C01ComputeResult {
  const missing: string[] = [];
  const availableSignals: ('feedback' | 'behavior' | 'match')[] = [];

  const feedback = input.feedback_sentimiento;
  const feedbackValid = feedback !== null && Number.isFinite(feedback) && feedback >= 0;
  if (feedbackValid) availableSignals.push('feedback');
  else missing.push('feedback_sentimiento');

  // behavior válido si hay al menos 1 interacción o visita o affordability.
  const hasBehavior =
    input.interactions_count > 0 ||
    input.visitas_agendadas > 0 ||
    input.visitas_realizadas > 0 ||
    (input.presupuesto_declarado !== null && input.precio_objetivo !== null);
  if (hasBehavior) availableSignals.push('behavior');
  else missing.push('behavior_signals');

  const matchRaw = computeMatchScore(input);
  if (matchRaw !== null) availableSignals.push('match');
  else missing.push('match_scores_top3');

  const totalSignals = 3;
  const coverage_pct = Math.round((availableSignals.length / totalSignals) * 100);

  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({
    critical,
    supporting,
    coverage_pct,
    min_coverage_pct: methodology.confidence_thresholds.min_coverage_pct,
    high_coverage_pct: methodology.confidence_thresholds.high_coverage_pct,
  });

  if (availableSignals.length < MIN_SIGNALS_TIER_2) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        contactoId: input.contactoId,
        feedback: feedbackValid ? (feedback ?? 0) : 0,
        behavior: 0,
        match: 0,
        affordability_bonus: 0,
        temperatura: 'frio',
        next_action: 'esperar',
        available_signals: availableSignals,
        coverage_pct,
        missing_dimensions: missing,
        capped_by: [],
        cap_reason: 'tier_gate_signals',
        gated: true,
        gate_reason: `Se requieren ≥${MIN_SIGNALS_TIER_2} señales (feedback/behavior/match), actualmente ${availableSignals.length}.`,
      },
    };
  }

  const feedbackVal = feedbackValid ? clamp100(feedback as number) : 50; // neutro fallback
  const behavior = computeBehaviorScore(input);
  const matchVal = matchRaw ?? 50; // fallback neutro

  const score =
    feedbackVal * WEIGHTS.feedback + behavior.score * WEIGHTS.behavior + matchVal * WEIGHTS.match;
  const score_value = Math.round(clamp100(score));

  const temperatura = temperaturaFor(score_value);
  const next_action = nextActionFor(temperatura, input.interactions_count, input.visitas_agendadas);

  let confidence: Confidence =
    deps.length > 0
      ? propagation.confidence
      : coverage_pct >= methodology.confidence_thresholds.high_coverage_pct
        ? 'high'
        : 'medium';

  if (confidence === 'insufficient_data' && score_value > 0) confidence = 'low';

  return {
    value: score_value,
    confidence,
    components: {
      contactoId: input.contactoId,
      feedback: Number(feedbackVal.toFixed(1)),
      behavior: Number(behavior.score.toFixed(1)),
      match: Number(matchVal.toFixed(1)),
      affordability_bonus: behavior.affordability,
      temperatura,
      next_action,
      available_signals: availableSignals,
      coverage_pct,
      missing_dimensions: missing,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
      gated: false,
      gate_reason: null,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.c01.insufficient';
  if (value >= 70) return 'ie.score.c01.caliente';
  if (value >= 40) return 'ie.score.c01.tibio';
  return 'ie.score.c01.frio';
}

export const c01LeadScoreCalculator: Calculator = {
  scoreId: 'C01',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const confidence: Confidence = 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        contactoId: input.userId ?? 'desconocido',
        feedback: 0,
        behavior: 0,
        match: 0,
        affordability_bonus: 0,
        temperatura: 'frio',
        next_action: 'esperar',
        gated: true,
        gate_reason:
          'C01 requiere feedback + interactions + visitas + matches desde DB. Use computeC01LeadScore(input) en tests.',
      },
      inputs_used: {
        periodDate: input.periodDate,
        contactoId: input.userId ?? null,
      },
      confidence,
      citations: [
        { source: 'interactions', period: input.periodDate },
        { source: 'visitas', period: input.periodDate },
        { source: 'busqueda_match_cache', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'interactions', count: 0 },
          { name: 'visitas', count: 0 },
          { name: 'busqueda_match_cache', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        contacto_id: input.userId ?? 'desconocido',
        temperatura: 'frio',
        feedback: 0,
        behavior: 0,
        match: 0,
        next_action: 'esperar',
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default c01LeadScoreCalculator;
