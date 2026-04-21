// D03 Supply Pipeline — score N2 que mide el balance oferta futura vs demanda
// por zona. Cruza proyectos en construcción + preventa con permisos SEDUVI
// (H2 stub) y los confronta contra la demanda agregada 12m estimada desde B01.
// Plan FASE 10 §10.A.12. Catálogo 03.8 §D03. Tier 2. Categoría mercado.
//
// FÓRMULA:
//   pipeline_units     = Σ unidades proyectos {construccion, preventa} + SEDUVI.estimated_units
//   oversupply_ratio   = pipeline_units / (demand_12m × 0.5)
//   score              = clamp(100 − oversupply_ratio × 50, 0, 100)
//
// Semántica: score alto = equilibrio sano (oferta cerca de demanda). Score bajo
// = oversupply → riesgo absorción lenta, presión margen B02. Score muy alto
// (oversupply_ratio < 1) puede implicar undersupply → oportunidad desarrollador.
//
// ALERTAS:
//   oversupply_ratio ≥ 2.0    → 'oversupply_riesgo'   (pipeline dobla demanda)
//   oversupply_ratio ∈ [0.8,2) → 'equilibrado'         (balance sano)
//   oversupply_ratio < 0.8    → 'undersupply_oportunidad' (hueco mercado)
//
// Critical deps (D13): B01 Demand Heatmap (demand_12m derivado). Sin B01
// válido no se puede calcular ratio — propagate fail → insufficient_data.
//
// H2 roadmap: SEDUVI permisos via scraping/API pública CDMX. H1 usa counter
// manual desde projects.estado_desarrollo ∈ {construccion, preventa}.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const OVERSUPPLY_MULTIPLIER = 50;

export const DEMAND_COVERAGE_FACTOR = 0.5;

export const CRITICAL_DEPS: readonly string[] = ['B01'] as const;

export const ALERT_THRESHOLDS = {
  oversupply_riesgo: 2.0,
  undersupply_oportunidad: 0.8,
} as const;

