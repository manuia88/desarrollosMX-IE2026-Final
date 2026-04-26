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

// STUB — activar L-NEW-GEO-FGJ-01 (FASE 11.E)
// FGJ CDMX (Fiscalía General de Justicia). Dataset abierto:
// https://datos.cdmx.gob.mx/dataset/carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico
// Periodicidad semanal. El portal publica carpetas con fecha_hechos,
// delito, categoria_delito, alcaldia, colonia, latitud, longitud. Driver
// dual CSV/JSON: admin descarga manual → upload, o scrape controlado
// vuelca JSON. Categorización heurística reduce ~300 delitos a 8 buckets
// normalizados para snapshots downstream (crime_rate).
// Auto-fetch CKAN CSVs anuales 2016-2024 archivo.datos.cdmx.gob.mx/FGJ/
// agendado L-NEW-GEO-FGJ-01 (FASE 11.E, ~4h). Reality audit:
// docs/08_PRODUCT_AUDIT/10_DATA_REALITY_AUDIT.md §5.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2

export const FGJ_SOURCE = 'fgj' as const;
export const FGJ_PERIODICITY = 'weekly' as const;
export const FGJ_ENTITY_TYPE = 'crime_incident' as const;
export const FGJ_UPSTREAM_URL =
  'https://datos.cdmx.gob.mx/dataset/carpetas-de-investigacion-fgj-de-la-ciudad-de-mexico';

export const FGJ_CRIME_CATEGORIES = [
  'robo_vivienda',
  'robo_vehiculo',
  'violencia_familiar',
  'homicidio',
  'lesiones',
  'narcomenudeo',
  'fraude',
  'otros',
] as const;

export type FgjCrimeCategory = (typeof FGJ_CRIME_CATEGORIES)[number];

export type FgjCanonicalHeader =
  | 'ao_hechos'
  | 'mes_hechos'
  | 'fecha_hechos'
  | 'delito'
  | 'categoria_delito'
  | 'alcaldia_hechos'
  | 'colonia_hechos'
  | 'latitud'
  | 'longitud'
  | 'id_carpeta';

// Mapa heurístico header raw normalizado → columna canónica. Keys ya
// normalizadas (lowercase + sin acentos + sin chars no alfanum).
export const FGJ_HEADER_MAP: Record<string, FgjCanonicalHeader> = {
  ao_hechos: 'ao_hechos',
  ano_hechos: 'ao_hechos',
  anio_hechos: 'ao_hechos',
  ao_inicio: 'ao_hechos',
  ano_inicio: 'ao_hechos',
  year: 'ao_hechos',
  mes_hechos: 'mes_hechos',
  mes_inicio: 'mes_hechos',
  mes: 'mes_hechos',
  fecha_hechos: 'fecha_hechos',
  fecha_inicio: 'fecha_hechos',
  fecha: 'fecha_hechos',
  delito: 'delito',
  tipo_delito: 'delito',
  categoria_delito: 'categoria_delito',
  categoria: 'categoria_delito',
  alcaldia_hechos: 'alcaldia_hechos',
  alcaldia: 'alcaldia_hechos',
  municipio_hechos: 'alcaldia_hechos',
  municipio: 'alcaldia_hechos',
  colonia_hechos: 'colonia_hechos',
  colonia: 'colonia_hechos',
  colonia_catalogo: 'colonia_hechos',
  latitud: 'latitud',
  lat: 'latitud',
  y: 'latitud',
  longitud: 'longitud',
  lon: 'longitud',
  lng: 'longitud',
  x: 'longitud',
  id_carpeta: 'id_carpeta',
  carpeta_investigacion: 'id_carpeta',
  folio: 'id_carpeta',
  numero_carpeta: 'id_carpeta',
};

export interface FgjApiRow {
  [key: string]: unknown;
}

