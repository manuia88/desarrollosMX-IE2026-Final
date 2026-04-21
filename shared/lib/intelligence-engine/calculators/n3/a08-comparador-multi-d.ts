// A08 Comparador Multi-Dimensional — score N3 que compara 2-6 proyectos
// en 8 dimensiones normalizadas 0-100: Precio, LQI (F08), Risk (F12),
// Momentum (N11), Walkability (N08), Schools (H01), Community fit (A06),
// Ecosystem (F03).
// Plan FASE 10 §10.B.2. Catálogo 03.8 §A08. Tier 3. Categoría proyecto.
//
// D31 FASE 10: comparable_properties auto-populate al persistir (persist.ts).
// L-31 FASE 10: multiplayer mode con per_user_scores + consensus via
// computeMultiplayerConsensus helper (multiplayer.ts).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import {
  computeMultiplayerConsensus,
  type MultiplayerConsensus,
  type PerUserScores,
} from '../multiplayer';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const DIMENSIONS = [
  'precio',
  'lqi',
  'risk',
  'momentum',
  'walkability',
  'schools',
  'community_fit',
  'ecosystem',
] as const;
export type A08Dimension = (typeof DIMENSIONS)[number];

export const methodology = {
  formula:
    'avg(8 dimensions normalized 0-100) per project; ranking per dimension. Multiplayer: consensus mean + disagreement stddev.',
  sources: [
    'project_scores:F08',
    'project_scores:F12',
    'zone_scores:N11',
    'zone_scores:N08',
    'zone_scores:H01',
    'zone_scores:A06',
    'zone_scores:F03',
    'project_scores:price_m2',
  ],
  dimensions: DIMENSIONS,
  dependencies: [
    { score_id: 'F08', weight: 0.125, role: 'lqi', critical: false },
    { score_id: 'F12', weight: 0.125, role: 'risk', critical: false },
    { score_id: 'A12', weight: 0.125, role: 'precio', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §A08 Comparador Multi-Dimensional',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#a08-comparador-multi-dimensional',
    },
    { name: 'Plan FASE 10 §10.B.2', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_coverage_pct: 60, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'F08', impact_pct_per_10pct_change: 1.25 },
    { dimension_id: 'F12', impact_pct_per_10pct_change: 1.25 },
    { dimension_id: 'A12', impact_pct_per_10pct_change: 1.25 },
  ],
} as const;

export const reasoning_template =
  'Comparador {project_count} proyectos: top {top_project} (score {top_score}). Multiplayer: {agreement_level} acuerdo.';

export interface ProjectDimensions {
  readonly projectId: string;
  readonly precio: number | null; // 0-100 (100 = mejor precio)
  readonly lqi: number | null;
  readonly risk: number | null; // invertido (100 = menor risk)
  readonly momentum: number | null;
  readonly walkability: number | null;
  readonly schools: number | null;
  readonly community_fit: number | null;
  readonly ecosystem: number | null;
}

export interface A08RankedProject {
  readonly projectId: string;
  readonly score: number;
  readonly dimensions: Readonly<Record<A08Dimension, number | null>>;
  readonly per_dimension_rank: Readonly<Record<A08Dimension, number>>;
}

export interface A08Components extends Record<string, unknown> {
  readonly projects_ranked: readonly A08RankedProject[];
  readonly top_project_id: string | null;
  readonly top_score: number;
  readonly project_count: number;
  readonly dimension_coverage: Readonly<Record<A08Dimension, number>>; // % projects con valor válido
  readonly multiplayer_consensus: MultiplayerConsensus | null;
}

export interface A08RawInput {
  readonly projects: readonly ProjectDimensions[];
  readonly userIds?: readonly string[]; // L-31 multiplayer
  readonly per_user_scores?: PerUserScores; // L-31 — score per user per dimension per project
}

export interface A08ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A08Components;
}

