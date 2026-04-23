// BLOQUE 11.P.2 — Climate twin signature + similarity engine.
//
// Pipeline:
//   1. buildClimateSignature: reduce 12 meses × N años de aggregates a
//      vector(12) con 12 features canónicas normalizadas 0..1.
//   2. persistAnnualSummaries: materializa summaries por año en
//      climate_annual_summaries.
//   3. findClimateTwins: cosine similarity entre signatures agregadas
//      (mean de los últimos N años).
//   4. persistTwinMatches: upsert en climate_twin_matches.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CLIMATE_METHODOLOGY,
  CLIMATE_SIGNATURE_DIM,
  type ClimateTwinResult,
  type MonthlyAggregate,
  SIGNATURE_FEATURES,
} from '@/features/climate-twin/types';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import type { Database, Json } from '@/shared/types/database';

const DEFAULT_TWIN_TOP_N = 10;
const DEFAULT_MIN_SIMILARITY = 70;
const MAX_CANDIDATE_ZONES = 500;

export function aggregateByYear(
  rows: readonly MonthlyAggregate[],
): Map<number, MonthlyAggregate[]> {
  const map = new Map<number, MonthlyAggregate[]>();
  for (const r of rows) {
    const year = Number.parseInt(r.year_month.slice(0, 4), 10);
    if (!Number.isFinite(year)) continue;
    const arr = map.get(year) ?? [];
    arr.push(r);
    map.set(year, arr);
  }
  return map;
}

function avg(xs: readonly (number | null)[]): number {
  const finite = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  if (finite.length === 0) return 0;
  return finite.reduce((a, b) => a + b, 0) / finite.length;
}

function sum(xs: readonly (number | null)[]): number {
  const finite = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return finite.reduce((a, b) => a + b, 0);
}

function range(xs: readonly (number | null)[]): number {
  const finite = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  if (finite.length === 0) return 0;
  return Math.max(...finite) - Math.min(...finite);
}

