// BLOQUE 11.P.2 (refactor pgvector) — Climate twin signature + similarity engine.
//
// Refactor FIX 11.O+P (filosofía escalable):
//   - climate_annual_summaries.composite_climate_signature: numeric[] → vector(12) + HNSW.
//   - Nueva tabla climate_zone_signatures (aggregate per-zone) para twin matching eficiente.
//   - findClimateTwins: NO materializa candidatos en Node. Usa RPC find_climate_twins
//     (cosine similarity DB-side via HNSW, O(log N) a escala nacional).
//   - pgvector se persiste como literal text '[0.1,0.2,...]' (compatible con supabase-js).
//
// Funciones puras (tests unitarios):
//   - aggregateByYear, avg, sum, range, normalize
//   - buildSignatureForYear → vector(12) normalizado [0..1]
//   - aggregateSignatures → mean over years + climate_change_delta
//   - cosineSimilarity (usada en tests; runtime delega al operador <=> de pgvector)

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

  const acc = new Array(CLIMATE_SIGNATURE_DIM).fill(0);
  for (const y of years) {
    const sig = perYear.get(y);
    if (!sig) continue;
    for (let i = 0; i < CLIMATE_SIGNATURE_DIM; i++) {
      acc[i] += sig[i] ?? 0;
    }
  }
  const mean = acc.map((v) => v / years.length);

  // Climate change delta (feature 11): primeros vs últimos 3 años en temp_avg normalizado.
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

// pgvector literal: '[0.1,0.2,...]' — formato que supabase-js acepta directamente.
function toPgVectorLiteral(v: readonly number[]): string {
  return `[${v.map((x) => x.toString()).join(',')}]`;
}

function parsePgVectorValue(v: unknown): number[] | null {
  if (Array.isArray(v)) {
    const arr = v.map((x) => Number(x));
    return arr.every((x) => Number.isFinite(x)) ? arr : null;
  }
  if (typeof v === 'string') {
    const trimmed = v.trim().replace(/^\[/, '').replace(/\]$/, '');
    if (!trimmed) return null;
    const parts = trimmed.split(',').map((s) => Number.parseFloat(s.trim()));
    return parts.every((x) => Number.isFinite(x)) ? parts : null;
  }
  return null;
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
    composite_climate_signature: string;
    summary: Json;
  }> = [];

  for (const [year, yearRows] of byYear) {
    const sig = buildSignatureForYear(yearRows);
    perYear.set(year, sig);
    annualUpsert.push({
      zone_id: zoneId,
      year,
      composite_climate_signature: toPgVectorLiteral(sig),
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
      console.error('[BLOQUE 11.P] annual upsert failed', zoneId, upErr.message);
    }
  }

  const aggregated = aggregateSignatures(perYear);

  // Persist zone-level aggregate signature en climate_zone_signatures (nueva tabla).
  const { error: zoneErr } = await supabase.from('climate_zone_signatures').upsert(
    {
      zone_id: zoneId,
      signature: toPgVectorLiteral(aggregated),
      years_observed: byYear.size,
      methodology: CLIMATE_METHODOLOGY,
    },
    { onConflict: 'zone_id' },
  );
  if (zoneErr) {
    console.error('[BLOQUE 11.P] zone signature upsert failed', zoneId, zoneErr.message);
  }

  return { signature: aggregated, years_processed: byYear.size };
}

export interface FindClimateTwinsInput {
  readonly zoneId: string;
  readonly supabase: SupabaseClient<Database>;
  readonly topN?: number;
  readonly minSimilarity?: number;
  readonly countryCode?: string;
}

interface RpcTwinRow {
  readonly twin_zone_id: string;
  readonly similarity: number;
}

export async function findClimateTwins(input: FindClimateTwinsInput): Promise<ClimateTwinResult[]> {
  const topN = input.topN ?? DEFAULT_TWIN_TOP_N;
  const minSim = input.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const countryCode = input.countryCode ?? 'MX';
  const { zoneId, supabase } = input;

  // RPC DB-side: O(log N) via HNSW cosine index sobre climate_zone_signatures.
  const { data: rpcRows, error: rpcErr } = await supabase.rpc('find_climate_twins', {
    p_zone_id: zoneId,
    p_top_n: topN,
    p_min_sim: minSim / 100, // RPC espera similarity 0..1.
  });

  if (rpcErr) {
    console.error('[BLOQUE 11.P] find_climate_twins RPC failed', zoneId, rpcErr.message);
    return [];
  }

  const twins = (rpcRows ?? []) as readonly RpcTwinRow[];
  if (twins.length === 0) return [];

  // Self signature (para extraer shared_patterns — features con diff < 0.1).
  const { data: selfRow } = await supabase
    .from('climate_zone_signatures')
    .select('signature')
    .eq('zone_id', zoneId)
    .maybeSingle();
  const selfVec = selfRow ? parsePgVectorValue(selfRow.signature) : null;

  // Batch fetch candidate signatures para diff de features.
  const twinIds = twins.map((t) => t.twin_zone_id);
  const { data: candRows } = await supabase
    .from('climate_zone_signatures')
    .select('zone_id, signature')
    .in('zone_id', twinIds);
  const candMap = new Map<string, number[]>();
  if (Array.isArray(candRows)) {
    for (const r of candRows) {
      if (typeof r.zone_id !== 'string') continue;
      const vec = parsePgVectorValue(r.signature);
      if (vec) candMap.set(r.zone_id, vec);
    }
  }

  const labels = await Promise.all(
    twins.map((t) =>
      resolveZoneLabel({
        scopeType: 'colonia',
        scopeId: t.twin_zone_id,
        countryCode,
        supabase,
      }).catch(() => null),
    ),
  );

  return twins.map((t, idx) => {
    const shared: Record<string, number> = {};
    if (selfVec) {
      const candVec = candMap.get(t.twin_zone_id);
      if (candVec) {
        for (let i = 0; i < CLIMATE_SIGNATURE_DIM; i++) {
          const diff = Math.abs((selfVec[i] ?? 0) - (candVec[i] ?? 0));
          if (diff < 0.1) {
            const feat = SIGNATURE_FEATURES[i];
            if (feat) shared[feat] = Math.round((1 - diff) * 100) / 100;
          }
        }
      }
    }
    return {
      zone_id: zoneId,
      twin_zone_id: t.twin_zone_id,
      twin_label: labels[idx] ?? null,
      similarity: Math.round(Number(t.similarity) * 100) / 100,
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
    console.error('[BLOQUE 11.P] persist twin matches failed', zoneId, error.message);
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
