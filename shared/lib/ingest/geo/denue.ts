import { createAdminClient } from '@/shared/lib/supabase/admin';
import { correlationHeaders } from '../correlation';
import { type IngestDriver, registerDriver } from '../driver';
import { pointToH3R8 } from '../h3';
import { recordLineage } from '../lineage';
import { SHF_ENTIDAD_CVE } from '../macro/shf';
import { type RunIngestOptions, runIngest } from '../orchestrator';
import {
  duplicateDetectionGate,
  geoValidityGateMx,
  rowCountSanityGate,
  runQualityGates,
} from '../quality-gates';
import type { IngestCtx, IngestJob, IngestResult } from '../types';

// DENUE INEGI BuscarEntidad client. API gubernamental gratuita con token en
// path (mismo patrón que inegi.ts macro). Ingiere establecimientos comerciales
// georreferenciados por entidad federativa (cve_estado 2 dígitos INEGI).
// SCIAN code raw se persiste en geo_data_points.scian_code — el mapeo a
// tiers (high/standard/basic) se aplica downstream en Bloque 7.F.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.1 / §7.F
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2

export const DENUE_BASE = 'https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarEntidad';

// Reuse del mapa entidad → CVE INEGI (read-only). Idéntico dominio de
// valores que SHF. Si en el futuro cambia alguno, actualizar en SHF y
// ambos ingestores reflejan el cambio.
export const DENUE_ESTADO_CVE: Record<string, string> = SHF_ENTIDAD_CVE;

export const DENUE_SOURCE = 'denue' as const;
export const DENUE_ENTITY_TYPE = 'commercial_establishment' as const;

export interface DenueApiRow {
  CLEE: string;
  Id?: string;
  Nombre?: string;
  Razon_social?: string;
  Clase_actividad?: string;
  Estrato?: string;
  Tipo_vialidad?: string;
  Calle?: string;
  Num_Exterior?: string;
  Num_Interior?: string;
  Colonia?: string;
  CP?: string;
  Ubicacion?: string;
  Telefono?: string;
  Correo_e?: string;
  Sitio_internet?: string;
  Tipo?: string;
  Longitud?: string;
  Latitud?: string;
  CentroComercial?: string;
  TipoCentroComercial?: string;
  NumLocal?: string;
  Fecha_Alta?: string;
}

export interface DenueParsedRow {
  source_id: string;
  entity_type: typeof DENUE_ENTITY_TYPE;
  name: string | null;
  lat: number;
  lng: number;
  h3_r8: string | null;
  scian_code: string | null;
  meta: {
    scian_code: string | null;
    clase_actividad_raw: string | null;
    estrato: string | null;
    giro: string | null;
    cp: string | null;
    razon_social: string | null;
    fecha_alta: string | null;
  };
}

// MX bounding box (continental). Refuerzo client-side: rechaza coords fuera
// del rango antes de delegar al gate geoValidityGateMx.
const MX_BBOX = { minLat: 14.5, maxLat: 32.8, minLng: -118.4, maxLng: -86.7 };

export function parseDenuePoint(
  rawLat: string | null | undefined,
  rawLng: string | null | undefined,
): { lat: number; lng: number } | null {
  if (rawLat == null || rawLng == null) return null;
  const lat = Number.parseFloat(String(rawLat).trim());
  const lng = Number.parseFloat(String(rawLng).trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// Clase_actividad trae formato "461110 — Comercio al por menor en tiendas…"
// El prefijo de 6 dígitos es el SCIAN code. Se devuelve null si la cadena no
// empieza con 6 dígitos — no intenta matchear SCIAN de menos dígitos.
export function parseDenueScian(claseActividad: string | null | undefined): string | null {
  if (claseActividad == null) return null;
  const s = String(claseActividad).trim();
  if (s === '') return null;
  const first = s.split(/\s+/)[0];
  if (first == null) return null;
  if (!/^\d{6}$/.test(first)) return null;
  return first;
}

export function parseDenuePayload(payload: DenueApiRow[]): DenueParsedRow[] {
  if (!Array.isArray(payload)) return [];
  const out: DenueParsedRow[] = [];
  for (const row of payload) {
    if (row == null || typeof row !== 'object') continue;
    const clee = typeof row.CLEE === 'string' ? row.CLEE.trim() : '';
    if (clee === '') continue;
    const point = parseDenuePoint(row.Latitud, row.Longitud);
    if (point == null) continue;
    if (
      point.lat < MX_BBOX.minLat ||
      point.lat > MX_BBOX.maxLat ||
      point.lng < MX_BBOX.minLng ||
      point.lng > MX_BBOX.maxLng
    ) {
      // Punto fuera de bounding box MX — skip. El gate geoValidityGateMx
      // todavía reporta warnings si colamos alguno borderline.
      continue;
    }

    const scian = parseDenueScian(row.Clase_actividad);
    const name = (row.Razon_social?.trim() || row.Nombre?.trim() || null) ?? null;
    const giro = row.Ubicacion?.trim() || row.Colonia?.trim() || null;

    out.push({
      source_id: clee,
      entity_type: DENUE_ENTITY_TYPE,
      name,
      lat: point.lat,
      lng: point.lng,
      h3_r8: pointToH3R8(point),
      scian_code: scian,
      meta: {
        scian_code: scian,
        clase_actividad_raw: row.Clase_actividad?.trim() ?? null,
        estrato: row.Estrato?.trim() ?? null,
        giro,
        cp: row.CP?.trim() ?? null,
        razon_social: row.Razon_social?.trim() ?? null,
        fecha_alta: row.Fecha_Alta?.trim() ?? null,
      },
    });
  }
  return out;
}

export interface FetchDenueOptions {
  runId?: string;
  fetchImpl?: typeof fetch;
}

function buildDenueUrl(cveEstado: string, token: string): string {
  return `${DENUE_BASE}/${cveEstado}/${token}`;
}

export async function fetchDenueEntidad(
  cveEstado: string,
  token: string,
  opts: FetchDenueOptions = {},
): Promise<DenueApiRow[]> {
  if (!cveEstado || !/^\d{2}$/.test(cveEstado)) {
    throw new Error('denue_invalid_cve_estado');
  }
  if (!token) throw new Error('denue_missing_token');
  const url = buildDenueUrl(cveEstado, token);
  const doFetch = opts.fetchImpl ?? fetch;
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(opts.runId ? correlationHeaders(opts.runId) : {}),
  };
  const res = await doFetch(url, { headers });
  if (!res.ok) {
    throw new Error(`denue_http_${res.status}`);
  }
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) return [];
  return json as DenueApiRow[];
}

