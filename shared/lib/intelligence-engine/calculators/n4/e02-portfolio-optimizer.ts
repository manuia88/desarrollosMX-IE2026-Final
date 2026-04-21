// E02 Portfolio Optimizer — Sharpe ratio inmobiliario sobre portfolio del dev.
// Plan FASE 10 §10.C (N4). Catálogo 03.8 §E02. Tier 3. Categoría proyecto.
//
// FÓRMULA:
//   sharpe = (avg_return − risk_free_rate) / stddev_returns
//   - avg_return   = promedio de E01 del portfolio últimos 12m.
//   - risk_free    = CETES hardcode H1 = 0.10 (10%). Override vía
//     methodology.validity params más adelante con macro_series.
//   - stddev       = desviación estándar poblacional de E01 entre proyectos.
//
// Score 0-100 normalizado:
//   sharpe rango objetivo [-1, +3]. Mapping lineal clamp:
//     sharpe ≤ 0  →  0
//     sharpe ≥ 3  → 100
//     interpolación lineal intermedia.
//
// D33 FASE 10 SESIÓN 3/3 — tenant_scope_required: true. El run() valida
// tenant_id en run-score.ts vía validateTenantScope. Este archivo solo
// implementa compute puro + run stub.
//
// Insufficient: portfolio < 3 proyectos (no hay stddev significativa).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

// H1 CETES default (10%). H2 override vía macro_series.
export const DEFAULT_RISK_FREE_RATE = 0.1;

// Umbral mínimo para calcular Sharpe con sentido (stddev significativa).
export const MIN_PORTFOLIO_SIZE = 3;

// Rango objetivo del Sharpe para mapear a 0-100.
export const SHARPE_FLOOR = 0;
export const SHARPE_CEIL = 3;

