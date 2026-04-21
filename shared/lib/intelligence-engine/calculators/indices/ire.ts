// DMX-IRE — Índice Riesgo Estructural. Categoría zona, tier 3, country MX.
// Plan FASE 11 §DMX-IRE + Catálogo 03.8 §dmx-ire. Registry ver
// shared/lib/intelligence-engine/registry.ts L1529-1541.
//
// Fórmula inversa (value alto = MENOS riesgo):
//   IRE = 100 - (H03·0.30 + N07·0.20 + F01_inv·0.20 + F06_inv·0.15 + N05_inv·0.15)
// Componentes:
//   H03 = Riesgo directo (mayor=peor, se usa tal cual)
//   N07 = Riesgo ambiental (mayor=peor, se usa tal cual)
//   F01_inv = 100 - F01 (F01 safety mayor=mejor → invertir)
//   F06_inv = 100 - F06 (F06 infraestructura mayor=mejor → invertir)
//   N05_inv = 100 - N05 (N05 agua calidad mayor=mejor → invertir)
//
// Desglose B2B aseguradoras: { sismico, hidrico, social, uso_suelo, infraestructura }.
// Mapeo conservador (H1): sismico=H03, hidrico=N05_inv, social=F01_inv, infraestructura=F06_inv,
// uso_suelo=N07. El desglose permite cotización multi-línea (ej. pólizas sísmicas vs hídricas).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

// Pesos sobre la "carga de riesgo" (antes de restar de 100).
export const DEFAULT_IRE_RISK_WEIGHTS: Readonly<Record<string, number>> = {
  H03: 0.3,
  N07: 0.2,
  F01_inv: 0.2,
  F06_inv: 0.15,
  N05_inv: 0.15,
} as const;

export const IRE_RISK_KEYS: readonly string[] = [
  'H03',
  'N07',
  'F01_inv',
  'F06_inv',
  'N05_inv',
] as const;

export const IRE_BASE_KEYS: readonly string[] = ['H03', 'N07', 'F01', 'F06', 'N05'] as const;

