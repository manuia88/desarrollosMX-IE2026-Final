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

// STUB — activar L-NEW-GEO-DGIS-01 (FASE 11.E)
// DGIS/CLUES — Dirección General de Información en Salud, Secretaría de Salud
// federal. CLUES = Clave Única de Establecimientos de Salud (12 chars).
// Dataset publica hospitales, clínicas, centros de salud, consultorios por
// institución (IMSS, ISSSTE, SSA, PEMEX, SEDENA, SEMAR, Privado) con
// nivel_atencion (primer/segundo/tercer) + georreferencia.
// Auto-fetch CKAN salud (datos.cdmx.gob.mx hospitales-y-centros-de-salud)
// agendado L-NEW-GEO-DGIS-01 (FASE 11.E, ~4h). Reality audit:
// docs/08_PRODUCT_AUDIT/10_DATA_REALITY_AUDIT.md §5.
//
// NOTA allowlist: source canónico es 'clues' (no 'dgis'). El plan maestro
// escribe "DGIS/CLUES" pero allowlist.ts usa 'clues' como identificador
// estable. Ver shared/lib/ingest/allowlist.ts:25.
//
// Input: admin-upload CSV. No hay API pública directa — DGIS publica CSV
// trimestral en portal datos.gob.mx.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.D.6

export const CLUES_SOURCE = 'clues' as const;
export const CLUES_PERIODICITY = 'monthly' as const;
export const CLUES_ENTITY_TYPE = 'healthcare_facility' as const;
export const CLUES_UPSTREAM_URL =
  'http://www.dgis.salud.gob.mx/contenidos/intercambio/clues_gobmx.html';

// Instituciones canónicas. 'otros' captura estatales, ONGs, religiosas,
// patronatos y cualquier no-mapeada explícitamente.
export const CLUES_INSTITUCION_CANONICAL = [
  'IMSS',
  'ISSSTE',
  'SSA',
  'PEMEX',
  'SEDENA',
  'SEMAR',
  'privado',
  'otros',
] as const;

export type CluesInstitucion = (typeof CLUES_INSTITUCION_CANONICAL)[number];

export const CLUES_NIVEL_ATENCION_CANONICAL = [
  'primer_nivel',
  'segundo_nivel',
  'tercer_nivel',
  'otros',
] as const;

export type CluesNivelAtencion = (typeof CLUES_NIVEL_ATENCION_CANONICAL)[number];

export type CluesCanonicalHeader =
  | 'clues'
  | 'nombre'
  | 'institucion'
  | 'tipo'
  | 'nivel_atencion'
  | 'latitud'
  | 'longitud'
  | 'alcaldia'
  | 'estado';

// Header map. DGIS publica con varias convenciones ("INSTITUCION",
// "NOMBRE_DE_LA_INSTITUCION", "CVE_INSTITUCION" mapea a numérico — evitado).
export const CLUES_HEADER_MAP: Record<string, CluesCanonicalHeader> = {
  clues: 'clues',
  clave_clues: 'clues',
  cve_clues: 'clues',
  nombre: 'nombre',
  nombre_establecimiento: 'nombre',
  nombre_unidad: 'nombre',
  institucion: 'institucion',
  nombre_de_la_institucion: 'institucion',
  nom_institucion: 'institucion',
  tipo: 'tipo',
  tipo_establecimiento: 'tipo',
  tipologia: 'tipo',
  nivel_atencion: 'nivel_atencion',
  nivel: 'nivel_atencion',
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
  nom_mun: 'alcaldia',
  estado: 'estado',
  entidad: 'estado',
  nom_ent: 'estado',
  entidad_federativa: 'estado',
};

export interface CluesParsedRow {
  source_id: string;
  entity_type: typeof CLUES_ENTITY_TYPE;
  name: string;
  scian_code: null;
  h3_r8: string | null;
  lat: number;
  lng: number;
  meta: {
    clues: string;
    institucion: CluesInstitucion;
    institucion_raw: string | null;
    tipo: string | null;
    nivel_atencion: CluesNivelAtencion;
    nivel_atencion_raw: string | null;
    alcaldia: string | null;
    estado: string | null;
  };
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

// Heurística substring para mapear institución raw → canónica. Orden
// relevante: SSA detecta "secretaria de salud"/"ssa"/"servicios de salud"
// DESPUÉS de las 3-letras IMSS/ISSSTE para evitar colisión; además
// "ISSSTE" literalmente contiene la subcadena "ssste" no "ssa", pero
// algunos datasets reportan "SSA-IMSS" prefijo, así que IMSS/ISSSTE primero.
export function parseCluesInstitucion(raw: string | null | undefined): CluesInstitucion {
  if (raw == null) return 'otros';
  const t = String(raw).trim();
  if (t === '') return 'otros';
  const norm = t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/issste/.test(norm)) return 'ISSSTE';
  if (/imss bienestar|imss-bienestar|imss/.test(norm)) return 'IMSS';
  if (/pemex/.test(norm)) return 'PEMEX';
  if (/sedena|defensa nacional/.test(norm)) return 'SEDENA';
  if (/semar|marina/.test(norm)) return 'SEMAR';
  if (/privad/.test(norm)) return 'privado';
  if (/ssa|secretaria de salud|servicios de salud|salud publica/.test(norm)) return 'SSA';
  return 'otros';
}

export function parseCluesNivelAtencion(raw: string | null | undefined): CluesNivelAtencion {
  if (raw == null) return 'otros';
  const t = String(raw).trim();
  if (t === '') return 'otros';
  const norm = t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/primer|1er|1o|nivel 1/.test(norm)) return 'primer_nivel';
  if (/segundo|2do|2o|nivel 2/.test(norm)) return 'segundo_nivel';
  if (/tercer|3er|3o|nivel 3/.test(norm)) return 'tercer_nivel';
  if (norm === '1') return 'primer_nivel';
  if (norm === '2') return 'segundo_nivel';
  if (norm === '3') return 'tercer_nivel';
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

