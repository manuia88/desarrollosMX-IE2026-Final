import * as XLSX from 'xlsx';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { type IngestDriver, registerDriver } from '../driver';
import { recordLineage } from '../lineage';
import { type RunIngestOptions, runIngest } from '../orchestrator';
import {
  duplicateDetectionGate,
  outlierFlagGate,
  rowCountSanityGate,
  runQualityGates,
} from '../quality-gates';
import type { IngestCtx, IngestJob, IngestResult } from '../types';

// SHF IPV trimestral — Admin upload XLSX. SHF publica el Índice de Precios de
// Vivienda cada trimestre sin API pública. El driver acepta un Buffer como
// input (vía mutation admin.ingestUpload, BLOQUE 7.H). Parser soporta 2 layouts
// comunes: wide (Estado + Q1..Q4 por año) y long (Estado/Año/Trimestre/IPV).
// source_span preserva sheet/row/header/value raw para auditar provenance
// (Constitutional AI GC-7 downstream).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.C.3
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2

export const SHF_SOURCE = 'shf' as const;
export const SHF_UNIT = 'index_base_2019=100' as const;
export const SHF_METRIC = 'ipv_trimestral' as const;
export const SHF_PERIODICITY = 'quarterly' as const;

// Mapa nombre entidad → clave INEGI (CVE_ENT 2 dígitos). Incluye "Nacional"
// como '00' (agregado país). Los alias cubren variantes comunes con/sin
// acentos y "Ciudad de México" vs "CDMX" vs antiguo "Distrito Federal".
export const SHF_ENTIDAD_CVE: Record<string, string> = {
  Nacional: '00',
  nacional: '00',
  NACIONAL: '00',
  Aguascalientes: '01',
  'Baja California': '02',
  'Baja California Sur': '03',
  Campeche: '04',
  Coahuila: '05',
  'Coahuila de Zaragoza': '05',
  Colima: '06',
  Chiapas: '07',
  Chihuahua: '08',
  'Ciudad de México': '09',
  CDMX: '09',
  'Distrito Federal': '09',
  Durango: '10',
  Guanajuato: '11',
  Guerrero: '12',
  Hidalgo: '13',
  Jalisco: '14',
  'Estado de México': '15',
  México: '15',
  Mexico: '15',
  Michoacán: '16',
  'Michoacán de Ocampo': '16',
  Morelos: '17',
  Nayarit: '18',
  'Nuevo León': '19',
  Oaxaca: '20',
  Puebla: '21',
  Querétaro: '22',
  'Querétaro de Arteaga': '22',
  'Quintana Roo': '23',
  'San Luis Potosí': '24',
  Sinaloa: '25',
  Sonora: '26',
  Tabasco: '27',
  Tamaulipas: '28',
  Tlaxcala: '29',
  Veracruz: '30',
  'Veracruz de Ignacio de la Llave': '30',
  Yucatán: '31',
  Zacatecas: '32',
};