export const methodology = {
  formula:
    'IRE = 100 - (H03·0.30 + N07·0.20 + (100-F01)·0.20 + (100-F06)·0.15 + (100-N05)·0.15). Mayor valor = menor riesgo.',
  sources: [
    'zone_scores:H03',
    'zone_scores:N07',
    'zone_scores:F01',
    'zone_scores:F06',
    'zone_scores:N05',
  ],
  dependencies: [
    { score_id: 'H03', weight: 0.3, role: 'riesgo_directo', critical: true },
    { score_id: 'N07', weight: 0.2, role: 'riesgo_ambiental', critical: true },
    { score_id: 'F01', weight: 0.2, role: 'safety_inv', critical: false },
    { score_id: 'F06', weight: 0.15, role: 'infraestructura_inv', critical: false },
    { score_id: 'N05', weight: 0.15, role: 'agua_calidad_inv', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-IRE',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-ire-indice-riesgo-estructural',
    },
    { name: 'Plan FASE 11 §DMX-IRE', url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md' },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 85 },
  fallback_lookback_days: 90,
  circuit_breaker_pct: 20,
} as const;

export const reasoning_template =
  'DMX-IRE {zone_id}: {score_value}/100 (mayor=menos riesgo). Cobertura {coverage_pct}%. Confianza {confidence}.';

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export type IreLabel =
  | 'ie.index.dmx_ire.muy_bajo_riesgo'
  | 'ie.index.dmx_ire.bajo_riesgo'
  | 'ie.index.dmx_ire.riesgo_moderado'
  | 'ie.index.dmx_ire.alto_riesgo'
  | 'ie.index.dmx_ire.insufficient';

export function getLabelKey(value: number, confidence: Confidence): IreLabel {
  if (confidence === 'insufficient_data') return 'ie.index.dmx_ire.insufficient';
  if (value >= 80) return 'ie.index.dmx_ire.muy_bajo_riesgo';
  if (value >= 60) return 'ie.index.dmx_ire.bajo_riesgo';
  if (value >= 40) return 'ie.index.dmx_ire.riesgo_moderado';
  return 'ie.index.dmx_ire.alto_riesgo';
}

export interface IreComponentEntry {
  readonly value: number;
  readonly weight: number;
  readonly citation_source: string;
  readonly citation_period: string;
  readonly inverted: boolean;
}

export interface IreRiskBreakdown {
  readonly sismico: number | null;
  readonly hidrico: number | null;
  readonly social: number | null;
  readonly uso_suelo: number | null;
  readonly infraestructura: number | null;
}

export interface IreConfidenceBreakdown {
  readonly data_freshness: number;
  readonly data_completeness: number;
  readonly sample_size: number;
  readonly methodology_maturity: number;
  readonly total: number;
}

export interface IreComponents extends Record<string, unknown> {
  readonly H03: IreComponentEntry | null;
  readonly N07: IreComponentEntry | null;
  readonly F01: IreComponentEntry | null;
  readonly F06: IreComponentEntry | null;
  readonly N05: IreComponentEntry | null;
  readonly risk_load: number;
  readonly breakdown: IreRiskBreakdown;
  readonly weights_used: Readonly<Record<string, number>>;
  readonly missing_components: readonly string[];
  readonly coverage_pct: number;
  readonly _meta: {
    readonly confidence_breakdown: IreConfidenceBreakdown;
    readonly circuit_breaker_triggered: boolean;
    readonly shadow: boolean;
    readonly previous_value: number | null;
  };
}

export interface IreRawInput {
  readonly scores: Readonly<Record<string, number | null>>; // F01, F06, N05, N07, H03 (valores base)
  readonly weights_override?: Readonly<Record<string, number>>;
  readonly period_date: string;
  readonly previous_value?: number | null;
  readonly sample_size?: number;
  readonly data_staleness_days?: number;
}

export interface IreComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: IreComponents;
}

function computeConfidenceBreakdown(params: {
  readonly availableRatio: number;
  readonly sample_size: number;
  readonly staleness_days: number;
}): IreConfidenceBreakdown {
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

export function computeIre(input: IreRawInput): IreComputeResult {
  const weights = { ...DEFAULT_IRE_RISK_WEIGHTS, ...(input.weights_override ?? {}) };
  const missing: string[] = [];
  const availableWeights: Record<string, number> = {};
  let sumAvailable = 0;

  // Mapea cada "risk key" al score base requerido (F01_inv usa F01).
  const baseOf: Record<string, string> = {
    H03: 'H03',
    N07: 'N07',
    F01_inv: 'F01',
    F06_inv: 'F06',
    N05_inv: 'N05',
  };

  for (const key of IRE_RISK_KEYS) {
    const baseKey = baseOf[key];
    if (baseKey === undefined) continue;
    const raw = input.scores[baseKey];
    const w = weights[key] ?? 0;
    if (!isFiniteNumber(raw)) {
      missing.push(key);
      continue;
    }
    availableWeights[key] = w;
    sumAvailable += w;
  }

  const available = IRE_RISK_KEYS.length - missing.length;
  const coverage_pct = Math.round((available / IRE_RISK_KEYS.length) * 100);
  const availableRatio = available / IRE_RISK_KEYS.length;

  const breakdown = computeConfidenceBreakdown({
    availableRatio,
    sample_size: input.sample_size ?? 0,
    staleness_days: input.data_staleness_days ?? 0,
  });

  const buildEntry = (riskKey: string): IreComponentEntry | null => {
    const baseKey = baseOf[riskKey];
    if (baseKey === undefined) return null;
    const raw = input.scores[baseKey];
    if (!isFiniteNumber(raw)) return null;
    const inverted = riskKey.endsWith('_inv');
    const w = availableWeights[riskKey] ?? 0;
    return {
      value: raw,
      weight: sumAvailable > 0 ? Number((w / sumAvailable).toFixed(6)) : 0,
      citation_source: `zone_scores:${baseKey}`,
      citation_period: input.period_date,
      inverted,
    };
  };

  const buildBreakdown = (): IreRiskBreakdown => {
    const f01 = input.scores.F01;
    const f06 = input.scores.F06;
    const n05 = input.scores.N05;
    const n07 = input.scores.N07;
    const h03 = input.scores.H03;
    return {
      sismico: isFiniteNumber(h03) ? Number(h03.toFixed(2)) : null,
      hidrico: isFiniteNumber(n05) ? Number((100 - n05).toFixed(2)) : null,
      social: isFiniteNumber(f01) ? Number((100 - f01).toFixed(2)) : null,
      uso_suelo: isFiniteNumber(n07) ? Number(n07.toFixed(2)) : null,
      infraestructura: isFiniteNumber(f06) ? Number((100 - f06).toFixed(2)) : null,
    };
  };

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        H03: buildEntry('H03'),
        N07: buildEntry('N07'),
        F01: buildEntry('F01_inv'),
        F06: buildEntry('F06_inv'),
        N05: buildEntry('N05_inv'),
        risk_load: 0,
        breakdown: buildBreakdown(),
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

  // Compute risk load weighted (re-normalizado).
  let risk_sum = 0;
  const weights_used: Record<string, number> = {};
  for (const key of IRE_RISK_KEYS) {
    const baseKey = baseOf[key];
    if (baseKey === undefined) continue;
    const raw = input.scores[baseKey];
    if (!isFiniteNumber(raw)) continue;
    const w = availableWeights[key] ?? 0;
    const normalized = sumAvailable > 0 ? w / sumAvailable : 0;
    weights_used[key] = Number(normalized.toFixed(6));
    const contribution = key.endsWith('_inv') ? 100 - raw : raw;
    risk_sum += contribution * normalized;
  }

  const risk_load = clamp100(risk_sum);
  const value = Math.round(clamp100(100 - risk_load));
  let confidence: Confidence;
  if (breakdown.total >= 75) confidence = 'high';
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
      H03: buildEntry('H03'),
      N07: buildEntry('N07'),
      F01: buildEntry('F01_inv'),
      F06: buildEntry('F06_inv'),
      N05: buildEntry('N05_inv'),
      risk_load: Number(risk_load.toFixed(2)),
      breakdown: buildBreakdown(),
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

async function fetchPreviousIre(
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
      .eq('index_code', 'DMX-IRE')
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

export const ireCalculator: Calculator = {
  scoreId: 'DMX-IRE',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    if (!input.zoneId) throw new Error('DMX-IRE requires zoneId');
    const zoneId = input.zoneId;
    const computed_at = new Date();
    const shadow_mode = input.params?.shadow_mode === true;
    const audit_log = input.params?.audit_log === true;

    const fetchers = IRE_BASE_KEYS.map((k) =>
      fetchZoneScore(supabase, zoneId, input.countryCode, k, input.periodDate),
    );
    const previousP = fetchPreviousIre(supabase, zoneId, input.countryCode, input.periodDate);
    const fetched = await Promise.all(fetchers);
    const previous_value = await previousP;

    const scores: Record<string, number | null> = {};
    let maxStaleness = 0;
    let components_present = 0;
    const citations: Array<{ source: string; period: string }> = [];
    const provenanceSources: Array<{ name: string; period: string; count: number }> = [];

    for (let i = 0; i < IRE_BASE_KEYS.length; i++) {
      const key = IRE_BASE_KEYS[i];
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

    const result = computeIre({
      scores,
      period_date: input.periodDate,
      previous_value,
      sample_size: components_present * 10,
      data_staleness_days: maxStaleness,
    });

    const components_with_shadow: IreComponents = {
      ...result.components,
      _meta: { ...result.components._meta, shadow: shadow_mode },
    };

    if (audit_log) {
      await writeAuditLog(supabase, {
        index_code: 'DMX-IRE',
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

export default ireCalculator;
