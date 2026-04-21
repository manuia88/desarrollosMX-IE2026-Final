// A11 Patrimonio 20y — proyección de patrimonio a 20 años del comprador.
// Combina A02 Investment Sim + N11 Momentum + A05 TCO 10y + inflación.
// Plan FASE 10 §10.B.5. Catálogo 03.8 §A11. Tier 3. Categoría comprador.
//
// D29 FASE 10 SESIÓN 2/3: scenarios macro { boom, stagnation, recession }
// con tasas de apreciación + inflación distintas.
//
// Output base: valor nominal + real (adjusted inflación) a 20y.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Calculator,
  CalculatorInput,
  CalculatorOutput,
  Confidence,
  ScenarioOutput,
} from '../base';
import { computeValidUntil } from '../persist';
import { defineScenarios, runWithScenarios } from '../scenarios';

export const version = '1.0.0';

export const methodology = {
  formula:
    'patrimonio_20y = precio_inicial × (1 + tasa_apreciacion_anual)^20. Real = nominal / (1+inflacion)^20.',
  sources: [
    'project_scores:A02',
    'zone_scores:N11',
    'project_scores:A05',
    'macro_series:inflacion',
  ],
  dependencies: [
    { score_id: 'A02', weight: 0.35, role: 'appreciation', critical: true },
    { score_id: 'N11', weight: 0.25, role: 'momentum', critical: false },
    { score_id: 'A05', weight: 0.2, role: 'tco_cost', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §A11 Patrimonio 20y',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#a11-patrimonio-20y',
    },
    { name: 'Plan FASE 10 §10.B.5', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'A02', impact_pct_per_10pct_change: 4.0 },
    { dimension_id: 'N11', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'A05', impact_pct_per_10pct_change: 1.5 },
  ],
} as const;

export const reasoning_template =
  'Patrimonio 20y proyectado: nominal ${patrimonio_nominal_mxn} / real ${patrimonio_real_mxn} (base {precio_inicial_mxn}, tasa {tasa_apreciacion_anual}). Confianza {confidence}.';

export interface A11Components extends Record<string, unknown> {
  readonly precio_inicial_mxn: number;
  readonly tasa_apreciacion_anual: number;
  readonly tasa_inflacion_anual: number;
  readonly patrimonio_nominal_mxn: number;
  readonly patrimonio_real_mxn: number;
  readonly tco_acumulado_mxn: number;
  readonly net_patrimonio_real_mxn: number;
  readonly horizon_years: number;
  readonly missing_dimensions: readonly string[];
  readonly coverage_pct: number;
}

export interface A11RawInput {
  readonly precio_inicial_mxn: number;
  readonly tasa_apreciacion_base: number | null; // decimal 0.05 = 5%
  readonly momentum_score: number | null; // 0-100
  readonly tco_mensual_mxn: number | null;
  readonly inflacion_base: number | null; // decimal
}

export interface A11ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A11Components;
  readonly scenarios: Readonly<Record<string, ScenarioOutput>>;
}

const HORIZON_YEARS = 20;

// D29 — escenarios macro con deltas distintos a la tasa base.
const SCENARIOS_CONFIG = defineScenarios({
  boom: {
    weights: { rate_delta: 0.02, infl_delta: -0.01 },
    rationale: 'Boom: apreciación +2pp, inflación -1pp.',
  },
  stagnation: {
    weights: { rate_delta: 0.0, infl_delta: 0.0 },
    rationale: 'Estancamiento: tasas base.',
  },
  recession: {
    weights: { rate_delta: -0.03, infl_delta: 0.02 },
    rationale: 'Recesión: apreciación -3pp, inflación +2pp.',
  },
});

function compoundYears(principal: number, rate: number, years: number): number {
  return principal * (1 + rate) ** years;
}

