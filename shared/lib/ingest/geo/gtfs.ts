import { createAdminClient } from '@/shared/lib/supabase/admin';
import { type IngestDriver, registerDriver } from '../driver';
import { pointToH3R8 } from '../h3';
import { recordLineage } from '../lineage';
import { type RunIngestOptions, runIngest } from '../orchestrator';
import {
  duplicateDetectionGate,
  geoValidityGateMx,
  rowCountSanityGate,
  runQualityGates,
} from '../quality-gates';
import type { IngestCtx, IngestJob, IngestResult } from '../types';

// STUB — activar L-NEW-GEO-GTFS-01 (FASE 11.E)
// GTFS (General Transit Feed Specification) estáticos de 5 sistemas MX:
// Metro CDMX, Metrobús, Tren Suburbano, Cablebús, EcoBici. Cada sistema
// publica un ZIP con stops.txt / routes.txt / trips.txt / stop_times.txt.
//
// ZIP extraction: bloqueante externo (no hay unzipper/adm-zip/fflate instalados
// y FASE 07 no autoriza nuevas deps — sólo pdf-parse aprobado). El driver
// acepta pre-extracted CSVs: admin/ETL externo descomprime el ZIP y pasa
// { stopsCsv, routesCsv?, systemName }. ZIP in-driver + auto-fetch CKAN
// resource id 32ed1b6b-41cd-49b3-b7f0-b57acb0eb819 agendado L-NEW-GEO-GTFS-01
// (FASE 11.E, ~5h cuando se autorice fflate). Reality audit: docs/08_PRODUCT_AUDIT/10_DATA_REALITY_AUDIT.md §5.
//
// source='gtfs' fijo (allowlist shared/lib/ingest/allowlist.ts:22). El
// systemName distingue los 5 feeds vía meta.system_name + source_id prefix
// (<system_slug>:<stop_id>). Evita bloat de allowlist con gtfs_<slug> por
// sistema.
//
// En H1 sólo persistimos stops.txt (entity_type='transit_stop'). routes.txt
// se parsea para validación pero NO se persiste en geo_data_points: una
// route no tiene geom puntual y requiere trips.txt + stop_times.txt para
// materializar stop→route. Routes persistence agendada FASE 07b.A.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.3
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2

export const GTFS_SOURCE = 'gtfs' as const;
export const GTFS_PERIODICITY = 'quarterly' as const;

// Columnas obligatorias GTFS stops.txt según spec (subset útil; spec completa
// incluye wheelchair_boarding, stop_code, etc. — opcionales para H1).
export const GTFS_HEADERS_STOPS = ['stop_id', 'stop_name', 'stop_lat', 'stop_lon'] as const;

// Columnas obligatorias GTFS routes.txt según spec.
export const GTFS_HEADERS_ROUTES = ['route_id', 'route_type'] as const;

export interface GtfsStopRow {
  entity_type: 'transit_stop';
  source_id: string;
  name: string;
  lat: number;
  lng: number;
  h3_r8: string | null;
  meta: {
    system_name: string;
    system_slug: string;
    stop_id_raw: string;
    parent_station: string | null;
    location_type: number | null;
    gtfs_zone_id: string | null;
  };
}

export interface GtfsRouteRow {
  route_id: string;
  route_short_name: string | null;
  route_long_name: string | null;
  route_type: number;
  meta: {
    system_name: string;
    system_slug: string;
  };
}

// Slugify: NFD → deaccent → lowercase → non-alphanum → underscore → trim _.
// Ejemplos:
//   'Metro CDMX'       → 'metro_cdmx'
//   'Metrobús'         → 'metrobus'
//   'Tren Suburbano'   → 'tren_suburbano'
//   'Cablebús'         → 'cablebus'
//   'EcoBici'          → 'ecobici'
export function slugifySystemName(name: string): string {
  if (typeof name !== 'string') return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Parser CSV inline. Mismo patrón que cnbv/fgj. Respeta comillas y comillas
// escapadas "". GTFS spec no permite newlines embebidos, consistente con
// parseCsvLine que tampoco los soporta.
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

function parseCsvCoord(v: string | undefined): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '') return null;
  const n = Number.parseFloat(t.replace(/,/g, '.'));
  return Number.isFinite(n) ? n : null;
}

function parseInteger(v: string | undefined): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '') return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseCsvRows(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };
  const firstLine = lines[0];
  if (firstLine == null) return { headers: [], rows: [] };
  const headers = parseCsvLine(firstLine).map((h) => h.trim().toLowerCase());
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line == null) continue;
    rows.push(parseCsvLine(line).map((c) => c.trim()));
  }
  return { headers, rows };
}

// Devuelve un mapping header → column index. Las keys requeridas tienen
// type `number` (garantizado por el throw). Keys no requeridas tienen type
// `number | undefined`. Evita non-null assertions downstream.
function assertHeaders<R extends string>(
  headers: string[],
  required: readonly R[],
  errCode: string,
): Record<R, number> & Record<string, number | undefined> {
  const idx: Record<string, number> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h) idx[h] = i;
  }
  for (const req of required) {
    if (idx[req] === undefined) {
      throw new Error(errCode);
    }
  }
  return idx as Record<R, number> & Record<string, number | undefined>;
}