export interface ShfParsedRow {
  metric_name: typeof SHF_METRIC;
  series_id: string;
  unit: typeof SHF_UNIT;
  periodicity: typeof SHF_PERIODICITY;
  period_start: string;
  period_end: string;
  value: number;
  source_span: {
    raw_sheet: string;
    raw_row: number;
    raw_header: string;
    raw_value: string;
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function parseShfQuarter(
  q: string | number | null | undefined,
): { quarterNum: 1 | 2 | 3 | 4; periodStart: string; periodEnd: string } | null {
  if (q == null) return null;
  const s = String(q).trim();
  if (s === '') return null;
  const upper = s.toUpperCase();
  let qn: 1 | 2 | 3 | 4 | null = null;
  if (upper === '1' || upper === 'Q1' || upper === 'I' || upper === 'T1') qn = 1;
  else if (upper === '2' || upper === 'Q2' || upper === 'II' || upper === 'T2') qn = 2;
  else if (upper === '3' || upper === 'Q3' || upper === 'III' || upper === 'T3') qn = 3;
  else if (upper === '4' || upper === 'Q4' || upper === 'IV' || upper === 'T4') qn = 4;
  if (qn == null) return null;
  const startMonth = (qn - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  // periodStart / periodEnd sin año — el caller agrega año. Regresamos
  // placeholder MM-DD; el caller sustituye YYYY.
  return {
    quarterNum: qn,
    periodStart: `${pad2(startMonth)}-01`,
    periodEnd: `${pad2(endMonth)}-${pad2(lastDayOfMonth(2001, endMonth))}`,
  };
}

function quarterPeriod(
  year: number,
  quarter: 1 | 2 | 3 | 4,
): { period_start: string; period_end: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = lastDayOfMonth(year, endMonth);
  return {
    period_start: `${year}-${pad2(startMonth)}-01`,
    period_end: `${year}-${pad2(endMonth)}-${pad2(lastDay)}`,
  };
}

export function parseShfValue(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = String(v).trim();
  if (t === '' || t === '-' || t === '—') return null;
  const upper = t.toUpperCase();
  if (upper === 'N/D' || upper === 'ND' || upper === 'N/E' || upper === 'NE') return null;
  const n = Number.parseFloat(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function resolveCve(entidadRaw: string): string | null {
  const name = entidadRaw.trim();
  if (name === '') return null;
  const direct = SHF_ENTIDAD_CVE[name];
  if (direct) return direct;
  // Fallback case-insensitive.
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(SHF_ENTIDAD_CVE)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function seriesIdFor(cve: string): string {
  return cve === '00' ? 'ipv_nacional' : `ipv_${cve}`;
}

// Header Q{1..4}_YYYY | QYYYY-N | YYYY_T{1..4} | YYYYQ{1..4} | "Q1 2024" ...
function parseWideHeader(header: string): { quarter: 1 | 2 | 3 | 4; year: number } | null {
  const h = header.trim();
  if (h === '') return null;
  // Q1_2024 / Q1-2024 / Q1 2024 / Q1.2024
  const m1 = h.match(/^Q?([1-4])[\s_\-./]+(\d{4})$/i);
  if (m1?.[1] && m1[2]) {
    return { quarter: Number(m1[1]) as 1 | 2 | 3 | 4, year: Number(m1[2]) };
  }
  // 2024_Q1 / 2024-Q1 / 2024 Q1 / 2024.1
  const m2 = h.match(/^(\d{4})[\s_\-./]+Q?([1-4])$/i);
  if (m2?.[1] && m2[2]) {
    return { quarter: Number(m2[2]) as 1 | 2 | 3 | 4, year: Number(m2[1]) };
  }
  // 2024Q1 / Q12024
  const m3 = h.match(/^(\d{4})Q([1-4])$/i);
  if (m3?.[1] && m3[2]) {
    return { quarter: Number(m3[2]) as 1 | 2 | 3 | 4, year: Number(m3[1]) };
  }
  const m4 = h.match(/^Q([1-4])(\d{4})$/i);
  if (m4?.[1] && m4[2]) {
    return { quarter: Number(m4[1]) as 1 | 2 | 3 | 4, year: Number(m4[2]) };
  }
  // T1_2024 / 1T2024 (variantes español)
  const m5 = h.match(/^T([1-4])[\s_\-./]+(\d{4})$/i);
  if (m5?.[1] && m5[2]) {
    return { quarter: Number(m5[1]) as 1 | 2 | 3 | 4, year: Number(m5[2]) };
  }
  return null;
}

function normalizeLongHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase();
}

function tryParseLongSheet(sheet: XLSX.WorkSheet, sheetName: string): ShfParsedRow[] | null {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  if (aoa.length < 2) return null;
  // Detectar header row: buscar fila con columnas entidad/año/trimestre/ipv.
  let headerRowIdx = -1;
  let idxEstado = -1;
  let idxAnio = -1;
  let idxTrim = -1;
  let idxIpv = -1;
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const row = aoa[i] ?? [];
    const norm = row.map(normalizeLongHeader);
    const ei = norm.findIndex(
      (c) => c === 'estado' || c === 'entidad' || c === 'entidad federativa',
    );
    const ai = norm.findIndex((c) => c === 'año' || c === 'anio' || c === 'year');
    const ti = norm.findIndex((c) => c === 'trimestre' || c === 'quarter' || c === 't');
    const vi = norm.findIndex(
      (c) => c === 'ipv' || c === 'valor' || c === 'value' || c === 'indice' || c === 'índice',
    );
    if (ei >= 0 && ai >= 0 && ti >= 0 && vi >= 0) {
      headerRowIdx = i;
      idxEstado = ei;
      idxAnio = ai;
      idxTrim = ti;
      idxIpv = vi;
      break;
    }
  }
  if (headerRowIdx < 0) return null;

  const out: ShfParsedRow[] = [];
  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] ?? [];
    const estadoRaw = row[idxEstado];
    const anioRaw = row[idxAnio];
    const trimRaw = row[idxTrim];
    const ipvRaw = row[idxIpv];
    if (estadoRaw == null) continue;
    const cve = resolveCve(String(estadoRaw));
    if (cve == null) continue;
    const anio = Number.parseInt(String(anioRaw ?? ''), 10);
    if (!Number.isFinite(anio) || anio < 1900 || anio > 2999) continue;
    const qParsed = parseShfQuarter(trimRaw as string | number);
    if (qParsed == null) continue;
    const value = parseShfValue(ipvRaw);
    if (value == null) continue;
    const period = quarterPeriod(anio, qParsed.quarterNum);
    out.push({
      metric_name: SHF_METRIC,
      series_id: seriesIdFor(cve),
      unit: SHF_UNIT,
      periodicity: SHF_PERIODICITY,
      period_start: period.period_start,
      period_end: period.period_end,
      value,
      source_span: {
        raw_sheet: sheetName,
        raw_row: r + 1,
        raw_header: `${String(estadoRaw)}|${String(anioRaw)}|${String(trimRaw)}`,
        raw_value: String(ipvRaw ?? ''),
      },
    });
  }
  return out.length > 0 ? out : null;
}

function tryParseWideSheet(sheet: XLSX.WorkSheet, sheetName: string): ShfParsedRow[] | null {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  if (aoa.length < 2) return null;
  // Busca la primera fila donde col[0] parezca "Estado"/"Entidad" y al menos
  // una celda subsiguiente matchea parseWideHeader.
  let headerRowIdx = -1;
  let quarterCols: Array<{ col: number; quarter: 1 | 2 | 3 | 4; year: number; header: string }> =
    [];
  let estadoCol = 0;
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const row = aoa[i] ?? [];
    const norm = row.map(normalizeLongHeader);
    const ei = norm.findIndex(
      (c) => c === 'estado' || c === 'entidad' || c === 'entidad federativa',
    );
    if (ei < 0) continue;
    const cols: typeof quarterCols = [];
    for (let j = 0; j < row.length; j++) {
      if (j === ei) continue;
      const cell = row[j];
      if (cell == null) continue;
      const parsed = parseWideHeader(String(cell));
      if (parsed) {
        cols.push({
          col: j,
          quarter: parsed.quarter,
          year: parsed.year,
          header: String(cell),
        });
      }
    }
    if (cols.length > 0) {
      headerRowIdx = i;
      quarterCols = cols;
      estadoCol = ei;
      break;
    }
  }
  if (headerRowIdx < 0 || quarterCols.length === 0) return null;

  const out: ShfParsedRow[] = [];
  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] ?? [];
    const estadoRaw = row[estadoCol];
    if (estadoRaw == null) continue;
    const cve = resolveCve(String(estadoRaw));
    if (cve == null) continue;
    for (const qc of quarterCols) {
      const cell = row[qc.col];
      const value = parseShfValue(cell);
      if (value == null) continue;
      const period = quarterPeriod(qc.year, qc.quarter);
      out.push({
        metric_name: SHF_METRIC,
        series_id: seriesIdFor(cve),
        unit: SHF_UNIT,
        periodicity: SHF_PERIODICITY,
        period_start: period.period_start,
        period_end: period.period_end,
        value,
        source_span: {
          raw_sheet: sheetName,
          raw_row: r + 1,
          raw_header: qc.header,
          raw_value: String(cell ?? ''),
        },
      });
    }
  }
  return out.length > 0 ? out : null;
}

