// DMX-DEV — Índice Salud Desarrolladora. Categoría dev, tier 3, country MX.
// Plan FASE 11 §DMX-DEV + Catálogo 03.8 §dmx-dev. Ranking de empresas
// desarrolladoras por salud institucional.
//
// Fórmula:
//   DEV = H05·0.30 + H06·0.20 + H07·0.15 + H15·0.15 + H08_inv·0.10 + H09·0.10
//
// Componentes:
//   - H05: Trust Developer Score (weighted mean histórico de proyectos).
//   - H06: On-time delivery histórico.
//   - H07: Construction quality histórico.
//   - H15: Due Diligence compliance score (último proyecto activo).
//   - H08_inv: 100 − H08 (legal claims inversa; menos demandas = mejor).
//   - H09: Financial solvency.
//
// Input resolution:
//   - Acepta `developerId` en params; o infiere desde `projectId` → proyectos.developer_id.
//   - Sin developerId resoluble → insufficient_data.
//
// Historial check:
//   - <3 proyectos completados → confidence='low' (sample size insuficiente).
//
// Upgrades FASE 11 XL: explainability, confidence granular, audit log, circuit
// breaker, shadow mode.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';
import {
  type AuditLogParams,
  buildConfidenceBreakdown,
  clamp100,
  detectCircuitBreaker,
  type IndexComponentDetail,
  type IndicesMeta,
  tryInsertAuditLog,
} from './shared';

export const version = '1.0.0';

