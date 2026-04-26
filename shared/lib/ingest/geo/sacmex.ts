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

// STUB — activar L-NEW-GEO-SACMEX-01 (FASE 11.E)
// SACMEX (Sistema de Aguas de la Ciudad de México). Portal publica avisos
// de cortes, tandeo y baja presión por colonia/alcaldía vía HTML y CSV.
// ADR-012 permite scraping responsable de portales gov.mx (diferente de
// portales inmobiliarios, explícitamente prohibidos por ADR-010 §D10).
//
// Periodicidad semanal — avisos se actualizan 2-3 veces por semana.
//
// Input dual:
//   - { kind: 'csv', text }: admin-upload CSV descargado del portal
//   - { kind: 'html', text }: admin-upload HTML para scrape parser
//
// En H1 SOLO implementamos csv path. HTML parsing requiere cheerio/jsdom
// (no instaladas y FASE 07 no autoriza nuevas deps). Driver acepta la
// variante HTML en el union pero throws 'sacmex_html_parsing_not_implemented'.
// Auto-fetch HTTP redirigido a CKAN reportes-de-agua (portal sacmex 503
// degraded) agendado L-NEW-GEO-SACMEX-01 (FASE 11.E, ~4h). Reality audit:
// docs/08_PRODUCT_AUDIT/10_DATA_REALITY_AUDIT.md §5.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.7
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-012 (scraping gov.mx permitido)

export const SACMEX_SOURCE = 'sacmex' as const;
export const SACMEX_PERIODICITY = 'weekly' as const;
export const SACMEX_ENTITY_TYPE = 'water_cut' as const;
export const SACMEX_UPSTREAM_URL = 'https://www.sacmex.cdmx.gob.mx/avisos';

// Tipos de afectación canónicos.
export const SACMEX_AFECTACION_CANONICAL = [
  'corte_total',
  'presion_baja',
  'sin_agua',
  'tandeo',
  'otros',
] as const;

export type SacmexAfectacion = (typeof SACMEX_AFECTACION_CANONICAL)[number];

export type SacmexCanonicalHeader =
  | 'alcaldia'
  | 'colonia'
  | 'fecha_inicio'
  | 'fecha_fin'
  | 'tipo_afectacion'
  | 'motivo'
  | 'latitud'
  | 'longitud';

export const SACMEX_HEADER_MAP: Record<string, SacmexCanonicalHeader> = {
  alcaldia: 'alcaldia',
  delegacion: 'alcaldia',
  municipio: 'alcaldia',
  colonia: 'colonia',
  colonias: 'colonia',
  zona: 'colonia',
  fecha_inicio: 'fecha_inicio',
  fecha_de_inicio: 'fecha_inicio',
  inicio: 'fecha_inicio',
  desde: 'fecha_inicio',
  fecha_fin: 'fecha_fin',
  fecha_de_fin: 'fecha_fin',
  fin: 'fecha_fin',
  hasta: 'fecha_fin',
  tipo_afectacion: 'tipo_afectacion',
  afectacion: 'tipo_afectacion',
  tipo: 'tipo_afectacion',
  motivo: 'motivo',
  causa: 'motivo',
  observaciones: 'motivo',
  latitud: 'latitud',
  lat: 'latitud',
  y: 'latitud',
  longitud: 'longitud',
  lon: 'longitud',
  lng: 'longitud',
  x: 'longitud',
};

