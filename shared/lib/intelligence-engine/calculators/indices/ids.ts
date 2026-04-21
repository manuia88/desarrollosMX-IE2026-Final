// DMX-IDS — Índice Desarrollo Social Integrado. Categoría zona, tier 3, country MX.
// Plan FASE 11 §DMX-IDS + Catálogo 03.8 §dmx-ids. Registry ver
// shared/lib/intelligence-engine/registry.ts L1515-1528.
//
// Fórmula:
//   IDS = F08·0.25 + H01·0.15 + H02·0.10 + N01·0.15 + N02·0.15 + F01·0.10 + F02·0.10
// - F08: Zone LQI
// - H01: Salud infra
// - H02: Educación infra
// - N01: Demografía
// - N02: Equipamiento
// - F01: Safety
// - F02: Transit
//
// Renormaliza pesos si faltan componentes. Fallback lookback 90d per component.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const DEFAULT_IDS_WEIGHTS: Readonly<Record<string, number>> = {
  F08: 0.25,
  H01: 0.15,
  H02: 0.1,
  N01: 0.15,
  N02: 0.15,
  F01: 0.1,
  F02: 0.1,
} as const;

export const IDS_COMPONENT_KEYS: readonly string[] = [
  'F08',
  'H01',
  'H02',
  'N01',
  'N02',
  'F01',
  'F02',
] as const;

