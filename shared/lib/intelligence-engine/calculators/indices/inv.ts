// DMX-INV — Índice Proyecto Inversión Institucional. Categoría proyecto, tier 3,
// country MX. Plan FASE 11 §DMX-INV + Catálogo 03.8 §dmx-inv.
//
// Fórmula:
//   INV = ICO·0.25 + MOM·0.20 + F09·0.20 + A12·0.15 + H05·0.10 + B08_inv·0.10
//
// Componentes:
//   - ICO: DMX-ICO índice costo oportunidad (zone_scores:DMX-ICO) — nested.
//   - MOM: DMX-MOM índice momentum (zone_scores:DMX-MOM) — nested.
//   - F09: Value Score (zone_scores:F09).
//   - A12: Price Fairness (project_scores:A12 o zone_scores:A12).
//   - H05: Trust Developer (project_scores:H05).
//   - B08_inv: 100 − B08 (absorción rápida = inversión atractiva).
//
// Missing data:
//   - ICO o MOM sin data en periodDate → buscar último ≤30d. Si no hay → insufficient.
//   - Soportes (F09/A12/H05/B08) missing → weights renormalize + confidence degrade.
//
// Score bands (producto institucional requiere categórico):
//   - ≥80: Excelente
//   - 65-79: Bueno
//   - 45-64: Regular
//   - <45: Bajo
//
// Upgrades FASE 11 XL:
//   - Explainability, confidence granular, audit log, circuit breaker, shadow mode.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';
import {
  type AuditLogParams,
  buildConfidenceBreakdown,
  clamp100,
  detectCircuitBreaker,
  fetchPreviousSnapshot,
  type IndexComponentDetail,
  type IndicesMeta,
  tryInsertAuditLog,
} from './shared';

export const version = '1.0.0';