export const DEFAULT_DEV_WEIGHTS: Readonly<Record<string, number>> = {
  H05: 0.3,
  H06: 0.2,
  H07: 0.15,
  H15: 0.15,
  H08_inv: 0.1,
  H09: 0.1,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['H05'] as const;

export const MIN_PROJECTS_FOR_HIGH_CONF = 3;

export const methodology = {
  formula:
    'DEV = H05·0.30 + H06·0.20 + H07·0.15 + H15·0.15 + (100−H08)·0.10 + H09·0.10. Renormaliza pesos presentes.',
  sources: [
    'developer_scores:H05',
    'developer_scores:H06',
    'developer_scores:H07',
    'developer_scores:H15',
    'developer_scores:H08',
    'developer_scores:H09',
    'proyectos',
  ],
  dependencies: [
    { score_id: 'H05', weight: 0.3, role: 'trust_developer', critical: true },
    { score_id: 'H06', weight: 0.2, role: 'on_time_delivery', critical: false },
    { score_id: 'H07', weight: 0.15, role: 'construction_quality', critical: false },
    { score_id: 'H15', weight: 0.15, role: 'due_diligence', critical: false },
    { score_id: 'H08_inv', weight: 0.1, role: 'legal_claims_inverse', critical: false },
    { score_id: 'H09', weight: 0.1, role: 'financial_solvency', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-DEV',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-dev-salud-desarrolladora',
    },
    {
      name: 'Plan FASE 11 §DMX-DEV',
      url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md#modulo-11b13-dmx-dev',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_coverage_pct: 50,
    high_coverage_pct: 85,
    min_projects_for_high: MIN_PROJECTS_FOR_HIGH_CONF,
  },
  circuit_breaker_pct: 20,
  sensitivity_analysis: [{ dimension_id: 'H05', impact_pct_per_10pct_change: 3.0 }],
} as const;

export const reasoning_template =
  'DEV {developer_id}: {score_value}/100 (banda={bucket}). {project_count} proyectos. Confianza {confidence}.';

export type DevBucket = 'excelente' | 'solida' | 'aceptable' | 'riesgo';

export interface DevComponents extends Record<string, unknown> {
  readonly H05: IndexComponentDetail | null;
  readonly H06: IndexComponentDetail | null;
  readonly H07: IndexComponentDetail | null;
  readonly H15: IndexComponentDetail | null;
  readonly H08_inv: IndexComponentDetail | null;
  readonly H09: IndexComponentDetail | null;
  readonly project_count: number;
  readonly coverage_pct: number;
  readonly bucket: DevBucket;
  readonly _meta: IndicesMeta;
}

export interface DevRawInput {
  readonly H05_value: number | null;
  readonly H06_value: number | null;
  readonly H07_value: number | null;
  readonly H15_value: number | null;
  readonly H08_value: number | null;
  readonly H09_value: number | null;
  readonly project_count: number;
  readonly universe_period: string;
  readonly data_freshness_days?: number;
  readonly previous_value?: number | null;
  readonly shadow_mode?: boolean;
}

export interface DevComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: DevComponents;
  readonly trend_vs_previous: number | null;
}

function bucketFor(value: number): DevBucket {
  if (value >= 80) return 'excelente';
  if (value >= 65) return 'solida';
  if (value >= 45) return 'aceptable';
  return 'riesgo';
}

export function computeDmxDev(input: DevRawInput): DevComputeResult {
  const has = {
    H05: input.H05_value !== null && Number.isFinite(input.H05_value),
    H06: input.H06_value !== null && Number.isFinite(input.H06_value),
    H07: input.H07_value !== null && Number.isFinite(input.H07_value),
    H15: input.H15_value !== null && Number.isFinite(input.H15_value),
    H08: input.H08_value !== null && Number.isFinite(input.H08_value),
    H09: input.H09_value !== null && Number.isFinite(input.H09_value),
  };

  const missing: string[] = [];
  if (!has.H05) missing.push('H05');
  if (!has.H06) missing.push('H06');
  if (!has.H07) missing.push('H07');
  if (!has.H15) missing.push('H15');
  if (!has.H08) missing.push('H08_inv');
  if (!has.H09) missing.push('H09');

  // Critical: H05 (Trust) missing → insufficient.
  if (!has.H05) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        H05: null,
        H06: null,
        H07: null,
        H15: null,
        H08_inv: null,
        H09: null,
        project_count: input.project_count,
        coverage_pct: 0,
        bucket: 'riesgo',
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            ...(input.data_freshness_days !== undefined
              ? { data_freshness_days: input.data_freshness_days }
              : {}),
            coverage_pct: 0,
            sample_size: input.project_count,
            methodology_maturity: 85,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          missing_components: missing,
          fallback_reason: 'h05_critical_missing',
        },
      },
      trend_vs_previous: null,
    };
  }

  const H08_inv_value = has.H08 ? clamp100(100 - (input.H08_value as number)) : null;

  const parts: Array<{
    key: keyof typeof DEFAULT_DEV_WEIGHTS;
    value: number | null;
    citation_source: string;
  }> = [
    { key: 'H05', value: input.H05_value, citation_source: 'developer_scores:H05' },
    { key: 'H06', value: input.H06_value, citation_source: 'developer_scores:H06' },
    { key: 'H07', value: input.H07_value, citation_source: 'developer_scores:H07' },
    { key: 'H15', value: input.H15_value, citation_source: 'developer_scores:H15' },
    { key: 'H08_inv', value: H08_inv_value, citation_source: 'developer_scores:H08' },
    { key: 'H09', value: input.H09_value, citation_source: 'developer_scores:H09' },
  ];

  let weighted = 0;
  let weightSum = 0;
  const details: Partial<Record<keyof typeof DEFAULT_DEV_WEIGHTS, IndexComponentDetail>> = {};
  for (const p of parts) {
    const w = DEFAULT_DEV_WEIGHTS[p.key] ?? 0;
    if (p.value === null || !Number.isFinite(p.value)) continue;
    details[p.key] = {
      value: Number(p.value.toFixed(2)),
      weight: w,
      citation_source: p.citation_source,
      citation_period: input.universe_period,
    };
    weighted += p.value * w;
    weightSum += w;
  }

  const available = parts.length - missing.length;
  const coverage_pct = Math.round((available / parts.length) * 100);
  const weighted_normalized = weightSum > 0 ? weighted / weightSum : 0;
  const value = Math.round(clamp100(weighted_normalized));

  const trend_vs_previous =
    input.previous_value !== undefined && input.previous_value !== null
      ? Number((value - input.previous_value).toFixed(2))
      : null;

  const circuit_breaker_triggered = detectCircuitBreaker(
    value,
    input.previous_value ?? null,
    methodology.circuit_breaker_pct,
  );

  // Confidence gating:
  //   - <3 proyectos → low (sample insuficiente).
  //   - coverage bajo min → low.
  //   - coverage >=high + >=3 proyectos → high.
  //   - else medium.
  let confidence: Confidence;
  if (input.project_count < MIN_PROJECTS_FOR_HIGH_CONF) {
    confidence = 'low';
  } else if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    confidence = 'low';
  } else if (
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct &&
    missing.length === 0
  ) {
    confidence = 'high';
  } else {
    confidence = 'medium';
  }

  return {
    value,
    confidence,
    components: {
      H05: details.H05 ?? null,
      H06: details.H06 ?? null,
      H07: details.H07 ?? null,
      H15: details.H15 ?? null,
      H08_inv: details.H08_inv ?? null,
      H09: details.H09 ?? null,
      project_count: input.project_count,
      coverage_pct,
      bucket: bucketFor(value),
      _meta: {
        confidence_breakdown: buildConfidenceBreakdown({
          ...(input.data_freshness_days !== undefined
            ? { data_freshness_days: input.data_freshness_days }
            : {}),
          coverage_pct,
          sample_size: input.project_count,
          methodology_maturity: 85,
        }),
        circuit_breaker_triggered,
        shadow: input.shadow_mode ?? false,
        weights_used: DEFAULT_DEV_WEIGHTS,
        missing_components: missing,
        redistributed_weights: missing.length > 0,
        ...(input.project_count < MIN_PROJECTS_FOR_HIGH_CONF
          ? { limitation: `historial_insuficiente:${input.project_count}_proyectos` }
          : {}),
      },
    },
    trend_vs_previous,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.index.dev.insufficient';
  if (value >= 80) return 'ie.index.dev.excelente';
  if (value >= 65) return 'ie.index.dev.solida';
  if (value >= 45) return 'ie.index.dev.aceptable';
  return 'ie.index.dev.riesgo';
}