export const methodology = {
  formula:
    'pipeline_units = proyectos(construccion+preventa).unidades + seduvi.estimated_units; oversupply_ratio = pipeline_units / (demand_12m · 0.5); score = clamp(100 − oversupply_ratio · 50, 0, 100).',
  sources: ['projects', 'seduvi_permisos', 'zone_scores:B01'],
  weights: {
    oversupply_multiplier: OVERSUPPLY_MULTIPLIER,
    demand_coverage_factor: DEMAND_COVERAGE_FACTOR,
  },
  dependencies: [{ score_id: 'B01', role: 'demand_12m', critical: true }],
  alert_thresholds: ALERT_THRESHOLDS,
  references: [
    {
      name: 'Catálogo 03.8 §D03 Supply Pipeline',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#d03-supply-pipeline',
    },
    {
      name: 'Plan FASE 10 §10.A.12',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
    {
      name: 'SEDUVI CDMX permisos de construcción',
      url: 'https://www.seduvi.cdmx.gob.mx',
      period: 'trimestral',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_coverage_pct: 50,
    high_coverage_pct: 100,
    min_pipeline_projects: 3,
  },
  sensitivity_analysis: [
    { dimension_id: 'B01', impact_pct_per_10pct_change: 5.0 },
    { dimension_id: 'pipeline_units', impact_pct_per_10pct_change: 5.0 },
  ],
  tier_gating: { tier: 2, min_months_data: 3 },
} as const;

export const reasoning_template =
  'Supply Pipeline {zona_name}: {pipeline_count} proyectos ({pipeline_units} unidades) vs demanda 12m {demand_12m}. Ratio {oversupply_ratio} → {alerta}. Score {score_value}. Confianza {confidence}.';

export type D03Alerta = 'equilibrado' | 'oversupply_riesgo' | 'undersupply_oportunidad';

export interface D03Components extends Record<string, unknown> {
  readonly pipeline_count: number;
  readonly pipeline_units: number;
  readonly seduvi_estimated_units: number;
  readonly demand_12m: number | null;
  readonly oversupply_ratio: number | null;
  readonly alerta: D03Alerta;
  readonly missing_dimensions: readonly string[];
  readonly coverage_pct: number;
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface D03RawInput {
  readonly pipeline_count: number;
  readonly pipeline_units: number;
  readonly seduvi_estimated_units?: number;
  readonly demand_12m: number | null;
  readonly deps?: readonly DepConfidence[];
}

export interface D03ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: D03Components;
}

function alertaFor(ratio: number): D03Alerta {
  if (ratio >= ALERT_THRESHOLDS.oversupply_riesgo) return 'oversupply_riesgo';
  if (ratio < ALERT_THRESHOLDS.undersupply_oportunidad) return 'undersupply_oportunidad';
  return 'equilibrado';
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeD03SupplyPipeline(input: D03RawInput): D03ComputeResult {
  const missing: string[] = [];
  const seduvi = Math.max(0, input.seduvi_estimated_units ?? 0);
  const pipeline_units = Math.max(0, input.pipeline_units) + seduvi;
  const pipeline_count = Math.max(0, input.pipeline_count);

  if (input.demand_12m === null || !Number.isFinite(input.demand_12m)) {
    missing.push('B01_demand_12m');
  }

  const total_dims = 2;
  const available = total_dims - missing.length;
  const coverage_pct = Math.round((available / total_dims) * 100);

  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({
    critical,
    supporting,
    coverage_pct,
    min_coverage_pct: methodology.confidence_thresholds.min_coverage_pct,
    high_coverage_pct: methodology.confidence_thresholds.high_coverage_pct,
  });

  // Critical dep missing (B01 demand) → insufficient.
  if (input.demand_12m === null || !Number.isFinite(input.demand_12m)) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        pipeline_count,
        pipeline_units,
        seduvi_estimated_units: seduvi,
        demand_12m: null,
        oversupply_ratio: null,
        alerta: 'equilibrado',
        missing_dimensions: missing,
        coverage_pct,
        capped_by: ['B01'],
        cap_reason: 'critical_dependency_missing',
      },
    };
  }

  const demand_12m = input.demand_12m;
  const denom = demand_12m * DEMAND_COVERAGE_FACTOR;

  if (demand_12m <= 0 || denom <= 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        pipeline_count,
        pipeline_units,
        seduvi_estimated_units: seduvi,
        demand_12m,
        oversupply_ratio: null,
        alerta: 'equilibrado',
        missing_dimensions: ['demand_12m_no_positivo', ...missing],
        coverage_pct,
        capped_by: [],
        cap_reason: 'denom_invalid',
      },
    };
  }

  const oversupply_ratio = pipeline_units / denom;
  const rawScore = 100 - oversupply_ratio * OVERSUPPLY_MULTIPLIER;
  const value = Math.round(clamp100(rawScore));
  const alerta = alertaFor(oversupply_ratio);

  let confidence: Confidence =
    deps.length > 0
      ? propagation.confidence
      : coverage_pct >= methodology.confidence_thresholds.high_coverage_pct
        ? 'high'
        : 'medium';

  // Pipeline muestra pobre (<3 proyectos + sin SEDUVI) — degradar confianza.
  if (
    pipeline_count < methodology.confidence_thresholds.min_pipeline_projects &&
    seduvi === 0 &&
    confidence === 'high'
  ) {
    confidence = 'medium';
  }

  // Relax insufficient → low SÓLO cuando no hubo fail de dependencia crítica
  // (D13: critical_dependency_insufficient debe propagate).
  if (
    confidence === 'insufficient_data' &&
    value > 0 &&
    propagation.cap_reason !== 'critical_dependency_insufficient'
  ) {
    confidence = 'low';
  }

  return {
    value,
    confidence,
    components: {
      pipeline_count,
      pipeline_units,
      seduvi_estimated_units: seduvi,
      demand_12m,
      oversupply_ratio: Number(oversupply_ratio.toFixed(4)),
      alerta,
      missing_dimensions: missing,
      coverage_pct,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.d03.insufficient';
  if (value >= 80) return 'ie.score.d03.undersupply_oportunidad';
  if (value >= 50) return 'ie.score.d03.equilibrado';
  if (value >= 25) return 'ie.score.d03.oversupply_moderado';
  return 'ie.score.d03.oversupply_riesgo';
}

export const d03SupplyPipelineCalculator: Calculator = {
  scoreId: 'D03',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const hasParams =
      typeof params.pipeline_count === 'number' &&
      typeof params.pipeline_units === 'number' &&
      typeof params.demand_12m === 'number';
    const confidence: Confidence = hasParams ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: hasParams
          ? 'prod path stub — invocar computeD03SupplyPipeline directo'
          : 'params pipeline_count/pipeline_units/demand_12m no provistos',
      },
      inputs_used: {
        periodDate: input.periodDate,
        zoneId: input.zoneId ?? null,
      },
      confidence,
      citations: [
        { source: 'projects', period: 'estado_desarrollo in (construccion, preventa)' },
        { source: 'seduvi_permisos', period: 'rolling 24m' },
        { source: 'zone_scores:B01', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'projects', count: 0 },
          { name: 'seduvi_permisos', count: 0 },
          { name: 'zone_scores:B01', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default d03SupplyPipelineCalculator;