interface RawCluesInput {
  clues: string | null;
  nombre: string | null;
  institucionRaw: string | null;
  tipo: string | null;
  nivelRaw: string | null;
  alcaldia: string | null;
  estado: string | null;
  lat: number | null;
  lng: number | null;
}

function buildParsedRow(input: RawCluesInput): CluesParsedRow | null {
  if (!input.clues || input.clues === '') return null;
  if (input.lat == null || input.lng == null) return null;
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;
  if (input.lat < -90 || input.lat > 90) return null;
  if (input.lng < -180 || input.lng > 180) return null;

  const institucion = parseCluesInstitucion(input.institucionRaw);
  const nivel = parseCluesNivelAtencion(input.nivelRaw);
  const name = input.nombre ?? input.clues;

  return {
    source_id: input.clues,
    entity_type: CLUES_ENTITY_TYPE,
    name,
    scian_code: null,
    h3_r8: pointToH3R8({ lat: input.lat, lng: input.lng }),
    lat: input.lat,
    lng: input.lng,
    meta: {
      clues: input.clues,
      institucion,
      institucion_raw: input.institucionRaw,
      tipo: input.tipo,
      nivel_atencion: nivel,
      nivel_atencion_raw: input.nivelRaw,
      alcaldia: input.alcaldia,
      estado: input.estado,
    },
  };
}

function coerceHeaders(headersRaw: string[]): Partial<Record<CluesCanonicalHeader, number>> {
  const colIndex: Partial<Record<CluesCanonicalHeader, number>> = {};
  for (let i = 0; i < headersRaw.length; i++) {
    const nm = normalizeHeader(headersRaw[i] ?? '');
    if (!nm) continue;
    const canon = CLUES_HEADER_MAP[nm];
    if (canon && colIndex[canon] === undefined) {
      colIndex[canon] = i;
    }
  }
  return colIndex;
}

export function parseDgisCsv(text: string): CluesParsedRow[] {
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
    colIndex.clues === undefined ||
    colIndex.latitud === undefined ||
    colIndex.longitud === undefined
  ) {
    throw new Error('dgis_csv_headers_not_recognized');
  }

  const iClues = colIndex.clues;
  const iLat = colIndex.latitud;
  const iLng = colIndex.longitud;
  const iNombre = colIndex.nombre;
  const iInst = colIndex.institucion;
  const iTipo = colIndex.tipo;
  const iNivel = colIndex.nivel_atencion;
  const iAlc = colIndex.alcaldia;
  const iEst = colIndex.estado;

  const out: CluesParsedRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    if (line == null) continue;
    const cols = parseCsvLine(line).map((c) => c.trim());
    if (cols.every((c) => c === '')) continue;

    const row = buildParsedRow({
      clues: cleanCell(cols[iClues]),
      nombre: iNombre !== undefined ? cleanCell(cols[iNombre]) : null,
      institucionRaw: iInst !== undefined ? cleanCell(cols[iInst]) : null,
      tipo: iTipo !== undefined ? cleanCell(cols[iTipo]) : null,
      nivelRaw: iNivel !== undefined ? cleanCell(cols[iNivel]) : null,
      alcaldia: iAlc !== undefined ? cleanCell(cols[iAlc]) : null,
      estado: iEst !== undefined ? cleanCell(cols[iEst]) : null,
      lat: parseCoord(cols[iLat]),
      lng: parseCoord(cols[iLng]),
    });
    if (row != null) out.push(row);
  }
  return out;
}

export type DgisDriverInput = { csvText: string };

export async function upsertDgisRows(
  rows: CluesParsedRow[],
  ctx: IngestCtx,
  validFrom: string,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: CLUES_SOURCE,
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

export const dgisDriver: IngestDriver<DgisDriverInput, string> = {
  source: CLUES_SOURCE,
  category: 'geo',
  defaultPeriodicity: CLUES_PERIODICITY,
  async fetch(_ctx, input) {
    if (!input?.csvText || input.csvText.trim() === '') {
      throw new Error('dgis_missing_payload');
    }
    return input.csvText;
  },
  async parse(payload) {
    return parseDgisCsv(payload as string);
  },
  async upsert(rows, ctx) {
    const parsed = rows as CluesParsedRow[];
    const { inserted, errors } = await upsertDgisRows(parsed, ctx, todayISO());
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

registerDriver(dgisDriver);

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayISO(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export interface IngestDgisOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

export async function ingestDgisCsv(
  input: DgisDriverInput,
  options: IngestDgisOptions = {},
): Promise<IngestResult> {
  if (!input?.csvText || input.csvText.trim() === '') {
    throw new Error('dgis_missing_payload');
  }
  const periodEnd = todayISO();

  const job: IngestJob<string> = {
    source: CLUES_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin_upload',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const parsed = parseDgisCsv(input.csvText);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<CluesParsedRow>({ min: 0 }),
          geoValidityGateMx<CluesParsedRow>(),
          duplicateDetectionGate<CluesParsedRow>((r) => r.source_id),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertDgisRows(parsed, ctx, periodEnd);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: CLUES_SOURCE,
              destinationTable: 'geo_data_points',
              upstreamUrl: CLUES_UPSTREAM_URL,
              transformation: 'dgis_csv_parse',
              sourceSpan: {
                clues: r.meta.clues,
                institucion: r.meta.institucion,
                nivel_atencion: r.meta.nivel_atencion,
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