function trendDirection(delta: number | null): 'mejorando' | 'estable' | 'empeorando' | undefined {
  if (delta === null) return undefined;
  if (delta > 1) return 'mejorando';
  if (delta < -1) return 'empeorando';
  return 'estable';
}

type LooseClient = SupabaseClient<Record<string, unknown>>;

interface DeveloperScoreRow {
  readonly score_type: string;
  readonly score_value: number | null;
  readonly computed_at: string | null;
}

async function resolveDeveloperId(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
  projectId: string | undefined,
): Promise<string | null> {
  const explicit = params.developerId;
  if (typeof explicit === 'string' && explicit.length > 0) return explicit;
  if (!projectId) return null;
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('proyectos' as never)
      .select('developer_id')
      .eq('id', projectId)
      .maybeSingle();
    const row = data as unknown as { developer_id: string | null } | null;
    return row?.developer_id ?? null;
  } catch {
    return null;
  }
}

async function fetchDeveloperScores(
  supabase: SupabaseClient,
  developerId: string,
  periodDate: string,
): Promise<{
  H05: number | null;
  H06: number | null;
  H07: number | null;
  H15: number | null;
  H08: number | null;
  H09: number | null;
  fetched: number;
  freshness_days: number | undefined;
}> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('developer_scores' as never)
      .select('score_type, score_value, computed_at')
      .eq('developer_id', developerId)
      .eq('period_date', periodDate)
      .in('score_type', ['H05', 'H06', 'H07', 'H15', 'H08', 'H09']);
    if (!data) {
      return {
        H05: null,
        H06: null,
        H07: null,
        H15: null,
        H08: null,
        H09: null,
        fetched: 0,
        freshness_days: undefined,
      };
    }
    const rows = data as unknown as readonly DeveloperScoreRow[];
    const result: Record<string, number | null> = {
      H05: null,
      H06: null,
      H07: null,
      H15: null,
      H08: null,
      H09: null,
    };
    let newestAt: string | null = null;
    for (const r of rows) {
      if (typeof r.score_value !== 'number' || !Number.isFinite(r.score_value)) continue;
      if (r.score_type in result) result[r.score_type] = r.score_value;
      if (r.computed_at && (newestAt === null || r.computed_at > newestAt)) {
        newestAt = r.computed_at;
      }
    }
    const freshness_days =
      newestAt !== null
        ? Math.max(
            0,
            Math.floor(
              (new Date(`${periodDate}T00:00:00Z`).getTime() - new Date(newestAt).getTime()) /
                86_400_000,
            ),
          )
        : undefined;
    return {
      H05: result.H05 ?? null,
      H06: result.H06 ?? null,
      H07: result.H07 ?? null,
      H15: result.H15 ?? null,
      H08: result.H08 ?? null,
      H09: result.H09 ?? null,
      fetched: rows.length,
      freshness_days,
    };
  } catch {
    return {
      H05: null,
      H06: null,
      H07: null,
      H15: null,
      H08: null,
      H09: null,
      fetched: 0,
      freshness_days: undefined,
    };
  }
}

