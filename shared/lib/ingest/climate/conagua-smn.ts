// CONAGUA SMN — Normales Climatológicas Diarios scraper (CDMX state code 09).
//
// Source: tools/RESOURCES/Normales_Climatologicas/Diarios/df/dia<NNNNN>.txt
// One TAB-delimited UTF-8 file per station, all-time data (1921-present).
// Columns: FECHA \t PRECIP \t EVAP \t TMAX \t TMIN. Missing = literal `NULO`.
// 13 CDMX active stations cover 2010-2025.
//
// F1.B 2026-04-26: replaces H2 STUB throw with real fetcher. No humidity in
// archive — humidity_avg = NULL on source='conagua' rows; blend layer can
// promote to source='hybrid' when paired with NOAA temp.

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import { checkCircuit, recordFailure, recordSuccess } from '../circuit-breaker';
import { pushDlq } from '../dlq';
import { type IngestDriver, registerDriver } from '../driver';
import { sleep, withRetry } from '../retry';
import type { IngestCtx, IngestResult } from '../types';
import type { KnownStation } from './spatial-resolver';

export const CONAGUA_SOURCE = 'conagua' as const;
export const CONAGUA_FEATURE_FLAG = 'ingest.conagua.enabled';
export const CONAGUA_BASE_URL =
  'https://smn.conagua.gob.mx/tools/RESOURCES/Normales_Climatologicas/Diarios/df';
export const CONAGUA_RATE_LIMIT_MS = 1000;

export const CONAGUA_CDMX_KNOWN_STATIONS: readonly KnownStation[] = [
  {
    station_id: '9020',
    source: 'conagua',
    lat: 19.29694,
    lng: -99.18222,
    name: 'DESV. ALTA AL EMISOR PONIENTE',
  },
  { station_id: '9004', source: 'conagua', lat: 19.4775, lng: -99.10444, name: 'AZCAPOTZALCO' },
  { station_id: '9010', source: 'conagua', lat: 19.34917, lng: -99.21694, name: 'COL. AMERICA' },
  { station_id: '9014', source: 'conagua', lat: 19.42583, lng: -99.06889, name: 'CHURUBUSCO' },
  {
    station_id: '9022',
    source: 'conagua',
    lat: 19.36,
    lng: -99.21111,
    name: 'DESV. ALTA MAGDALENA',
  },
  {
    station_id: '9029',
    source: 'conagua',
    lat: 19.20694,
    lng: -99.18,
    name: 'EX-CONVENTO DESIERTO LEONES',
  },
  {
    station_id: '9032',
    source: 'conagua',
    lat: 19.30139,
    lng: -99.21972,
    name: 'GRAN CANAL KM 06+250',
  },
  {
    station_id: '9036',
    source: 'conagua',
    lat: 19.36389,
    lng: -99.18861,
    name: 'HACIENDA DE NARVARTE',
  },
  {
    station_id: '9041',
    source: 'conagua',
    lat: 19.45083,
    lng: -99.30556,
    name: 'LOMAS DE PADIERNA',
  },
  { station_id: '9043', source: 'conagua', lat: 19.385, lng: -99.10889, name: 'MORELOS' },
  {
    station_id: '9045',
    source: 'conagua',
    lat: 19.41972,
    lng: -99.07361,
    name: 'MOYOGUARDA (DGE)',
  },
  { station_id: '9051', source: 'conagua', lat: 19.36, lng: -99.18361, name: 'PRESA ANZALDO' },
  { station_id: '9068', source: 'conagua', lat: 19.30222, lng: -99.07889, name: 'TLAHUAC' },
];

export class ConaguaNotImplementedError extends Error {
  readonly code = 'conagua_legacy_unavailable' as const;
  constructor(message?: string) {
    super(message ?? 'conagua_legacy_unavailable');
    this.name = 'ConaguaNotImplementedError';
  }
}

export interface ConaguaDailyRecord {
  readonly date: string;
  readonly precip_mm: number | null;
  readonly evap_mm: number | null;
  readonly tmax_c: number | null;
  readonly tmin_c: number | null;
}

export const ConaguaDailyRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  precip_mm: z.number().nullable(),
  evap_mm: z.number().nullable(),
  tmax_c: z.number().nullable(),
  tmin_c: z.number().nullable(),
});

const NULO = 'NULO';

function parseValueOrNull(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.toUpperCase() === NULO) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function parseConaguaDailies(rawText: string): ConaguaDailyRecord[] {
  const out: ConaguaDailyRecord[] = [];
  const lines = rawText.split(/\r?\n/);
  const dateRe = /^(\d{4})-(\d{2})-(\d{2})/;
  for (const line of lines) {
    if (!dateRe.test(line)) continue;
    const cols = line.split(/\t+/).map((c) => c.trim());
    if (cols.length < 5) continue;
    const date = (cols[0] ?? '').slice(0, 10);
    out.push({
      date,
      precip_mm: parseValueOrNull(cols[1]),
      evap_mm: parseValueOrNull(cols[2]),
      tmax_c: parseValueOrNull(cols[3]),
      tmin_c: parseValueOrNull(cols[4]),
    });
  }
  return out;
}