export interface SacmexParsedRow {
  source_id: string;
  entity_type: typeof SACMEX_ENTITY_TYPE;
  name: string;
  scian_code: null;
  h3_r8: string | null;
  lat: number | null;
  lng: number | null;
  valid_from: string;
  valid_to: string | null;
  meta: {
    alcaldia: string;
    colonia: string;
    tipo_afectacion: SacmexAfectacion;
    tipo_afectacion_raw: string | null;
    motivo: string | null;
    fecha_inicio_raw: string;
    fecha_fin_raw: string | null;
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function normalizeHeader(h: string): string {
  if (typeof h !== 'string') return '';
  const deaccented = h
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return deaccented.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

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

// Acepta YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, DD-MM-YYYY. Regresa ISO
// YYYY-MM-DD o null. Mismo patrón que parseFgjDate.
export function parseSacmexDate(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (t === '') return null;

  const iso = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso?.[1] && iso[2] && iso[3]) {
    const yyyy = Number(iso[1]);
    const mm = Number(iso[2]);
    const dd = Number(iso[3]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  const mx = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (mx?.[1] && mx[2] && mx[3]) {
    const dd = Number(mx[1]);
    const mm = Number(mx[2]);
    const yyyy = Number(mx[3]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  return null;
}

// Heurística substring (case/accent-insensitive) para mapear tipo raw
// a canónico. Orden importa: "corte total" antes de "sin agua" porque
// algunos avisos dicen "corte total sin agua" — corte_total gana.
export function parseSacmexAfectacion(raw: string | null | undefined): SacmexAfectacion {
  if (raw == null) return 'otros';
  const t = String(raw).trim();
  if (t === '') return 'otros';
  const norm = t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/corte total|corte-total|cortetotal/.test(norm)) return 'corte_total';
  if (/tandeo|tanda/.test(norm)) return 'tandeo';
  if (/presion baja|baja presion|presion-baja/.test(norm)) return 'presion_baja';
  if (/sin agua|desabasto|suspension/.test(norm)) return 'sin_agua';
  return 'otros';
}

// FNV-1a 32-bit hash hex. natural key dedup = hash(alcaldia+colonia+fecha_inicio).
function hashKey(parts: Array<string | null | undefined>): string {
  const s = parts.map((p) => (p == null ? '' : String(p))).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `sacmex_${h.toString(16).padStart(8, '0')}`;
}

function parseCoord(v: string | undefined): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '') return null;
  const n = Number.parseFloat(t.replace(/,/g, '.'));
  if (!Number.isFinite(n)) return null;
  if (n < -180 || n > 180) return null;
  return n;
}

function cleanCell(v: string | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

interface RawSacmexInput {
  alcaldia: string | null;
  colonia: string | null;
  fechaInicioRaw: string | null;
  fechaFinRaw: string | null;
  tipoAfectacionRaw: string | null;
  motivo: string | null;
  lat: number | null;
  lng: number | null;
}

function buildParsedRow(input: RawSacmexInput): SacmexParsedRow | null {
  const fechaInicio = parseSacmexDate(input.fechaInicioRaw);
  if (fechaInicio == null) return null;
  const alcaldia = input.alcaldia;
  const colonia = input.colonia;
  if (!alcaldia || alcaldia === '') return null;
  if (!colonia || colonia === '') return null;

  const fechaFin = parseSacmexDate(input.fechaFinRaw);
  const tipo = parseSacmexAfectacion(input.tipoAfectacionRaw);

  // Valida lat/lng: si uno es nulo y el otro no, ambos quedan null (no
  // colocamos parciales). Si ambos presentes pero fuera de rango lat
  // [-90,90], también ambos null.
  let lat: number | null = input.lat;
  let lng: number | null = input.lng;
  if (lat != null && (lat < -90 || lat > 90)) {
    lat = null;
    lng = null;
  } else if (lat == null || lng == null) {
    lat = null;
    lng = null;
  }

  const sourceId = hashKey([alcaldia, colonia, fechaInicio]);
  const h3 = lat != null && lng != null ? pointToH3R8({ lat, lng }) : null;

  return {
    source_id: sourceId,
    entity_type: SACMEX_ENTITY_TYPE,
    name: `${tipo} — ${colonia}, ${alcaldia}`,
    scian_code: null,
    h3_r8: h3,
    lat,
    lng,
    valid_from: fechaInicio,
    valid_to: fechaFin,
    meta: {
      alcaldia,
      colonia,
      tipo_afectacion: tipo,
      tipo_afectacion_raw: input.tipoAfectacionRaw,
      motivo: input.motivo,
      fecha_inicio_raw: input.fechaInicioRaw ?? fechaInicio,
      fecha_fin_raw: input.fechaFinRaw,
    },
  };
}

function coerceHeaders(headersRaw: string[]): Partial<Record<SacmexCanonicalHeader, number>> {
  const colIndex: Partial<Record<SacmexCanonicalHeader, number>> = {};
  for (let i = 0; i < headersRaw.length; i++) {
    const nm = normalizeHeader(headersRaw[i] ?? '');
    if (!nm) continue;
    const canon = SACMEX_HEADER_MAP[nm];
    if (canon && colIndex[canon] === undefined) {
      colIndex[canon] = i;
    }
  }
  return colIndex;
}

export function parseSacmexCsv(text: string): SacmexParsedRow[] {
  if (typeof text !== 'string' || text.trim() === '') return [];
  const lines = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  if (firstLine == null) return [];
  const headersRaw = parseCsvLine(firstLine).map((h) => h.trim());
  const colIndex = coerceHeaders(headersRaw);

  if (
    colIndex.alcaldia === undefined ||
    colIndex.colonia === undefined ||
    colIndex.fecha_inicio === undefined
  ) {
    throw new Error('sacmex_csv_headers_not_recognized');
  }

  const iAlc = colIndex.alcaldia;
  const iCol = colIndex.colonia;
  const iFi = colIndex.fecha_inicio;
  const iFf = colIndex.fecha_fin;
  const iTipo = colIndex.tipo_afectacion;
  const iMot = colIndex.motivo;
  const iLat = colIndex.latitud;
  const iLng = colIndex.longitud;

  const out: SacmexParsedRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    if (line == null) continue;
    const cols = parseCsvLine(line).map((c) => c.trim());
    if (cols.every((c) => c === '')) continue;

    const row = buildParsedRow({
      alcaldia: cleanCell(cols[iAlc]),
      colonia: cleanCell(cols[iCol]),
      fechaInicioRaw: cleanCell(cols[iFi]),
      fechaFinRaw: iFf !== undefined ? cleanCell(cols[iFf]) : null,
      tipoAfectacionRaw: iTipo !== undefined ? cleanCell(cols[iTipo]) : null,
      motivo: iMot !== undefined ? cleanCell(cols[iMot]) : null,
      lat: iLat !== undefined ? parseCoord(cols[iLat]) : null,
      lng: iLng !== undefined ? parseCoord(cols[iLng]) : null,
    });
    if (row != null) out.push(row);
  }
  return out;
}

export type SacmexDriverInput = { kind: 'csv'; text: string } | { kind: 'html'; text: string };

function toParsed(input: SacmexDriverInput): SacmexParsedRow[] {
  if (input.kind === 'html') {
    // HTML scraping requiere cheerio/jsdom — deferido H2/FASE 07b.A.
    throw new Error('sacmex_html_parsing_not_implemented');
  }
  if (input.kind !== 'csv') {
    throw new Error('sacmex_unknown_input_kind');
  }
  return parseSacmexCsv(input.text);
}

export async function upsertSacmexRows(
  rows: SacmexParsedRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: SACMEX_SOURCE,
    source_id: r.source_id,
    entity_type: r.entity_type,
    name: r.name,
    scian_code: r.scian_code,
    h3_r8: r.h3_r8,
    valid_from: r.valid_from,
    run_id: ctx.runId,
    meta: {
      ...r.meta,
      valid_to: r.valid_to,
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

export const sacmexDriver: IngestDriver<SacmexDriverInput, SacmexDriverInput> = {
  source: SACMEX_SOURCE,
  category: 'geo',
  defaultPeriodicity: SACMEX_PERIODICITY,
  async fetch(_ctx, input) {
    if (!input) throw new Error('sacmex_missing_input');
    if (input.kind === 'html') {
      // Se reconoce el kind, pero el parser no está implementado. Se
      // re-lanza al ejecutar toParsed, consistente con el driver contract.
      throw new Error('sacmex_html_parsing_not_implemented');
    }
    if (input.kind !== 'csv') throw new Error('sacmex_unknown_input_kind');
    if (!input.text || input.text.trim() === '') throw new Error('sacmex_missing_payload');
    return input;
  },
  async parse(payload) {
    return toParsed(payload as SacmexDriverInput);
  },
  async upsert(rows, ctx) {
    const parsed = rows as SacmexParsedRow[];
    const { inserted, errors } = await upsertSacmexRows(parsed, ctx);
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

registerDriver(sacmexDriver);

function todayISO(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export interface IngestSacmexOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

export async function ingestSacmex(
  input: SacmexDriverInput,
  options: IngestSacmexOptions = {},
): Promise<IngestResult> {
  if (!input) throw new Error('sacmex_missing_input');
  if (input.kind === 'html') throw new Error('sacmex_html_parsing_not_implemented');
  if (input.kind !== 'csv') throw new Error('sacmex_unknown_input_kind');
  if (!input.text || input.text.trim() === '') throw new Error('sacmex_missing_payload');

  const periodEnd = todayISO();

  const job: IngestJob<SacmexDriverInput> = {
    source: SACMEX_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'cron:weekly',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const parsed = toParsed(input);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<SacmexParsedRow>({ min: 0 }),
          geoValidityGateMx<SacmexParsedRow>(),
          duplicateDetectionGate<SacmexParsedRow>((r) => `${r.source_id}:${r.valid_from}`),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertSacmexRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: SACMEX_SOURCE,
              destinationTable: 'geo_data_points',
              upstreamUrl: SACMEX_UPSTREAM_URL,
              transformation: 'sacmex_csv_parse',
              sourceSpan: {
                source_id: r.source_id,
                tipo_afectacion: r.meta.tipo_afectacion,
                alcaldia: r.meta.alcaldia,
                colonia: r.meta.colonia,
              },
            })),
          );
        } catch {
          // lineage best-effort
        }
      }

      const meta: Record<string, unknown> = {
        quality_gate_warnings: gates.warnings,
        rows_parsed: parsed.length,
        payload_kind: input.kind,
      };
      if (options.uploadedBy) meta.uploaded_by = options.uploadedBy;

      return {
        rows_inserted: inserted,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: 0,
        errors,
        cost_estimated_usd: 0,
        meta,
        rawPayload: input,
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
