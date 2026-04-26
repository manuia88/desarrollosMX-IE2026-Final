// NOAA NCEI Climate Data Online v2 fetcher — F1.B real data ingest.
//
// Replaces synthetic SEED (heuristic_v1, FNV-1a + sinusoides) with real
// daily GHCND records aggregated to monthly per CDMX zone via Voronoi
// nearest-station map (zone_climate_station_map).
//
// Auth: header `token: <process.env.NOAA_TOKEN>`. Free tier: 5 req/sec,
// 10 000 req/day. Backfill 8 active stations × 192 months ≈ 1536 calls
// at 250 ms throttle ≈ 6.4 min. Cost: $0.
//
// F1.C.A 2026-04-26: writes to climate_source_observations (NOT directly
// climate_monthly_aggregates). Cross-validation winner derived by
// recompute_climate_aggregates_from_observations() SECDEF post-fetch.

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import { checkCircuit, recordFailure, recordSuccess } from '../circuit-breaker';
import { pushDlq } from '../dlq';
import { type IngestDriver, registerDriver } from '../driver';
import { sleep, withRetry } from '../retry';
import type { IngestCtx, IngestResult } from '../types';
import { type KnownStation, resolveStationForZone } from './spatial-resolver';

export const NOAA_SOURCE = 'noaa' as const;
export const NOAA_BASE_URL = 'https://www.ncdc.noaa.gov/cdo-web/api/v2';
export const NOAA_RATE_LIMIT_MS = 250;

export const CDMX_CENTRAL_BBOX = {
  southLat: 18.0,
  westLng: -100.5,
  northLat: 21.0,
  eastLng: -97.5,
} as const;

export const NOAA_CDMX_KNOWN_STATIONS: readonly KnownStation[] = [
  { station_id: 'GHCND:MXM00076680', source: 'noaa', lat: 19.4, lng: -99.183, name: 'MEXICO CITY' },
  {
    station_id: 'GHCND:MXM00076683',
    source: 'noaa',
    lat: 19.3167,
    lng: -98.2333,
    name: 'TLAXCALA DE XICONTECATL',
  },
  { station_id: 'GHCND:MXM00076675', source: 'noaa', lat: 19.2833, lng: -99.7, name: 'TOLUCA OBS' },
  {
    station_id: 'GHCND:MXM00076685',
    source: 'noaa',
    lat: 19.158,
    lng: -98.371,
    name: 'HERMANOS SERDAN INTL (PUE)',
  },
  {
    station_id: 'GHCND:MXM00076726',
    source: 'noaa',
    lat: 18.883,
    lng: -99.233,
    name: 'CUERNAVACA',
  },
  {
    station_id: 'GHCND:MXM00076634',
    source: 'noaa',
    lat: 20.083,
    lng: -98.367,
    name: 'TULANCINGO HGO',
  },
  {
    station_id: 'GHCND:MXM00076625',
    source: 'noaa',
    lat: 20.617,
    lng: -100.186,
    name: 'QUERETARO INTERCONTINENTAL',
  },
  {
    station_id: 'GHCND:MXM00076632',
    source: 'noaa',
    lat: 20.133,
    lng: -98.75,
    name: 'PACHUCA HGO',
  },
];

export const NoaaResultsetSchema = z.object({
  offset: z.number().int(),
  count: z.number().int(),
  limit: z.number().int(),
});

export const NoaaStationSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().optional(),
  elevationUnit: z.enum(['METERS', 'FEET']).optional(),
  datacoverage: z.number().min(0).max(1),
  mindate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type NoaaStation = z.infer<typeof NoaaStationSchema>;

export const NoaaStationsListResponseSchema = z.object({
  metadata: z.object({ resultset: NoaaResultsetSchema }).optional(),
  results: z.array(NoaaStationSchema).default([]),
});

export const NoaaDatatypeIdSchema = z.enum([
  'TMAX',
  'TMIN',
  'TAVG',
  'PRCP',
  'RHAV',
  'SNWD',
  'SNOW',
  'AWND',
]);

export const NoaaDataPointSchema = z.object({
  date: z.string(),
  datatype: NoaaDatatypeIdSchema,
  station: z.string(),
  attributes: z.string().optional(),
  value: z.number(),
});
export type NoaaDataPoint = z.infer<typeof NoaaDataPointSchema>;