async function fetchProjectCount(supabase: SupabaseClient, developerId: string): Promise<number> {
  try {
    const { count } = await (supabase as unknown as LooseClient)
      .from('proyectos' as never)
      .select('id', { count: 'exact', head: true })
      .eq('developer_id', developerId);
    return typeof count === 'number' ? count : 0;
  } catch {
    return 0;
  }
}

async function fetchPreviousSnapshotForDeveloper(
  supabase: SupabaseClient,
  developerId: string,
  beforePeriodDate: string,
): Promise<number | null> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('score_history' as never)
      .select('score_value, period_date')
      .eq('entity_type', 'developer')
      .eq('entity_id', developerId)
      .eq('score_type', 'DMX-DEV')
      .lt('period_date', beforePeriodDate)
      .order('period_date', { ascending: false })
      .limit(1);
    if (!data) return null;
    const rows = data as unknown as Array<{ score_value: number | null }>;
    const row = rows[0];
    if (!row || typeof row.score_value !== 'number' || !Number.isFinite(row.score_value)) {
      return null;
    }
    return row.score_value;
  } catch {
    return null;
  }
}

export const dmxDevCalculator: Calculator = {
  scoreId: 'DMX-DEV',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const shadow_mode = params.shadow_mode === true;
    const audit_log = params.audit_log === true;

    const developerId = await resolveDeveloperId(supabase, params, input.projectId);
    if (!developerId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: {
          reason: 'DMX-DEV requiere developerId en params o projectId con developer_id resoluble.',
        },
        inputs_used: {
          periodDate: input.periodDate,
          projectId: input.projectId ?? null,
          developerId: null,
        },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'proyectos', count: 0 }],
          computed_at: computed_at.toISOString(),
          calculator_version: version,
        },
        valid_until: computeValidUntil(computed_at, methodology.validity),
      };
    }

    const [scores, project_count, previous_value] = await Promise.all([
      fetchDeveloperScores(supabase, developerId, input.periodDate),
      fetchProjectCount(supabase, developerId),
      fetchPreviousSnapshotForDeveloper(supabase, developerId, input.periodDate),
    ]);

    const rawInput: DevRawInput = {
      H05_value: scores.H05,
      H06_value: scores.H06,
      H07_value: scores.H07,
      H15_value: scores.H15,
      H08_value: scores.H08,
      H09_value: scores.H09,
      project_count,
      universe_period: input.periodDate,
      ...(scores.freshness_days !== undefined
        ? { data_freshness_days: scores.freshness_days }
        : {}),
      ...(previous_value !== null ? { previous_value } : {}),
      shadow_mode,
    };

    const result = computeDmxDev(rawInput);

    if (audit_log) {
      const auditParams: AuditLogParams = {
        score_id: 'DMX-DEV',
        entity_type: 'zone',
        entity_id: developerId,
        country_code: input.countryCode,
        period_date: input.periodDate,
        score_value: result.value,
        confidence: result.confidence,
        computed_at: computed_at.toISOString(),
        calculator_version: version,
        inputs_hash: `dev:${developerId}|n:${project_count}|h05:${scores.H05}`,
      };
      await tryInsertAuditLog(supabase, auditParams);
    }

    const dir = trendDirection(result.trend_vs_previous);

    return {
      score_value: result.value,
      score_label: getLabelKey(result.value, result.confidence),
      components: result.components,
      inputs_used: {
        periodDate: input.periodDate,
        developerId,
        projectId: input.projectId ?? null,
        project_count,
        shadow_mode,
      },
      confidence: result.confidence,
      citations: [
        { source: 'developer_scores:H05', period: input.periodDate },
        { source: 'developer_scores:H06', period: input.periodDate },
        { source: 'developer_scores:H07', period: input.periodDate },
        { source: 'developer_scores:H15', period: input.periodDate },
        { source: 'developer_scores:H08', period: input.periodDate },
        { source: 'developer_scores:H09', period: input.periodDate },
        { source: 'proyectos', count: project_count },
      ],
      ...(result.trend_vs_previous !== null ? { trend_vs_previous: result.trend_vs_previous } : {}),
      ...(dir !== undefined ? { trend_direction: dir } : {}),
      provenance: {
        sources: [
          {
            name: 'developer_scores',
            period: input.periodDate,
            count: scores.fetched,
          },
          { name: 'proyectos', count: project_count },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        developer_id: developerId,
        bucket: result.components.bucket,
        project_count,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default dmxDevCalculator;
