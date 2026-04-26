// DMX-ICO — Índice Costo Oportunidad. Categoría mercado, tier 3, country MX.
// Plan FASE 11 §DMX-ICO + Catálogo 03.8 §dmx-ico. Registry ver
// shared/lib/intelligence-engine/registry.ts L1542-1554.
//
// Fórmula:
//   yieldInmobiliario = (renta_mensual_avg × 12 / precio_m2) × 100   // % anual
//   yieldCetes         = macro_series[cetes_28d].value               // % anual
//   ICO = clamp((yieldInmobiliario - yieldCetes) / yieldCetes × 50 + 50, 0, 100)
//
// Requiere:
//   - market_prices_secondary rentas Y compras en la zona (operation='renta'/'venta')
//   - macro_series con series_id identificando cetes_28d en el período
// Si falta data alguna → confidence='insufficient_data' + value=0.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula:
    'yieldInmobiliario = (renta_mensual_avg × 12 / precio_m2) × 100. ICO = clamp((yieldRE - yieldCetes)/yieldCetes × 50 + 50, 0, 100).',
  sources: ['market_prices_secondary', 'macro_series:cetes_28d'],
  dependencies: [
    { score_id: 'market_prices_renta', weight: 0.5, role: 'yield_numerator', critical: true },
    { score_id: 'market_prices_venta', weight: 0.3, role: 'yield_denominator', critical: true },
    { score_id: 'macro_series:cetes_28d', weight: 0.2, role: 'risk_free', critical: true },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-ICO',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-ico-indice-costo-oportunidad',
    },
    { name: 'Plan FASE 11 §DMX-ICO', url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md' },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_listings_per_op: 5, high_listings_per_op: 25 },
  cetes_series_id: 'SF44070',
  cetes_source_candidates: ['banxico_SF44070', 'banxico'] as const,
  window_days: 90,
  circuit_breaker_pct: 20,
} as const;

export const reasoning_template =
  'DMX-ICO zona={zone_id}: {score_value}/100. Yield RE {yield_re}%, CETES28 {yield_cetes}%. Confianza {confidence}.';

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export type IcoLabel =
  | 'ie.index.dmx_ico.excelente'
  | 'ie.index.dmx_ico.bueno'
  | 'ie.index.dmx_ico.neutro'
  | 'ie.index.dmx_ico.malo'
  | 'ie.index.dmx_ico.insufficient';

export function getLabelKey(value: number, confidence: Confidence): IcoLabel {
  if (confidence === 'insufficient_data') return 'ie.index.dmx_ico.insufficient';
  if (value >= 75) return 'ie.index.dmx_ico.excelente';
  if (value >= 55) return 'ie.index.dmx_ico.bueno';
  if (value >= 40) return 'ie.index.dmx_ico.neutro';
  return 'ie.index.dmx_ico.malo';
}

export interface IcoComponentEntry {
  readonly value: number;
  readonly weight: number;
  readonly citation_source: string;
  readonly citation_period: string;
  readonly sample_count?: number;
}

export interface IcoConfidenceBreakdown {
  readonly data_freshness: number;
  readonly data_completeness: number;
  readonly sample_size: number;
  readonly methodology_maturity: number;
  readonly total: number;
}

export interface IcoComponents extends Record<string, unknown> {
  readonly renta_mensual_avg: IcoComponentEntry | null;
  readonly precio_m2_avg: IcoComponentEntry | null;
  readonly yield_inmobiliario: number | null;
  readonly yield_cetes: IcoComponentEntry | null;
  readonly spread: number | null;
  readonly n_rentas: number;
  readonly n_ventas: number;
  readonly _meta: {
    readonly confidence_breakdown: IcoConfidenceBreakdown;
    readonly circuit_breaker_triggered: boolean;
    readonly shadow: boolean;
    readonly previous_value: number | null;
  };
}

