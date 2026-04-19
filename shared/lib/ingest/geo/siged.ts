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

// SIGED SEP (Sistema de Información y Gestión Educativa). Dataset abierto
// con establecimientos educativos: CCT (Centro de Trabajo) 10 chars,
// nombre, nivel, turno, tipo, modalidad, lat, lng, alcaldía, estado.
// Periodicidad mensual — SEP publica actualizaciones el último viernes
// de cada mes vía portal datos.gob.mx.
//
// Input: admin-upload CSV texto. No hay API pública consumible directamente
// (el portal SIGED web requiere sesión/captcha).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.5

export const SIGED_SOURCE = 'siged' as const;
export const SIGED_PERIODICITY = 'monthly' as const;
export const SIGED_ENTITY_TYPE = 'school' as const;
export const SIGED_UPSTREAM_URL = 'https://www.siged.sep.gob.mx/SIGED/';

// Niveles educativos canónicos. Mapping heurístico desde strings raw del
// CSV SEP vía parseSigedNivel. "otros" captura educación inicial, especial,
// para adultos y cualquier otro no mapeado explícitamente.
export const SIGED_NIVEL_CANONICAL = [
  'preescolar',
  'primaria',
  'secundaria',
  'media_superior',
  'superior',
  'otros',
] as const;

export type SigedNivel = (typeof SIGED_NIVEL_CANONICAL)[number];

export type SigedCanonicalHeader =
  | 'cct'
  | 'nombre'
  | 'nivel'
  | 'tipo'
  | 'turno'
  | 'modalidad'
  | 'latitud'
  | 'longitud'
  | 'alcaldia'
  | 'estado';

// Header map raw-normalizado → canónico. SEP cambia nombres de columna
// entre publicaciones ("CLAVE_CT" vs "CCT" vs "clave_cct"); el mapa
// absorbe las variantes conocidas.
export const SIGED_HEADER_MAP: Record<string, SigedCanonicalHeader> = {
  cct: 'cct',
  clave_ct: 'cct',
  clave_cct: 'cct',
  clave_centro_trabajo: 'cct',
  nombre: 'nombre',
  nombre_ct: 'nombre',
  nombre_centro_trabajo: 'nombre',
  nombre_escuela: 'nombre',
  nivel: 'nivel',
  nivel_educativo: 'nivel',
  tipo: 'tipo',
  tipo_educativo: 'tipo',
  sostenimiento: 'tipo',
  turno: 'turno',
  modalidad: 'modalidad',
  latitud: 'latitud',
  lat: 'latitud',
  y: 'latitud',
  longitud: 'longitud',
  lon: 'longitud',
  lng: 'longitud',
  x: 'longitud',
  alcaldia: 'alcaldia',
  municipio: 'alcaldia',
  delegacion: 'alcaldia',
  estado: 'estado',
  entidad: 'estado',
  entidad_federativa: 'estado',
};

export interface SigedParsedRow {
  source_id: string;
  entity_type: typeof SIGED_ENTITY_TYPE;
  name: string;
  scian_code: null;
  h3_r8: string | null;
  lat: number;
  lng: number;
  meta: {
    cct: string;
    nivel: SigedNivel;
    nivel_raw: string | null;
    tipo: string | null;
    turno: string | null;
    modalidad: string | null;
    alcaldia: string | null;
    estado: string | null;
  };
}

// Normaliza header: NFD deacento → lowercase → colapsa non-alnum a "_".
// Idéntico a fgj.normalizeHeader. Nos mantiene consistentes entre ingestores.
export function normalizeHeader(h: string): string {
  if (typeof h !== 'string') return '';
  const deaccented = h
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return deaccented.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Parser CSV inline. Mismo pattern que fgj/gtfs: respeta comillas,
// comillas escapadas "", NO soporta newlines embebidos en campos.
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

// Heurística substring (case/accent-insensitive) sobre nivel raw del CSV.
// Orden importa: "media superior" antes de "superior" y "secundaria" antes
// de "primaria" (por si algún raw trae "secundaria_tecnica_primaria" u
// otro compound; los matches substring se evaluarían en el orden definido).
export function parseSigedNivel(nivelRaw: string | null | undefined): SigedNivel {
  if (nivelRaw == null) return 'otros';
  const t = String(nivelRaw).trim();
  if (t === '') return 'otros';
  const norm = t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/preescolar|inicial|kinder/.test(norm)) return 'preescolar';
  if (/media superior|bachillerato|preparatoria|cbtis|cetis|conalep|cobach/.test(norm)) {
    return 'media_superior';
  }
  if (/superior|universidad|licenciatura|tecnologico|normal/.test(norm)) return 'superior';
  if (/secundaria|telesecundaria/.test(norm)) return 'secundaria';
  if (/primaria/.test(norm)) return 'primaria';
  return 'otros';
}

function parseCoord(v: string | undefined): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '') return null;
  const n = Number.parseFloat(t.replace(/,/g, '.'));
  return Number.isFinite(n) ? n : null;
}