export function parseGtfsStopsCsv(csvText: string, systemName: string): GtfsStopRow[] {
  if (typeof csvText !== 'string' || csvText.trim() === '') return [];
  const slug = slugifySystemName(systemName);
  if (slug === '') throw new Error('gtfs_invalid_system_name');

  const { headers, rows } = parseCsvRows(csvText);
  if (headers.length === 0) return [];
  const idx = assertHeaders(headers, GTFS_HEADERS_STOPS, 'gtfs_stops_headers_missing');

  const iStopId = idx.stop_id;
  const iName = idx.stop_name;
  const iLat = idx.stop_lat;
  const iLon = idx.stop_lon;
  const iParent = idx.parent_station;
  const iLocType = idx.location_type;
  const iZone = idx.zone_id;

  const out: GtfsStopRow[] = [];
  for (const cols of rows) {
    const stopIdRaw = (cols[iStopId] ?? '').trim();
    if (stopIdRaw === '') continue;
    const nameRaw = (cols[iName] ?? '').trim();
    const lat = parseCsvCoord(cols[iLat]);
    const lng = parseCsvCoord(cols[iLon]);
    if (lat == null || lng == null) continue;
    // location_type=1 (station) / 2 (entrance) / 3 (generic) aún son válidas;
    // location_type=4 (boarding area) también. Filtramos sólo coords inválidas.
    const parent = iParent !== undefined ? (cols[iParent] ?? '').trim() : '';
    const locType = iLocType !== undefined ? parseInteger(cols[iLocType]) : null;
    const gtfsZone = iZone !== undefined ? (cols[iZone] ?? '').trim() : '';
    out.push({
      entity_type: 'transit_stop',
      source_id: `${slug}:${stopIdRaw}`,
      name: nameRaw,
      lat,
      lng,
      h3_r8: pointToH3R8({ lat, lng }),
      meta: {
        system_name: systemName,
        system_slug: slug,
        stop_id_raw: stopIdRaw,
        parent_station: parent === '' ? null : parent,
        location_type: locType,
        gtfs_zone_id: gtfsZone === '' ? null : gtfsZone,
      },
    });
  }
  return out;
}

export function parseGtfsRoutesCsv(csvText: string, systemName: string): GtfsRouteRow[] {
  if (typeof csvText !== 'string' || csvText.trim() === '') return [];
  const slug = slugifySystemName(systemName);
  if (slug === '') throw new Error('gtfs_invalid_system_name');

  const { headers, rows } = parseCsvRows(csvText);
  if (headers.length === 0) return [];
  const idx = assertHeaders(headers, GTFS_HEADERS_ROUTES, 'gtfs_routes_headers_missing');

  const iRouteId = idx.route_id;
  const iType = idx.route_type;
  const iShort = idx.route_short_name;
  const iLong = idx.route_long_name;

  const out: GtfsRouteRow[] = [];
  for (const cols of rows) {
    const routeIdRaw = (cols[iRouteId] ?? '').trim();
    if (routeIdRaw === '') continue;
    const routeType = parseInteger(cols[iType]);
    if (routeType == null) continue;
    const shortN = iShort !== undefined ? (cols[iShort] ?? '').trim() : '';
    const longN = iLong !== undefined ? (cols[iLong] ?? '').trim() : '';
    out.push({
      route_id: routeIdRaw,
      route_short_name: shortN === '' ? null : shortN,
      route_long_name: longN === '' ? null : longN,
      route_type: routeType,
      meta: {
        system_name: systemName,
        system_slug: slug,
      },
    });
  }
  return out;
}

// Discriminated union para el driver: sólo una variante en H1 (pre-extracted
// CSVs). Diseñada para extensión futura a { zipBuffer } cuando se autorice
// una dep de ZIP extraction.
export type GtfsDriverInput =
  | {
      kind: 'pre_extracted';
      stopsCsv: string;
      routesCsv?: string;
      systemName: string;
    }
  | {
      // Placeholder — NO implementado en H1. Driver throws si se invoca.
      // Agendado BLOQUE 7.H / FASE 07b.A.
      kind: 'zip_buffer';
      zipBuffer: Buffer;
      systemName: string;
    };

interface GtfsParsedPayload {
  stops: GtfsStopRow[];
  routes: GtfsRouteRow[];
  systemName: string;
  systemSlug: string;
}

export async function upsertGtfsStops(
  rows: GtfsStopRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const validFrom = new Date().toISOString().slice(0, 10);
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: GTFS_SOURCE,
    source_id: r.source_id,
    entity_type: r.entity_type,
    name: r.name,
    h3_r8: r.h3_r8,
    valid_from: validFrom,
    run_id: ctx.runId,
    // NOTE: geom (PostGIS Point) omitido — el SDK Supabase no tipa PostGIS
    // directamente. lat/lng quedan en meta; h3_r8 se usa como spatial index
    // primario para queries IE. Materialización PostGIS en BLOQUE 7.H via
    // RPC upsert_gtfs_stop(lat,lng,...) con ST_SetSRID(ST_MakePoint(...),4326).
    meta: {
      ...r.meta,
      lat: r.lat,
      lng: r.lng,
    },
  }));
  const { error, count } = await supabase.from('geo_data_points').upsert(payload as never, {
    onConflict: 'country_code,source,source_id,valid_from',
    count: 'exact',
    ignoreDuplicates: false,
  });
  if (error) return { inserted: 0, errors: [`geo_data_points_upsert: ${error.message}`] };
  return { inserted: count ?? rows.length, errors: [] };
}

