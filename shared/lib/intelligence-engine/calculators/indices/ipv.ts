// DMX-IPV — Índice Precio-Valor (Plusvalía). Categoría zona, tier 3, country MX.
// Plan FASE 11 §DMX-IPV + Catálogo 03.8 §dmx-ipv. Registry entry ver
// shared/lib/intelligence-engine/registry.ts L1489-1501.
//
// Fórmula:
//   IPV = F08·0.30 + F09·0.25 + N11·0.20 + A12·0.15 + N01·0.10
// Mayor IPV = mayor potencial plusvalía. Renormaliza pesos cuando faltan
// componentes (core logic reutilizable por D02 ranking y DMX composites).
//
// Upgrades FASE 11 XL:
//   - Explainability-ready: cada component con {value, weight, citation}
//   - Confidence granular 0-100 (subcomponents) además del enum
//   - Audit log hook opcional (dmx_indices_audit_log)
//   - Circuit breaker: flag si |value - prev| > 20%
//   - Shadow mode aware: aceptar input.params.shadow_mode=true

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const DEFAULT_IPV_WEIGHTS: Readonly<Record<string, number>> = {
  F08: 0.3,
  F09: 0.25,
  N11: 0.2,
  A12: 0.15,
  N01: 0.1,
} as const;

export const IPV_COMPONENT_KEYS: readonly string[] = ['F08', 'F09', 'N11', 'A12', 'N01'] as const;

export const methodology = {
  formula:
    'IPV = F08·0.30 + F09·0.25 + N11·0.20 + A12·0.15 + N01·0.10. Renormaliza pesos presentes.',
  sources: [
    'zone_scores:F08',
    'zone_scores:F09',
    'zone_scores:N11',
    'zone_scores:A12',
    'zone_scores:N01',
  ],
  dependencies: [
    { score_id: 'F08', weight: 0.3, role: 'zone_lqi', critical: true },
    { score_id: 'F09', weight: 0.25, role: 'value_score', critical: true },
    { score_id: 'N11', weight: 0.2, role: 'dmx_momentum', critical: false },
    { score_id: 'A12', weight: 0.15, role: 'price_fairness', critical: false },
    { score_id: 'N01', weight: 0.1, role: 'demografia', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-IPV',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-ipv-indice-precio-valor',
    },
    { name: 'Plan FASE 11 §DMX-IPV', url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md' },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 85 },
  fallback_lookback_days: 90,
  circuit_breaker_pct: 20,
} as const;

export const reasoning_template =
  'DMX-IPV {zone_id}: {score_value}/100. Cobertura {coverage_pct}%. Confianza {confidence}.';

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export type IpvLabel =
  | 'ie.index.dmx_ipv.excelente'
  | 'ie.index.dmx_ipv.bueno'
  | 'ie.index.dmx_ipv.regular'
  | 'ie.index.dmx_ipv.pobre'
  | 'ie.index.dmx_ipv.insufficient';

export function getLabelKey(value: number, confidence: Confidence): IpvLabel {
  if (confidence === 'insufficient_data') return 'ie.index.dmx_ipv.insufficient';
  if (value >= 85) return 'ie.index.dmx_ipv.excelente';
  if (value >= 70) return 'ie.index.dmx_ipv.bueno';
  if (value >= 50) return 'ie.index.dmx_ipv.regular';
  return 'ie.index.dmx_ipv.pobre';
}

export interface IpvComponentEntry {
  readonly value: number;
  readonly weight: number;
  readonly citation_source: string;
  readonly citation_period: string;
}

export interface IpvConfidenceBreakdown {
  readonly data_freshness: number; // 0..30
  readonly data_completeness: number; // 0..30
  readonly sample_size: number; // 0..20
  readonly methodology_maturity: number; // 0..20
  readonly total: number; // 0..100
}

export interface IpvComponents extends Record<string, unknown> {
  readonly F08: IpvComponentEntry | null;
  readonly F09: IpvComponentEntry | null;
  readonly N11: IpvComponentEntry | null;
  readonly A12: IpvComponentEntry | null;
  readonly N01: IpvComponentEntry | null;
  readonly weights_used: Readonly<Record<string, number>>;
  readonly missing_components: readonly string[];
  readonly coverage_pct: number;
  readonly _meta: {
    readonly confidence_breakdown: IpvConfidenceBreakdown;
    readonly circuit_breaker_triggered: boolean;
    readonly shadow: boolean;
    readonly previous_value: number | null;
  };
}

export interface IpvRawInput {
  readonly scores: Readonly<Record<string, number | null>>;
  readonly weights_override?: Readonly<Record<string, number>>;
  readonly previous_value?: number | null;
  readonly period_date: string;
  readonly sample_size?: number;
  readonly data_staleness_days?: number; // freshness proxy: max age across components
}

export interface IpvComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: IpvComponents;
}

function computeConfidenceBreakdown(params: {
  readonly availableRatio: number; // 0..1 cobertura
  readonly sample_size: number;
  readonly staleness_days: number;
}): IpvConfidenceBreakdown {
  const completeness = Math.round(Math.max(0, Math.min(1, params.availableRatio)) * 30);
  // Freshness: 0 días → 30. >90 días → 0. Lineal.
  const stalenessClamped = Math.max(0, Math.min(90, params.staleness_days));
  const freshness = Math.round(((90 - stalenessClamped) / 90) * 30);
  // Sample size: ≥50 proyectos zona → 20. 0 → 0.
  const sampleClamped = Math.max(0, Math.min(50, params.sample_size));
  const sampleScore = Math.round((sampleClamped / 50) * 20);
  // Methodology maturity: IPV v1.0 documentado + ADR → 20.
  const maturity = 20;
  const total = freshness + completeness + sampleScore + maturity;
  return {
    data_freshness: freshness,
    data_completeness: completeness,
    sample_size: sampleScore,
    methodology_maturity: maturity,
    total: Math.max(0, Math.min(100, total)),
  };
}

function confidenceFromBreakdown(total: number, coverage_pct: number): Confidence {
  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) return 'insufficient_data';
  if (total >= 75) return 'high';
  if (total >= 50) return 'medium';
  return 'low';
}