export const methodology = {
  formula:
    'IDS = F08·0.25 + H01·0.15 + H02·0.10 + N01·0.15 + N02·0.15 + F01·0.10 + F02·0.10. Renormaliza pesos presentes.',
  sources: [
    'zone_scores:F08',
    'zone_scores:H01',
    'zone_scores:H02',
    'zone_scores:N01',
    'zone_scores:N02',
    'zone_scores:F01',
    'zone_scores:F02',
  ],
  dependencies: [
    { score_id: 'F08', weight: 0.25, role: 'zone_lqi', critical: true },
    { score_id: 'H01', weight: 0.15, role: 'salud_infra', critical: false },
    { score_id: 'H02', weight: 0.1, role: 'educacion_infra', critical: false },
    { score_id: 'N01', weight: 0.15, role: 'demografia', critical: false },
    { score_id: 'N02', weight: 0.15, role: 'equipamiento', critical: false },
    { score_id: 'F01', weight: 0.1, role: 'safety', critical: false },
    { score_id: 'F02', weight: 0.1, role: 'transit', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-IDS',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-ids-indice-desarrollo-social-integrado',
    },
    { name: 'Plan FASE 11 §DMX-IDS', url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md' },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 85 },
  fallback_lookback_days: 90,
  circuit_breaker_pct: 20,
} as const;

export const reasoning_template =
  'DMX-IDS {zone_id}: {score_value}/100. Cobertura {coverage_pct}%. Confianza {confidence}.';

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export type IdsLabel =
  | 'ie.index.dmx_ids.excelente'
  | 'ie.index.dmx_ids.bueno'
  | 'ie.index.dmx_ids.regular'
  | 'ie.index.dmx_ids.pobre'
  | 'ie.index.dmx_ids.insufficient';

export function getLabelKey(value: number, confidence: Confidence): IdsLabel {
  if (confidence === 'insufficient_data') return 'ie.index.dmx_ids.insufficient';
  if (value >= 85) return 'ie.index.dmx_ids.excelente';
  if (value >= 70) return 'ie.index.dmx_ids.bueno';
  if (value >= 50) return 'ie.index.dmx_ids.regular';
  return 'ie.index.dmx_ids.pobre';
}

export interface IdsComponentEntry {
  readonly value: number;
  readonly weight: number;
  readonly citation_source: string;
  readonly citation_period: string;
}

export interface IdsConfidenceBreakdown {
  readonly data_freshness: number;
  readonly data_completeness: number;
  readonly sample_size: number;
  readonly methodology_maturity: number;
  readonly total: number;
}

export interface IdsComponents extends Record<string, unknown> {
  readonly F08: IdsComponentEntry | null;
  readonly H01: IdsComponentEntry | null;
  readonly H02: IdsComponentEntry | null;
  readonly N01: IdsComponentEntry | null;
  readonly N02: IdsComponentEntry | null;
  readonly F01: IdsComponentEntry | null;
  readonly F02: IdsComponentEntry | null;
  readonly weights_used: Readonly<Record<string, number>>;
  readonly missing_components: readonly string[];
  readonly coverage_pct: number;
  readonly _meta: {
    readonly confidence_breakdown: IdsConfidenceBreakdown;
    readonly circuit_breaker_triggered: boolean;
    readonly shadow: boolean;
    readonly previous_value: number | null;
  };
}

export interface IdsRawInput {
  readonly scores: Readonly<Record<string, number | null>>;
  readonly weights_override?: Readonly<Record<string, number>>;
  readonly period_date: string;
  readonly previous_value?: number | null;
  readonly sample_size?: number;
  readonly data_staleness_days?: number;
}

export interface IdsComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: IdsComponents;
}

function computeConfidenceBreakdown(params: {
  readonly availableRatio: number;
  readonly sample_size: number;
  readonly staleness_days: number;
}): IdsConfidenceBreakdown {
  const completeness = Math.round(Math.max(0, Math.min(1, params.availableRatio)) * 30);
  const stalenessClamped = Math.max(0, Math.min(90, params.staleness_days));
  const freshness = Math.round(((90 - stalenessClamped) / 90) * 30);
  const sampleClamped = Math.max(0, Math.min(50, params.sample_size));
  const sampleScore = Math.round((sampleClamped / 50) * 20);
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

export function computeIds(input: IdsRawInput): IdsComputeResult {
  const weights = { ...DEFAULT_IDS_WEIGHTS, ...(input.weights_override ?? {}) };
  const missing: string[] = [];
  const availableWeights: Record<string, number> = {};
  let sumAvailable = 0;

  for (const key of IDS_COMPONENT_KEYS) {
    const raw = input.scores[key];
    const w = weights[key] ?? 0;
    if (!isFiniteNumber(raw)) {
      missing.push(key);
      continue;
    }
    availableWeights[key] = w;
    sumAvailable += w;
  }

  const available = IDS_COMPONENT_KEYS.length - missing.length;
  const coverage_pct = Math.round((available / IDS_COMPONENT_KEYS.length) * 100);
  const availableRatio = available / IDS_COMPONENT_KEYS.length;

  const breakdown = computeConfidenceBreakdown({
    availableRatio,
    sample_size: input.sample_size ?? 0,
    staleness_days: input.data_staleness_days ?? 0,
  });

  const buildEntry = (key: string): IdsComponentEntry | null => {
    const raw = input.scores[key];
    if (!isFiniteNumber(raw)) return null;
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
        H01: buildEntry('H01'),
        H02: buildEntry('H02'),
        N01: buildEntry('N01'),
        N02: buildEntry('N02'),
        F01: buildEntry('F01'),
        F02: buildEntry('F02'),
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

  let weighted_sum = 0;
  const weights_used: Record<string, number> = {};
  for (const key of IDS_COMPONENT_KEYS) {
    const raw = input.scores[key];
    if (!isFiniteNumber(raw)) continue;
    const w = availableWeights[key] ?? 0;
    const normalized = sumAvailable > 0 ? w / sumAvailable : 0;
    weights_used[key] = Number(normalized.toFixed(6));
    weighted_sum += raw * normalized;
  }

  const value = Math.round(clamp100(weighted_sum));
  let confidence: Confidence;
  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct)
    confidence = 'insufficient_data';
  else if (breakdown.total >= 75) confidence = 'high';
  else if (breakdown.total >= 50) confidence = 'medium';
  else confidence = 'low';

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
      H01: buildEntry('H01'),
      H02: buildEntry('H02'),
      N01: buildEntry('N01'),
      N02: buildEntry('N02'),
      F01: buildEntry('F01'),
      F02: buildEntry('F02'),
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

// ---- Supabase helpers ----
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

async function fetchPreviousIds(
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
      .eq('index_code', 'DMX-IDS')
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
    // best-effort
  }
}

export const idsCalculator: Calculator = {
  scoreId: 'DMX-IDS',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    if (!input.zoneId) throw new Error('DMX-IDS requires zoneId');
    const zoneId = input.zoneId;
    const computed_at = new Date();
    const shadow_mode = input.params?.shadow_mode === true;
    const audit_log = input.params?.audit_log === true;

    const fetchers = IDS_COMPONENT_KEYS.map((k) =>
      fetchZoneScore(supabase, zoneId, input.countryCode, k, input.periodDate),
    );
    const previousP = fetchPreviousIds(supabase, zoneId, input.countryCode, input.periodDate);
    const fetched = await Promise.all(fetchers);
    const previous_value = await previousP;

    const scores: Record<string, number | null> = {};
    let maxStaleness = 0;
    let components_present = 0;
    const citations: Array<{ source: string; period: string }> = [];
    const provenanceSources: Array<{ name: string; period: string; count: number }> = [];

    for (let i = 0; i < IDS_COMPONENT_KEYS.length; i++) {
      const key = IDS_COMPONENT_KEYS[i];
      const f = fetched[i];
      if (key === undefined || f === undefined) continue;
      scores[key] = f.value;
      maxStaleness = Math.max(maxStaleness, f.days_old);
      if (f.value !== null) components_present += 1;
      const periodUsed = f.period_used ?? input.periodDate;
      citations.push({ source: `zone_scores:${key}`, period: periodUsed });
      provenanceSources.push({
        name: `zone_scores:${key}`,
        period: periodUsed,
        count: f.value !== null ? 1 : 0,
      });
    }

    const result = computeIds({
      scores,
      period_date: input.periodDate,
      previous_value,
      sample_size: components_present * 10,
      data_staleness_days: maxStaleness,
    });

    const components_with_shadow: IdsComponents = {
      ...result.components,
      _meta: { ...result.components._meta, shadow: shadow_mode },
    };

    if (audit_log) {
      await writeAuditLog(supabase, {
        index_code: 'DMX-IDS',
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
      citations,
      ...(trend_vs_previous !== undefined ? { trend_vs_previous } : {}),
      ...(trend_direction !== undefined ? { trend_direction } : {}),
      provenance: {
        sources: provenanceSources,
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

export default idsCalculator;