export function computeA11Patrimonio(input: A11RawInput): A11ComputeResult {
  const missing: string[] = [];
  if (input.tasa_apreciacion_base === null || !Number.isFinite(input.tasa_apreciacion_base))
    missing.push('A02_apreciacion');
  if (input.momentum_score === null || !Number.isFinite(input.momentum_score))
    missing.push('N11_momentum');
  if (input.tco_mensual_mxn === null || !Number.isFinite(input.tco_mensual_mxn))
    missing.push('A05_tco');
  if (input.inflacion_base === null || !Number.isFinite(input.inflacion_base))
    missing.push('macro_inflacion');

  const total = 4;
  const available = total - missing.length;
  const coverage_pct = Math.round((available / total) * 100);

  if (
    input.tasa_apreciacion_base === null ||
    !Number.isFinite(input.tasa_apreciacion_base) ||
    coverage_pct < methodology.confidence_thresholds.min_coverage_pct
  ) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        precio_inicial_mxn: input.precio_inicial_mxn,
        tasa_apreciacion_anual: 0,
        tasa_inflacion_anual: 0,
        patrimonio_nominal_mxn: 0,
        patrimonio_real_mxn: 0,
        tco_acumulado_mxn: 0,
        net_patrimonio_real_mxn: 0,
        horizon_years: HORIZON_YEARS,
        missing_dimensions: missing,
        coverage_pct,
      },
      scenarios: {},
    };
  }

  const rateBase = input.tasa_apreciacion_base ?? 0;
  const inflBase = input.inflacion_base ?? 0;
  const momentumBoost = ((input.momentum_score ?? 50) - 50) / 2000; // 50→0, 100→0.025
  const tcoMensual = input.tco_mensual_mxn ?? 0;

  // Base scenario values.
  const rateBaseAdj = Math.max(-0.1, rateBase + momentumBoost);
  const nominal = compoundYears(input.precio_inicial_mxn, rateBaseAdj, HORIZON_YEARS);
  const real = inflBase > 0 ? nominal / (1 + inflBase) ** HORIZON_YEARS : nominal;
  const tcoAcumulado = tcoMensual * 12 * HORIZON_YEARS;
  const netReal = real - tcoAcumulado;

  // D29 — scenarios: aplica delta a rate + infl.
  const scenarios = runWithScenarios({
    config: SCENARIOS_CONFIG,
    computeFn: (weights) => {
      const rate = Math.max(-0.1, rateBaseAdj + weights.rate_delta);
      const infl = Math.max(0, inflBase + weights.infl_delta);
      const nom = compoundYears(input.precio_inicial_mxn, rate, HORIZON_YEARS);
      const rl = infl > 0 ? nom / (1 + infl) ** HORIZON_YEARS : nom;
      // score 0-100: relacion real_net / precio_inicial (cap 3x).
      const ratio = Math.min(3, Math.max(0, (rl - tcoAcumulado) / input.precio_inicial_mxn));
      const v = Math.round((ratio / 3) * 100);
      return { value: v, confidence: 'medium' };
    },
  });

  const ratio = Math.min(3, Math.max(0, netReal / input.precio_inicial_mxn));
  const value = Math.round((ratio / 3) * 100);

  const confidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';

  return {
    value,
    confidence,
    components: {
      precio_inicial_mxn: input.precio_inicial_mxn,
      tasa_apreciacion_anual: Number(rateBaseAdj.toFixed(4)),
      tasa_inflacion_anual: Number(inflBase.toFixed(4)),
      patrimonio_nominal_mxn: Math.round(nominal),
      patrimonio_real_mxn: Math.round(real),
      tco_acumulado_mxn: Math.round(tcoAcumulado),
      net_patrimonio_real_mxn: Math.round(netReal),
      horizon_years: HORIZON_YEARS,
      missing_dimensions: missing,
      coverage_pct,
    },
    scenarios,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a11.insufficient';
  if (value >= 75) return 'ie.score.a11.crecimiento_alto';
  if (value >= 50) return 'ie.score.a11.crecimiento_medio';
  if (value >= 25) return 'ie.score.a11.crecimiento_bajo';
  return 'ie.score.a11.sin_crecimiento';
}

export const a11Patrimonio20yCalculator: Calculator = {
  scoreId: 'A11',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence =
      typeof params.precio_inicial_mxn === 'number' ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'prod path stub — invocar computeA11Patrimonio directo' },
      inputs_used: { periodDate: input.periodDate, userId: input.userId ?? null },
      confidence,
      citations: [
        { source: 'project_scores:A02', period: input.periodDate },
        { source: 'zone_scores:N11', period: input.periodDate },
        { source: 'project_scores:A05', period: input.periodDate },
        { source: 'macro_series:inflacion', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'project_scores:A02', count: 0 },
          { name: 'zone_scores:N11', count: 0 },
          { name: 'macro_series:inflacion', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { project_id: input.projectId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a11Patrimonio20yCalculator;