export function computeIpv(input: IpvRawInput): IpvComputeResult {
  const weights = { ...DEFAULT_IPV_WEIGHTS, ...(input.weights_override ?? {}) };
  const missing: string[] = [];
  const availableWeights: Record<string, number> = {};
  let sumAvailable = 0;

  for (const key of IPV_COMPONENT_KEYS) {
    const raw = input.scores[key];
    const w = weights[key] ?? 0;
    if (!isFiniteNumber(raw)) {
      missing.push(key);
      continue;
    }
    availableWeights[key] = w;
    sumAvailable += w;
  }

  const available = IPV_COMPONENT_KEYS.length - missing.length;
  const coverage_pct = Math.round((available / IPV_COMPONENT_KEYS.length) * 100);
  const availableRatio = available / IPV_COMPONENT_KEYS.length;

  const breakdown = computeConfidenceBreakdown({
    availableRatio,
    sample_size: input.sample_size ?? 0,
    staleness_days: input.data_staleness_days ?? 0,
  });

  const buildEmptyEntry = (): null => null;

  const buildEntry = (key: string): IpvComponentEntry | null => {
    const raw = input.scores[key];
    if (!isFiniteNumber(raw)) return buildEmptyEntry();
    const w = availableWeights[key] ?? 0;
    return {
      value: raw,
      weight: sumAvailable > 0 ? Number((w / sumAvailable).toFixed(6)) : 0,
      citation_source: `zone_scores:${key}`,
      citation_period: input.period_date,
    };
  };

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        F08: buildEntry('F08'),
        F09: buildEntry('F09'),
        N11: buildEntry('N11'),
        A12: buildEntry('A12'),
        N01: buildEntry('N01'),
        weights_used: {},
        missing_components: missing,
        coverage_pct,
        _meta: {
          confidence_breakdown: breakdown,
          circuit_breaker_triggered: false,
          shadow: false,
          previous_value: input.previous_value ?? null,
        },
      },
    };
  }

  // Re-normalizar + weighted sum.
  let weighted_sum = 0;
  const weights_used: Record<string, number> = {};
  for (const key of IPV_COMPONENT_KEYS) {
    const raw = input.scores[key];
    if (!isFiniteNumber(raw)) continue;
    const w = availableWeights[key] ?? 0;
    const normalized = sumAvailable > 0 ? w / sumAvailable : 0;
    weights_used[key] = Number(normalized.toFixed(6));
    weighted_sum += raw * normalized;
  }

  const value = Math.round(clamp100(weighted_sum));
  const confidence = confidenceFromBreakdown(breakdown.total, coverage_pct);

  // Circuit breaker: flag si delta > 20% vs previous_value.
  let circuit_breaker_triggered = false;
  const prev = input.previous_value;
  if (isFiniteNumber(prev) && prev > 0) {
    const deltaPct = (Math.abs(value - prev) / prev) * 100;
    circuit_breaker_triggered = deltaPct > methodology.circuit_breaker_pct;
  }

  return {
    value,
    confidence,
    components: {
      F08: buildEntry('F08'),
      F09: buildEntry('F09'),
      N11: buildEntry('N11'),
      A12: buildEntry('A12'),
      N01: buildEntry('N01'),
      weights_used,
      missing_components: missing,
      coverage_pct,
      _meta: {
        confidence_breakdown: breakdown,
        circuit_breaker_triggered,
        shadow: false,
        previous_value: input.previous_value ?? null,
      },
    },
  };
}