export interface FgjParsedRow {
  source_id: string;
  entity_type: typeof FGJ_ENTITY_TYPE;
  name: string;
  h3_r8: string | null;
  scian_code: null;
  lat: number | null;
  lng: number | null;
  valid_from: string;
  meta: {
    categoria_normalizada: FgjCrimeCategory;
    delito_raw: string;
    fecha_hechos: string;
    alcaldia: string | null;
    colonia: string | null;
    ao_hechos: number | null;
    mes_hechos: number | null;
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Quita acentos, lowercase, colapsa non-alphanum a "_". Idéntico a cnbv.
export function normalizeHeader(h: string): string {
  if (typeof h !== 'string') return '';
  const deaccented = h
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return deaccented.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Parser CSV inline. Soporta comas internas entre comillas, comillas
// escapadas "" dentro de campo entre comillas, espacios preservados.
// NO soporta newlines embebidos (FGJ portal no los usa).
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

// Heurística substring sobre delito_raw (case/accent-insensitive). Orden
// importa: robo_vivienda antes de robo_vehiculo porque "robo a casa
// habitacion" podría contener "casa" sin que sea vehicular; pero
// "vehiculo" es token específico. El orden preserva prioridad según
// ADR-010 §D2 (vivienda highest weight para IE).
export function categorizeFgjDelito(delitoRaw: string): FgjCrimeCategory {
  if (typeof delitoRaw !== 'string' || delitoRaw.trim() === '') return 'otros';
  const norm = delitoRaw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/casa habitacion|vivienda/.test(norm)) return 'robo_vivienda';
  if (/vehiculo|automovil|coche/.test(norm)) return 'robo_vehiculo';
  if (/violencia familiar/.test(norm)) return 'violencia_familiar';
  if (/homicidio/.test(norm)) return 'homicidio';
  if (/lesion/.test(norm)) return 'lesiones';
  if (/narcomenud|drogas/.test(norm)) return 'narcomenudeo';
  if (/fraude/.test(norm)) return 'fraude';
  return 'otros';
}

// Acepta YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, DD-MM-YYYY. Regresa
// YYYY-MM-DD o null. NO intenta parseo libre de texto fecha.
export function parseFgjDate(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (t === '') return null;

  // ISO-like YYYY-MM-DD or YYYY/MM/DD
  const iso = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso?.[1] && iso[2] && iso[3]) {
    const yyyy = Number(iso[1]);
    const mm = Number(iso[2]);
    const dd = Number(iso[3]);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
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

function parseNumericCell(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = String(v).trim();
  if (t === '' || t === '-' || t === '—') return null;
  const upper = t.toUpperCase();
  if (upper === 'N/D' || upper === 'ND' || upper === 'N/A' || upper === 'NA') return null;
  const n = Number.parseFloat(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseIntCell(v: unknown): number | null {
  const n = parseNumericCell(v);
  if (n == null) return null;
  return Number.isInteger(n) ? n : Math.trunc(n);
}

// FNV-1a 32-bit hash hex — suficiente para natural key dedup por carpeta
// cuando el portal no expone id_carpeta. No hay colisión adversarial.
function hashKey(parts: Array<string | number | null | undefined>): string {
  const s = parts.map((p) => (p == null ? '' : String(p))).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `fgj_${h.toString(16).padStart(8, '0')}`;
}

function coerceHeaders(headersRaw: string[]): {
  headersRaw: string[];
  colIndex: Partial<Record<FgjCanonicalHeader, number>>;
} {
  const colIndex: Partial<Record<FgjCanonicalHeader, number>> = {};
  for (let i = 0; i < headersRaw.length; i++) {
    const nm = normalizeHeader(headersRaw[i] ?? '');
    if (!nm) continue;
    const canon = FGJ_HEADER_MAP[nm];
    if (canon && colIndex[canon] === undefined) {
      colIndex[canon] = i;
    }
  }
  return { headersRaw, colIndex };
}

function buildParsedRow(input: {
  idCarpeta: string | null;
  delito: string;
  categoriaRaw: string | null;
  fechaRaw: string | null;
  aoHechos: number | null;
  mesHechos: number | null;
  alcaldia: string | null;
  colonia: string | null;
  lat: number | null;
  lng: number | null;
}): FgjParsedRow | null {
  const fecha = parseFgjDate(input.fechaRaw);
  if (fecha == null) return null;
  const delitoRaw = String(input.delito ?? '').trim();
  if (delitoRaw === '') return null;

  // Categoriza primero sobre delito (texto específico tipo "robo a casa
  // habitacion"); si el heurístico cae en "otros" y hay categoria_delito
  // publicada, intenta con esa como fallback. categoria_delito a veces es
  // nivel de impacto (DELITO DE ALTO IMPACTO) y no aporta; a veces es
  // familia (ROBO DE VEHICULO) y sí aporta.
  const primary = categorizeFgjDelito(delitoRaw);
  const categoria =
    primary === 'otros' && input.categoriaRaw && input.categoriaRaw.trim() !== ''
      ? categorizeFgjDelito(input.categoriaRaw)
      : primary;

  const hasCoords =
    typeof input.lat === 'number' &&
    typeof input.lng === 'number' &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng);

  const sourceId =
    input.idCarpeta && input.idCarpeta.trim() !== ''
      ? input.idCarpeta.trim()
      : hashKey([fecha, input.colonia, delitoRaw, input.lat, input.lng]);

  const h3 = hasCoords ? pointToH3R8({ lat: input.lat as number, lng: input.lng as number }) : null;

  return {
    source_id: sourceId,
    entity_type: FGJ_ENTITY_TYPE,
    name: delitoRaw.slice(0, 100),
    h3_r8: h3,
    scian_code: null,
    lat: hasCoords ? (input.lat as number) : null,
    lng: hasCoords ? (input.lng as number) : null,
    valid_from: fecha,
    meta: {
      categoria_normalizada: categoria,
      delito_raw: delitoRaw,
      fecha_hechos: fecha,
      alcaldia: input.alcaldia && input.alcaldia.trim() !== '' ? input.alcaldia.trim() : null,
      colonia: input.colonia && input.colonia.trim() !== '' ? input.colonia.trim() : null,
      ao_hechos: input.aoHechos,
      mes_hechos: input.mesHechos,
    },
  };
}

function parseFgjCsv(text: string): FgjParsedRow[] {
  if (typeof text !== 'string' || text.trim() === '') return [];

  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  if (firstLine == null) return [];
  const headersRaw = parseCsvLine(firstLine).map((h) => h.trim());
  const { colIndex } = coerceHeaders(headersRaw);

  if (colIndex.delito === undefined || colIndex.fecha_hechos === undefined) {
    throw new Error('fgj_csv_headers_not_recognized');
  }

  const out: FgjParsedRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    if (line == null) continue;
    const cols = parseCsvLine(line).map((c) => c.trim());
    if (cols.every((c) => c === '')) continue;

    const idCarpetaIdx = colIndex.id_carpeta;
    const categoriaIdx = colIndex.categoria_delito;
    const alcaldiaIdx = colIndex.alcaldia_hechos;
    const coloniaIdx = colIndex.colonia_hechos;
    const latIdx = colIndex.latitud;
    const lngIdx = colIndex.longitud;
    const aoIdx = colIndex.ao_hechos;
    const mesIdx = colIndex.mes_hechos;

    const row = buildParsedRow({
      idCarpeta: idCarpetaIdx !== undefined ? (cols[idCarpetaIdx] ?? null) : null,
      delito: cols[colIndex.delito] ?? '',
      categoriaRaw: categoriaIdx !== undefined ? (cols[categoriaIdx] ?? null) : null,
      fechaRaw: cols[colIndex.fecha_hechos] ?? null,
      aoHechos: aoIdx !== undefined ? parseIntCell(cols[aoIdx]) : null,
      mesHechos: mesIdx !== undefined ? parseIntCell(cols[mesIdx]) : null,
      alcaldia: alcaldiaIdx !== undefined ? (cols[alcaldiaIdx] ?? null) : null,
      colonia: coloniaIdx !== undefined ? (cols[coloniaIdx] ?? null) : null,
      lat: latIdx !== undefined ? parseNumericCell(cols[latIdx]) : null,
      lng: lngIdx !== undefined ? parseNumericCell(cols[lngIdx]) : null,
    });

    if (row != null) out.push(row);
  }
  return out;
}

function parseFgjJson(rows: unknown[]): FgjParsedRow[] {
  if (!Array.isArray(rows)) return [];
  if (rows.length === 0) return [];

  // Usa keys de la primera row como "headers" y mapea igual que CSV.
  const sample = rows.find((r): r is FgjApiRow => typeof r === 'object' && r != null);
  if (!sample) return [];
  const headersRaw = Object.keys(sample);
  const { colIndex } = coerceHeaders(headersRaw);

  if (colIndex.delito === undefined || colIndex.fecha_hechos === undefined) {
    throw new Error('fgj_json_headers_not_recognized');
  }

  const keyOf = (canon: FgjCanonicalHeader): string | undefined => {
    const idx = colIndex[canon];
    if (idx === undefined) return undefined;
    return headersRaw[idx];
  };

  const kId = keyOf('id_carpeta');
  const kDelito = keyOf('delito');
  const kCategoria = keyOf('categoria_delito');
  const kFecha = keyOf('fecha_hechos');
  const kAlc = keyOf('alcaldia_hechos');
  const kCol = keyOf('colonia_hechos');
  const kLat = keyOf('latitud');
  const kLng = keyOf('longitud');
  const kAo = keyOf('ao_hechos');
  const kMes = keyOf('mes_hechos');

  if (!kDelito || !kFecha) throw new Error('fgj_json_headers_not_recognized');

  const out: FgjParsedRow[] = [];
  for (const raw of rows) {
    if (typeof raw !== 'object' || raw == null) continue;
    const obj = raw as FgjApiRow;
    const row = buildParsedRow({
      idCarpeta: kId ? (obj[kId] == null ? null : String(obj[kId])) : null,
      delito: String(obj[kDelito] ?? ''),
      categoriaRaw: kCategoria ? (obj[kCategoria] == null ? null : String(obj[kCategoria])) : null,
      fechaRaw: kFecha ? (obj[kFecha] == null ? null : String(obj[kFecha])) : null,
      aoHechos: kAo ? parseIntCell(obj[kAo]) : null,
      mesHechos: kMes ? parseIntCell(obj[kMes]) : null,
      alcaldia: kAlc ? (obj[kAlc] == null ? null : String(obj[kAlc])) : null,
      colonia: kCol ? (obj[kCol] == null ? null : String(obj[kCol])) : null,
      lat: kLat ? parseNumericCell(obj[kLat]) : null,
      lng: kLng ? parseNumericCell(obj[kLng]) : null,
    });
    if (row != null) out.push(row);
  }
  return out;
}

export type FgjParseInput = { kind: 'csv'; text: string } | { kind: 'json'; rows: unknown[] };

export function parseFgjPayload(input: FgjParseInput): FgjParsedRow[] {
  if (input.kind === 'csv') return parseFgjCsv(input.text);
  return parseFgjJson(input.rows);
}

export type FgjDriverInput = { csvText: string } | { json: FgjApiRow[] };

function toParseInput(input: FgjDriverInput): FgjParseInput {
  if ('csvText' in input) {
    if (!input.csvText || input.csvText.trim() === '') {
      throw new Error('fgj_missing_payload');
    }
    return { kind: 'csv', text: input.csvText };
  }
  if (!Array.isArray(input.json)) throw new Error('fgj_missing_payload');
  return { kind: 'json', rows: input.json };
}

export async function upsertFgjRows(
  rows: FgjParsedRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: FGJ_SOURCE,
    source_id: r.source_id,
    entity_type: r.entity_type,
    name: r.name,
    scian_code: r.scian_code,
    h3_r8: r.h3_r8,
    valid_from: r.valid_from,
    run_id: ctx.runId,
    meta: r.meta as unknown as Record<string, unknown>,
  }));
  const { error, count } = await supabase.from('geo_data_points').upsert(payload as never, {
    onConflict: 'country_code,source,source_id,valid_from',
    count: 'exact',
    ignoreDuplicates: false,
  });
  if (error) return { inserted: 0, errors: [`geo_data_points_upsert: ${error.message}`] };
  return { inserted: count ?? rows.length, errors: [] };
}

