#!/usr/bin/env node
/**
 * Batch compute climate signatures para zonas MX — synthetic heuristic v1 (H1).
 *
 * Hidrata 4 tablas:
 *   climate_monthly_aggregates  (1 row por zone × year × month, ±180 meses/zona)
 *   climate_annual_summaries    (1 row por zone × year, signature vector(12))
 *   climate_zone_signatures     (1 row por zone — rollup composite)
 *   climate_twin_matches        (top-5 por zone, cosine similarity 0-100%)
 *
 * Synthetic data (determinista via hashSeed) calibrada para CDMX: temp_avg
 * peaks en Mayo-Junio ~21°C, low en Dic-Ene ~11°C; monzón Mayo-Octubre.
 * Signature 12-dim = [temp, rain, hum, seasonality_t, seasonality_r,
 * hottest, coldest, wettest, driest, anomalies, trend_t, trend_r].
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/compute/10_compute-climate-signatures.ts
 *
 * Flags:
 *   --dry-run           Preview 3 zonas sin UPSERT.
 *   --limit-zones=N     Default 228, cap 300.
 *   --start-year=2011   Default 2011.
 *   --end-year=2026     Default 2026 (inclusive).
 *   --country=MX        Default MX.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../shared/types/database.ts';
import { withIngestRun } from '../ingest/lib/ingest-run-helper.ts';

type CliArgs = {
  dryRun: boolean;
  limitZones: number;
  startYear: number;
  endYear: number;
  country: string;
};

type ZoneRow = {
  id: string;
  scope_id: string;
  scope_type: string;
  country_code: string;
};

type MonthlyInsert = Database['public']['Tables']['climate_monthly_aggregates']['Insert'];
type AnnualInsert = Database['public']['Tables']['climate_annual_summaries']['Insert'];
type ZoneSigInsert = Database['public']['Tables']['climate_zone_signatures']['Insert'];
type TwinInsert = Database['public']['Tables']['climate_twin_matches']['Insert'];

export type ClimateType = 'tropical' | 'arid' | 'temperate' | 'cold' | 'humid_subtropical';
export type AnomalyFlag =
  | 'temp_high'
  | 'temp_low'
  | 'rainfall_high'
  | 'rainfall_low'
  | 'humidity_extreme';

export type MonthlyClimate = {
  year: number;
  month: number; // 1..12
  temp_avg: number;
  temp_max: number;
  temp_min: number;
  rainfall_mm: number;
  humidity_avg: number;
};

export type AnnualSummary = {
  year: number;
  avg_temp: number;
  total_rainfall: number;
  avg_humidity: number;
  seasonality_amplitude: number;
};

const DEFAULT_COUNTRY = 'MX';
const DEFAULT_LIMIT_ZONES = 228;
const MAX_ZONES_CAP = 300;
const DEFAULT_START_YEAR = 2011;
const DEFAULT_END_YEAR = 2026;
const SIGNATURE_DIM = 12;
const SOURCE = 'compute_climate_signatures';
const METHODOLOGY_VERSION = 'v1.0';
const CLIMATE_SOURCE = 'heuristic_v1';
const CHUNK_SIZE = 500;
const MAX_MONTHLY_ROWS = 54_000; // 300 zonas × 180 meses
const TOP_TWINS = 5;
const MIN_TWIN_SIMILARITY = 0.7; // cosine [0,1], converted to 70% lower bound

const ALLOWED_SCOPE_TYPES: readonly string[] = ['colonia', 'alcaldia', 'city', 'estado'];

const SIGNATURE_DIM_NAMES: readonly string[] = [
  'mean_annual_temp',
  'mean_annual_rainfall',
  'mean_humidity',
  'seasonality_amplitude_temp',
  'seasonality_amplitude_rainfall',
  'hottest_month_avg',
  'coldest_month_avg',
  'wettest_month_rainfall',
  'driest_month_rainfall',
  'extreme_events_frequency',
  'temp_trend_slope_15y',
  'rainfall_trend_slope_15y',
];

// Module-load sanity: 12 dim names exactly.
if (SIGNATURE_DIM_NAMES.length !== SIGNATURE_DIM) {
  throw new Error(
    `[compute-climate-signatures] SIGNATURE_DIM_NAMES length=${SIGNATURE_DIM_NAMES.length} ≠ ${SIGNATURE_DIM}`,
  );
}

/**
 * Deterministic hash (scope_id, bucket) → [0, 1).
 */