// ---- Supabase helpers (prod run path) ----

type LooseClient = SupabaseClient<Record<string, unknown>>;
function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

async function fetchZoneScore(
  supabase: SupabaseClient,
  zoneId: string,
  countryCode: string,
  scoreType: string,
  periodDate: string,
): Promise<{ value: number | null; period_used: string | null; days_old: number }> {
  // Exact period first.
  const exact = await castFrom(supabase, 'zone_scores')
    .select('score_value, period_date')
    .eq('zone_id', zoneId)
    .eq('country_code', countryCode)
    .eq('score_type', scoreType)
    .eq('period_date', periodDate)
    .limit(1);

  if (!exact.error && exact.data) {
    const rows = exact.data as unknown as Array<{ score_value: number; period_date: string }>;
    const first = rows[0];
    if (first && isFiniteNumber(first.score_value)) {
      return { value: first.score_value, period_used: first.period_date, days_old: 0 };
    }
  }

  // Fallback: buscar último ≤ fallback_lookback_days.
  const anchor = new Date(`${periodDate}T00:00:00Z`);
  const lookback = new Date(anchor.getTime());
  lookback.setUTCDate(lookback.getUTCDate() - methodology.fallback_lookback_days);
  const fromISO = lookback.toISOString().slice(0, 10);

  const fallback = await castFrom(supabase, 'zone_scores')
    .select('score_value, period_date')
    .eq('zone_id', zoneId)
    .eq('country_code', countryCode)
    .eq('score_type', scoreType)
    .gte('period_date', fromISO)
    .lte('period_date', periodDate)
    .order('period_date', { ascending: false })
    .limit(1);

  if (!fallback.error && fallback.data) {
    const rows = fallback.data as unknown as Array<{ score_value: number; period_date: string }>;
    const first = rows[0];
    if (first && isFiniteNumber(first.score_value)) {
      const dt = new Date(`${first.period_date}T00:00:00Z`);
      const days = Math.round((anchor.getTime() - dt.getTime()) / 86_400_000);
      return { value: first.score_value, period_used: first.period_date, days_old: days };
    }
  }

  return { value: null, period_used: null, days_old: methodology.fallback_lookback_days };
}

async function fetchPreviousIpv(
  supabase: SupabaseClient,
  zoneId: string,
  countryCode: string,
  periodDate: string,
): Promise<number | null> {
  try {
    const { data, error } = await castFrom(supabase, 'dmx_indices')
      .select('value, period_date')
      .eq('zone_id', zoneId)
      .eq('country_code', countryCode)
      .eq('index_code', 'DMX-IPV')
      .lt('period_date', periodDate)
      .order('period_date', { ascending: false })
      .limit(1);
    if (error || !data) return null;
    const rows = data as unknown as Array<{ value: number }>;
    const first = rows[0];
    if (!first || !isFiniteNumber(first.value)) return null;
    return first.value;
  } catch {
    return null;
  }
}

async function writeAuditLog(
  supabase: SupabaseClient,
  params: {
    readonly index_code: string;
    readonly zone_id: string | null;
    readonly country_code: string;
    readonly period_date: string;
    readonly value: number;
    readonly confidence: Confidence;
    readonly shadow: boolean;
    readonly circuit_breaker_triggered: boolean;
    readonly components: Readonly<Record<string, unknown>>;
  },
): Promise<void> {
  try {
    await castFrom(supabase, 'dmx_indices_audit_log').insert({
      index_code: params.index_code,
      zone_id: params.zone_id,
      country_code: params.country_code,
      period_date: params.period_date,
      value: params.value,
      confidence: params.confidence,
      shadow: params.shadow,
      circuit_breaker_triggered: params.circuit_breaker_triggered,
      components: params.components,
      computed_at: new Date().toISOString(),
    } as never);
  } catch {
    // best-effort — audit log failure no debe tumbar cálculo.
  }
}

