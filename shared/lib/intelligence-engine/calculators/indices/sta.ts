// DMX-STA — Índice Estabilidad Institucional. Categoría zona, tier 3, country MX.
// Plan FASE 11 §DMX-STA + Catálogo 03.8 §dmx-sta. Producto B2B fondos
// institucionales + aseguradoras (requieren zonas con volatilidad baja).
//
// Fórmula:
//   STA = volatility_36m_inv·0.30 + liquidity·0.20 + IRE·0.20
//       + confidence_hist·0.15 + MOM_stability·0.10 + F08·0.05
//
// Componentes:
//   - volatility_36m_inv: 100 − normalized_stddev(price_m2, 36m) × 100.
//       Baja volatilidad = alto STA.
//   - liquidity: normalized count transactions 12m.
//   - IRE: DMX-IRE índice riesgo estructural (nested zone_scores:DMX-IRE).
//   - confidence_hist: % meses últimos 36 con data completa.
//   - MOM_stability: 100 − abs(normalized_stddev(MOM_12m)).
//   - F08: Zone LQI baseline.
//
// Missing data:
//   - <36m history price_m2 → confidence proportional (ej. 24m → medium; <12m → low).
//   - IRE sin data → se excluye del cálculo + degrade confidence.
//
// Score bands (producto institucional — categórico obligatorio):
//   - ≥80: Excelente
//   - 65-79: Bueno
//   - 45-64: Regular
//   - <45: Bajo
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
  fetchPreviousSnapshot,
  type IndexComponentDetail,
  type IndicesMeta,
  tryInsertAuditLog,
} from './shared';

export const version = '1.0.0';

export const DEFAULT_STA_WEIGHTS: Readonly<Record<string, number>> = {
  volatility_36m_inv: 0.3,
  liquidity: 0.2,
  IRE: 0.2,
  confidence_hist: 0.15,
  MOM_stability: 0.1,
  F08: 0.05,
} as const;

export const CRITICAL_DEPS: readonly string[] = ['volatility_36m_inv'] as const;

export const HISTORY_WINDOW_MONTHS = 36;
export const LIQUIDITY_SCALE_TARGET = 100; // 100 transacciones 12m → 100

export const methodology = {
  formula:
    'STA = (100−stddev_price_36m_norm)·0.30 + liquidity·0.20 + IRE·0.20 + confidence_hist·0.15 + (100−stddev_MOM_12m_norm)·0.10 + F08·0.05.',
  sources: [
    'market_prices_secondary (36m history)',
    'transactions_log',
    'zone_scores:DMX-IRE',
    'zone_scores:DMX-MOM (history)',
    'zone_scores:F08',
  ],
  dependencies: [
    {
      score_id: 'volatility_36m_inv',
      weight: 0.3,
      role: 'price_stability_inverse',
      critical: true,
    },
    { score_id: 'liquidity', weight: 0.2, role: 'transaction_liquidity', critical: false },
    { score_id: 'IRE', weight: 0.2, role: 'structural_risk', critical: false },
    {
      score_id: 'confidence_hist',
      weight: 0.15,
      role: 'data_completeness_36m',
      critical: false,
    },
    { score_id: 'MOM_stability', weight: 0.1, role: 'momentum_variance', critical: false },
    { score_id: 'F08', weight: 0.05, role: 'zone_lqi', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-STA',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-sta-estabilidad-institucional',
    },
    {
      name: 'Plan FASE 11 §DMX-STA',
      url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md#modulo-11b15-dmx-sta',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_coverage_pct: 50,
    high_coverage_pct: 85,
    min_history_months: 12,
    full_history_months: HISTORY_WINDOW_MONTHS,
  },
  circuit_breaker_pct: 20,
  score_bands: {
    excelente_min: 80,
    bueno_min: 65,
    regular_min: 45,
  },
  sensitivity_analysis: [{ dimension_id: 'volatility_36m_inv', impact_pct_per_10pct_change: 3.0 }],
} as const;

export const reasoning_template =
  'STA Estabilidad zona={zone_id}: {score_value}/100 (banda={score_band}). Volatilidad inversa={volatility_36m_inv}. Confianza {confidence}.';

export type StaBand = 'Excelente' | 'Bueno' | 'Regular' | 'Bajo';

export interface StaComponents extends Record<string, unknown> {
  readonly volatility_36m_inv: IndexComponentDetail | null;
  readonly liquidity: IndexComponentDetail | null;
  readonly IRE: IndexComponentDetail | null;
  readonly confidence_hist: IndexComponentDetail | null;
  readonly MOM_stability: IndexComponentDetail | null;
  readonly F08: IndexComponentDetail | null;
  readonly history_months_available: number;
  readonly coverage_pct: number;
  readonly score_band: StaBand;
  readonly _meta: IndicesMeta;
}

export interface StaRawInput {
  readonly price_m2_history_36m: readonly number[];
  readonly transactions_count_12m: number | null;
  readonly IRE_value: number | null;
  readonly MOM_history_12m: readonly number[];
  readonly F08_value: number | null;
  readonly universe_period: string;
  readonly data_freshness_days?: number;
  readonly previous_value?: number | null;
  readonly shadow_mode?: boolean;
}

export interface StaComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: StaComponents;
  readonly trend_vs_previous: number | null;
}

