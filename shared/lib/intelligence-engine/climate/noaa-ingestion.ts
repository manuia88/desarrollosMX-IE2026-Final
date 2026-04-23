// BLOQUE 11.P.1 — NOAA GHCND ingestion (H1 heuristic fallback).
//
// H1 SEED: ingestor heurístico determinístico basado en patrones CDMX
// conocidos (temperate_subtropical_highland) con variación por zona via
// hash estable del zone_id. NO llama API externa (NOAA GHCND requiere
// NOAA_API_TOKEN + station mapping por lat/lng — upgrade L140).
//
// H2 (L140 FASE 12 N5): reemplazar heuristicFetchMonthlyCDMX por fetchNoaaGhcnd
// que usa https://www.ncei.noaa.gov/cdo-web/api/v2/data. Rate limit 5 req/sec,
// 10K req/día free. Station lookup cache una-vez.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MonthlyAggregate } from '@/features/climate-twin/types';
import { DEFAULT_HISTORY_YEARS } from '@/features/climate-twin/types';
import type { Database } from '@/shared/types/database';

const CDMX_BASE_TEMP_C = 17.5; // anual promedio histórico CDMX.
const CDMX_BASE_RAINFALL_MM_MONTH = 70;
const CDMX_BASE_HUMIDITY = 55;

// Hash determinístico 0..1 desde string (FNV-1a 32-bit).
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Normaliza a 0..1.
  return (h >>> 0) / 0xffffffff;
}

function seasonalTempDelta(monthIndex0: number): number {
  // CDMX: pico abril ~22°C, mínimo enero ~14°C. Amplitud ~4°C.
  return 4 * Math.sin(((monthIndex0 - 1) / 12) * 2 * Math.PI);
}

function seasonalRainMultiplier(monthIndex0: number): number {
  // Lluvia CDMX: seco dic-abr, lluvioso may-oct. Sinusoide desfasada.
  return 0.3 + 1.5 * Math.max(0, Math.sin(((monthIndex0 - 4) / 12) * 2 * Math.PI));
}

export function heuristicMonthlyAggregate(zoneId: string, yearMonth: string): MonthlyAggregate {
  const [yStr, mStr] = yearMonth.split('-');
  const year = Number.parseInt(yStr ?? '0', 10);
  const month = Number.parseInt(mStr ?? '1', 10);
  const monthIdx = month - 1;
  const hzone = hash01(zoneId);
  const hmonth = hash01(`${zoneId}-${yearMonth}`);

  // Variación por zona: ±1.5°C (altitud/urbanidad), ±30% lluvia.
  const zoneTempBias = (hzone - 0.5) * 3;
  const zoneRainBias = 0.7 + hzone * 0.6;

  // Climate change delta lineal: +0.03°C/año desde 2011 base.
  const ccDelta = (year - 2011) * 0.03;

  const tempAvg = CDMX_BASE_TEMP_C + seasonalTempDelta(monthIdx) + zoneTempBias + ccDelta;
  const tempMax = tempAvg + 5 + hmonth * 2;
  const tempMin = tempAvg - 5 - hmonth * 2;

  const rainfall = Math.max(
    0,
    CDMX_BASE_RAINFALL_MM_MONTH *
      seasonalRainMultiplier(monthIdx) *
      zoneRainBias *
      (0.7 + hmonth * 0.6),
  );

  const humidity = CDMX_BASE_HUMIDITY + seasonalTempDelta(monthIdx) + (hzone - 0.5) * 20;

  // Eventos extremos (baja probabilidad por mes): heat, cold, flood.
  const extreme: Record<string, number> = {};
  if (tempMax > 28 + hmonth * 3) extreme.heat = 1;
  if (tempMin < 5) extreme.cold = 1;
  if (rainfall > 180) extreme.flood = 1;

  return {
    zone_id: zoneId,
    year_month: yearMonth,
    temp_avg: Math.round(tempAvg * 100) / 100,
    temp_max: Math.round(tempMax * 100) / 100,
    temp_min: Math.round(tempMin * 100) / 100,
    rainfall_mm: Math.round(rainfall * 10) / 10,
    humidity_avg: Math.round(humidity * 10) / 10,
    extreme_events_count: extreme,
    source: 'hybrid',
  };
}