export function parseShfWorkbook(buffer: Buffer): ShfParsedRow[] {
  if (!buffer || buffer.length === 0) return [];
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetNames = wb.SheetNames ?? [];
  const out: ShfParsedRow[] = [];
  for (const name of sheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    // Probar wide primero (formato más común de publicación SHF), luego long.
    const wide = tryParseWideSheet(sheet, name);
    if (wide && wide.length > 0) {
      out.push(...wide);
      continue;
    }
    const long = tryParseLongSheet(sheet, name);
    if (long && long.length > 0) {
      out.push(...long);
    }
  }
  return out;
}

export interface ShfDriverInput {
  buffer: Buffer;
}

export async function upsertShfRows(
  rows: ShfParsedRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: SHF_SOURCE,
    series_id: r.series_id,
    metric_name: r.metric_name,
    period_start: r.period_start,
    period_end: r.period_end,
    periodicity: r.periodicity,
    unit: r.unit,
    value: r.value,
    run_id: ctx.runId,
    meta: { source_span: r.source_span },
  }));
  const { error, count } = await supabase.from('macro_series').upsert(payload as never, {
    onConflict: 'country_code,source,series_id,period_start',
    count: 'exact',
    ignoreDuplicates: false,
  });
  if (error) return { inserted: 0, errors: [`macro_series_upsert: ${error.message}`] };
  return { inserted: count ?? rows.length, errors: [] };
}