export async function fetchConaguaStation(
  stationId: string,
  options: { readonly fetchFn?: typeof fetch } = {},
): Promise<string> {
  const fetchFn = options.fetchFn ?? fetch;
  const url = `${CONAGUA_BASE_URL}/dia${stationId.padStart(5, '0')}.txt`;
  const res = await fetchFn(url, {
    headers: { 'User-Agent': 'desarrollosMX-IE/1.0 (climate-ingest)' },
  });
  if (!res.ok) {
    const err: Error & { status?: number } = new Error(
      `conagua_fetch_failed: ${res.status} ${res.statusText} for ${stationId}`,
    );
    err.status = res.status;
    throw err;
  }
  return res.text();
}

export interface MonthlyAggregateConagua {
  readonly year_month: string;
  readonly temp_avg: number | null;
  readonly temp_max: number | null;
  readonly temp_min: number | null;
  readonly rainfall_mm: number | null;
  readonly humidity_avg: null;
  readonly extreme_events_count: Record<string, number>;
  readonly station_id: string;
}

export function aggregateMonthlyFromDailies(
  stationId: string,
  dailies: readonly ConaguaDailyRecord[],
  startYearMonth: string,
  endYearMonth: string,
): MonthlyAggregateConagua[] {
  const startKey = startYearMonth.replace(/-/g, '');
  const endKey = endYearMonth.replace(/-/g, '');
  const byYm = new Map<string, ConaguaDailyRecord[]>();
  for (const d of dailies) {
    const ym = d.date.slice(0, 7);
    const ymKey = ym.replace('-', '');
    if (ymKey < startKey || ymKey > endKey) continue;
    const arr = byYm.get(ym) ?? [];
    arr.push(d);
    byYm.set(ym, arr);
  }
  const out: MonthlyAggregateConagua[] = [];
  for (const [ym, days] of byYm) {
    if (days.length < 15) continue;
    let tmaxSum = 0;
    let tmaxCnt = 0;
    let tminSum = 0;
    let tminCnt = 0;
    let absMax: number | null = null;
    let absMin: number | null = null;
    let prcpSum = 0;
    let prcpCnt = 0;
    let heatDays = 0;
    let coldDays = 0;
    let heavyRainDays = 0;
    for (const d of days) {
      if (d.tmax_c !== null) {
        tmaxSum += d.tmax_c;
        tmaxCnt++;
        absMax = absMax === null ? d.tmax_c : Math.max(absMax, d.tmax_c);
        if (d.tmax_c >= 30) heatDays++;
      }
      if (d.tmin_c !== null) {
        tminSum += d.tmin_c;
        tminCnt++;
        absMin = absMin === null ? d.tmin_c : Math.min(absMin, d.tmin_c);
        if (d.tmin_c <= 5) coldDays++;
      }
      if (d.precip_mm !== null) {
        prcpSum += d.precip_mm;
        prcpCnt++;
        if (d.precip_mm >= 25) heavyRainDays++;
      }
    }
    const tavg = tmaxCnt > 0 && tminCnt > 0 ? (tmaxSum / tmaxCnt + tminSum / tminCnt) / 2 : null;
    const extreme: Record<string, number> = {};
    if (heatDays > 0) extreme.heat_days = heatDays;
    if (coldDays > 0) extreme.cold_days = coldDays;
    if (heavyRainDays > 0) extreme.heavy_rain_days = heavyRainDays;
    out.push({
      year_month: `${ym}-01`,
      temp_avg: tavg === null ? null : Math.round(tavg * 100) / 100,
      temp_max: absMax === null ? null : Math.round(absMax * 100) / 100,
      temp_min: absMin === null ? null : Math.round(absMin * 100) / 100,
      rainfall_mm: prcpCnt > 0 ? Math.round(prcpSum * 10) / 10 : null,
      humidity_avg: null,
      extreme_events_count: extreme,
      station_id: stationId,
    });
  }
  return out;
}

export interface ConaguaFetchInput {
  readonly stationIds: readonly string[];
  readonly startYearMonth: string;
  readonly endYearMonth: string;
}

export interface ConaguaFetchPayload {
  readonly byStation: Map<string, ConaguaDailyRecord[]>;
  readonly fetchedAt: string;
}

