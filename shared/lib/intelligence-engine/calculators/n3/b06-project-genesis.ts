// B06 Project Genesis — score N3 que evalúa viabilidad de lanzar un nuevo
// proyecto dev en una zona. Consolida F09 Value + F10 Gentrification + B01
// Demand + B04 PMF + D03 Supply Pipeline + H12 Zona Oportunidad.
// Plan FASE 10 §10.B.6. Catálogo 03.8 §B06. Tier 3. Categoría dev.

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
  value: 0.2,
  gentrification: 0.15,
  demand: 0.2,
  pmf: 0.2,
  supply_pressure: 0.15, // invertido: high supply → penaliza
  oportunidad: 0.1,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['B01', 'D03'] as const;

export const methodology = {
  formula: 'genesis = F09·0.20 + F10·0.15 + B01·0.20 + B04·0.20 + (100-D03)·0.15 + H12·0.10',
  sources: [
    'zone_scores:F09',
    'zone_scores:F10',
    'zone_scores:B01',
    'zone_scores:B04',
    'zone_scores:D03',
    'zone_scores:H12',
  ],
  weights: WEIGHTS,
  dependencies: [
    { score_id: 'F09', weight: 0.2, role: 'value', critical: false },
    { score_id: 'F10', weight: 0.15, role: 'gentrification', critical: false },
    { score_id: 'B01', weight: 0.2, role: 'demand', critical: true },
    { score_id: 'B04', weight: 0.2, role: 'pmf', critical: false },
    { score_id: 'D03', weight: 0.15, role: 'supply_pressure', critical: true },
    { score_id: 'H12', weight: 0.1, role: 'oportunidad', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §B06 Project Genesis',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b06-project-genesis',
    },
    { name: 'Plan FASE 10 §10.B.6', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_coverage_pct: 60, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'B01', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'B04', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'D03', impact_pct_per_10pct_change: 1.5 },
  ],
} as const;

export const reasoning_template =
  'Project Genesis zona {zone_id}: viabilidad {score_value}/100 ({bucket}). Demanda {demand}, oferta {supply}. Confianza {confidence}.';

export type B06Bucket = 'alta_viabilidad' | 'moderada' | 'marginal' | 'no_viable';

export interface B06Components extends Record<string, unknown> {
  readonly value: number | null;
  readonly gentrification: number | null;
  readonly demand: number | null;
  readonly pmf: number | null;
  readonly supply_pressure: number | null;
  readonly oportunidad: number | null;
  readonly bucket: B06Bucket;
  readonly missing_dimensions: readonly string[];
  readonly coverage_pct: number;
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
}

export interface B06RawInput {
  readonly value: number | null;
  readonly gentrification: number | null;
  readonly demand: number | null;
  readonly pmf: number | null;
  readonly supply_pressure: number | null; // 0-100 (100=high oversupply)
  readonly oportunidad: number | null;
  readonly deps?: readonly DepConfidence[];
}

export interface B06ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B06Components;
}

function bucketFor(value: number): B06Bucket {
  if (value >= 75) return 'alta_viabilidad';
  if (value >= 55) return 'moderada';
  if (value >= 35) return 'marginal';
  return 'no_viable';
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeB06Genesis(input: B06RawInput): B06ComputeResult {
  const missing: string[] = [];
  if (input.value === null || !Number.isFinite(input.value)) missing.push('F09_value');
  if (input.gentrification === null || !Number.isFinite(input.gentrification))
    missing.push('F10_gentrification');
  if (input.demand === null || !Number.isFinite(input.demand)) missing.push('B01_demand');
  if (input.pmf === null || !Number.isFinite(input.pmf)) missing.push('B04_pmf');
  if (input.supply_pressure === null || !Number.isFinite(input.supply_pressure))
    missing.push('D03_supply');
  if (input.oportunidad === null || !Number.isFinite(input.oportunidad))
    missing.push('H12_oportunidad');

  const total = 6;
  const available = total - missing.length;
  const coverage_pct = Math.round((available / total) * 100);

  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({
    critical,
    supporting,
    coverage_pct,
    min_coverage_pct: methodology.confidence_thresholds.min_coverage_pct,
    high_coverage_pct: methodology.confidence_thresholds.high_coverage_pct,
  });

  // critical: B01 + D03
  if (
    input.demand === null ||
    !Number.isFinite(input.demand) ||
    input.supply_pressure === null ||
    !Number.isFinite(input.supply_pressure)
  ) {
    const cappedBy: string[] = [];
    if (input.demand === null || !Number.isFinite(input.demand)) cappedBy.push('B01');
    if (input.supply_pressure === null || !Number.isFinite(input.supply_pressure))
      cappedBy.push('D03');
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        value: input.value,
        gentrification: input.gentrification,
        demand: input.demand,
        pmf: input.pmf,
        supply_pressure: input.supply_pressure,
        oportunidad: input.oportunidad,
        bucket: 'no_viable',
        missing_dimensions: missing,
        coverage_pct,
        capped_by: cappedBy,
        cap_reason: 'critical_dependency_missing',
      },
    };
  }

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        value: input.value,
        gentrification: input.gentrification,
        demand: input.demand,
        pmf: input.pmf,
        supply_pressure: input.supply_pressure,
        oportunidad: input.oportunidad,
        bucket: 'no_viable',
        missing_dimensions: missing,
        coverage_pct,
        capped_by: [],
        cap_reason: 'coverage_below_min',
      },
    };
  }

  const v = input.value ?? 0;
  const g = input.gentrification ?? 0;
  const d = input.demand ?? 0;
  const p = input.pmf ?? 0;
  const s = input.supply_pressure ?? 0;
  const o = input.oportunidad ?? 0;

  const weighted =
    v * WEIGHTS.value +
    g * WEIGHTS.gentrification +
    d * WEIGHTS.demand +
    p * WEIGHTS.pmf +
    (100 - s) * WEIGHTS.supply_pressure +
    o * WEIGHTS.oportunidad;

  const value = Math.round(clamp100(weighted));

  const baselineConfidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';
  const confidence: Confidence = deps.length > 0 ? propagation.confidence : baselineConfidence;

  return {
    value,
    confidence,
    components: {
      value: v,
      gentrification: g,
      demand: d,
      pmf: p,
      supply_pressure: s,
      oportunidad: o,
      bucket: bucketFor(value),
      missing_dimensions: missing,
      coverage_pct,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b06.insufficient';
  if (value >= 75) return 'ie.score.b06.alta_viabilidad';
  if (value >= 55) return 'ie.score.b06.moderada';
  if (value >= 35) return 'ie.score.b06.marginal';
  return 'ie.score.b06.no_viable';
}

export const b06ProjectGenesisCalculator: Calculator = {
  scoreId: 'B06',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence =
      typeof params.demand === 'number' ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'prod path stub — invocar computeB06Genesis directo' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        { source: 'zone_scores:F09', period: input.periodDate },
        { source: 'zone_scores:F10', period: input.periodDate },
        { source: 'zone_scores:B01', period: input.periodDate },
        { source: 'zone_scores:B04', period: input.periodDate },
        { source: 'zone_scores:D03', period: input.periodDate },
        { source: 'zone_scores:H12', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:B01', count: 0 },
          { name: 'zone_scores:D03', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zone_id: input.zoneId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default b06ProjectGenesisCalculator;
