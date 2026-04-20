// B15 Launch Timing — recomienda ventana óptima de lanzamiento (mes + semana) de
// un proyecto basado en estacionalidad búsqueda, ciclo macro (B05) y pipeline de
// competencia zona (D03).
// Plan FASE 10 §10.A.9. Catálogo 03.8 §B15. Tier 2. Categoría proyecto.
//
// LÓGICA:
//   score_mensual(m) = search_trends(m) · w1 + macro_factor(m) · w2 + (1 − competencia_density(m)) · w3
//   Ventana recomendada = mes con score máximo + semana primera del mes (default).
//   evitar = meses con score < percentil 25.
//
// Critical deps (D13): D03 (supply_pipeline — competencia), B05 (market_cycle).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const WEIGHTS = {
  search_trends: 0.4,
  macro_cycle: 0.35,
  competencia_gap: 0.25,
} as const;

export const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export type B15MonthName = (typeof MONTH_NAMES)[number];

export const CRITICAL_DEPS: readonly string[] = ['D03', 'B05'] as const;

export const methodology = {
  formula:
    'score_mensual(m) = 0.40·search_trends(m) + 0.35·macro_factor(m) + 0.25·(1 − competencia_density(m)). Ventana = mes con score máx.',
  sources: ['search_trends_mensuales', 'project_scores:B05', 'zone_scores:D03', 'macro_indicators'],
  weights: WEIGHTS,
  dependencies: [
    { score_id: 'D03', weight: 0.25, role: 'supply_pipeline_competencia', critical: true },
    { score_id: 'B05', weight: 0.35, role: 'market_cycle', critical: true },
    { score_id: 'N11', weight: 0.2, role: 'momentum_zona', critical: false },
    { score_id: 'B01', weight: 0.2, role: 'demand_heatmap', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §B15 Launch Timing',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b15-launch-timing',
    },
    {
      name: 'Plan FASE 10 §10.A.9',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_months_data: 6,
    high_months_data: 12,
  },
  sensitivity_analysis: [
    { dimension_id: 'search_trends', impact_pct_per_10pct_change: 4.0 },
    { dimension_id: 'B05', impact_pct_per_10pct_change: 3.5 },
    { dimension_id: 'D03', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'N11', impact_pct_per_10pct_change: 1.5 },
  ],
} as const;

export const reasoning_template =
  'Launch Timing {project_id}: ventana recomendada {month_name} semana {semana} (score {window_score}). Evitar {evitar_joined}. Rationale: {rationale}.';

export interface B15VentanaRecomendada extends Record<string, unknown> {
  readonly mes: number; // 1-12
  readonly mes_nombre: B15MonthName;
  readonly semana: 1 | 2 | 3 | 4;
  readonly score: number;
}

export interface B15Components extends Record<string, unknown> {
  readonly ventana_recomendada: B15VentanaRecomendada;
  readonly scores_mensuales: readonly number[]; // 12 valores
  readonly evitar: readonly { mes: number; mes_nombre: B15MonthName; score: number }[];
  readonly rationale: string;
  readonly missing_dimensions: readonly string[];
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface B15RawInput {
  readonly projectId: string;
  readonly search_trends_mensuales: readonly number[]; // 12 valores 0-100
  readonly macro_factor_mensual: readonly number[]; // 12 valores 0-100
  readonly competencia_density_mensual: readonly number[]; // 12 valores 0-100 (proyectos lanzando)
  readonly deps?: readonly DepConfidence[];
}

export interface B15ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B15Components;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function monthName(m1to12: number): B15MonthName {
  return MONTH_NAMES[(m1to12 - 1) % 12] ?? 'enero';
}

function percentile25(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.25);
  return sorted[idx] ?? 0;
}

export function computeB15LaunchTiming(input: B15RawInput): B15ComputeResult {
  const missing: string[] = [];
  if (input.search_trends_mensuales.length !== 12) missing.push('search_trends_mensuales_12');
  if (input.macro_factor_mensual.length !== 12) missing.push('macro_factor_mensual_12');
  if (input.competencia_density_mensual.length !== 12)
    missing.push('competencia_density_mensual_12');

  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({ critical, supporting });

  if (missing.length > 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        ventana_recomendada: {
          mes: 0,
          mes_nombre: 'enero',
          semana: 1,
          score: 0,
        },
        scores_mensuales: [],
        evitar: [],
        rationale: 'datos mensuales incompletos (requiere 12 puntos por dimensión)',
        missing_dimensions: missing,
        capped_by: [],
        cap_reason: 'missing_monthly_data',
      },
    };
  }

  const scores: number[] = [];
  for (let m = 0; m < 12; m++) {
    const st = input.search_trends_mensuales[m] ?? 0;
    const macro = input.macro_factor_mensual[m] ?? 0;
    const comp = input.competencia_density_mensual[m] ?? 0;
    const s =
      st * WEIGHTS.search_trends +
      macro * WEIGHTS.macro_cycle +
      (100 - comp) * WEIGHTS.competencia_gap;
    scores.push(Math.round(clamp100(s)));
  }

  // Pick best month + derive semana (1ra semana del mes por default).
  let bestIdx = 0;
  let bestScore = scores[0] ?? 0;
  for (let m = 1; m < 12; m++) {
    const s = scores[m] ?? 0;
    if (s > bestScore) {
      bestScore = s;
      bestIdx = m;
    }
  }

  const p25 = percentile25(scores);
  const evitar = scores
    .map((s, i) => ({ mes: i + 1, mes_nombre: monthName(i + 1), score: s }))
    .filter((x) => x.score < p25);

  const ventana: B15VentanaRecomendada = {
    mes: bestIdx + 1,
    mes_nombre: monthName(bestIdx + 1),
    semana: 1,
    score: bestScore,
  };

  const evitarNames = evitar.map((e) => e.mes_nombre).join(', ') || 'ninguno';
  const rationale = `Mejor ventana ${ventana.mes_nombre}: search_trends ${input.search_trends_mensuales[bestIdx]}, macro ${input.macro_factor_mensual[bestIdx]}, competencia ${input.competencia_density_mensual[bestIdx]}. Evitar ${evitarNames}.`;

  const value = bestScore;

  // Baseline high si 12m data completos. Propagación D13 manda si se proveen deps.
  const baselineConfidence: Confidence = 'high';
  const confidence: Confidence = deps.length > 0 ? propagation.confidence : baselineConfidence;

  return {
    value,
    confidence,
    components: {
      ventana_recomendada: ventana,
      scores_mensuales: scores,
      evitar,
      rationale,
      missing_dimensions: [],
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b15.insufficient';
  if (value >= 75) return 'ie.score.b15.ventana_optima';
  if (value >= 50) return 'ie.score.b15.ventana_aceptable';
  return 'ie.score.b15.ventana_subóptima';
}

export const b15LaunchTimingCalculator: Calculator = {
  scoreId: 'B15',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams = Array.isArray(params.search_trends_mensuales);
    const confidence: Confidence = hasParams ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeB15LaunchTiming directo'
          : 'params search_trends/macro/competencia no provistos',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
      },
      confidence,
      citations: [
        { source: 'search_trends_mensuales', period: input.periodDate },
        { source: 'zone_scores:D03', period: input.periodDate },
        { source: 'project_scores:B05', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'search_trends_mensuales', count: 0 },
          { name: 'zone_scores:D03', count: 0 },
          { name: 'project_scores:B05', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { project_id: input.projectId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default b15LaunchTimingCalculator;