export function scoreBandFor(value: number): StaBand {
  if (value >= methodology.score_bands.excelente_min) return 'Excelente';
  if (value >= methodology.score_bands.bueno_min) return 'Bueno';
  if (value >= methodology.score_bands.regular_min) return 'Regular';
  return 'Bajo';
}

function stdDev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function cv(values: readonly number[]): number {
  const filtered = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (filtered.length < 2) return 0;
  const mean = filtered.reduce((s, v) => s + v, 0) / filtered.length;
  if (mean === 0) return 0;
  return stdDev(filtered) / Math.abs(mean);
}

export function computeDmxSta(input: StaRawInput): StaComputeResult {
  const priceHistory = input.price_m2_history_36m.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0,
  );
  const historyMonths = priceHistory.length;

  // Critical check: history insuficiente (<12 months) → insufficient_data.
  if (historyMonths < methodology.confidence_thresholds.min_history_months) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        volatility_36m_inv: null,
        liquidity: null,
        IRE: null,
        confidence_hist: null,
        MOM_stability: null,
        F08: null,
        history_months_available: historyMonths,
        coverage_pct: 0,
        score_band: 'Bajo',
        _meta: {
          confidence_breakdown: buildConfidenceBreakdown({
            ...(input.data_freshness_days !== undefined
              ? { data_freshness_days: input.data_freshness_days }
              : {}),
            coverage_pct: 0,
            sample_size: historyMonths,
            methodology_maturity: 85,
          }),
          circuit_breaker_triggered: false,
          shadow: input.shadow_mode ?? false,
          missing_components: ['volatility_36m_inv'],
          fallback_reason: `history_below_min:${historyMonths}m`,
        },
      },
      trend_vs_previous: null,
    };
  }

  // Volatility inverted: CV (coefficient of variation) → 100 − (cv × 100) clamped.
  // High CV (>1) = very volatile; CV 0 = totally stable.
  const price_cv = cv(priceHistory);
  const volatility_inv_value = clamp100(100 - price_cv * 100);

  // Liquidity: normalize transactions/12m target LIQUIDITY_SCALE_TARGET → 100.
  const liquidity_value =
    input.transactions_count_12m !== null && Number.isFinite(input.transactions_count_12m)
      ? clamp100((Math.max(0, input.transactions_count_12m) / LIQUIDITY_SCALE_TARGET) * 100)
      : null;

  const IRE_value =
    input.IRE_value !== null && Number.isFinite(input.IRE_value) ? clamp100(input.IRE_value) : null;

  // Confidence_hist: % months con data (completeness 36m).
  const confidence_hist_value = clamp100(
    (historyMonths / methodology.confidence_thresholds.full_history_months) * 100,
  );

  // MOM_stability: 100 − CV(MOM_history) normalizado.
  const momHistory = input.MOM_history_12m.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  const MOM_stability_value = momHistory.length >= 3 ? clamp100(100 - cv(momHistory) * 100) : null;

  const F08_value =
    input.F08_value !== null && Number.isFinite(input.F08_value) ? clamp100(input.F08_value) : null;

  const parts: Array<{
    key: keyof typeof DEFAULT_STA_WEIGHTS;
    value: number | null;
    citation_source: string;
  }> = [
    {
      key: 'volatility_36m_inv',
      value: volatility_inv_value,
      citation_source: 'market_prices_secondary (36m)',
    },
    { key: 'liquidity', value: liquidity_value, citation_source: 'transactions_log' },
    { key: 'IRE', value: IRE_value, citation_source: 'zone_scores:DMX-IRE' },
    {
      key: 'confidence_hist',
      value: confidence_hist_value,
      citation_source: 'market_prices_secondary (completeness 36m)',
    },
    {
      key: 'MOM_stability',
      value: MOM_stability_value,
      citation_source: 'zone_scores:DMX-MOM (history)',
    },
    { key: 'F08', value: F08_value, citation_source: 'zone_scores:F08' },
  ];

  const missing: string[] = [];
  let weighted = 0;
  let weightSum = 0;
  const details: Partial<Record<keyof typeof DEFAULT_STA_WEIGHTS, IndexComponentDetail>> = {};
  for (const p of parts) {
    const w = DEFAULT_STA_WEIGHTS[p.key] ?? 0;
    if (p.value === null || !Number.isFinite(p.value)) {
      missing.push(p.key);
      continue;
    }
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

  // Confidence proportional a history + coverage:
  //   - history 36m + coverage ≥85% → high
  //   - history ≥24m + coverage ≥50% → medium
  //   - else low
  let confidence: Confidence;
  if (
    historyMonths >= methodology.confidence_thresholds.full_history_months &&
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct &&
    missing.length === 0
  ) {
    confidence = 'high';
  } else if (
    historyMonths >= 24 &&
    coverage_pct >= methodology.confidence_thresholds.min_coverage_pct
  ) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    value,
    confidence,
    components: {
      volatility_36m_inv: details.volatility_36m_inv ?? null,
      liquidity: details.liquidity ?? null,
      IRE: details.IRE ?? null,
      confidence_hist: details.confidence_hist ?? null,
      MOM_stability: details.MOM_stability ?? null,
      F08: details.F08 ?? null,
      history_months_available: historyMonths,
      coverage_pct,
      score_band: scoreBandFor(value),
      _meta: {
        confidence_breakdown: buildConfidenceBreakdown({
          ...(input.data_freshness_days !== undefined
            ? { data_freshness_days: input.data_freshness_days }
            : {}),
          coverage_pct,
          sample_size: historyMonths,
          methodology_maturity: 85,
        }),
        circuit_breaker_triggered,
        shadow: input.shadow_mode ?? false,
        weights_used: DEFAULT_STA_WEIGHTS,
        missing_components: missing,
        redistributed_weights: missing.length > 0,
        ...(historyMonths < methodology.confidence_thresholds.full_history_months
          ? {
              limitation: `history_partial:${historyMonths}/${methodology.confidence_thresholds.full_history_months}m`,
            }
          : {}),
      },
    },
    trend_vs_previous,
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.index.sta.insufficient';
  if (value >= methodology.score_bands.excelente_min) return 'ie.index.sta.excelente';
  if (value >= methodology.score_bands.bueno_min) return 'ie.index.sta.bueno';
  if (value >= methodology.score_bands.regular_min) return 'ie.index.sta.regular';
  return 'ie.index.sta.bajo';
}