function avgDimensions(dims: Readonly<Record<A08Dimension, number | null>>): number {
  const values: number[] = [];
  for (const d of DIMENSIONS) {
    const v = dims[d];
    if (typeof v === 'number' && Number.isFinite(v)) values.push(v);
  }
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function rankPerDimension(
  projects: readonly ProjectDimensions[],
): Record<string, Record<A08Dimension, number>> {
  const result: Record<string, Record<A08Dimension, number>> = {};
  for (const p of projects) result[p.projectId] = {} as Record<A08Dimension, number>;
  for (const dim of DIMENSIONS) {
    const sorted = [...projects]
      .filter((p) => typeof p[dim] === 'number' && Number.isFinite(p[dim] as number))
      .sort((a, b) => (b[dim] as number) - (a[dim] as number));
    sorted.forEach((p, idx) => {
      const entry = result[p.projectId];
      if (entry) entry[dim] = idx + 1;
    });
  }
  return result;
}

function dimensionCoverage(projects: readonly ProjectDimensions[]): Record<A08Dimension, number> {
  const result = {} as Record<A08Dimension, number>;
  const total = projects.length;
  for (const dim of DIMENSIONS) {
    const available = projects.filter(
      (p) => typeof p[dim] === 'number' && Number.isFinite(p[dim] as number),
    ).length;
    result[dim] = total > 0 ? Math.round((available / total) * 100) : 0;
  }
  return result;
}

export function computeA08Comparador(input: A08RawInput): A08ComputeResult {
  if (input.projects.length < 2) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        projects_ranked: [],
        top_project_id: null,
        top_score: 0,
        project_count: input.projects.length,
        dimension_coverage: Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as Record<
          A08Dimension,
          number
        >,
        multiplayer_consensus: null,
      },
    };
  }
  if (input.projects.length > 6) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        projects_ranked: [],
        top_project_id: null,
        top_score: 0,
        project_count: input.projects.length,
        dimension_coverage: Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as Record<
          A08Dimension,
          number
        >,
        multiplayer_consensus: null,
      },
    };
  }

  const ranksByProject = rankPerDimension(input.projects);
  const coverage = dimensionCoverage(input.projects);
  const avgCoverage = Object.values(coverage).reduce((s, v) => s + v, 0) / DIMENSIONS.length;

  const projects_ranked: A08RankedProject[] = input.projects
    .map((p): A08RankedProject => {
      const dims = {
        precio: p.precio,
        lqi: p.lqi,
        risk: p.risk,
        momentum: p.momentum,
        walkability: p.walkability,
        schools: p.schools,
        community_fit: p.community_fit,
        ecosystem: p.ecosystem,
      } as Record<A08Dimension, number | null>;
      const score = avgDimensions(dims);
      return {
        projectId: p.projectId,
        score,
        dimensions: dims,
        per_dimension_rank: ranksByProject[p.projectId] ?? ({} as Record<A08Dimension, number>),
      };
    })
    .sort((a, b) => b.score - a.score);

  const top = projects_ranked[0];

  // L-31 multiplayer consensus
  let multiplayer_consensus: MultiplayerConsensus | null = null;
  if (input.per_user_scores && Object.keys(input.per_user_scores).length >= 2) {
    multiplayer_consensus = computeMultiplayerConsensus(input.per_user_scores);
  }

  const confidence: Confidence =
    avgCoverage >= methodology.confidence_thresholds.high_coverage_pct
      ? 'high'
      : avgCoverage >= methodology.confidence_thresholds.min_coverage_pct
        ? 'medium'
        : 'insufficient_data';

  return {
    value: top?.score ?? 0,
    confidence,
    components: {
      projects_ranked,
      top_project_id: top?.projectId ?? null,
      top_score: top?.score ?? 0,
      project_count: input.projects.length,
      dimension_coverage: coverage,
      multiplayer_consensus,
    },
  };
}

export function getLabelKey(score: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a08.insufficient';
  if (score >= 75) return 'ie.score.a08.top_claro';
  if (score >= 55) return 'ie.score.a08.competitivo';
  if (score >= 35) return 'ie.score.a08.mid';
  return 'ie.score.a08.rezagado';
}

export const a08ComparadorMultiDCalculator: Calculator = {
  scoreId: 'A08',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence = Array.isArray(params.projects) ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'prod path stub — invocar computeA08Comparador directo con projects[2..6]',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
      },
      confidence,
      citations: DIMENSIONS.map((d) => ({
        source: `compared:${d}`,
        period: input.periodDate,
      })),
      provenance: {
        sources: DIMENSIONS.map((d) => ({ name: `compared:${d}`, count: 0 })),
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { project_id: input.projectId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a08ComparadorMultiDCalculator;