export async function fetchConaguaPayload(
  input: ConaguaFetchInput,
  options: { readonly throttleMs?: number; readonly fetchFn?: typeof fetch } = {},
): Promise<ConaguaFetchPayload> {
  const throttle = options.throttleMs ?? CONAGUA_RATE_LIMIT_MS;
  const byStation = new Map<string, ConaguaDailyRecord[]>();
  for (const sid of input.stationIds) {
    checkCircuit(CONAGUA_SOURCE);
    try {
      const raw = await withRetry(
        () => fetchConaguaStation(sid, options.fetchFn ? { fetchFn: options.fetchFn } : {}),
        { retries: 3, baseMs: 2000 },
      );
      const dailies = parseConaguaDailies(raw);
      byStation.set(sid, dailies);
      recordSuccess(CONAGUA_SOURCE);
    } catch (err) {
      recordFailure(CONAGUA_SOURCE);
      await pushDlq({
        runId: 'conagua-fetch',
        source: CONAGUA_SOURCE,
        reason: (err as Error).message,
        payload: { station: sid },
      }).catch(() => undefined);
    }
    if (throttle > 0) await sleep(throttle);
  }
  return { byStation, fetchedAt: new Date().toISOString() };
}

interface DbRow {
  zone_id: string;
  year_month: string;
  temp_avg: number | null;
  temp_max: number | null;
  temp_min: number | null;
  rainfall_mm: number | null;
  humidity_avg: number | null;
  extreme_events_count: Record<string, number>;
  source: 'conagua';
}

async function loadZoneStationMap(
  supabase: SupabaseClient<Database>,
): Promise<Array<{ zone_id: string; station_id: string }>> {
  const { data, error } = await supabase
    .from('zone_climate_station_map')
    .select('zone_id, station_id, station_source')
    .eq('station_source', CONAGUA_SOURCE);
  if (error || !data) return [];
  return data.map((r) => ({ zone_id: r.zone_id, station_id: r.station_id }));
}

export const conaguaDriver: IngestDriver<ConaguaFetchInput, ConaguaFetchPayload> = {
  source: CONAGUA_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'daily',
  async fetch(_ctx: IngestCtx, input: ConaguaFetchInput): Promise<ConaguaFetchPayload> {
    return fetchConaguaPayload(input);
  },
  async parse(payload: ConaguaFetchPayload): Promise<DbRow[]> {
    const supabase = createAdminClient();
    const assignments = await loadZoneStationMap(supabase);
    const monthlyByStation = new Map<string, MonthlyAggregateConagua[]>();
    for (const [sid, dailies] of payload.byStation) {
      const start = '2010-01';
      const now = new Date();
      const end = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      monthlyByStation.set(sid, aggregateMonthlyFromDailies(sid, dailies, start, end));
    }
    const rows: DbRow[] = [];
    for (const { zone_id, station_id } of assignments) {
      const months = monthlyByStation.get(station_id) ?? [];
      for (const m of months) {
        if (
          m.temp_avg === null &&
          m.temp_max === null &&
          m.temp_min === null &&
          m.rainfall_mm === null
        ) {
          continue;
        }
        rows.push({
          zone_id,
          year_month: m.year_month,
          temp_avg: m.temp_avg,
          temp_max: m.temp_max,
          temp_min: m.temp_min,
          rainfall_mm: m.rainfall_mm,
          humidity_avg: null,
          extreme_events_count: m.extreme_events_count,
          source: CONAGUA_SOURCE,
        });
      }
    }
    return rows;
  },
  async upsert(rows: DbRow[]): Promise<IngestResult> {
    if (rows.length === 0) {
      return {
        rows_inserted: 0,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: 0,
        errors: [],
        cost_estimated_usd: 0,
      };
    }
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('climate_monthly_aggregates')
      .upsert(rows, { onConflict: 'zone_id,year_month' });
    if (error) {
      return {
        rows_inserted: 0,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: rows.length,
        errors: [`climate_monthly_aggregates upsert failed: ${error.message}`],
      };
    }
    return {
      rows_inserted: rows.length,
      rows_updated: 0,
      rows_skipped: 0,
      rows_dlq: 0,
      errors: [],
      cost_estimated_usd: 0,
    };
  },
};

registerDriver(conaguaDriver);

export async function ingestConagua(input?: Partial<ConaguaFetchInput>): Promise<IngestResult> {
  const stationIds = input?.stationIds ?? CONAGUA_CDMX_KNOWN_STATIONS.map((s) => s.station_id);
  const now = new Date();
  const startYearMonth = input?.startYearMonth ?? '2010-01';
  const endYearMonth =
    input?.endYearMonth ??
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const ctx: IngestCtx = {
    runId: 'manual',
    source: CONAGUA_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: null,
    startedAt: new Date(),
  };
  const payload = await conaguaDriver.fetch(ctx, { stationIds, startYearMonth, endYearMonth });
  const rows = await conaguaDriver.parse(payload, ctx);
  return conaguaDriver.upsert(rows, ctx);
}