export const NoaaDataResponseSchema = z.object({
  metadata: z.object({ resultset: NoaaResultsetSchema }).optional(),
  results: z.array(NoaaDataPointSchema).default([]),
});
export type NoaaDataResponse = z.infer<typeof NoaaDataResponseSchema>;

export interface MonthlyAggregateRow {
  readonly zone_id: string;
  readonly year_month: string;
  readonly station_id: string;
  readonly temp_avg: number | null;
  readonly temp_max: number | null;
  readonly temp_min: number | null;
  readonly rainfall_mm: number | null;
  readonly humidity_avg: number | null;
  readonly extreme_events_count: Record<string, number>;
  readonly source: 'noaa';
}

export async function fetchNoaa(
  path: string,
  token: string,
  query: Record<string, string | number>,
): Promise<unknown> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) params.set(k, String(v));
  const url = `${NOAA_BASE_URL}${path}?${params.toString()}`;
  const res = await fetch(url, {
    headers: { token, Accept: 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err: Error & { status?: number } = new Error(
      `noaa_fetch_failed: ${res.status} ${res.statusText} ${body.slice(0, 200)}`,
    );
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function listStationsBbox(params: {
  readonly token: string;
  readonly bbox?: typeof CDMX_CENTRAL_BBOX;
  readonly limit?: number;
}): Promise<NoaaStation[]> {
  const { token, bbox = CDMX_CENTRAL_BBOX, limit = 1000 } = params;
  checkCircuit(NOAA_SOURCE);
  try {
    const raw = await withRetry(
      () =>
        fetchNoaa('/stations', token, {
          datasetid: 'GHCND',
          extent: `${bbox.southLat},${bbox.westLng},${bbox.northLat},${bbox.eastLng}`,
          limit,
        }),
      { retries: 5, baseMs: 1000 },
    );
    const parsed = NoaaStationsListResponseSchema.safeParse(raw);
    recordSuccess(NOAA_SOURCE);
    if (!parsed.success) return [];
    return parsed.data.results;
  } catch (err) {
    recordFailure(NOAA_SOURCE);
    throw err;
  }
}

interface RawDaily {
  date: string;
  TMAX?: number;
  TMIN?: number;
  TAVG?: number;
  PRCP?: number;
}

function shouldKeepAttributes(attrs: string | undefined): boolean {
  if (!attrs) return true;
  const parts = attrs.split(',');
  // QC flag on index 1 — non-empty means quality issue, skip.
  return !(parts[1] && parts[1].length > 0);
}

function dailyKey(date: string): string {
  return date.slice(0, 10);
}

function yearMonthKey(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function aggregateMonth(daily: RawDaily[]): {
  temp_avg: number | null;
  temp_max: number | null;
  temp_min: number | null;
  rainfall_mm: number | null;
  humidity_avg: number | null;
  extreme_events_count: Record<string, number>;
} {
  if (daily.length === 0) {
    return {
      temp_avg: null,
      temp_max: null,
      temp_min: null,
      rainfall_mm: null,
      humidity_avg: null,
      extreme_events_count: {},
    };
  }
  let sumAvg = 0;
  let cntAvg = 0;
  let absMax: number | null = null;
  let absMin: number | null = null;
  let sumPrcp = 0;
  let cntPrcp = 0;
  let heatDays = 0;
  let coldDays = 0;
  let heavyRainDays = 0;

  for (const d of daily) {
    const tavg =
      typeof d.TAVG === 'number'
        ? d.TAVG
        : typeof d.TMAX === 'number' && typeof d.TMIN === 'number'
          ? (d.TMAX + d.TMIN) / 2
          : null;
    if (tavg !== null) {
      sumAvg += tavg;
      cntAvg++;
    }
    if (typeof d.TMAX === 'number') {
      absMax = absMax === null ? d.TMAX : Math.max(absMax, d.TMAX);
      if (d.TMAX >= 30) heatDays++;
    }
    if (typeof d.TMIN === 'number') {
      absMin = absMin === null ? d.TMIN : Math.min(absMin, d.TMIN);
      if (d.TMIN <= 5) coldDays++;
    }
    if (typeof d.PRCP === 'number') {
      sumPrcp += d.PRCP;
      cntPrcp++;
      if (d.PRCP >= 25) heavyRainDays++;
    }
  }

  const extreme: Record<string, number> = {};
  if (heatDays > 0) extreme.heat_days = heatDays;
  if (coldDays > 0) extreme.cold_days = coldDays;
  if (heavyRainDays > 0) extreme.heavy_rain_days = heavyRainDays;

  return {
    temp_avg: cntAvg > 0 ? Math.round((sumAvg / cntAvg) * 100) / 100 : null,
    temp_max: absMax === null ? null : Math.round(absMax * 100) / 100,
    temp_min: absMin === null ? null : Math.round(absMin * 100) / 100,
    rainfall_mm: cntPrcp > 0 ? Math.round(sumPrcp * 10) / 10 : null,
    humidity_avg: null,
    extreme_events_count: extreme,
  };
}

export function groupDailyByYearMonth(points: NoaaDataPoint[]): Map<string, RawDaily[]> {
  const dailyByDate = new Map<string, RawDaily>();
  for (const p of points) {
    if (!shouldKeepAttributes(p.attributes)) continue;
    const dk = dailyKey(p.date);
    let row = dailyByDate.get(dk);
    if (!row) {
      row = { date: dk };
      dailyByDate.set(dk, row);
    }
    if (
      p.datatype === 'TMAX' ||
      p.datatype === 'TMIN' ||
      p.datatype === 'TAVG' ||
      p.datatype === 'PRCP'
    ) {
      row[p.datatype] = p.value;
    }
  }
  const byMonth = new Map<string, RawDaily[]>();
  for (const [, row] of dailyByDate) {
    const ym = yearMonthKey(row.date);
    const arr = byMonth.get(ym) ?? [];
    arr.push(row);
    byMonth.set(ym, arr);
  }
  return byMonth;
}

export interface NoaaFetchInput {
  readonly stationIds: readonly string[];
  readonly startYearMonth: string;
  readonly endYearMonth: string;
}

export interface NoaaFetchPayload {
  readonly byStation: Map<string, NoaaDataPoint[]>;
  readonly fetchedAt: string;
}

function* enumerateMonths(start: string, end: string): Generator<string> {
  const [sy, sm] = start.split('-').map(Number) as [number, number];
  const [ey, em] = end.split('-').map(Number) as [number, number];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    yield `${y}-${String(m).padStart(2, '0')}`;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
}

function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(d).padStart(2, '0')}`;
}

export async function fetchNoaaPayload(
  input: NoaaFetchInput,
  options: { readonly token: string; readonly throttleMs?: number } = { token: '' },
): Promise<NoaaFetchPayload> {
  const token = options.token || process.env.NOAA_TOKEN || '';
  if (!token) throw new Error('NOAA_TOKEN missing');
  const throttle = options.throttleMs ?? NOAA_RATE_LIMIT_MS;

  const byStation = new Map<string, NoaaDataPoint[]>();
  for (const sid of input.stationIds) {
    const collected: NoaaDataPoint[] = [];
    for (const ym of enumerateMonths(input.startYearMonth, input.endYearMonth)) {
      checkCircuit(NOAA_SOURCE);
      try {
        const raw = await withRetry(
          () =>
            fetchNoaa('/data', token, {
              datasetid: 'GHCND',
              stationid: sid,
              startdate: `${ym}-01`,
              enddate: lastDayOfMonth(ym),
              datatypeid: 'TMAX,TMIN,TAVG,PRCP',
              units: 'metric',
              limit: 1000,
            }),
          { retries: 5, baseMs: 1000 },
        );
        const parsed = NoaaDataResponseSchema.safeParse(raw);
        recordSuccess(NOAA_SOURCE);
        if (parsed.success) collected.push(...parsed.data.results);
      } catch (err) {
        recordFailure(NOAA_SOURCE);
        await pushDlq({
          runId: 'noaa-fetch',
          source: NOAA_SOURCE,
          reason: (err as Error).message,
          payload: { station: sid, year_month: ym },
        }).catch(() => undefined);
      }
      if (throttle > 0) await sleep(throttle);
    }
    byStation.set(sid, collected);
  }
  return { byStation, fetchedAt: new Date().toISOString() };
}

async function loadZoneStationMap(
  supabase: SupabaseClient<Database>,
): Promise<Array<{ zone_id: string; station_id: string }>> {
  const { data, error } = await supabase
    .from('zone_climate_station_map')
    .select('zone_id, station_id, station_source')
    .eq('station_source', NOAA_SOURCE);
  if (error || !data) return [];
  return data.map((r) => ({ zone_id: r.zone_id, station_id: r.station_id }));
}

export const noaaDriver: IngestDriver<NoaaFetchInput, NoaaFetchPayload> = {
  source: NOAA_SOURCE,
  category: 'macro',
  defaultPeriodicity: 'monthly',
  async fetch(_ctx: IngestCtx, input: NoaaFetchInput): Promise<NoaaFetchPayload> {
    return fetchNoaaPayload(input);
  },
  async parse(payload: NoaaFetchPayload): Promise<MonthlyAggregateRow[]> {
    const supabase = createAdminClient();
    const assignments = await loadZoneStationMap(supabase);
    const rows: MonthlyAggregateRow[] = [];
    for (const { zone_id, station_id } of assignments) {
      const points = payload.byStation.get(station_id) ?? [];
      const grouped = groupDailyByYearMonth(points);
      for (const [ym, daily] of grouped) {
        const agg = aggregateMonth(daily);
        if (
          agg.temp_avg === null &&
          agg.temp_max === null &&
          agg.temp_min === null &&
          agg.rainfall_mm === null
        ) {
          continue;
        }
        rows.push({
          zone_id,
          year_month: ym,
          station_id,
          temp_avg: agg.temp_avg,
          temp_max: agg.temp_max,
          temp_min: agg.temp_min,
          rainfall_mm: agg.rainfall_mm,
          humidity_avg: agg.humidity_avg,
          extreme_events_count: agg.extreme_events_count,
          source: NOAA_SOURCE,
        });
      }
    }
    return rows;
  },
  async upsert(rows: MonthlyAggregateRow[]): Promise<IngestResult> {
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
    const payload = rows.map((r) => ({
      zone_id: r.zone_id,
      year_month: r.year_month,
      station_id: r.station_id,
      temp_avg: r.temp_avg,
      temp_max: r.temp_max,
      temp_min: r.temp_min,
      rainfall_mm: r.rainfall_mm,
      humidity_avg: r.humidity_avg,
      extreme_events_count: r.extreme_events_count,
      source: r.source,
    }));
    const { error } = await supabase
      .from('climate_source_observations')
      .upsert(payload, { onConflict: 'zone_id,year_month,source' });
    if (error) {
      return {
        rows_inserted: 0,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: rows.length,
        errors: [`climate_source_observations upsert failed: ${error.message}`],
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

registerDriver(noaaDriver);

export async function ingestNoaa(input: NoaaFetchInput): Promise<IngestResult> {
  const ctx: IngestCtx = {
    runId: 'manual',
    source: NOAA_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: null,
    startedAt: new Date(),
  };
  const payload = await noaaDriver.fetch(ctx, input);
  const rows = await noaaDriver.parse(payload, ctx);
  return noaaDriver.upsert(rows, ctx);
}

export async function batchIngestMonthlyCDMX(params: {
  readonly supabase: SupabaseClient<Database>;
  readonly historyYears?: number;
  readonly maxZones?: number;
}): Promise<{
  readonly total_zones: number;
  readonly total_rows_upserted: number;
}> {
  const { historyYears = 15 } = params;
  const now = new Date();
  const endYearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const startYearMonth = `${now.getUTCFullYear() - historyYears}-01`;

  const stationIds = NOAA_CDMX_KNOWN_STATIONS.map((s) => s.station_id);
  const result = await ingestNoaa({ stationIds, startYearMonth, endYearMonth });

  const supabase = createAdminClient();
  const assignments = await loadZoneStationMap(supabase);
  const zonesTouched = new Set(assignments.map((a) => a.zone_id)).size;

  return {
    total_zones: zonesTouched,
    total_rows_upserted: result.rows_inserted,
  };
}

export async function getStationByZone(zoneId: string): Promise<string | null> {
  const r = await resolveStationForZone({ zoneId, source: NOAA_SOURCE });
  return r?.station_id ?? null;
}