function cleanCell(v: string | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

interface RawSigedRowInput {
  cct: string | null;
  nombre: string | null;
  nivelRaw: string | null;
  tipo: string | null;
  turno: string | null;
  modalidad: string | null;
  alcaldia: string | null;
  estado: string | null;
  lat: number | null;
  lng: number | null;
}

function buildParsedRow(input: RawSigedRowInput): SigedParsedRow | null {
  if (!input.cct || input.cct === '') return null;
  if (input.lat == null || input.lng == null) return null;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;
  if (input.lat < -90 || input.lat > 90) return null;
  if (input.lng < -180 || input.lng > 180) return null;

  const nivel = parseSigedNivel(input.nivelRaw);
  const name = input.nombre ?? input.cct;

  return {
    source_id: input.cct,
    entity_type: SIGED_ENTITY_TYPE,
    name,
    scian_code: null,
    h3_r8: pointToH3R8({ lat: input.lat, lng: input.lng }),
    lat: input.lat,
    lng: input.lng,
    meta: {
      cct: input.cct,
      nivel,
      nivel_raw: input.nivelRaw,
      tipo: input.tipo,
      turno: input.turno,
      modalidad: input.modalidad,
      alcaldia: input.alcaldia,
      estado: input.estado,
    },
  };
}

function coerceHeaders(headersRaw: string[]): Partial<Record<SigedCanonicalHeader, number>> {
  const colIndex: Partial<Record<SigedCanonicalHeader, number>> = {};
  for (let i = 0; i < headersRaw.length; i++) {
    const nm = normalizeHeader(headersRaw[i] ?? '');
    if (!nm) continue;
    const canon = SIGED_HEADER_MAP[nm];
    if (canon && colIndex[canon] === undefined) {
      colIndex[canon] = i;
    }
  }
  return colIndex;
}

export function parseSigedCsv(text: string): SigedParsedRow[] {
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
    colIndex.cct === undefined ||
    colIndex.latitud === undefined ||
    colIndex.longitud === undefined
  ) {
    throw new Error('siged_csv_headers_not_recognized');
  }

  const iCct = colIndex.cct;
  const iLat = colIndex.latitud;
  const iLng = colIndex.longitud;
  const iNombre = colIndex.nombre;
  const iNivel = colIndex.nivel;
  const iTipo = colIndex.tipo;
  const iTurno = colIndex.turno;
  const iMod = colIndex.modalidad;
  const iAlc = colIndex.alcaldia;
  const iEst = colIndex.estado;

  const out: SigedParsedRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    if (line == null) continue;
    const cols = parseCsvLine(line).map((c) => c.trim());
    if (cols.every((c) => c === '')) continue;

    const row = buildParsedRow({
      cct: cleanCell(cols[iCct]),
      nombre: iNombre !== undefined ? cleanCell(cols[iNombre]) : null,
      nivelRaw: iNivel !== undefined ? cleanCell(cols[iNivel]) : null,
      tipo: iTipo !== undefined ? cleanCell(cols[iTipo]) : null,
      turno: iTurno !== undefined ? cleanCell(cols[iTurno]) : null,
      modalidad: iMod !== undefined ? cleanCell(cols[iMod]) : null,
      alcaldia: iAlc !== undefined ? cleanCell(cols[iAlc]) : null,
      estado: iEst !== undefined ? cleanCell(cols[iEst]) : null,
      lat: parseCoord(cols[iLat]),
      lng: parseCoord(cols[iLng]),
    });
    if (row != null) out.push(row);
  }
  return out;
}

export type SigedDriverInput = { csvText: string };

export async function upsertSigedRows(
  rows: SigedParsedRow[],
  ctx: IngestCtx,
  validFrom: string,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: SIGED_SOURCE,
    source_id: r.source_id,
    entity_type: r.entity_type,
    name: r.name,
    scian_code: r.scian_code,
    h3_r8: r.h3_r8,
    valid_from: validFrom,
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

export const sigedDriver: IngestDriver<SigedDriverInput, string> = {
  source: SIGED_SOURCE,
  category: 'geo',
  defaultPeriodicity: SIGED_PERIODICITY,
  async fetch(_ctx, input) {
    if (!input || typeof input.csvText !== 'string' || input.csvText.trim() === '') {
      throw new Error('siged_missing_payload');
    }
    return input.csvText;
  },
  async parse(payload) {
    return parseSigedCsv(payload as string);
  },
  async upsert(rows, ctx) {
    const parsed = rows as SigedParsedRow[];
    const { inserted, errors } = await upsertSigedRows(parsed, ctx, todayISO());
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

registerDriver(sigedDriver);

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayISO(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export interface IngestSigedOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

export async function ingestSigedCsv(
  input: SigedDriverInput,
  options: IngestSigedOptions = {},
): Promise<IngestResult> {
  if (!input?.csvText || input.csvText.trim() === '') {
    throw new Error('siged_missing_payload');
  }
  const periodEnd = todayISO();

  const job: IngestJob<string> = {
    source: SIGED_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin_upload',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const parsed = parseSigedCsv(input.csvText);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<SigedParsedRow>({ min: 0 }),
          geoValidityGateMx<SigedParsedRow>(),
          duplicateDetectionGate<SigedParsedRow>((r) => r.source_id),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertSigedRows(parsed, ctx, periodEnd);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: SIGED_SOURCE,
              destinationTable: 'geo_data_points',
              upstreamUrl: SIGED_UPSTREAM_URL,
              transformation: 'siged_csv_parse',
              sourceSpan: {
                cct: r.meta.cct,
                nivel: r.meta.nivel,
                nivel_raw: r.meta.nivel_raw,
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
        rawPayload: input.csvText,
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