export interface IcoRawInput {
  readonly renta_mensual_avg: number | null;
  readonly precio_m2_avg: number | null;
  readonly yield_cetes: number | null;
  readonly n_rentas: number;
  readonly n_ventas: number;
  readonly period_date: string;
  readonly previous_value?: number | null;
  readonly data_staleness_days?: number;
}

export interface IcoComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: IcoComponents;
}

function computeConfidenceBreakdown(params: {
  readonly n_rentas: number;
  readonly n_ventas: number;
  readonly cetes_present: boolean;
  readonly staleness_days: number;
}): IcoConfidenceBreakdown {
  const completeness =
    (params.n_rentas > 0 ? 10 : 0) +
    (params.n_ventas > 0 ? 10 : 0) +
    (params.cetes_present ? 10 : 0);
  const stalenessClamped = Math.max(0, Math.min(90, params.staleness_days));
  const freshness = Math.round(((90 - stalenessClamped) / 90) * 30);
  const min = methodology.confidence_thresholds.min_listings_per_op;
  const high = methodology.confidence_thresholds.high_listings_per_op;
  const n = Math.min(params.n_rentas, params.n_ventas);
  const sampleScore =
    n <= 0 ? 0 : n >= high ? 20 : Math.round(Math.max(0, (n - min) / (high - min)) * 20);
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

export function computeIco(input: IcoRawInput): IcoComputeResult {
  const breakdown = computeConfidenceBreakdown({
    n_rentas: input.n_rentas,
    n_ventas: input.n_ventas,
    cetes_present: isFiniteNumber(input.yield_cetes),
    staleness_days: input.data_staleness_days ?? 0,
  });

  const minListings = methodology.confidence_thresholds.min_listings_per_op;
  const missingData =
    !isFiniteNumber(input.renta_mensual_avg) ||
    !isFiniteNumber(input.precio_m2_avg) ||
    input.precio_m2_avg <= 0 ||
    !isFiniteNumber(input.yield_cetes) ||
    input.yield_cetes <= 0 ||
    input.n_rentas < minListings ||
    input.n_ventas < minListings;

  if (missingData) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        renta_mensual_avg: isFiniteNumber(input.renta_mensual_avg)
          ? {
              value: Number(input.renta_mensual_avg.toFixed(2)),
              weight: 0.5,
              citation_source: 'market_prices_secondary:renta',
              citation_period: input.period_date,
              sample_count: input.n_rentas,
            }
          : null,
        precio_m2_avg: isFiniteNumber(input.precio_m2_avg)
          ? {
              value: Number(input.precio_m2_avg.toFixed(2)),
              weight: 0.3,
              citation_source: 'market_prices_secondary:venta',
              citation_period: input.period_date,
              sample_count: input.n_ventas,
            }
          : null,
        yield_inmobiliario: null,
        yield_cetes: isFiniteNumber(input.yield_cetes)
          ? {
              value: Number(input.yield_cetes.toFixed(3)),
              weight: 0.2,
              citation_source: 'macro_series:cetes_28d',
              citation_period: input.period_date,
            }
          : null,
        spread: null,
        n_rentas: input.n_rentas,
        n_ventas: input.n_ventas,
        _meta: {
          confidence_breakdown: breakdown,
          circuit_breaker_triggered: false,
          shadow: false,
          previous_value: input.previous_value ?? null,
        },
      },
    };
  }

  const rentaAnual = input.renta_mensual_avg * 12;
  const yield_inmobiliario = (rentaAnual / input.precio_m2_avg) * 100;
  const spread = yield_inmobiliario - input.yield_cetes;
  const raw = (spread / input.yield_cetes) * 50 + 50;
  const value = Math.round(clamp100(raw));

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
      renta_mensual_avg: {
        value: Number(input.renta_mensual_avg.toFixed(2)),
        weight: 0.5,
        citation_source: 'market_prices_secondary:renta',
        citation_period: input.period_date,
        sample_count: input.n_rentas,
      },
      precio_m2_avg: {
        value: Number(input.precio_m2_avg.toFixed(2)),
        weight: 0.3,
        citation_source: 'market_prices_secondary:venta',
        citation_period: input.period_date,
        sample_count: input.n_ventas,
      },
      yield_inmobiliario: Number(yield_inmobiliario.toFixed(3)),
      yield_cetes: {
        value: Number(input.yield_cetes.toFixed(3)),
        weight: 0.2,
        citation_source: 'macro_series:cetes_28d',
        citation_period: input.period_date,
      },
      spread: Number(spread.toFixed(3)),
      n_rentas: input.n_rentas,
      n_ventas: input.n_ventas,
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