export const ipvCalculator: Calculator = {
  scoreId: 'DMX-IPV',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    if (!input.zoneId) throw new Error('DMX-IPV requires zoneId');
    const computed_at = new Date();
    const shadow_mode = input.params?.shadow_mode === true;
    const audit_log = input.params?.audit_log === true;

    // Fetch 5 components + previous value en paralelo.
    const [f08, f09, n11, a12, n01, previous_value] = await Promise.all([
      fetchZoneScore(supabase, input.zoneId, input.countryCode, 'F08', input.periodDate),
      fetchZoneScore(supabase, input.zoneId, input.countryCode, 'F09', input.periodDate),
      fetchZoneScore(supabase, input.zoneId, input.countryCode, 'N11', input.periodDate),
      fetchZoneScore(supabase, input.zoneId, input.countryCode, 'A12', input.periodDate),
      fetchZoneScore(supabase, input.zoneId, input.countryCode, 'N01', input.periodDate),
      fetchPreviousIpv(supabase, input.zoneId, input.countryCode, input.periodDate),
    ]);

    const scores: Record<string, number | null> = {
      F08: f08.value,
      F09: f09.value,
      N11: n11.value,
      A12: a12.value,
      N01: n01.value,
    };

    const maxStaleness = Math.max(
      f08.days_old,
      f09.days_old,
      n11.days_old,
      a12.days_old,
      n01.days_old,
    );
    const components_present = [f08, f09, n11, a12, n01].filter((x) => x.value !== null).length;

    const result = computeIpv({
      scores,
      period_date: input.periodDate,
      previous_value,
      sample_size: components_present * 10, // proxy simple en ausencia de #proyectos zona
      data_staleness_days: maxStaleness,
    });

    // Shadow mode aware
    const components_with_shadow: IpvComponents = {
      ...result.components,
      _meta: {
        ...result.components._meta,
        shadow: shadow_mode,
      },
    };

    // Audit log opcional
    if (audit_log) {
      await writeAuditLog(supabase, {
        index_code: 'DMX-IPV',
        zone_id: input.zoneId,
        country_code: input.countryCode,
        period_date: input.periodDate,
        value: result.value,
        confidence: result.confidence,
        shadow: shadow_mode,
        circuit_breaker_triggered: result.components._meta.circuit_breaker_triggered,
        components: components_with_shadow,
      });
    }

    const trend_vs_previous = isFiniteNumber(previous_value)
      ? Number((result.value - previous_value).toFixed(2))
      : undefined;
    const trend_direction =
      trend_vs_previous === undefined
        ? undefined
        : trend_vs_previous > 1
          ? 'mejorando'
          : trend_vs_previous < -1
            ? 'empeorando'
            : 'estable';

    return {
      score_value: result.value,
      score_label: getLabelKey(result.value, result.confidence),
      components: components_with_shadow,
      inputs_used: {
        zoneId: input.zoneId,
        periodDate: input.periodDate,
        components_present,
        max_staleness_days: maxStaleness,
      },
      confidence: result.confidence,
      citations: [
        { source: 'zone_scores:F08', period: f08.period_used ?? input.periodDate },
        { source: 'zone_scores:F09', period: f09.period_used ?? input.periodDate },
        { source: 'zone_scores:N11', period: n11.period_used ?? input.periodDate },
        { source: 'zone_scores:A12', period: a12.period_used ?? input.periodDate },
        { source: 'zone_scores:N01', period: n01.period_used ?? input.periodDate },
      ],
      ...(trend_vs_previous !== undefined ? { trend_vs_previous } : {}),
      ...(trend_direction !== undefined ? { trend_direction } : {}),
      provenance: {
        sources: [
          {
            name: 'zone_scores:F08',
            period: f08.period_used ?? input.periodDate,
            count: f08.value !== null ? 1 : 0,
          },
          {
            name: 'zone_scores:F09',
            period: f09.period_used ?? input.periodDate,
            count: f09.value !== null ? 1 : 0,
          },
          {
            name: 'zone_scores:N11',
            period: n11.period_used ?? input.periodDate,
            count: n11.value !== null ? 1 : 0,
          },
          {
            name: 'zone_scores:A12',
            period: a12.period_used ?? input.periodDate,
            count: a12.value !== null ? 1 : 0,
          },
          {
            name: 'zone_scores:N01',
            period: n01.period_used ?? input.periodDate,
            count: n01.value !== null ? 1 : 0,
          },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zone_id: input.zoneId,
        coverage_pct: result.components.coverage_pct,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default ipvCalculator;