export async function upsertDenueRows(
  rows: DenueParsedRow[],
  ctx: IngestCtx,
  fetchedAtISO: string,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  // NOTA: geo_data_points.geom es geometry(Point,4326) en Postgres pero el
  // SDK supabase-js no tipa PostGIS directamente. Se omite geom al insertar
  // y se popula via trigger/RPC post-insert desde (lat,lng) persistidos en
  // meta + h3_r8. h3_r8 es suficiente para spatial ops downstream (ST_Contains
  // con zonas usa h3_r8, y el trigger DB puede calcular geom=ST_SetSRID(
  // ST_Point(meta->>'lng', meta->>'lat'), 4326) si se necesita.
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: DENUE_SOURCE,
    source_id: r.source_id,
    entity_type: r.entity_type,
    name: r.name,
    scian_code: r.scian_code,
    h3_r8: r.h3_r8,
    zone_id: null,
    valid_from: fetchedAtISO,
    run_id: ctx.runId,
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayISO(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export interface DenueDriverInput {
  cveEstado?: string;
}

export const denueDriver: IngestDriver<DenueDriverInput, DenueApiRow[]> = {
  source: DENUE_SOURCE,
  category: 'geo',
  defaultPeriodicity: 'monthly',
  async fetch(ctx, input) {
    const token = process.env.INEGI_TOKEN;
    if (!token) throw new Error('missing_env: INEGI_TOKEN');
    const cveEstado = input?.cveEstado ?? '09';
    return await fetchDenueEntidad(cveEstado, token, { runId: ctx.runId });
  },
  async parse(payload) {
    return parseDenuePayload(payload as DenueApiRow[]);
  },
  async upsert(rows, ctx) {
    const parsed = rows as DenueParsedRow[];
    const { inserted, errors } = await upsertDenueRows(parsed, ctx, todayISO());
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

registerDriver(denueDriver);

export interface IngestDenueOptions {
  cveEstado?: string;
  triggeredBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

// Ingesta single-entidad (default CDMX=09). Para bulk MX completo, el caller
// debe iterar externamente sobre Object.values(DENUE_ESTADO_CVE) — no se hace
// aquí porque cada entidad genera su propio ingest_runs row + watermark +
// raw payload persist, y queremos métricas por entidad.
export async function ingestDenue(options: IngestDenueOptions = {}): Promise<IngestResult> {
  const cveEstado = options.cveEstado ?? '09';
  if (!/^\d{2}$/.test(cveEstado)) throw new Error('denue_invalid_cve_estado');
  const fetchedAt = todayISO();

  const job: IngestJob<DenueApiRow[]> = {
    source: DENUE_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'cron:monthly',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const token = process.env.INEGI_TOKEN;
      if (!token) throw new Error('missing_env: INEGI_TOKEN');

      const payload = await fetchDenueEntidad(cveEstado, token, { runId: ctx.runId });
      const parsed = parseDenuePayload(payload);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<DenueParsedRow>({ min: 10 }),
          geoValidityGateMx<DenueParsedRow>(),
          duplicateDetectionGate<DenueParsedRow>((r) => r.source_id),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertDenueRows(parsed, ctx, fetchedAt);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: DENUE_SOURCE,
              destinationTable: 'geo_data_points',
              upstreamUrl: `${DENUE_BASE}/${cveEstado}`,
              transformation: 'denue_buscar_entidad_parse',
              sourceSpan: {
                clee: r.source_id,
                scian_code: r.scian_code,
                clase_actividad_raw: r.meta.clase_actividad_raw,
              },
            })),
          );
        } catch {
          // lineage best-effort
        }
      }

      return {
        rows_inserted: inserted,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: 0,
        errors,
        cost_estimated_usd: 0,
        meta: {
          quality_gate_warnings: gates.warnings,
          rows_parsed: parsed.length,
          cve_estado: cveEstado,
        },
        rawPayload: payload,
      };
    },
  };

  const runOpts: RunIngestOptions = {
    saveRaw: options.saveRaw ?? true,
    bumpWatermarkOnSuccess: { periodEnd: fetchedAt },
  };
  if (typeof options.retries === 'number') runOpts.retries = options.retries;

  return await runIngest(job, runOpts);
}
