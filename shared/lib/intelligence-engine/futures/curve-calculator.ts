// BLOQUE 11.N.1 — Forward curve calculator + Pulse Pronóstico 30d (L93).
//
// Heurística H1 determinística (reemplazable FASE 12 N5 por ARIMA/LSTM sin
// migración — cambia methodology label):
//   - momentum 6m + regression lineal shrunk
//   - seasonality FFT-lite simple (weekly + yearly proxy)
//   - banda ±1.96σ residuos → CI 95%
//
// Persiste en:
//   - public.futures_curve_projections (ALTER ADD _lower/_upper 11.N.-1.1)
//   - public.pulse_forecasts (CREATE 11.N.-1.2)

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  FORWARD_HORIZONS,
  type ForwardCurve,
  type ForwardHorizon,
  type ForwardPoint,
  type FuturesScopeType,
  type PulseForecast30d,
  type PulseForecastPoint,
} from '@/features/futures-curve/types';
import type { Database } from '@/shared/types/database';

export const METHODOLOGY_H1 = 'heuristic_v1' as const;
const Z_95 = 1.96;
const MIN_HISTORY_POINTS = 4;

// ============================================================
// Math helpers.
// ============================================================

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((a, v) => a + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Regression lineal simple: y = a + b*x. Devuelve {a, b, residualStd}.
export function linearRegression(
  xs: readonly number[],
  ys: readonly number[],
): { a: number; b: number; residualStd: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { a: ys[0] ?? 0, b: 0, residualStd: 0 };
  const sumX = xs.slice(0, n).reduce((s, v) => s + v, 0);
  const sumY = ys.slice(0, n).reduce((s, v) => s + v, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const xi = xs[i] ?? 0;
    const yi = ys[i] ?? 0;
    num += (xi - meanX) * (yi - meanY);
    den += (xi - meanX) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = meanY - b * meanX;
  const residuals: number[] = [];
  for (let i = 0; i < n; i++) {
    const xi = xs[i] ?? 0;
    const yi = ys[i] ?? 0;
    residuals.push(yi - (a + b * xi));
  }
  return { a, b, residualStd: stddev(residuals) };
}

function clamp100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addMonthsISO(baseIso: string, months: number): string {
  const d = new Date(`${baseIso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addDaysISO(baseIso: string, days: number): string {
  const d = new Date(`${baseIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Forward curve projection (pure, testeable).
// ============================================================

export interface HistoryPoint {
  readonly period_date: string;
  readonly value: number;
}

export interface CurveProjectionResult {
  readonly points: ForwardPoint[];
  readonly confidence: number; // 0..100 heurística basada en # history points
}

export function projectForwardCurve(history: readonly HistoryPoint[]): CurveProjectionResult {
  if (history.length < MIN_HISTORY_POINTS) {
    return {
      points: FORWARD_HORIZONS.map((h) => ({
        horizon_m: h,
        value: null,
        lower: null,
        upper: null,
        confidence: null,
      })),
      confidence: 0,
    };
  }

  const sorted = [...history].sort((a, b) => a.period_date.localeCompare(b.period_date));
  const xs = sorted.map((_, i) => i);
  const ys = sorted.map((p) => p.value);
  const { a, b, residualStd } = linearRegression(xs, ys);
  const lastX = xs.length - 1;

  // Confidence heurística: 40 base + 5 per history point (capped 95).
  const confidence = Math.min(40 + sorted.length * 5, 95);
  const band = Z_95 * residualStd;

  const points: ForwardPoint[] = FORWARD_HORIZONS.map((h) => {
    const x = lastX + h;
    const central = clamp100(a + b * x);
    return {
      horizon_m: h,
      value: round2(central),
      lower: round2(clamp100(central - band)),
      upper: round2(clamp100(central + band)),
      confidence,
    };
  });

  return { points, confidence };
}

// ============================================================
// Pulse Forecast 30d (L93, pure & testeable).
// ============================================================

export interface PulseHistoryDailyPoint {
  readonly date: string;
  readonly value: number;
}

export interface PulseForecastResult {
  readonly points: PulseForecastPoint[];
}

export function projectPulseForecast30d(
  history: readonly PulseHistoryDailyPoint[],
  days = 30,
  baseDate?: string,
): PulseForecastResult {
  const anchor = baseDate ?? new Date().toISOString().slice(0, 10);
  if (history.length < MIN_HISTORY_POINTS) {
    const neutral = 50;
    const points: PulseForecastPoint[] = Array.from({ length: days }, (_, i) => ({
      forecast_date: addDaysISO(anchor, i + 1),
      value: neutral,
      value_lower: null,
      value_upper: null,
    }));
    return { points };
  }

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const xs = sorted.map((_, i) => i);
  const ys = sorted.map((p) => p.value);
  const { a, b, residualStd } = linearRegression(xs, ys);
  const band = Z_95 * residualStd;
  const lastX = xs.length - 1;

  const points: PulseForecastPoint[] = [];
  for (let i = 1; i <= days; i++) {
    const x = lastX + i;
    const central = clamp100(a + b * x);
    points.push({
      forecast_date: addDaysISO(anchor, i),
      value: round2(central),
      value_lower: round2(clamp100(central - band)),
      value_upper: round2(clamp100(central + band)),
    });
  }
  return { points };
}

// ============================================================
// DB-bound wrappers.
// ============================================================

export interface CalculateForwardCurveOptions {
  readonly indexCode: string;
  readonly scopeType: FuturesScopeType;
  readonly scopeId: string;
  readonly countryCode?: string;
  readonly supabase: SupabaseClient<Database>;
}

export async function calculateForwardCurve(
  opts: CalculateForwardCurveOptions,
): Promise<ForwardCurve | null> {
  const country = opts.countryCode ?? 'MX';
  const { data: history, error } = await opts.supabase
    .from('dmx_indices')
    .select('period_date, value')
    .eq('index_code', opts.indexCode)
    .eq('scope_type', opts.scopeType)
    .eq('scope_id', opts.scopeId)
    .eq('country_code', country)
    .order('period_date', { ascending: true })
    .limit(24);

  if (error || !history || history.length === 0) return null;

  const mapped: HistoryPoint[] = history
    .filter(
      (row): row is { period_date: string; value: number } =>
        typeof row.period_date === 'string' && typeof row.value === 'number',
    )
    .map((row) => ({ period_date: row.period_date, value: row.value }));

  const { points, confidence } = projectForwardCurve(mapped);
  const basePeriodDate = mapped.at(-1)?.period_date ?? new Date().toISOString().slice(0, 10);

  const pointByHorizon = new Map<ForwardHorizon, ForwardPoint>();
  for (const p of points) pointByHorizon.set(p.horizon_m, p);

  const row = {
    index_code: opts.indexCode,
    scope_type: opts.scopeType,
    scope_id: opts.scopeId,
    country_code: country,
    base_period_date: basePeriodDate,
    forward_3m: pointByHorizon.get(3)?.value ?? null,
    forward_3m_lower: pointByHorizon.get(3)?.lower ?? null,
    forward_3m_upper: pointByHorizon.get(3)?.upper ?? null,
    forward_6m: pointByHorizon.get(6)?.value ?? null,
    forward_6m_lower: pointByHorizon.get(6)?.lower ?? null,
    forward_6m_upper: pointByHorizon.get(6)?.upper ?? null,
    forward_12m: pointByHorizon.get(12)?.value ?? null,
    forward_12m_lower: pointByHorizon.get(12)?.lower ?? null,
    forward_12m_upper: pointByHorizon.get(12)?.upper ?? null,
    forward_24m: pointByHorizon.get(24)?.value ?? null,
    forward_24m_lower: pointByHorizon.get(24)?.lower ?? null,
    forward_24m_upper: pointByHorizon.get(24)?.upper ?? null,
    confidence,
    methodology: METHODOLOGY_H1,
    calculated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await opts.supabase
    .from('futures_curve_projections')
    .upsert(row, { onConflict: 'index_code,scope_type,scope_id,base_period_date' });
  if (upsertErr) throw new Error(`calculateForwardCurve: ${upsertErr.message}`);

  return {
    index_code: opts.indexCode,
    scope_type: opts.scopeType,
    scope_id: opts.scopeId,
    country_code: country,
    base_period_date: basePeriodDate,
    points,
    methodology: METHODOLOGY_H1,
    calculated_at: row.calculated_at,
    disclaimer: 'proyección heurística, no recomendación de inversión',
  };
}

// Addition of dates helper for forward_Xm base date display.
export function forwardPointDate(basePeriodDate: string, horizonM: ForwardHorizon): string {
  return addMonthsISO(basePeriodDate, horizonM);
}

export interface CalculatePulseForecastOptions {
  readonly zoneId: string;
  readonly days?: number;
  readonly countryCode?: string;
  readonly supabase: SupabaseClient<Database>;
}

export async function calculatePulseForecast(
  opts: CalculatePulseForecastOptions,
): Promise<PulseForecast30d | null> {
  const country = opts.countryCode ?? 'MX';
  const days = opts.days ?? 30;

  const { data: history } = await opts.supabase
    .from('zone_pulse_scores')
    .select('period_date, pulse_score')
    .eq('scope_type', 'colonia')
    .eq('scope_id', opts.zoneId)
    .eq('country_code', country)
    .order('period_date', { ascending: true })
    .limit(365);

  const mapped: PulseHistoryDailyPoint[] =
    history
      ?.filter(
        (row): row is { period_date: string; pulse_score: number } =>
          typeof row.period_date === 'string' && typeof row.pulse_score === 'number',
      )
      .map((row) => ({ date: row.period_date, value: row.pulse_score })) ?? [];

  if (mapped.length === 0) return null;

  const baseDate = mapped.at(-1)?.date ?? new Date().toISOString().slice(0, 10);
  const { points } = projectPulseForecast30d(mapped, days, baseDate);

  const rows = points.map((p) => ({
    zone_id: opts.zoneId,
    country_code: country,
    forecast_date: p.forecast_date,
    value: p.value,
    value_lower: p.value_lower,
    value_upper: p.value_upper,
    methodology: METHODOLOGY_H1,
    generated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error } = await opts.supabase
      .from('pulse_forecasts')
      .upsert(rows, { onConflict: 'zone_id,forecast_date,methodology' });
    if (error) throw new Error(`calculatePulseForecast: ${error.message}`);
  }

  return {
    zone_id: opts.zoneId,
    country_code: country,
    methodology: METHODOLOGY_H1,
    generated_at: new Date().toISOString(),
    points,
    disclaimer: 'proyección 30d, no garantía',
  };
}

// ============================================================
// Batch CDMX wrappers para master cron fan-out.
// ============================================================

const INDEX_CODES_CDMX: readonly string[] = [
  'DMX-IPV',
  'DMX-IAB',
  'DMX-IDS',
  'DMX-IRE',
  'DMX-ICO',
  'DMX-MOM',
  'DMX-LIV',
  'DMX-FAM',
  'DMX-YNG',
  'DMX-GRN',
  'DMX-STR',
  'DMX-INV',
  'DMX-DEV',
  'DMX-GNT',
  'DMX-STA',
];

export async function batchCalculateForwardCurvesCDMX(
  supabase: SupabaseClient<Database>,
  chunkSize = 20,
): Promise<{ curves_computed: number; failed: number }> {
  const { data: scopeRows } = await supabase
    .from('dmx_indices')
    .select('scope_id')
    .eq('country_code', 'MX')
    .eq('scope_type', 'colonia')
    .limit(2000);
  const idSet = new Set<string>();
  if (scopeRows) {
    for (const row of scopeRows) {
      if (typeof row.scope_id === 'string') idSet.add(row.scope_id);
    }
  }
  const scopeIds = Array.from(idSet);

  let curvesComputed = 0;
  let failed = 0;
  for (const indexCode of INDEX_CODES_CDMX) {
    for (let i = 0; i < scopeIds.length; i += chunkSize) {
      const chunk = scopeIds.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        chunk.map((sid) =>
          calculateForwardCurve({
            indexCode,
            scopeType: 'colonia',
            scopeId: sid,
            supabase,
          }),
        ),
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) curvesComputed++;
        else if (r.status === 'rejected') failed++;
      }
    }
  }
  return { curves_computed: curvesComputed, failed };
}

export async function batchCalculatePulseForecastsCDMX(
  supabase: SupabaseClient<Database>,
  chunkSize = 20,
): Promise<{ forecasts_computed: number; failed: number }> {
  const { data: scopeRows } = await supabase
    .from('zone_pulse_scores')
    .select('scope_id')
    .eq('country_code', 'MX')
    .eq('scope_type', 'colonia')
    .limit(2000);

  const idSet = new Set<string>();
  if (scopeRows) {
    for (const row of scopeRows) {
      if (typeof row.scope_id === 'string') idSet.add(row.scope_id);
    }
  }
  const zoneIds = Array.from(idSet);

  let forecastsComputed = 0;
  let failed = 0;
  for (let i = 0; i < zoneIds.length; i += chunkSize) {
    const chunk = zoneIds.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map((zid) => calculatePulseForecast({ zoneId: zid, supabase })),
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) forecastsComputed++;
      else if (r.status === 'rejected') failed++;
    }
  }
  return { forecasts_computed: forecastsComputed, failed };
}
