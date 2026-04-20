// B03 Pricing Autopilot — sugiere precio óptimo por unidad activa de un proyecto
// combinando señales de absorción (B08), días en mercado, comparables (A12) y
// presión competitiva (B07). Tier 2.
// Plan FASE 10 §10.A.3. Catálogo 03.8 §B03. Categoría proyecto.
//
// LÓGICA por unidad:
//   días_mercado > 90 && absorcion_mensual < 1 → delta sugerido −3% a −8%.
//   demanda_alta && momentum_positivo          → delta sugerido +2% a +5%.
//   fuera de ambas → hold (delta 0%).
//
// Output agregado: {unidades: [{unidadId, precio_actual, precio_sugerido, delta_pct, rationale}]}.
//
// Critical deps (D13): A12 (precio justo referencia), B08 (absorption).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const THRESHOLDS = {
  dias_mercado_alto: 90,
  absorcion_mensual_baja: 1,
  absorcion_mensual_alta: 3,
  delta_bajada_min_pct: -3,
  delta_bajada_max_pct: -8,
  delta_subida_min_pct: 2,
  delta_subida_max_pct: 5,
  momentum_positivo_min: 60,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['A12', 'B08'] as const;

export const methodology = {
  formula:
    'Por unidad: si dias_mercado>90 && absorcion<1/mes → delta −3% a −8%; si demanda alta && momentum≥60 → delta +2% a +5%; else hold 0%.',
  sources: [
    'unidades',
    'project_scores:A12',
    'zone_scores:B08',
    'zone_scores:B07',
    'zone_scores:N11',
  ],
  weights: THRESHOLDS,
  dependencies: [
    { score_id: 'A12', weight: 0.4, role: 'precio_justo_referencia', critical: true },
    { score_id: 'B08', weight: 0.3, role: 'absorption_forecast', critical: true },
    { score_id: 'B07', weight: 0.15, role: 'competitive_pressure', critical: false },
    { score_id: 'N11', weight: 0.15, role: 'momentum_zona', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §B03 Pricing Autopilot',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b03-pricing-autopilot',
    },
    {
      name: 'Plan FASE 10 §10.A.3',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 14 } as const,
  confidence_thresholds: {
    min_unidades: 1,
    high_unidades: 10,
  },
  sensitivity_analysis: [
    { dimension_id: 'A12', impact_pct_per_10pct_change: 3.5 },
    { dimension_id: 'B08', impact_pct_per_10pct_change: 3.0 },
    { dimension_id: 'B07', impact_pct_per_10pct_change: 1.5 },
    { dimension_id: 'N11', impact_pct_per_10pct_change: 1.5 },
  ],
} as const;

export const reasoning_template =
  'Pricing Autopilot {project_id}: {unidades_count} unidades analizadas → {bajadas_count} con sugerencia bajada, {subidas_count} con sugerencia subida, {hold_count} mantener. Delta promedio {delta_avg_pct}%.';

export type B03Accion = 'bajar' | 'subir' | 'mantener';

export interface B03UnidadInput {
  readonly unidadId: string;
  readonly precio_actual: number;
  readonly dias_en_mercado: number;
  readonly absorcion_mensual: number;
}

export interface B03UnidadSuggestion extends Record<string, unknown> {
  readonly unidadId: string;
  readonly precio_actual: number;
  readonly precio_sugerido: number;
  readonly delta_pct: number;
  readonly accion: B03Accion;
  readonly rationale: string;
}

export interface B03Components extends Record<string, unknown> {
  readonly unidades: readonly B03UnidadSuggestion[];
  readonly unidades_count: number;
  readonly bajadas_count: number;
  readonly subidas_count: number;
  readonly hold_count: number;
  readonly delta_avg_pct: number;
  readonly missing_dimensions: readonly string[];
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface B03RawInput {
  readonly projectId: string;
  readonly unidades: readonly B03UnidadInput[];
  readonly momentum_zona?: number | null;
  readonly demanda_alta?: boolean;
  readonly deps?: readonly DepConfidence[];
}

export interface B03ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B03Components;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function suggestUnit(
  u: B03UnidadInput,
  demanda_alta: boolean,
  momentum_positivo: boolean,
): B03UnidadSuggestion {
  const stale = u.dias_en_mercado > THRESHOLDS.dias_mercado_alto;
  const lowAbsorb = u.absorcion_mensual < THRESHOLDS.absorcion_mensual_baja;

  if (stale && lowAbsorb) {
    // Linear scaling dentro del rango −3% a −8% por severidad.
    const severity = Math.min(
      1,
      (u.dias_en_mercado - THRESHOLDS.dias_mercado_alto) / 90 +
        (THRESHOLDS.absorcion_mensual_baja - u.absorcion_mensual) /
          THRESHOLDS.absorcion_mensual_baja,
    );
    const delta_pct = round2(
      THRESHOLDS.delta_bajada_min_pct +
        (THRESHOLDS.delta_bajada_max_pct - THRESHOLDS.delta_bajada_min_pct) * severity,
    );
    const precio_sugerido = Math.round(u.precio_actual * (1 + delta_pct / 100));
    return {
      unidadId: u.unidadId,
      precio_actual: u.precio_actual,
      precio_sugerido,
      delta_pct,
      accion: 'bajar',
      rationale: `${u.dias_en_mercado}d en mercado + absorción ${u.absorcion_mensual.toFixed(1)}/mes <1 → ajuste ${delta_pct}%.`,
    };
  }

  // Sube solo si la unidad misma muestra demanda alta (absorcion ≥ alta)
  // Y el contexto macro (demanda_alta flag + momentum positivo) lo confirma.
  const unitHot = u.absorcion_mensual >= THRESHOLDS.absorcion_mensual_alta;
  if (unitHot && demanda_alta && momentum_positivo) {
    const demandaScore = u.absorcion_mensual >= THRESHOLDS.absorcion_mensual_alta * 1.5 ? 1 : 0.5;
    const delta_pct = round2(
      THRESHOLDS.delta_subida_min_pct +
        (THRESHOLDS.delta_subida_max_pct - THRESHOLDS.delta_subida_min_pct) * demandaScore,
    );
    const precio_sugerido = Math.round(u.precio_actual * (1 + delta_pct / 100));
    return {
      unidadId: u.unidadId,
      precio_actual: u.precio_actual,
      precio_sugerido,
      delta_pct,
      accion: 'subir',
      rationale: `demanda alta (${u.absorcion_mensual.toFixed(1)}/mes) + momentum positivo → ajuste +${delta_pct}%.`,
    };
  }

  return {
    unidadId: u.unidadId,
    precio_actual: u.precio_actual,
    precio_sugerido: u.precio_actual,
    delta_pct: 0,
    accion: 'mantener',
    rationale: `métricas estables (${u.dias_en_mercado}d, absorción ${u.absorcion_mensual.toFixed(1)}/mes) → mantener.`,
  };
}

export function computeB03PricingAutopilot(input: B03RawInput): B03ComputeResult {
  const missing: string[] = [];
  if (input.momentum_zona === undefined || input.momentum_zona === null)
    missing.push('N11_momentum');

  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({ critical, supporting });

  if (input.unidades.length < methodology.confidence_thresholds.min_unidades) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        unidades: [],
        unidades_count: 0,
        bajadas_count: 0,
        subidas_count: 0,
        hold_count: 0,
        delta_avg_pct: 0,
        missing_dimensions: ['unidades_activas', ...missing],
        capped_by: [],
        cap_reason: 'no_unidades',
      },
    };
  }

  const momentum_positivo = (input.momentum_zona ?? 0) >= THRESHOLDS.momentum_positivo_min;
  const demanda_alta = input.demanda_alta ?? false;

  const suggestions = input.unidades.map((u) => suggestUnit(u, demanda_alta, momentum_positivo));

  const bajadas = suggestions.filter((s) => s.accion === 'bajar').length;
  const subidas = suggestions.filter((s) => s.accion === 'subir').length;
  const hold = suggestions.filter((s) => s.accion === 'mantener').length;
  const delta_avg = suggestions.length
    ? round2(suggestions.reduce((a, s) => a + s.delta_pct, 0) / suggestions.length)
    : 0;

  // Score 0-100: inverso al desorden. 100 = todas mantener (saludable).
  const healthy_ratio = hold / suggestions.length;
  const value = Math.round(clamp100(healthy_ratio * 100));

  const baselineConfidence: Confidence =
    input.unidades.length >= methodology.confidence_thresholds.high_unidades ? 'high' : 'medium';
  const confidence: Confidence = deps.length > 0 ? propagation.confidence : baselineConfidence;

  return {
    value,
    confidence,
    components: {
      unidades: suggestions,
      unidades_count: suggestions.length,
      bajadas_count: bajadas,
      subidas_count: subidas,
      hold_count: hold,
      delta_avg_pct: delta_avg,
      missing_dimensions: missing,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
  };
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b03.insufficient';
  if (value >= 80) return 'ie.score.b03.saludable';
  if (value >= 50) return 'ie.score.b03.ajustes_menores';
  return 'ie.score.b03.requiere_accion';
}

export const b03PricingAutopilotCalculator: Calculator = {
  scoreId: 'B03',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams = Array.isArray(params.unidades);
    const confidence: Confidence = hasParams ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeB03PricingAutopilot directo'
          : 'params unidades[] no provisto',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
      },
      confidence,
      citations: [
        { source: 'unidades', period: 'realtime' },
        { source: 'project_scores:A12', period: input.periodDate },
        { source: 'zone_scores:B08', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'unidades', count: 0 },
          { name: 'project_scores:A12', count: 0 },
          { name: 'zone_scores:B08', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { project_id: input.projectId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default b03PricingAutopilotCalculator;