interface MarketAggregate {
  readonly avg: number | null;
  readonly count: number;
  readonly max_staleness_days: number;
}

async function fetchMarketAggregate(
  supabase: SupabaseClient,
  params: {
    readonly countryCode: string;
    readonly zoneId: string | null;
    readonly periodDate: string;
    readonly operation: 'renta' | 'venta';
  },
): Promise<MarketAggregate> {
  const anchor = new Date(`${params.periodDate}T00:00:00Z`);
  const from = new Date(anchor.getTime());
  from.setUTCDate(from.getUTCDate() - methodology.window_days);
  const fromISO = from.toISOString().slice(0, 10);

  let q = castFrom(supabase, 'market_prices_secondary')
    .select('price_minor, area_built_m2, posted_at, operation')
    .eq('country_code', params.countryCode)
    .eq('operation', params.operation)
    .gte('posted_at', fromISO)
    .lte('posted_at', params.periodDate);

  if (params.zoneId) q = q.eq('zone_id', params.zoneId);

  const { data, error } = await q;
  if (error || !data) return { avg: null, count: 0, max_staleness_days: methodology.window_days };
  const rows = data as unknown as Array<{
    price_minor: number;
    area_built_m2: number | null;
    posted_at: string;
  }>;

  let sum = 0;
  let count = 0;
  let maxDays = 0;
  for (const r of rows) {
    if (!isFiniteNumber(r.price_minor) || r.price_minor <= 0) continue;
    if (params.operation === 'venta') {
      // Precio m² venta: price_minor (en centavos) → mayor → MXN. Dividir por area_built_m2.
      if (!isFiniteNumber(r.area_built_m2) || r.area_built_m2 <= 0) continue;
      const priceMxn = r.price_minor / 100;
      sum += priceMxn / r.area_built_m2;
    } else {
      // Renta mensual: price_minor (en centavos) → MXN.
      sum += r.price_minor / 100;
    }
    count += 1;
    const dt = new Date(`${r.posted_at}T00:00:00Z`);
    const days = Math.round((anchor.getTime() - dt.getTime()) / 86_400_000);
    if (days > maxDays) maxDays = days;
  }

  if (count === 0) return { avg: null, count: 0, max_staleness_days: methodology.window_days };
  return { avg: sum / count, count, max_staleness_days: maxDays };
}

async function fetchCetes28d(
  supabase: SupabaseClient,
  countryCode: string,
  periodDate: string,
): Promise<{ yield_pct: number | null; period_used: string | null; days_old: number }> {
  const anchor = new Date(`${periodDate}T00:00:00Z`);
  const from = new Date(anchor.getTime());
  from.setUTCDate(from.getUTCDate() - methodology.window_days);
  const fromISO = from.toISOString().slice(0, 10);
  const { data, error } = await castFrom(supabase, 'macro_series')
    .select('value, period_start, source, series_id')
    .eq('country_code', countryCode)
    .eq('series_id', methodology.cetes_series_id)
    .gte('period_start', fromISO)
    .lte('period_start', periodDate)
    .order('period_start', { ascending: false })
    .limit(1);
  if (error || !data)
    return { yield_pct: null, period_used: null, days_old: methodology.window_days };
  const rows = data as unknown as Array<{ value: number; period_start: string }>;
  const first = rows[0];
  if (!first || !isFiniteNumber(first.value)) {
    return { yield_pct: null, period_used: null, days_old: methodology.window_days };
  }
  const dt = new Date(`${first.period_start}T00:00:00Z`);
  const days = Math.round((anchor.getTime() - dt.getTime()) / 86_400_000);
  return { yield_pct: first.value, period_used: first.period_start, days_old: days };
}