export function hashSeed(scopeId: string, bucket: number): number {
  let h = 2166136261 ^ bucket;
  for (let i = 0; i < scopeId.length; i++) {
    h = Math.imul(h ^ scopeId.charCodeAt(i), 16777619);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limitZones = DEFAULT_LIMIT_ZONES;
  let startYear = DEFAULT_START_YEAR;
  let endYear = DEFAULT_END_YEAR;
  let country = DEFAULT_COUNTRY;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--limit-zones=')) {
      const n = Number.parseInt(a.slice('--limit-zones='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-climate-signatures] --limit-zones inválido: "${a}"`);
      }
      limitZones = n;
    } else if (a.startsWith('--start-year=')) {
      const n = Number.parseInt(a.slice('--start-year='.length), 10);
      if (!Number.isFinite(n) || n < 2010 || n > 2030) {
        throw new Error(`[compute-climate-signatures] --start-year inválido: "${a}"`);
      }
      startYear = n;
    } else if (a.startsWith('--end-year=')) {
      const n = Number.parseInt(a.slice('--end-year='.length), 10);
      if (!Number.isFinite(n) || n < 2010 || n > 2030) {
        throw new Error(`[compute-climate-signatures] --end-year inválido: "${a}"`);
      }
      endYear = n;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).trim().toUpperCase();
      if (raw === '' || raw.length !== 2) {
        throw new Error(`[compute-climate-signatures] --country inválido: "${a}"`);
      }
      country = raw;
    }
  }
  if (limitZones > MAX_ZONES_CAP) {
    throw new Error(
      `[compute-climate-signatures] --limit-zones=${limitZones} excede cap=${MAX_ZONES_CAP}`,
    );
  }
  if (endYear < startYear) {
    throw new Error(
      `[compute-climate-signatures] --end-year=${endYear} < --start-year=${startYear}`,
    );
  }
  const totalMonths = limitZones * (endYear - startYear + 1) * 12;
  if (totalMonths > MAX_MONTHLY_ROWS) {
    throw new Error(
      `[compute-climate-signatures] total monthly rows=${totalMonths} excede cap=${MAX_MONTHLY_ROWS}`,
    );
  }
  return { dryRun, limitZones, startYear, endYear, country };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(`[compute-climate-signatures] Falta env var requerida: ${name}`);
  }
  return v;
}

/**
 * Monthly synthetic climate for (scopeId, year, month) — deterministic.
 * CDMX calibrated: temp peaks May-Jun ~21°C, lows Dec-Jan ~11°C.
 * Monsoon May-Oct (months 5..10) → high rainfall + humidity.
 */
export function computeSyntheticMonthly(
  scopeId: string,
  year: number,
  month: number,
): MonthlyClimate {
  const baseTempC = 16 + 5 * Math.sin(((month - 4) * Math.PI) / 6);
  const tempJitter = (hashSeed(`${scopeId}|${year}|${month}|temp`, 0) - 0.5) * 3;
  const tempAvg = baseTempC + tempJitter;

  const maxDelta = 4 + hashSeed(`${scopeId}|${year}|${month}|max`, 1) * 2;
  const minDelta = 4 + hashSeed(`${scopeId}|${year}|${month}|min`, 2) * 2;
  const tempMax = tempAvg + maxDelta;
  const tempMin = tempAvg - minDelta;

  const isMonsoon = month >= 5 && month <= 10;
  const rainBase = isMonsoon ? 100 : 20;
  const rainJitter = (hashSeed(`${scopeId}|${year}|${month}|rain`, 3) - 0.5) * 40;
  const rainfallMm = Math.max(0, rainBase + rainJitter);

  const humBase = 55 + (isMonsoon ? 15 : 0);
  const humJitter = (hashSeed(`${scopeId}|${year}|${month}|hum`, 4) - 0.5) * 10;
  const humidityAvg = clamp(humBase + humJitter, 0, 100);

  return {
    year,
    month,
    temp_avg: tempAvg,
    temp_max: tempMax,
    temp_min: tempMin,
    rainfall_mm: rainfallMm,
    humidity_avg: humidityAvg,
  };
}

/**
 * Build 12-month array for a given (scopeId, year).
 */
export function computeSyntheticYear(scopeId: string, year: number): MonthlyClimate[] {
  const out: MonthlyClimate[] = [];
  for (let m = 1; m <= 12; m++) {
    out.push(computeSyntheticMonthly(scopeId, year, m));
  }
  return out;
}

/**
 * Aggregate 12 monthly rows → annual summary.
 */
export function aggregateAnnual(months: readonly MonthlyClimate[]): AnnualSummary {
  if (months.length === 0) {
    throw new Error('[compute-climate-signatures] aggregateAnnual: empty months');
  }
  const firstMonth = months[0];
  if (firstMonth === undefined) {
    throw new Error('[compute-climate-signatures] aggregateAnnual: undefined first month');
  }
  const year = firstMonth.year;
  let sumTemp = 0;
  let sumRain = 0;
  let sumHum = 0;
  const temps: number[] = [];
  for (const m of months) {
    sumTemp += m.temp_avg;
    sumRain += m.rainfall_mm;
    sumHum += m.humidity_avg;
    temps.push(m.temp_avg);
  }
  const avgTemp = sumTemp / months.length;
  const avgHum = sumHum / months.length;
  // Seasonality amplitude = max(temp_avg) - min(temp_avg) across 12 months.
  const tMax = Math.max(...temps);
  const tMin = Math.min(...temps);
  const seasonality = tMax - tMin;
  return {
    year,
    avg_temp: avgTemp,
    total_rainfall: sumRain,
    avg_humidity: avgHum,
    seasonality_amplitude: seasonality,
  };
}

/**
 * Classify climate type based on annual rollup heuristic H1.
 */
export function classifyClimateType(avgTemp: number, totalRainfall: number): ClimateType {
  if (totalRainfall < 400) return 'arid';
  if (avgTemp > 25) return 'tropical';
  if (avgTemp >= 18 && avgTemp <= 25) return 'humid_subtropical';
  if (avgTemp >= 10 && avgTemp < 18) return 'temperate';
  return 'cold';
}

/**
 * Compute slope (simple linear regression slope) over pairs (x_i, y_i).
 */
export function computeSlope(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length !== ys.length || xs.length < 2) return 0;
  const n = xs.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    if (x === undefined || y === undefined) continue;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Stddev of an array (population — divide by N, not N-1).
 */
export function stddev(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / values.length;
  let sq = 0;
  for (const v of values) sq += (v - mean) * (v - mean);
  return Math.sqrt(sq / values.length);
}

/**
 * Mean helper.
 */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

/**
 * Build 12-dim signature vector from multi-year monthly data.
 * Each dim ∈ [0, 1].
 */
export function buildSignatureVector(
  allMonths: readonly MonthlyClimate[],
  anomaliesCount: number,
): number[] {
  if (allMonths.length === 0) {
    throw new Error('[compute-climate-signatures] buildSignatureVector: empty input');
  }
  // Group by year.
  const yearMap = new Map<number, MonthlyClimate[]>();
  for (const m of allMonths) {
    const arr = yearMap.get(m.year);
    if (arr === undefined) {
      yearMap.set(m.year, [m]);
    } else {
      arr.push(m);
    }
  }
  const years = [...yearMap.keys()].sort((a, b) => a - b);

  const annualTemps: number[] = [];
  const annualRainfalls: number[] = [];
  const annualHumidities: number[] = [];
  const monthlyTempStddevsByYear: number[] = [];
  const monthlyRainStddevsByYear: number[] = [];

  for (const y of years) {
    const yMonths = yearMap.get(y);
    if (yMonths === undefined || yMonths.length === 0) continue;
    const summary = aggregateAnnual(yMonths);
    annualTemps.push(summary.avg_temp);
    annualRainfalls.push(summary.total_rainfall);
    annualHumidities.push(summary.avg_humidity);
    monthlyTempStddevsByYear.push(stddev(yMonths.map((m) => m.temp_avg)));
    monthlyRainStddevsByYear.push(stddev(yMonths.map((m) => m.rainfall_mm)));
  }

  const meanTemp = mean(annualTemps);
  const meanRain = mean(annualRainfalls);
  const meanHum = mean(annualHumidities);

  const allMonthlyTemps = allMonths.map((m) => m.temp_avg);
  const allMonthlyRains = allMonths.map((m) => m.rainfall_mm);

  const hottestMonth = Math.max(...allMonthlyTemps);
  const coldestMonth = Math.min(...allMonthlyTemps);
  const wettestMonth = Math.max(...allMonthlyRains);
  const driestMonth = Math.min(...allMonthlyRains);

  const seasonalityTemp = mean(monthlyTempStddevsByYear);
  const seasonalityRain = mean(monthlyRainStddevsByYear);

  const tempSlope = computeSlope(years, annualTemps);
  const rainSlope = computeSlope(years, annualRainfalls);

  const anomalyFrequency = allMonths.length === 0 ? 0 : anomaliesCount / allMonths.length;

  const sig: number[] = [
    clamp((meanTemp + 5) / 40, 0, 1), // dim 0: mean_annual_temp normalized
    clamp(meanRain / 2000, 0, 1), // dim 1: mean_annual_rainfall
    clamp(meanHum / 100, 0, 1), // dim 2: mean_humidity
    clamp(seasonalityTemp / 20, 0, 1), // dim 3: seasonality_amplitude_temp
    clamp(seasonalityRain / 500, 0, 1), // dim 4: seasonality_amplitude_rainfall
    clamp(hottestMonth / 45, 0, 1), // dim 5: hottest_month_avg
    clamp((coldestMonth + 10) / 40, 0, 1), // dim 6: coldest_month_avg
    clamp(wettestMonth / 800, 0, 1), // dim 7: wettest_month_rainfall
    clamp(driestMonth / 100, 0, 1), // dim 8: driest_month_rainfall
    clamp(anomalyFrequency, 0, 1), // dim 9: extreme_events_frequency
    clamp((tempSlope + 2) / 4, 0, 1), // dim 10: temp_trend_slope
    clamp((rainSlope / 100 + 2) / 4, 0, 1), // dim 11: rainfall_trend_slope
  ];

  if (sig.length !== SIGNATURE_DIM) {
    throw new Error(
      `[compute-climate-signatures] buildSignatureVector length=${sig.length} ≠ ${SIGNATURE_DIM}`,
    );
  }
  return sig;
}

/**
 * pgvector text serialization with 8 decimals.
 */
export function serializeVector12(v: readonly number[]): string {
  if (v.length !== SIGNATURE_DIM) {
    throw new Error(
      `[compute-climate-signatures] serializeVector12: length=${v.length} ≠ ${SIGNATURE_DIM}`,
    );
  }
  return `[${v.map((x) => x.toFixed(8)).join(',')}]`;
}

/**
 * Anomaly detection: for each monthly row, compare its value vs mean+stddev
 * of same (zone, month-of-year) across all years. Flag if > mean + 2σ or
 * < mean - 2σ. Returns parallel array of AnomalyFlag[] per month.
 */
export function detectAnomalies(months: readonly MonthlyClimate[]): AnomalyFlag[][] {
  // Group by month-of-year.
  const byMonth = new Map<number, MonthlyClimate[]>();
  for (const m of months) {
    const arr = byMonth.get(m.month);
    if (arr === undefined) byMonth.set(m.month, [m]);
    else arr.push(m);
  }

  const statsByMonth = new Map<
    number,
    {
      tempMean: number;
      tempStd: number;
      rainMean: number;
      rainStd: number;
      humMean: number;
      humStd: number;
    }
  >();
  for (const [mo, arr] of byMonth.entries()) {
    statsByMonth.set(mo, {
      tempMean: mean(arr.map((x) => x.temp_avg)),
      tempStd: stddev(arr.map((x) => x.temp_avg)),
      rainMean: mean(arr.map((x) => x.rainfall_mm)),
      rainStd: stddev(arr.map((x) => x.rainfall_mm)),
      humMean: mean(arr.map((x) => x.humidity_avg)),
      humStd: stddev(arr.map((x) => x.humidity_avg)),
    });
  }

  return months.map((m) => {
    const flags: AnomalyFlag[] = [];
    const stats = statsByMonth.get(m.month);
    if (stats === undefined) return flags;
    if (stats.tempStd > 0) {
      if (m.temp_avg > stats.tempMean + 2 * stats.tempStd) flags.push('temp_high');
      else if (m.temp_avg < stats.tempMean - 2 * stats.tempStd) flags.push('temp_low');
    }
    if (stats.rainStd > 0) {
      if (m.rainfall_mm > stats.rainMean + 2 * stats.rainStd) flags.push('rainfall_high');
      else if (m.rainfall_mm < stats.rainMean - 2 * stats.rainStd) flags.push('rainfall_low');
    }
    if (stats.humStd > 0) {
      if (
        m.humidity_avg > stats.humMean + 2 * stats.humStd ||
        m.humidity_avg < stats.humMean - 2 * stats.humStd
      ) {
        flags.push('humidity_extreme');
      }
    }
    return flags;
  });
}

/**
 * Cosine similarity in [-1, 1]. Zero-magnitude guard returns 0.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai === undefined || bi === undefined) continue;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * For a source zone vector, rank candidates by cosine similarity (DESC).
 * Excludes self (matching by zoneId). Filters out candidates below minCosine.
 * Returns top-N `{ twinZoneId, similarityPct }` where similarityPct ∈ [0, 100].
 */
export function findTopTwins(
  zoneId: string,
  zoneVec: readonly number[],
  candidates: ReadonlyArray<{ zoneId: string; vec: number[] }>,
  topN: number,
  minCosine: number,
): Array<{ twinZoneId: string; similarityPct: number }> {
  const scored: Array<{ twinZoneId: string; cosine: number }> = [];
  for (const c of candidates) {
    if (c.zoneId === zoneId) continue;
    const cos = cosineSimilarity(zoneVec, c.vec);
    if (cos < minCosine) continue;
    scored.push({ twinZoneId: c.zoneId, cosine: cos });
  }
  scored.sort((a, b) => b.cosine - a.cosine);
  return scored.slice(0, topN).map((s) => ({
    twinZoneId: s.twinZoneId,
    // Cosine of non-negative vectors in [0,1] → percentage. Clamp negatives to 0.
    similarityPct: clamp(s.cosine, 0, 1) * 100,
  }));
}

export async function fetchClimateZones(
  supabase: SupabaseClient<Database>,
  country: string,
  limit: number,
): Promise<ZoneRow[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, scope_id, scope_type, country_code')
    .eq('country_code', country)
    .in('scope_type', ALLOWED_SCOPE_TYPES as string[])
    .order('scope_id', { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`[compute-climate-signatures] zones fetch: ${error.message}`);
  }
  return (data ?? []) as ZoneRow[];
}

function yearMonthStr(year: number, month: number): string {
  const mm = month.toString().padStart(2, '0');
  return `${year}-${mm}-01`;
}

async function upsertMonthlyChunked(
  supabase: SupabaseClient<Database>,
  rows: MonthlyInsert[],
): Promise<{ processed: number; dlq: number }> {
  let processed = 0;
  let dlq = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('climate_monthly_aggregates')
      .upsert(chunk, { onConflict: 'zone_id,year_month' });
    if (error) {
      dlq += chunk.length;
      console.error(
        `[compute-climate-signatures] monthly upsert chunk fail [${i}..${i + chunk.length}]: ${error.message}`,
      );
    } else {
      processed += chunk.length;
    }
  }
  return { processed, dlq };
}

async function upsertAnnualChunked(
  supabase: SupabaseClient<Database>,
  rows: AnnualInsert[],
): Promise<{ processed: number; dlq: number }> {
  let processed = 0;
  let dlq = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('climate_annual_summaries')
      .upsert(chunk, { onConflict: 'zone_id,year' });
    if (error) {
      dlq += chunk.length;
      console.error(`[compute-climate-signatures] annual upsert chunk fail: ${error.message}`);
    } else {
      processed += chunk.length;
    }
  }
  return { processed, dlq };
}

async function upsertZoneSignaturesChunked(
  supabase: SupabaseClient<Database>,
  rows: ZoneSigInsert[],
): Promise<{ processed: number; dlq: number }> {
  let processed = 0;
  let dlq = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('climate_zone_signatures')
      .upsert(chunk, { onConflict: 'zone_id' });
    if (error) {
      dlq += chunk.length;
      console.error(
        `[compute-climate-signatures] zone_signatures upsert chunk fail: ${error.message}`,
      );
    } else {
      processed += chunk.length;
    }
  }
  return { processed, dlq };
}

async function upsertTwinsChunked(
  supabase: SupabaseClient<Database>,
  rows: TwinInsert[],
): Promise<{ processed: number; dlq: number }> {
  let processed = 0;
  let dlq = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('climate_twin_matches')
      .upsert(chunk, { onConflict: 'zone_id,twin_zone_id' });
    if (error) {
      dlq += chunk.length;
      console.error(
        `[compute-climate-signatures] twin_matches upsert chunk fail: ${error.message}`,
      );
    } else {
      processed += chunk.length;
    }
  }
  return { processed, dlq };
}

type ZoneComputeResult = {
  zoneId: string;
  monthly: MonthlyInsert[];
  annual: AnnualInsert[];
  signature: ZoneSigInsert;
  signatureVec: number[];
};

function computeForZone(
  zone: ZoneRow,
  startYear: number,
  endYear: number,
  computedAt: string,
): ZoneComputeResult {
  const allMonths: MonthlyClimate[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const months = computeSyntheticYear(zone.scope_id, y);
    for (const m of months) allMonths.push(m);
  }

  const flagsPerMonth = detectAnomalies(allMonths);
  let totalAnomalies = 0;
  const monthlyInserts: MonthlyInsert[] = allMonths.map((m, idx) => {
    const flags = flagsPerMonth[idx] ?? [];
    totalAnomalies += flags.length;
    const extremeEvents: Record<string, AnomalyFlag[]> =
      flags.length > 0 ? { anomalies_flags: flags } : {};
    return {
      zone_id: zone.id,
      year_month: yearMonthStr(m.year, m.month),
      temp_avg: Number(m.temp_avg.toFixed(2)),
      temp_max: Number(m.temp_max.toFixed(2)),
      temp_min: Number(m.temp_min.toFixed(2)),
      rainfall_mm: Number(m.rainfall_mm.toFixed(2)),
      humidity_avg: Number(m.humidity_avg.toFixed(2)),
      extreme_events_count: extremeEvents as unknown as Json,
      source: CLIMATE_SOURCE,
      computed_at: computedAt,
    };
  });

  const signatureVec = buildSignatureVector(allMonths, totalAnomalies);
  const signatureText = serializeVector12(signatureVec);

  const annualInserts: AnnualInsert[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const yearMonths = allMonths.filter((m) => m.year === y);
    if (yearMonths.length === 0) continue;
    const summary = aggregateAnnual(yearMonths);
    const climateType = classifyClimateType(summary.avg_temp, summary.total_rainfall);
    const summaryJson: Record<string, number> = {
      avg_temp: Number(summary.avg_temp.toFixed(3)),
      total_rainfall: Number(summary.total_rainfall.toFixed(2)),
      avg_humidity: Number(summary.avg_humidity.toFixed(2)),
      seasonality_amplitude: Number(summary.seasonality_amplitude.toFixed(3)),
    };
    annualInserts.push({
      zone_id: zone.id,
      year: y,
      climate_type: climateType,
      composite_climate_signature: signatureText,
      summary: summaryJson as unknown as Json,
      computed_at: computedAt,
    });
  }

  const signatureInsert: ZoneSigInsert = {
    zone_id: zone.id,
    signature: signatureText,
    years_observed: endYear - startYear + 1,
    methodology: CLIMATE_SOURCE,
    computed_at: computedAt,
  };

  return {
    zoneId: zone.id,
    monthly: monthlyInserts,
    annual: annualInserts,
    signature: signatureInsert,
    signatureVec,
  };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const tag = '[compute-climate-signatures]';
  console.log(
    `${tag} dryRun=${args.dryRun} country=${args.country} limitZones=${args.limitZones} years=${args.startYear}-${args.endYear}`,
  );

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const zones = await fetchClimateZones(supabase, args.country, args.limitZones);
  console.log(`${tag} zones_matched=${zones.length}`);

  if (zones.length === 0) {
    console.warn(`${tag} No hay zonas para country=${args.country}. Exit clean.`);
    return 0;
  }

  const computedAt = new Date().toISOString();

  if (args.dryRun) {
    const sample = zones.slice(0, 3);
    for (const zone of sample) {
      const res = computeForZone(zone, args.startYear, args.endYear, computedAt);
      const anomalies = res.monthly.filter((r) => {
        const ee = r.extreme_events_count as Record<string, unknown> | undefined;
        if (ee === undefined) return false;
        const flags = ee.anomalies_flags;
        return Array.isArray(flags) && flags.length > 0;
      }).length;
      console.log(
        `${tag} DRY scope_id=${zone.scope_id} monthly=${res.monthly.length} annual=${res.annual.length} anomalies=${anomalies} sig_preview=${res.signature.signature.slice(0, 60)}...`,
      );
    }
    console.log(
      `${tag} DRY RUN — would upsert monthly=${zones.length * (args.endYear - args.startYear + 1) * 12} annual=${zones.length * (args.endYear - args.startYear + 1)} signatures=${zones.length}`,
    );
    return 0;
  }

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: args.country,
      triggeredBy: 'cli:compute-climate-signatures',
      expectedPeriodicity: 'monthly',
      meta: {
        script: '10_compute-climate-signatures.ts',
        zones_total: zones.length,
        years_range: `${args.startYear}-${args.endYear}`,
        methodology_version: METHODOLOGY_VERSION,
      },
    },
    async () => {
      const inserted = 0;
      let updated = 0;
      const skipped = 0;
      let dlq = 0;

      const allMonthly: MonthlyInsert[] = [];
      const allAnnual: AnnualInsert[] = [];
      const allSignatures: ZoneSigInsert[] = [];
      const vecsByZone: Array<{ zoneId: string; vec: number[] }> = [];

      for (const zone of zones) {
        try {
          const res = computeForZone(zone, args.startYear, args.endYear, computedAt);
          for (const r of res.monthly) allMonthly.push(r);
          for (const r of res.annual) allAnnual.push(r);
          allSignatures.push(res.signature);
          vecsByZone.push({ zoneId: zone.id, vec: res.signatureVec });
        } catch (e) {
          dlq += 1;
          console.error(
            `${tag} compute fail scope_id=${zone.scope_id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      const monthlyRes = await upsertMonthlyChunked(supabase, allMonthly);
      updated += monthlyRes.processed;
      dlq += monthlyRes.dlq;

      const annualRes = await upsertAnnualChunked(supabase, allAnnual);
      updated += annualRes.processed;
      dlq += annualRes.dlq;

      const sigRes = await upsertZoneSignaturesChunked(supabase, allSignatures);
      updated += sigRes.processed;
      dlq += sigRes.dlq;

      // Twin matches (JS-side cosine) — top-5 per zone.
      const allTwins: TwinInsert[] = [];
      for (const src of vecsByZone) {
        const twins = findTopTwins(src.zoneId, src.vec, vecsByZone, TOP_TWINS, MIN_TWIN_SIMILARITY);
        for (const t of twins) {
          allTwins.push({
            zone_id: src.zoneId,
            twin_zone_id: t.twinZoneId,
            similarity: Number(t.similarityPct.toFixed(4)),
            shared_patterns: { dims: SIGNATURE_DIM_NAMES } as unknown as Json,
            methodology: CLIMATE_SOURCE,
            computed_at: computedAt,
          });
        }
      }
      const twinRes = await upsertTwinsChunked(supabase, allTwins);
      updated += twinRes.processed;
      dlq += twinRes.dlq;

      return {
        counts: { inserted, updated, skipped, dlq },
        lastSuccessfulPeriodEnd: new Date().toISOString().slice(0, 10),
      };
    },
  );

  console.log(
    `${tag} done: status=${result.status} counts=${JSON.stringify(result.counts)} duration_ms=${result.durationMs}`,
  );
  return result.status === 'success' ? 0 : 1;
}

const invokedAsScript =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedAsScript) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error('[compute-climate-signatures] FATAL:', err);
      process.exit(1);
    });
}
