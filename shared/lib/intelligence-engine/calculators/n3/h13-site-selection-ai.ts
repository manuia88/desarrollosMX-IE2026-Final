// H13 Site Selection AI — score N3 para developer que ranking de sites
// (zonas candidatas) según criteria. Compone F09+F10+B01+D03+Uso_Suelo+N11
// + L-69 zone_demographics (profession match + salary compatibility).
// Plan FASE 10 §10.B.11. Catálogo 03.8 §H13. Tier 3. Categoría dev.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeZoneDemographics,
  professionBoost,
  salaryCompatibility,
  type ZoneDemographics,
} from '../../sources/zone-demographics';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export type SiteObjetivo = 'residencial' | 'comercial' | 'industrial';

export const WEIGHTS = {
  value: 0.2,
  gentrification: 0.15,
  demand: 0.2,
  supply_inv: 0.1,
  uso_suelo_match: 0.1,
  momentum: 0.1,
  demographics_fit: 0.15, // L-69
} as const;

export const methodology = {
  formula:
    'site_score = F09·0.20 + F10·0.15 + B01·0.20 + (100-D03)·0.10 + Uso·0.10 + N11·0.10 + (prof_boost + salary_compat)·0.15',
  sources: [
    'zone_scores:F09',
    'zone_scores:F10',
    'zone_scores:B01',
    'zone_scores:D03',
    'zone_scores:N11',
    'uso_suelo',
    'zone_demographics_cache',
  ],
  dependencies: [
    { score_id: 'F09', weight: 0.2, role: 'value', critical: false },
    { score_id: 'B01', weight: 0.2, role: 'demand', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §H13 Site Selection AI',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#h13-site-selection-ai',
    },
    { name: 'Plan FASE 10 §10.B.11', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
    {
      name: 'L-69 zone_demographics source',
      url: 'shared/lib/intelligence-engine/sources/zone-demographics.ts',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_coverage_pct: 60, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'F09', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'B01', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'demographics', impact_pct_per_10pct_change: 1.5 },
  ],
} as const;

export const reasoning_template =
  'Site Selection AI: top {top_count} zonas. Best {top_zone_id} score {top_score}. Criteria {objetivo}. L-69 demographics {demographics_source}.';

export interface ZoneCandidate {
  readonly zone_id: string;
  readonly value: number | null; // F09
  readonly gentrification: number | null; // F10
  readonly demand: number | null; // B01
  readonly supply_pressure: number | null; // D03
  readonly uso_suelo_compat: number | null; // 0-100 preconverted
  readonly momentum: number | null; // N11
}

export interface H13SiteOutput {
  readonly zone_id: string;
  readonly score: number;
  readonly rank: number;
  readonly demographics_source: ZoneDemographics['source'];
  readonly profession_boost: number;
  readonly salary_compat: number;
  readonly rationale: readonly string[];
}

export interface H13Components extends Record<string, unknown> {
  readonly objetivo: SiteObjetivo;
  readonly ranked_sites: readonly H13SiteOutput[];
  readonly top_zone_id: string | null;
  readonly top_score: number;
  readonly zones_evaluated: number;
  readonly zones_ranked: number;
}

export interface H13RawInput {
  readonly objetivo: SiteObjetivo;
  readonly zones: readonly ZoneCandidate[];
  readonly target_profession?: string | null;
  readonly target_salary_mxn?: number | null;
  readonly demographics_by_zone: Readonly<Record<string, ZoneDemographics>>;
}

export interface H13ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H13Components;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeH13Site(input: H13RawInput): H13ComputeResult {
  if (input.zones.length === 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        objetivo: input.objetivo,
        ranked_sites: [],
        top_zone_id: null,
        top_score: 0,
        zones_evaluated: 0,
        zones_ranked: 0,
      },
    };
  }

  const scored: H13SiteOutput[] = [];

  for (const z of input.zones) {
    const rationale: string[] = [];
    const demo = input.demographics_by_zone[z.zone_id];

    const value = z.value ?? 0;
    const gent = z.gentrification ?? 0;
    const demand = z.demand ?? 0;
    const supplyInv = 100 - (z.supply_pressure ?? 50);
    const uso = z.uso_suelo_compat ?? 50;
    const momentum = z.momentum ?? 0;

    // L-69 demographics boost
    let profBoost = 0;
    let salBoost = 0;
    if (demo) {
      profBoost = professionBoost(demo, input.target_profession ?? null);
      salBoost = salaryCompatibility(demo, input.target_salary_mxn ?? null);
    }
    const demographicsScore = ((profBoost + salBoost) / 2) * 100;

    const raw =
      value * WEIGHTS.value +
      gent * WEIGHTS.gentrification +
      demand * WEIGHTS.demand +
      supplyInv * WEIGHTS.supply_inv +
      uso * WEIGHTS.uso_suelo_match +
      momentum * WEIGHTS.momentum +
      demographicsScore * WEIGHTS.demographics_fit;

    const score = Math.round(clamp100(raw));

    if (value >= 70) rationale.push(`Value Score F09=${value}`);
    if (demand >= 70) rationale.push(`Demanda alta B01=${demand}`);
    if (momentum >= 70) rationale.push(`Momentum N11=${momentum}`);
    if (input.target_profession && profBoost > 0.3)
      rationale.push(`Concentración profesional compatible (${(profBoost * 100).toFixed(0)}%)`);
    if (supplyInv >= 70) rationale.push('Baja saturación oferta');

    scored.push({
      zone_id: z.zone_id,
      score,
      rank: 0,
      demographics_source: demo?.source ?? 'stub',
      profession_boost: Number(profBoost.toFixed(3)),
      salary_compat: Number(salBoost.toFixed(3)),
      rationale,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((s, idx) => {
    (s as { rank: number }).rank = idx + 1;
  });

  const top = scored[0];
  const value = top?.score ?? 0;

  const richDemoCount = Object.values(input.demographics_by_zone).filter((d) => !d.stub).length;
  const coverage = input.zones.length > 0 ? richDemoCount / input.zones.length : 0;
  const confidence: Confidence =
    input.zones.length >= 5 && coverage >= 0.5
      ? 'high'
      : input.zones.length >= 3
        ? 'medium'
        : 'low';

  return {
    value,
    confidence,
    components: {
      objetivo: input.objetivo,
      ranked_sites: scored,
      top_zone_id: top?.zone_id ?? null,
      top_score: value,
      zones_evaluated: input.zones.length,
      zones_ranked: scored.length,
    },
  };
}

export function getLabelKey(score: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h13.insufficient';
  if (score >= 75) return 'ie.score.h13.top_site';
  if (score >= 55) return 'ie.score.h13.candidato';
  if (score >= 35) return 'ie.score.h13.marginal';
  return 'ie.score.h13.descartar';
}

export async function computeH13WithDemographics(
  input: Omit<H13RawInput, 'demographics_by_zone'>,
  supabase: SupabaseClient,
): Promise<H13ComputeResult> {
  const demographics_by_zone: Record<string, ZoneDemographics> = {};
  await Promise.all(
    input.zones.map(async (z) => {
      demographics_by_zone[z.zone_id] = await computeZoneDemographics(z.zone_id, supabase);
    }),
  );
  return computeH13Site({ ...input, demographics_by_zone });
}

export const h13SiteSelectionAiCalculator: Calculator = {
  scoreId: 'H13',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence = Array.isArray(params.zones) ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'prod path stub — invocar computeH13Site / computeH13WithDemographics',
      },
      inputs_used: { periodDate: input.periodDate },
      confidence,
      citations: [
        { source: 'zone_scores:F09', period: input.periodDate },
        { source: 'zone_scores:B01', period: input.periodDate },
        { source: 'zone_demographics_cache', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:F09', count: 0 },
          { name: 'zone_demographics_cache', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { objetivo: 'residencial', top_count: 0 },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default h13SiteSelectionAiCalculator;