export const shfDriver: IngestDriver<ShfDriverInput, Buffer> = {
  source: SHF_SOURCE,
  category: 'macro',
  defaultPeriodicity: SHF_PERIODICITY,
  async fetch(_ctx, input) {
    if (!input?.buffer || input.buffer.length === 0) {
      throw new Error('shf_missing_buffer');
    }
    return input.buffer;
  },
  async parse(payload) {
    return parseShfWorkbook(payload);
  },
  async upsert(rows, ctx) {
    const parsed = rows as ShfParsedRow[];
    const { inserted, errors } = await upsertShfRows(parsed, ctx);
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

registerDriver(shfDriver);

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${yyyy}-${mm}-${dd}`;
}

export interface IngestShfOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

export async function ingestShfXlsx(
  buffer: Buffer,
  options: IngestShfOptions = {},
): Promise<IngestResult> {
  if (!buffer || buffer.length === 0) throw new Error('shf_missing_buffer');
  const periodEnd = todayISO();

  const job: IngestJob<Buffer> = {
    source: SHF_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin_upload',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const parsed = parseShfWorkbook(buffer);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<ShfParsedRow>({ min: 0 }),
          duplicateDetectionGate<ShfParsedRow>((r) => `${r.series_id}:${r.period_start}`),
          outlierFlagGate<ShfParsedRow>((r) => r.value),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertShfRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: SHF_SOURCE,
              destinationTable: 'macro_series',
              upstreamUrl: 'https://www.gob.mx/shf/documentos/indice-shf-de-precios-de-la-vivienda',
              transformation: 'shf_xlsx_parse',
              sourceSpan: r.source_span as unknown as Record<string, unknown>,
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
        rawPayload: buffer,
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