export const gtfsDriver: IngestDriver<GtfsDriverInput, GtfsParsedPayload> = {
  source: GTFS_SOURCE,
  category: 'geo',
  defaultPeriodicity: GTFS_PERIODICITY,
  async fetch(_ctx, input) {
    if (!input) throw new Error('gtfs_missing_input');
    if (input.kind === 'zip_buffer') {
      // ZIP extraction bloqueada por falta de dep (unzipper/adm-zip/fflate).
      // Ver nota head of file. Caller debe pre-extraer CSVs.
      throw new Error('gtfs_zip_extraction_not_supported');
    }
    if (input.kind !== 'pre_extracted') {
      throw new Error('gtfs_unknown_input_kind');
    }
    const systemName = input.systemName?.trim() ?? '';
    if (systemName === '') throw new Error('gtfs_missing_system_name');
    const stopsCsv = input.stopsCsv ?? '';
    if (stopsCsv.trim() === '') throw new Error('gtfs_missing_stops_csv');
    const slug = slugifySystemName(systemName);
    const stops = parseGtfsStopsCsv(stopsCsv, systemName);
    const routes = input.routesCsv ? parseGtfsRoutesCsv(input.routesCsv, systemName) : [];
    return { stops, routes, systemName, systemSlug: slug };
  },
  async parse(payload) {
    // El driver emite sólo stops al pipeline de geo_data_points. routes se
    // ignora en H1 (ver nota head of file).
    return payload.stops;
  },
  async upsert(rows, ctx) {
    const stops = rows as GtfsStopRow[];
    const { inserted, errors } = await upsertGtfsStops(stops, ctx);
    return {
      rows_inserted: inserted,
      rows_updated: 0,
      rows_skipped: 0,
      rows_dlq: 0,
      errors,
      cost_estimated_usd: 0,
    };
  },
};

registerDriver(gtfsDriver);

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export interface IngestGtfsOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

export interface IngestGtfsInput {
  stopsCsv: string;
  routesCsv?: string;
  systemName: string;
}

export async function ingestGtfs(
  input: IngestGtfsInput,
  options: IngestGtfsOptions = {},
): Promise<IngestResult> {
  if (!input?.stopsCsv || input.stopsCsv.trim() === '') {
    throw new Error('gtfs_missing_stops_csv');
  }
  if (!input.systemName || input.systemName.trim() === '') {
    throw new Error('gtfs_missing_system_name');
  }

  const periodEnd = todayISO();
  const systemSlug = slugifySystemName(input.systemName);

  const job: IngestJob<GtfsParsedPayload> = {
    source: GTFS_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin_upload',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const stops = parseGtfsStopsCsv(input.stopsCsv, input.systemName);
      const routes = input.routesCsv ? parseGtfsRoutesCsv(input.routesCsv, input.systemName) : [];

      const gates = await runQualityGates(
        stops,
        [
          rowCountSanityGate<GtfsStopRow>({ min: 0 }),
          duplicateDetectionGate<GtfsStopRow>((r) => r.source_id),
          geoValidityGateMx<GtfsStopRow>(),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertGtfsStops(stops, ctx);

      if (stops.length > 0) {
        try {
          await recordLineage(
            stops.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: GTFS_SOURCE,
              destinationTable: 'geo_data_points',
              upstreamUrl: `gtfs://${systemSlug}/stops.txt`,
              transformation: 'gtfs_stops_csv_parse',
              sourceSpan: {
                system_name: input.systemName,
                system_slug: systemSlug,
                stop_id_raw: r.meta.stop_id_raw,
              } as unknown as Record<string, unknown>,
            })),
          );
        } catch {
          // lineage best-effort
        }
      }

      const meta: Record<string, unknown> = {
        quality_gate_warnings: gates.warnings,
        rows_parsed_stops: stops.length,
        rows_parsed_routes: routes.length,
        system_name: input.systemName,
        system_slug: systemSlug,
      };
      if (options.uploadedBy) meta.uploaded_by = options.uploadedBy;

      const rawPayload: GtfsParsedPayload = {
        stops,
        routes,
        systemName: input.systemName,
        systemSlug,
      };

      return {
        rows_inserted: inserted,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: 0,
        errors,
        cost_estimated_usd: 0,
        meta,
        rawPayload,
      };
    },
  };

  const runOpts: RunIngestOptions = {
    saveRaw: options.saveRaw ?? true,
    bumpWatermarkOnSuccess: { periodEnd },
  };
  if (typeof options.retries === 'number') runOpts.retries = options.retries;

  return await runIngest(job, runOpts);
}