export function generateMonthlyHistory(
  zoneId: string,
  historyYears: number = DEFAULT_HISTORY_YEARS,
): MonthlyAggregate[] {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const startYear = currentYear - historyYears;
  const out: MonthlyAggregate[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    const maxMonth = y === currentYear ? currentMonth : 12;
    for (let m = 1; m <= maxMonth; m++) {
      const ym = `${y}-${String(m).padStart(2, '0')}-01`;
      out.push(heuristicMonthlyAggregate(zoneId, ym));
    }
  }
  return out;
}

export interface IngestMonthlyResult {
  readonly zone_id: string;
  readonly rows_upserted: number;
  readonly skipped_existing: number;
}

export async function ingestMonthlyForZone(params: {
  readonly zoneId: string;
  readonly supabase: SupabaseClient<Database>;
  readonly historyYears?: number;
}): Promise<IngestMonthlyResult> {
  const { zoneId, supabase, historyYears } = params;
  const rows = generateMonthlyHistory(zoneId, historyYears);

  // Check existing (to skip recompute for SEED determinism — allows idempotent reruns).
  const ymList = rows.map((r) => r.year_month);
  const { data: existing } = await supabase
    .from('climate_monthly_aggregates')
    .select('year_month')
    .eq('zone_id', zoneId)
    .in('year_month', ymList);
  const existingSet = new Set(
    (existing ?? []).map((r) => r.year_month).filter((x): x is string => typeof x === 'string'),
  );

  const toInsert = rows.filter((r) => !existingSet.has(r.year_month));
  if (toInsert.length === 0) {
    return { zone_id: zoneId, rows_upserted: 0, skipped_existing: existingSet.size };
  }

  const payload = toInsert.map((r) => ({
    zone_id: r.zone_id,
    year_month: r.year_month,
    temp_avg: r.temp_avg,
    temp_max: r.temp_max,
    temp_min: r.temp_min,
    rainfall_mm: r.rainfall_mm,
    humidity_avg: r.humidity_avg,
    extreme_events_count: r.extreme_events_count,
    source: r.source,
  }));

  const { error } = await supabase
    .from('climate_monthly_aggregates')
    .upsert(payload, { onConflict: 'zone_id,year_month' });

  if (error) {
    throw new Error(`climate_monthly_aggregates upsert failed: ${error.message}`);
  }

  return {
    zone_id: zoneId,
    rows_upserted: toInsert.length,
    skipped_existing: existingSet.size,
  };
}

export async function batchIngestMonthlyCDMX(params: {
  readonly supabase: SupabaseClient<Database>;
  readonly historyYears?: number;
  readonly maxZones?: number;
}): Promise<{
  readonly total_zones: number;
  readonly total_rows_upserted: number;
}> {
  const { supabase, historyYears, maxZones = 200 } = params;

  const { data: zones, error } = await supabase
    .from('dmx_indices')
    .select('scope_id')
    .eq('scope_type', 'colonia')
    .eq('country_code', 'MX')
    .eq('index_code', 'DMX-LIV')
    .limit(maxZones);

  if (error || !zones) return { total_zones: 0, total_rows_upserted: 0 };

  const uniqueZones = Array.from(
    new Set(zones.map((z) => z.scope_id).filter((x): x is string => typeof x === 'string')),
  );

  let totalRows = 0;
  for (const zid of uniqueZones) {
    try {
      const r = await ingestMonthlyForZone({
        zoneId: zid,
        supabase,
        ...(historyYears !== undefined ? { historyYears } : {}),
      });
      totalRows += r.rows_upserted;
    } catch (err) {
      console.error('[climate-ingestion] zone failed', zid, err);
    }
  }

  return { total_zones: uniqueZones.length, total_rows_upserted: totalRows };
}