async function fetchPreviousIco(
  supabase: SupabaseClient,
  zoneId: string | null,
  countryCode: string,
  periodDate: string,
): Promise<number | null> {
  try {
    let q = castFrom(supabase, 'dmx_indices')
      .select('value, period_date')
      .eq('country_code', countryCode)
      .eq('index_code', 'DMX-ICO')
      .lt('period_date', periodDate)
      .order('period_date', { ascending: false })
      .limit(1);
    if (zoneId) q = q.eq('zone_id', zoneId);
    const { data, error } = await q;
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

export const icoCalculator: Calculator = {
  scoreId: 'DMX-ICO',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const shadow_mode = input.params?.shadow_mode === true;
    const audit_log = input.params?.audit_log === true;

    const [rentas, ventas, cetes, previous_value] = await Promise.all([
      fetchMarketAggregate(supabase, {
        countryCode: input.countryCode,
        zoneId: input.zoneId ?? null,
        periodDate: input.periodDate,
        operation: 'renta',
      }),
      fetchMarketAggregate(supabase, {
        countryCode: input.countryCode,
        zoneId: input.zoneId ?? null,
        periodDate: input.periodDate,
        operation: 'venta',
      }),
      fetchCetes28d(supabase, input.countryCode, input.periodDate),
      fetchPreviousIco(supabase, input.zoneId ?? null, input.countryCode, input.periodDate),
    ]);

    const maxStaleness = Math.max(
      rentas.max_staleness_days,
      ventas.max_staleness_days,
      cetes.days_old,
    );

    const result = computeIco({
      renta_mensual_avg: rentas.avg,
      precio_m2_avg: ventas.avg,
      yield_cetes: cetes.yield_pct,
      n_rentas: rentas.count,
      n_ventas: ventas.count,
      period_date: input.periodDate,
      previous_value,
      data_staleness_days: maxStaleness,
    });

    const components_with_shadow: IcoComponents = {
      ...result.components,
      _meta: { ...result.components._meta, shadow: shadow_mode },
    };

    if (audit_log) {
      await writeAuditLog(supabase, {
        index_code: 'DMX-ICO',
        zone_id: input.zoneId ?? null,
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
        zoneId: input.zoneId ?? null,
        periodDate: input.periodDate,
        n_rentas: rentas.count,
        n_ventas: ventas.count,
        cetes_present: cetes.yield_pct !== null,
      },
      confidence: result.confidence,
      citations: [
        {
          source: 'market_prices_secondary:renta',
          period: input.periodDate,
          count: rentas.count,
        },
        {
          source: 'market_prices_secondary:venta',
          period: input.periodDate,
          count: ventas.count,
        },
        { source: 'macro_series:cetes_28d', period: cetes.period_used ?? input.periodDate },
      ],
      ...(trend_vs_previous !== undefined ? { trend_vs_previous } : {}),
      ...(trend_direction !== undefined ? { trend_direction } : {}),
      provenance: {
        sources: [
          {
            name: 'market_prices_secondary',
            period: input.periodDate,
            count: rentas.count + ventas.count,
          },
          {
            name: 'macro_series:cetes_28d',
            period: cetes.period_used ?? input.periodDate,
            count: cetes.yield_pct !== null ? 1 : 0,
          },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zone_id: input.zoneId ?? 'cdmx_aggregate',
        yield_re: result.components.yield_inmobiliario ?? 0,
        yield_cetes: result.components.yield_cetes?.value ?? 0,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default icoCalculator;