function trendDirection(delta: number | null): 'mejorando' | 'estable' | 'empeorando' | undefined {
  if (delta === null) return undefined;
  if (delta > 1) return 'mejorando';
  if (delta < -1) return 'empeorando';
  return 'estable';
}

type LooseClient = SupabaseClient<Record<string, unknown>>;

async function fetchPriceHistory36m(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<readonly number[]> {
  try {
    const start = new Date(`${periodDate}T00:00:00Z`);
    start.setUTCMonth(start.getUTCMonth() - 36);
    const { data } = await (supabase as unknown as LooseClient)
      .from('market_prices_secondary' as never)
      .select('price_m2, period_date')
      .eq('zone_id', zoneId)
      .gte('period_date', start.toISOString().slice(0, 10))
      .lte('period_date', periodDate)
      .order('period_date', { ascending: true });
    if (!data) return [];
    const rows = data as unknown as Array<{ price_m2: number | null }>;
    return rows
      .map((r) => r.price_m2)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
  } catch {
    return [];
  }
}

async function fetchTransactionsCount12m(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<number | null> {
  try {
    const start = new Date(`${periodDate}T00:00:00Z`);
    start.setUTCMonth(start.getUTCMonth() - 12);
    const { count } = await (supabase as unknown as LooseClient)
      .from('transactions_log' as never)
      .select('id', { count: 'exact', head: true })
      .eq('zone_id', zoneId)
      .gte('transaction_date', start.toISOString().slice(0, 10))
      .lte('transaction_date', periodDate);
    return typeof count === 'number' ? count : null;
  } catch {
    return null;
  }
}

async function fetchIRE(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<number | null> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_value')
      .eq('zone_id', zoneId)
      .eq('score_type', 'DMX-IRE')
      .lte('period_date', periodDate)
      .order('period_date', { ascending: false })
      .limit(1);
    if (!data) return null;
    const rows = data as unknown as Array<{ score_value: number | null }>;
    const row = rows[0];
    return row && typeof row.score_value === 'number' ? row.score_value : null;
  } catch {
    return null;
  }
}

async function fetchMomHistory12m(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<readonly number[]> {
  try {
    const start = new Date(`${periodDate}T00:00:00Z`);
    start.setUTCMonth(start.getUTCMonth() - 12);
    const { data } = await (supabase as unknown as LooseClient)
      .from('score_history' as never)
      .select('score_value, period_date')
      .eq('entity_type', 'zone')
      .eq('entity_id', zoneId)
      .eq('score_type', 'DMX-MOM')
      .gte('period_date', start.toISOString().slice(0, 10))
      .lte('period_date', periodDate)
      .order('period_date', { ascending: true });
    if (!data) return [];
    const rows = data as unknown as Array<{ score_value: number | null }>;
    return rows
      .map((r) => r.score_value)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  } catch {
    return [];
  }
}

async function fetchF08(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<number | null> {
  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_value')
      .eq('zone_id', zoneId)
      .eq('score_type', 'F08')
      .eq('period_date', periodDate)
      .limit(1);
    if (!data) return null;
    const rows = data as unknown as Array<{ score_value: number | null }>;
    const row = rows[0];
    return row && typeof row.score_value === 'number' ? row.score_value : null;
  } catch {
    return null;
  }
}

export const dmxStaCalculator: Calculator = {
  scoreId: 'DMX-STA',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const shadow_mode = params.shadow_mode === true;
    const audit_log = params.audit_log === true;

    if (!input.zoneId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: { reason: 'DMX-STA requiere zoneId.' },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'market_prices_secondary', count: 0 }],
          computed_at: computed_at.toISOString(),
          calculator_version: version,
        },
        valid_until: computeValidUntil(computed_at, methodology.validity),
      };
    }

    const [priceHistory, txCount, ire, momHistory, f08, previous_value] = await Promise.all([
      fetchPriceHistory36m(supabase, input.zoneId, input.periodDate),
      fetchTransactionsCount12m(supabase, input.zoneId, input.periodDate),
      fetchIRE(supabase, input.zoneId, input.periodDate),
      fetchMomHistory12m(supabase, input.zoneId, input.periodDate),
      fetchF08(supabase, input.zoneId, input.periodDate),
      fetchPreviousSnapshot(supabase, 'zone', input.zoneId, 'DMX-STA', input.periodDate),
    ]);

    const rawInput: StaRawInput = {
      price_m2_history_36m: priceHistory,
      transactions_count_12m: txCount,
      IRE_value: ire,
      MOM_history_12m: momHistory,
      F08_value: f08,
      universe_period: input.periodDate,
      ...(previous_value !== null ? { previous_value } : {}),
      shadow_mode,
    };

    const result = computeDmxSta(rawInput);

    if (audit_log) {
      const auditParams: AuditLogParams = {
        score_id: 'DMX-STA',
        entity_type: 'zone',
        entity_id: input.zoneId,
        country_code: input.countryCode,
        period_date: input.periodDate,
        score_value: result.value,
        confidence: result.confidence,
        computed_at: computed_at.toISOString(),
        calculator_version: version,
        inputs_hash: `hist:${priceHistory.length}|tx:${txCount}|ire:${ire}`,
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
        zoneId: input.zoneId,
        history_months: priceHistory.length,
        shadow_mode,
      },
      confidence: result.confidence,
      citations: [
        { source: 'market_prices_secondary', period: input.periodDate, count: priceHistory.length },
        { source: 'transactions_log', period: input.periodDate },
        { source: 'zone_scores:DMX-IRE', period: input.periodDate },
        { source: 'zone_scores:DMX-MOM (history)', period: input.periodDate },
        { source: 'zone_scores:F08', period: input.periodDate },
      ],
      ...(result.trend_vs_previous !== null ? { trend_vs_previous: result.trend_vs_previous } : {}),
      ...(dir !== undefined ? { trend_direction: dir } : {}),
      provenance: {
        sources: [
          {
            name: 'market_prices_secondary',
            period: input.periodDate,
            count: priceHistory.length,
          },
          { name: 'transactions_log', period: input.periodDate, count: txCount ?? 0 },
          { name: 'zone_scores', period: input.periodDate },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zone_id: input.zoneId,
        score_band: result.components.score_band,
        volatility_36m_inv: String(result.components.volatility_36m_inv?.value ?? 'n/a'),
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default dmxStaCalculator;