export const DEFAULT_INV_WEIGHTS: Readonly<Record<string, number>> = {
  ICO: 0.25,
  MOM: 0.2,
  F09: 0.2,
  A12: 0.15,
  H05: 0.1,
  B08_inv: 0.1,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['ICO', 'MOM'] as const;

export const FALLBACK_LOOKBACK_DAYS = 30;

export const methodology = {
  formula:
    'INV = ICO·0.25 + MOM·0.20 + F09·0.20 + A12·0.15 + H05·0.10 + (100−B08)·0.10. Renormaliza pesos presentes.',
  sources: [
    'zone_scores:DMX-ICO',
    'zone_scores:DMX-MOM',
    'zone_scores:F09',
    'project_scores:A12',
    'project_scores:H05',
    'project_scores:B08',
  ],
  dependencies: [
    { score_id: 'ICO', weight: 0.25, role: 'costo_oportunidad', critical: true },
    { score_id: 'MOM', weight: 0.2, role: 'momentum', critical: true },
    { score_id: 'F09', weight: 0.2, role: 'value_score', critical: false },
    { score_id: 'A12', weight: 0.15, role: 'price_fairness', critical: false },
    { score_id: 'H05', weight: 0.1, role: 'trust_developer', critical: false },
    { score_id: 'B08_inv', weight: 0.1, role: 'absorption_inverse', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-INV',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-inv-proyecto-inversion',
    },
    {
      name: 'Plan FASE 11 §DMX-INV',
      url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md#modulo-11b12-dmx-inv',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 85 },
  circuit_breaker_pct: 20,
  score_bands: {
    excelente_min: 80,
    bueno_min: 65,
    regular_min: 45,
  },
  sensitivity_analysis: [
    { dimension_id: 'ICO', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'MOM', impact_pct_per_10pct_change: 2.0 },
  ],
} as const;

export const reasoning_template =
  'INV Proyecto {project_id}: {score_value}/100 (banda={score_band}). ICO={ICO}, MOM={MOM}. Confianza {confidence}.';

export type InvBand = 'Excelente' | 'Bueno' | 'Regular' | 'Bajo';

export interface InvComponents extends Record<string, unknown> {
  readonly ICO: IndexComponentDetail | null;
  readonly MOM: IndexComponentDetail | null;
  readonly F09: IndexComponentDetail | null;
  readonly A12: IndexComponentDetail | null;
  readonly H05: IndexComponentDetail | null;
  readonly B08_inv: IndexComponentDetail | null;
  readonly coverage_pct: number;
  readonly score_band: InvBand;
  readonly _meta: IndicesMeta;
}

export interface InvRawInput {
  readonly ICO_value: number | null;
  readonly MOM_value: number | null;
  readonly F09_value: number | null;
  readonly A12_value: number | null;
  readonly H05_value: number | null;
  readonly B08_value: number | null;
  readonly universe_period: string;
  readonly data_freshness_days?: number;
  readonly previous_value?: number | null;
  readonly shadow_mode?: boolean;
  readonly nested_lookup_fallback?: boolean;
}

export interface InvComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: InvComponents;
  readonly trend_vs_previous: number | null;
}

export function scoreBandFor(value: number): InvBand {
  if (value >= methodology.score_bands.excelente_min) return 'Excelente';
  if (value >= methodology.score_bands.bueno_min) return 'Bueno';
  if (value >= methodology.score_bands.regular_min) return 'Regular';
  return 'Bajo';
}

export function computeDmxInv(input: InvRawInput): InvComputeResult {
  const has = {
    ICO: input.ICO_value !== null && Number.isFinite(input.ICO_value),
    MOM: input.MOM_value !== null && Number.isFinite(input.MOM_value),
    F09: input.F09_value !== null && Number.isFinite(input.F09_value),
    A12: input.A12_value !== null && Number.isFinite(input.A12_value),
    H05: input.H05_value !== null && Number.isFinite(input.H05_value),
    B08: input.B08_value !== null && Number.isFinite(input.B08_value),
  };

  const missing: string[] = [];
  if (!has.ICO) missing.push('ICO');
  if (!has.MOM) missing.push('MOM');
  if (!has.F09) missing.push('F09');
  if (!has.A12) missing.push('A12');
  if (!has.H05) missing.push('H05');
  if (!has.B08) missing.push('B08_inv');

  // Critical check: nested ICO o MOM missing → insufficient_data.
  if (!has.ICO || !has.MOM) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        ICO: null,
        MOM: null,
        F09: null,
        A12: null,
        H05: null,
        B08_inv: null,
        coverage_pct: 0,
        score_band: 'Bajo',
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            ...(input.data_freshness_days !== undefined
              ? { data_freshness_days: input.data_freshness_days }
              : {}),
            coverage_pct: 0,
            sample_size: 0,
            methodology_maturity: 85,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          missing_components: missing,
          fallback_reason: 'nested_critical_missing',
        },
      },
      trend_vs_previous: null,
    };
  }

  const b08Inv = has.B08 ? clamp100(100 - (input.B08_value as number)) : null;

  const parts: Array<{
    key: keyof typeof DEFAULT_INV_WEIGHTS;
    value: number | null;
    citation_source: string;
  }> = [
    { key: 'ICO', value: input.ICO_value, citation_source: 'zone_scores:DMX-ICO' },
    { key: 'MOM', value: input.MOM_value, citation_source: 'zone_scores:DMX-MOM' },
    { key: 'F09', value: input.F09_value, citation_source: 'zone_scores:F09' },
    { key: 'A12', value: input.A12_value, citation_source: 'project_scores:A12' },
    { key: 'H05', value: input.H05_value, citation_source: 'project_scores:H05' },
    { key: 'B08_inv', value: b08Inv, citation_source: 'project_scores:B08' },
  ];

  let weighted = 0;
  let weightSum = 0;
  const details: Partial<Record<keyof typeof DEFAULT_INV_WEIGHTS, IndexComponentDetail>> = {};
  for (const p of parts) {
    const w = DEFAULT_INV_WEIGHTS[p.key] ?? 0;
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

  const confidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct &&
    !input.nested_lookup_fallback
      ? 'high'
      : coverage_pct >= methodology.confidence_thresholds.min_coverage_pct
        ? 'medium'
        : 'low';

  return {
    value,
    confidence,
    components: {
      ICO: details.ICO ?? null,
      MOM: details.MOM ?? null,
      F09: details.F09 ?? null,
      A12: details.A12 ?? null,
      H05: details.H05 ?? null,
      B08_inv: details.B08_inv ?? null,
      coverage_pct,
      score_band: scoreBandFor(value),
      _meta: {
        confidence_breakdown: buildConfidenceBreakdown({
          ...(input.data_freshness_days !== undefined
            ? { data_freshness_days: input.data_freshness_days }
            : {}),
          coverage_pct,
          sample_size: available,
          methodology_maturity: 85,
        }),
        circuit_breaker_triggered,
        shadow: input.shadow_mode ?? false,
        weights_used: DEFAULT_INV_WEIGHTS,
        missing_components: missing,
        redistributed_weights: missing.length > 0,
        ...(input.nested_lookup_fallback ? { fallback_reason: 'nested_lookup_fallback_30d' } : {}),
      },
    },
    trend_vs_previous,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.index.inv.insufficient';
  if (value >= methodology.score_bands.excelente_min) return 'ie.index.inv.excelente';
  if (value >= methodology.score_bands.bueno_min) return 'ie.index.inv.bueno';
  if (value >= methodology.score_bands.regular_min) return 'ie.index.inv.regular';
  return 'ie.index.inv.bajo';
}

function trendDirection(delta: number | null): 'mejorando' | 'estable' | 'empeorando' | undefined {
  if (delta === null) return undefined;
  if (delta > 1) return 'mejorando';
  if (delta < -1) return 'empeorando';
  return 'estable';
}

type LooseClient = SupabaseClient<Record<string, unknown>>;

interface ZoneScoreRow {
  readonly score_type: string;
  readonly score_value: number | null;
  readonly period_date: string;
  readonly computed_at: string | null;
}

interface ProjectScoreRow {
  readonly score_type: string;
  readonly score_value: number | null;
  readonly period_date: string;
}

interface ProjectRow {
  readonly zone_id: string | null;
  readonly developer_id: string | null;
}

async function fetchProject(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ProjectRow | null> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('proyectos' as never)
      .select('zone_id, developer_id')
      .eq('id', projectId)
      .maybeSingle();
    return (data as unknown as ProjectRow | null) ?? null;
  } catch {
    return null;
  }
}