function normalize(x: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  const v = (x - min) / (max - min);
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function buildSignatureForYear(rows: readonly MonthlyAggregate[]): readonly number[] {
  // Limits canónicos para normalización (CDMX range + margen para escalabilidad).
  const TEMP_MIN = -5;
  const TEMP_MAX = 40;
  const RAIN_MIN = 0;
  const RAIN_MAX = 2500; // mm/year
  const HUMID_MIN = 0;
  const HUMID_MAX = 100;

  const tempAvgs = rows.map((r) => r.temp_avg);
  const tempMaxs = rows.map((r) => r.temp_max);
  const tempMins = rows.map((r) => r.temp_min);
  const rains = rows.map((r) => r.rainfall_mm);
  const humids = rows.map((r) => r.humidity_avg);

  const tempAvg = avg(tempAvgs);
  const tempRange = range([...tempMaxs, ...tempMins]);
  const rainfallTotalY = sum(rains);
  const rainfallVariability = rains.length
    ? Math.sqrt(
        rains
          .filter((x): x is number => typeof x === 'number')
          .reduce((acc, v) => acc + (v - rainfallTotalY / 12) ** 2, 0) / 12,
      )
    : 0;
  const humidAvg = avg(humids);
  const humidRange = range(humids);

  let extremeHeat = 0;
  let extremeCold = 0;
  let floodCount = 0;
  for (const r of rows) {
    const e = r.extreme_events_count;
    extremeHeat += typeof e.heat === 'number' ? e.heat : 0;
    extremeCold += typeof e.cold === 'number' ? e.cold : 0;
    floodCount += typeof e.flood === 'number' ? e.flood : 0;
  }
  const droughtScore = rainfallTotalY < 400 ? 1 : rainfallTotalY < 700 ? 0.5 : 0;
  const floodRisk = Math.min(1, floodCount / 6);

  // Seasonality: amplitud temp / base temp.
  const seasonalityIdx = tempAvg > 0 ? tempRange / Math.max(tempAvg, 1) : 0;

  // Climate change delta placeholder (calculated externamente en signature agregada).
  const ccDelta = 0;

  const features: readonly number[] = [
    normalize(tempAvg, TEMP_MIN, TEMP_MAX),
    normalize(tempRange, 0, 40),
    normalize(rainfallTotalY, RAIN_MIN, RAIN_MAX),
    normalize(rainfallVariability, 0, 100),
    normalize(humidAvg, HUMID_MIN, HUMID_MAX),
    normalize(humidRange, 0, 40),
    normalize(extremeHeat, 0, 20),
    normalize(extremeCold, 0, 20),
    floodRisk,
    droughtScore,
    Math.min(1, seasonalityIdx),
    Math.min(1, Math.max(0, ccDelta)),
  ];

  return features;
}

export function aggregateSignatures(perYear: Map<number, readonly number[]>): readonly number[] {
  const years = Array.from(perYear.keys()).sort((a, b) => a - b);
  if (years.length === 0) return new Array(CLIMATE_SIGNATURE_DIM).fill(0);

  const sum = new Array(CLIMATE_SIGNATURE_DIM).fill(0);
  for (const y of years) {
    const sig = perYear.get(y);
    if (!sig) continue;
    for (let i = 0; i < CLIMATE_SIGNATURE_DIM; i++) {
      sum[i] += sig[i] ?? 0;
    }
  }
  const mean = sum.map((v) => v / years.length);

  // Climate change delta (última feature): comparar primeros vs últimos 3 años temp_avg normalizado.
  const firstYearsSig = years.slice(0, 3).map((y) => perYear.get(y)?.[0] ?? 0);
  const lastYearsSig = years.slice(-3).map((y) => perYear.get(y)?.[0] ?? 0);
  const firstAvg = firstYearsSig.reduce((a, b) => a + b, 0) / firstYearsSig.length;
  const lastAvg = lastYearsSig.reduce((a, b) => a + b, 0) / lastYearsSig.length;
  mean[11] = Math.min(1, Math.max(0, (lastAvg - firstAvg) * 5 + 0.5));

  return mean;
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function buildAndPersistSignatures(params: {
  readonly zoneId: string;
  readonly supabase: SupabaseClient<Database>;
}): Promise<{ readonly signature: readonly number[]; readonly years_processed: number }> {
  const { zoneId, supabase } = params;
  const { data: rows, error } = await supabase
    .from('climate_monthly_aggregates')
    .select('*')
    .eq('zone_id', zoneId);

  if (error || !rows || rows.length === 0) {
    return { signature: new Array(CLIMATE_SIGNATURE_DIM).fill(0), years_processed: 0 };
  }

  const casted: MonthlyAggregate[] = rows.map((r) => ({
    zone_id: r.zone_id,
    year_month: r.year_month,
    temp_avg: r.temp_avg,
    temp_max: r.temp_max,
    temp_min: r.temp_min,
    rainfall_mm: r.rainfall_mm,
    humidity_avg: r.humidity_avg,
    extreme_events_count: (r.extreme_events_count ?? {}) as Readonly<Record<string, number>>,
    source: r.source as MonthlyAggregate['source'],
  }));

  const byYear = aggregateByYear(casted);
  const perYear = new Map<number, readonly number[]>();
  const annualUpsert: Array<{
    zone_id: string;
    year: number;
    composite_climate_signature: number[];
    summary: Json;
  }> = [];

  for (const [year, yearRows] of byYear) {
    const sig = buildSignatureForYear(yearRows);
    perYear.set(year, sig);
    annualUpsert.push({
      zone_id: zoneId,
      year,
      composite_climate_signature: Array.from(sig),
      summary: {
        months_observed: yearRows.length,
        source_breakdown: yearRows.reduce<Record<string, number>>((acc, r) => {
          acc[r.source] = (acc[r.source] ?? 0) + 1;
          return acc;
        }, {}),
      } as Json,
    });
  }

  if (annualUpsert.length > 0) {
    const { error: upErr } = await supabase
      .from('climate_annual_summaries')
      .upsert(annualUpsert, { onConflict: 'zone_id,year' });
    if (upErr) {
      console.error('[climate-twin] annual upsert failed', zoneId, upErr.message);
    }
  }

  const aggregated = aggregateSignatures(perYear);
  return { signature: aggregated, years_processed: byYear.size };
}

export interface FindClimateTwinsInput {
  readonly zoneId: string;
  readonly supabase: SupabaseClient<Database>;
  readonly topN?: number;
  readonly minSimilarity?: number;
  readonly countryCode?: string;
}

export async function findClimateTwins(input: FindClimateTwinsInput): Promise<ClimateTwinResult[]> {
  const topN = input.topN ?? DEFAULT_TWIN_TOP_N;
  const minSim = input.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const countryCode = input.countryCode ?? 'MX';
  const { zoneId, supabase } = input;

  const { data: selfSummaries } = await supabase
    .from('climate_annual_summaries')
    .select('year, composite_climate_signature')
    .eq('zone_id', zoneId);

  if (!selfSummaries || selfSummaries.length === 0) return [];

  const perYearSelf = new Map<number, readonly number[]>();
  for (const row of selfSummaries) {
    if (typeof row.year !== 'number') continue;
    const sig = row.composite_climate_signature;
    if (Array.isArray(sig) && sig.length === CLIMATE_SIGNATURE_DIM) {
      perYearSelf.set(
        row.year,
        sig.map((x) => Number(x)),
      );
    }
  }
  const selfSig = aggregateSignatures(perYearSelf);

  // Candidate zones: zonas con datos climáticos != self.
  const { data: candRows } = await supabase
    .from('climate_annual_summaries')
    .select('zone_id, year, composite_climate_signature')
    .neq('zone_id', zoneId)
    .limit(MAX_CANDIDATE_ZONES * 15);
  if (!candRows || candRows.length === 0) return [];

  const candMap = new Map<string, Map<number, readonly number[]>>();
  for (const r of candRows) {
    if (!r.zone_id || typeof r.year !== 'number') continue;
    const sig = r.composite_climate_signature;
    if (!Array.isArray(sig) || sig.length !== CLIMATE_SIGNATURE_DIM) continue;
    const inner = candMap.get(r.zone_id) ?? new Map<number, readonly number[]>();
    inner.set(
      r.year,
      sig.map((x) => Number(x)),
    );
    candMap.set(r.zone_id, inner);
  }

  const scored: Array<{ zone_id: string; similarity: number; sig: readonly number[] }> = [];
  for (const [cid, yearMap] of candMap) {
    const candSig = aggregateSignatures(yearMap);
    const sim = cosineSimilarity(selfSig, candSig) * 100;
    if (sim >= minSim) scored.push({ zone_id: cid, similarity: sim, sig: candSig });
  }
  scored.sort((a, b) => b.similarity - a.similarity);
  const top = scored.slice(0, topN);
  if (top.length === 0) return [];

  const labels = await Promise.all(
    top.map((t) =>
      resolveZoneLabel({
        scopeType: 'colonia',
        scopeId: t.zone_id,
        countryCode,
        supabase,
      }).catch(() => null),
    ),
  );

  return top.map((t, idx) => {
    // Shared patterns: features con diff < 0.1 entre self y cand.
    const shared: Record<string, number> = {};
    for (let i = 0; i < CLIMATE_SIGNATURE_DIM; i++) {
      const diff = Math.abs((selfSig[i] ?? 0) - (t.sig[i] ?? 0));
      if (diff < 0.1) {
        const feat = SIGNATURE_FEATURES[i];
        if (feat) shared[feat] = Math.round((1 - diff) * 100) / 100;
      }
    }
    return {
      zone_id: zoneId,
      twin_zone_id: t.zone_id,
      twin_label: labels[idx] ?? null,
      similarity: Math.round(t.similarity * 100) / 100,
      shared_patterns: shared,
    };
  });
}

export async function persistTwinMatches(params: {
  readonly zoneId: string;
  readonly twins: readonly ClimateTwinResult[];
  readonly supabase: SupabaseClient<Database>;
}): Promise<number> {
  const { zoneId, twins, supabase } = params;
  if (twins.length === 0) return 0;
  const payload = twins.map((t) => ({
    zone_id: zoneId,
    twin_zone_id: t.twin_zone_id,
    similarity: t.similarity,
    shared_patterns: t.shared_patterns as unknown as Json,
    methodology: CLIMATE_METHODOLOGY,
  }));
  const { error } = await supabase
    .from('climate_twin_matches')
    .upsert(payload, { onConflict: 'zone_id,twin_zone_id' });
  if (error) {
    console.error('[climate-twin] persist failed', zoneId, error.message);
    return 0;
  }
  return twins.length;
}

export async function refreshTwinsForZone(params: {
  readonly zoneId: string;
  readonly supabase: SupabaseClient<Database>;
  readonly topN?: number;
  readonly minSimilarity?: number;
}): Promise<{ readonly twins_persisted: number }> {
  const twins = await findClimateTwins({
    zoneId: params.zoneId,
    supabase: params.supabase,
    ...(params.topN !== undefined ? { topN: params.topN } : {}),
    ...(params.minSimilarity !== undefined ? { minSimilarity: params.minSimilarity } : {}),
  });
  const persisted = await persistTwinMatches({
    zoneId: params.zoneId,
    twins,
    supabase: params.supabase,
  });
  return { twins_persisted: persisted };
}