export const methodology = {
  formula:
    'sharpe = (avg_E01 − risk_free_rate) / stddev_E01. Portfolio ≥ 3 proyectos. Score 0-100 clamp(sharpe, 0, 3) × 100 / 3.',
  sources: ['project_scores:E01', 'macro_series:cetes_28d'],
  dependencies: [
    { score_id: 'E01', weight: 1.0, role: 'aggregate_input', critical: true } as const,
  ] as const,
  references: [
    {
      name: 'Catálogo 03.8 §E02 Portfolio Optimizer',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#e02-portfolio-optimizer',
    },
    { name: 'Plan FASE 10 §10.C', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_portfolio_size: MIN_PORTFOLIO_SIZE, high_portfolio_size: 8 },
  tenant_scope_required: true,
  default_risk_free_rate: DEFAULT_RISK_FREE_RATE,
  sharpe_floor: SHARPE_FLOOR,
  sharpe_ceil: SHARPE_CEIL,
} as const;

export const reasoning_template =
  'Portfolio Optimizer: Sharpe {sharpe_ratio} (avg E01 {avg_return}, stddev {stddev}). Portfolio {portfolio_size} proyectos. Score {score_value}/100.';

export interface E02Components extends Record<string, unknown> {
  readonly sharpe_ratio: number;
  readonly avg_return: number;
  readonly stddev: number;
  readonly portfolio_size: number;
  readonly diversification_index: number;
  readonly risk_free_rate: number;
  // Sensitive raw data — not exposed publicly; persistido en project_scores
  // components jsonb (RLS institucional H2 limita acceso por tenant_id).
  readonly raw_positions: readonly number[];
  readonly cost_basis: readonly number[];
}

export interface E02RawInput {
  // E01 per proyecto del portfolio (0-100). Orden irrelevante.
  readonly portfolio_e01_scores: readonly number[];
  // Cost basis opcional per proyecto (mxn). Se persiste pero no afecta score.
  readonly portfolio_cost_basis?: readonly number[];
  // Override opcional (default DEFAULT_RISK_FREE_RATE).
  readonly risk_free_rate?: number;
}

export interface E02ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: E02Components;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

function stddevPop(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  const variance = xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

// Herfindahl-Hirschman inverso normalizado a diversificación [0,1].
// Si hay N proyectos con cost_basis uniforme → 1 − 1/N maximal. Si uno solo
// concentra 100% → 0. Cuando cost_basis no disponible, usa equal-weight.
function diversificationIndex(costs: readonly number[] | undefined, size: number): number {
  if (size <= 1) return 0;
  const weights =
    costs && costs.length === size && costs.some((c) => c > 0)
      ? (() => {
          const total = costs.reduce((s, v) => s + (v > 0 ? v : 0), 0);
          if (total <= 0) return costs.map(() => 1 / size);
          return costs.map((c) => (c > 0 ? c / total : 0));
        })()
      : Array.from({ length: size }, () => 1 / size);
  const hhi = weights.reduce((s, w) => s + w * w, 0);
  // HHI min = 1/N (equal weight); max = 1 (concentrado).
  // diversification = (1 − HHI) normalizado a [0,1] contra equal-weight.
  // Para N grande, 1 − 1/N ≈ 1.
  const maxDiversification = 1 - 1 / size;
  if (maxDiversification <= 0) return 0;
  return clamp((1 - hhi) / maxDiversification, 0, 1);
}

export function computeE02PortfolioOptimizer(input: E02RawInput): E02ComputeResult {
  const scores = input.portfolio_e01_scores.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  const riskFree = input.risk_free_rate ?? DEFAULT_RISK_FREE_RATE;
  const costs = input.portfolio_cost_basis ?? [];
  const portfolio_size = scores.length;

  if (portfolio_size < MIN_PORTFOLIO_SIZE) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        sharpe_ratio: 0,
        avg_return: 0,
        stddev: 0,
        portfolio_size,
        diversification_index: 0,
        risk_free_rate: riskFree,
        raw_positions: scores,
        cost_basis: costs,
      },
    };
  }

  // E01 0-100 → tratamos como "return %" directo (proxy H1). El avg se
  // expresa en decimal dividiendo /100 para homogeneidad con risk_free.
  const avg_raw = mean(scores);
  const avg_return = avg_raw / 100;
  const stddev_raw = stddevPop(scores);
  const stddev = stddev_raw / 100;

  // Sharpe = (return − rf) / stddev. stddev=0 → portfolio homogéneo, se
  // asume sharpe alto solo si avg_return > rf, bajo si ≤ rf.
  const sharpe_ratio =
    stddev === 0 ? (avg_return > riskFree ? SHARPE_CEIL : 0) : (avg_return - riskFree) / stddev;

  const clamped = clamp(sharpe_ratio, SHARPE_FLOOR, SHARPE_CEIL);
  const value = Math.round((clamped / SHARPE_CEIL) * 100);

  const diversification_index = diversificationIndex(costs, portfolio_size);

  const confidence: Confidence =
    portfolio_size >= methodology.confidence_thresholds.high_portfolio_size ? 'high' : 'medium';

  return {
    value,
    confidence,
    components: {
      sharpe_ratio: Number(sharpe_ratio.toFixed(4)),
      avg_return: Number(avg_return.toFixed(4)),
      stddev: Number(stddev.toFixed(4)),
      portfolio_size,
      diversification_index: Number(diversification_index.toFixed(4)),
      risk_free_rate: riskFree,
      raw_positions: scores,
      cost_basis: costs,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.e02.insufficient';
  if (value >= 75) return 'ie.score.e02.excelente';
  if (value >= 55) return 'ie.score.e02.bueno';
  if (value >= 35) return 'ie.score.e02.regular';
  return 'ie.score.e02.pobre';
}

export const e02PortfolioOptimizerCalculator: Calculator = {
  scoreId: 'E02',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const portfolio_ids = Array.isArray(params.portfolio_ids) ? params.portfolio_ids : [];
    const confidence: Confidence =
      portfolio_ids.length >= MIN_PORTFOLIO_SIZE ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'prod path stub — invocar computeE02PortfolioOptimizer directo',
        portfolio_size_requested: portfolio_ids.length,
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
        tenant_id: input.tenant_id ?? null,
        portfolio_ids,
      },
      confidence,
      citations: [
        { source: 'project_scores:E01', period: input.periodDate },
        { source: 'macro_series:cetes_28d', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'project_scores:E01', count: 0 },
          { name: 'macro_series:cetes_28d', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        sharpe_ratio: 0,
        avg_return: 0,
        stddev: 0,
        portfolio_size: portfolio_ids.length,
        score_value: 0,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default e02PortfolioOptimizerCalculator;