async function fetchZoneIndex(
  supabase: SupabaseClient,
  zoneId: string,
  scoreType: string,
  periodDate: string,
  lookbackDays: number,
): Promise<{ value: number | null; fallback: boolean; period: string | null }> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_value, period_date, computed_at')
      .eq('zone_id', zoneId)
      .eq('score_type', scoreType)
      .lte('period_date', periodDate)
      .order('period_date', { ascending: false })
      .limit(1);
    if (!data) return { value: null, fallback: false, period: null };
    const rows = data as unknown as readonly ZoneScoreRow[];
    const row = rows[0];
    if (!row || typeof row.score_value !== 'number' || !Number.isFinite(row.score_value)) {
      return { value: null, fallback: false, period: null };
    }
    const lookbackMs = lookbackDays * 86_400_000;
    const fallback =
      new Date(`${periodDate}T00:00:00Z`).getTime() -
        new Date(`${row.period_date}T00:00:00Z`).getTime() >
      0;
    const tooOld =
      new Date(`${periodDate}T00:00:00Z`).getTime() -
        new Date(`${row.period_date}T00:00:00Z`).getTime() >
      lookbackMs;
    if (tooOld) return { value: null, fallback: true, period: row.period_date };
    return { value: row.score_value, fallback, period: row.period_date };
  } catch {
    return { value: null, fallback: false, period: null };
  }
}

async function fetchProjectScores(
  supabase: SupabaseClient,
  projectId: string,
  periodDate: string,
): Promise<{ A12: number | null; H05: number | null; B08: number | null; fetched: number }> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('project_scores' as never)
      .select('score_type, score_value, period_date')
      .eq('project_id', projectId)
      .eq('period_date', periodDate)
      .in('score_type', ['A12', 'H05', 'B08']);
    if (!data) return { A12: null, H05: null, B08: null, fetched: 0 };
    const rows = data as unknown as readonly ProjectScoreRow[];
    let A12: number | null = null;
    let H05: number | null = null;
    let B08: number | null = null;
    for (const r of rows) {
      if (typeof r.score_value !== 'number' || !Number.isFinite(r.score_value)) continue;
      if (r.score_type === 'A12') A12 = r.score_value;
      if (r.score_type === 'H05') H05 = r.score_value;
      if (r.score_type === 'B08') B08 = r.score_value;
    }
    return { A12, H05, B08, fetched: rows.length };
  } catch {
    return { A12: null, H05: null, B08: null, fetched: 0 };
  }
}