export const fgjDriver: IngestDriver<FgjDriverInput, FgjParseInput> = {
  source: FGJ_SOURCE,
  category: 'geo',
  defaultPeriodicity: FGJ_PERIODICITY,
  async fetch(_ctx, input) {
    if (!input) throw new Error('fgj_missing_payload');
    return toParseInput(input);
  },
  async parse(payload) {
    return parseFgjPayload(payload);
  },
  async upsert(rows, ctx) {
    const parsed = rows as FgjParsedRow[];
    const { inserted, errors } = await upsertFgjRows(parsed, ctx);
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

registerDriver(fgjDriver);

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${yyyy}-${mm}-${dd}`;
}

export interface IngestFgjOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

export async function ingestFgj(
  input: FgjDriverInput,
  options: IngestFgjOptions = {},
): Promise<IngestResult> {
  const parseInput = toParseInput(input);
  const periodEnd = todayISO();

  const job: IngestJob<FgjParseInput> = {
    source: FGJ_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'cron:weekly',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const parsed = parseFgjPayload(parseInput);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<FgjParsedRow>({ min: 0 }),
          geoValidityGateMx<FgjParsedRow>(),
          duplicateDetectionGate<FgjParsedRow>((r) => `${r.source_id}:${r.valid_from}`),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertFgjRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: FGJ_SOURCE,
              destinationTable: 'geo_data_points',
              upstreamUrl: FGJ_UPSTREAM_URL,
              transformation: `fgj_${parseInput.kind}_parse`,
              sourceSpan: {
                source_id: r.source_id,
                categoria_normalizada: r.meta.categoria_normalizada,
                delito_raw: r.meta.delito_raw,
                fecha_hechos: r.meta.fecha_hechos,
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
        payload_kind: parseInput.kind,
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
        rawPayload: parseInput,
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