async function fetchZoneF09(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<number | null> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_value')
      .eq('zone_id', zoneId)
      .eq('score_type', 'F09')
      .eq('period_date', periodDate)
      .limit(1);
    if (!data) return null;
    const rows = data as unknown as Array<{ score_value: number | null }>;
    const first = rows[0];
    return first && typeof first.score_value === 'number' ? first.score_value : null;
  } catch {
    return null;
  }
}

export const dmxInvCalculator: Calculator = {
  scoreId: 'DMX-INV',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const shadow_mode = params.shadow_mode === true;
    const audit_log = params.audit_log === true;

    if (!input.projectId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: { reason: 'DMX-INV requiere projectId.' },
        inputs_used: { periodDate: input.periodDate, projectId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'project_scores', count: 0 }],
          computed_at: computed_at.toISOString(),
          calculator_version: version,
        },
        valid_until: computeValidUntil(computed_at, methodology.validity),
      };
    }

    const proj = await fetchProject(supabase, input.projectId);
    const zoneId = proj?.zone_id ?? (typeof params.zoneId === 'string' ? params.zoneId : null);

    let icoResult = {
      value: null as number | null,
      fallback: false,
      period: null as string | null,
    };
    let momResult = {
      value: null as number | null,
      fallback: false,
      period: null as string | null,
    };
    let f09: number | null = null;
    if (zoneId) {
      [icoResult, momResult, f09] = await Promise.all([
        fetchZoneIndex(supabase, zoneId, 'DMX-ICO', input.periodDate, FALLBACK_LOOKBACK_DAYS),
        fetchZoneIndex(supabase, zoneId, 'DMX-MOM', input.periodDate, FALLBACK_LOOKBACK_DAYS),
        fetchZoneF09(supabase, zoneId, input.periodDate),
      ]);
    }

    const projectScores = await fetchProjectScores(supabase, input.projectId, input.periodDate);

    const previous_value = await fetchPreviousSnapshot(
      supabase,
      'project',
      input.projectId,
      'DMX-INV',
      input.periodDate,
    );

    const nested_lookup_fallback = icoResult.fallback || momResult.fallback;

    const rawInput: InvRawInput = {
      ICO_value: icoResult.value,
      MOM_value: momResult.value,
      F09_value: f09,
      A12_value: projectScores.A12,
      H05_value: projectScores.H05,
      B08_value: projectScores.B08,
      universe_period: input.periodDate,
      ...(previous_value !== null ? { previous_value } : {}),
      shadow_mode,
      nested_lookup_fallback,
    };

    const result = computeDmxInv(rawInput);

    if (audit_log) {
      const auditParams: AuditLogParams = {
        score_id: 'DMX-INV',
        entity_type: 'project',
        entity_id: input.projectId,
        country_code: input.countryCode,
        period_date: input.periodDate,
        score_value: result.value,
        confidence: result.confidence,
        computed_at: computed_at.toISOString(),
        calculator_version: version,
        inputs_hash: `ico:${icoResult.value}|mom:${momResult.value}|f09:${f09}|a12:${projectScores.A12}|h05:${projectScores.H05}|b08:${projectScores.B08}`,
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
        projectId: input.projectId,
        zone_id_resolved: zoneId,
        ico_fallback: icoResult.fallback,
        mom_fallback: momResult.fallback,
        shadow_mode,
      },
      confidence: result.confidence,
      citations: [
        { source: 'zone_scores:DMX-ICO', period: input.periodDate },
        { source: 'zone_scores:DMX-MOM', period: input.periodDate },
        { source: 'zone_scores:F09', period: input.periodDate },
        { source: 'project_scores:A12', period: input.periodDate },
        { source: 'project_scores:H05', period: input.periodDate },
        { source: 'project_scores:B08', period: input.periodDate },
      ],
      ...(result.trend_vs_previous !== null ? { trend_vs_previous: result.trend_vs_previous } : {}),
      ...(dir !== undefined ? { trend_direction: dir } : {}),
      provenance: {
        sources: [
          { name: 'zone_scores', period: input.periodDate, count: zoneId ? 3 : 0 },
          {
            name: 'project_scores',
            period: input.periodDate,
            count: projectScores.fetched,
          },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        project_id: input.projectId,
        score_band: result.components.score_band,
        ICO: String(icoResult.value ?? 'n/a'),
        MOM: String(momResult.value ?? 'n/a'),
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default dmxInvCalculator;
