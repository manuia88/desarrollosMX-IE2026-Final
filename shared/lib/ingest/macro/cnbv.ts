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

// CNBV cartera hipotecaria mensual — Admin upload CSV. CNBV publica series
// abiertas por institución (banco) con cartera_total / cartera_vencida /
// tasa_promedio. El driver acepta csvText como input (UI admin convierte
// File → text). Parser CSV inline sin dependencia externa: split + manejo
// de comillas. Header mapping heurístico case/accent-insensitive para
// tolerar variaciones del publicador. 1 metric emitido por row y banco
// (cartera_total, cartera_vencida, tasa_promedio).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.C.5
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2

export const CNBV_SOURCE = 'cnbv' as const;
export const CNBV_PERIODICITY = 'monthly' as const;
export const CNBV_UNIT_MDP = 'MXN_mdp' as const;
export const CNBV_UNIT_PCT = 'pct' as const;

export type CnbvCanonicalHeader =
  | 'periodo'
  | 'institucion'
  | 'cartera_total_mdp'
  | 'cartera_vencida_mdp'
  | 'tasa_promedio_pct'
  | 'plazo_promedio_meses';

export type CnbvMetric = 'cartera_total' | 'cartera_vencida' | 'tasa_promedio';

// Mapa heurístico header raw normalizado → columna canónica. Las keys son
// ya normalizadas (lowercase + sin acentos + sin chars no alfanum). Las
// variantes comunes de publicación CNBV caen aquí.
export const CNBV_HEADER_MAP: Record<string, CnbvCanonicalHeader> = {
  periodo: 'periodo',
  periodo_reporte: 'periodo',
  fecha: 'periodo',
  mes: 'periodo',
  fecha_reporte: 'periodo',
  institucion: 'institucion',
  banco: 'institucion',
  entidad: 'institucion',
  entidad_financiera: 'institucion',
  nombre_institucion: 'institucion',
  cartera_total: 'cartera_total_mdp',
  cartera_total_mdp: 'cartera_total_mdp',
  cartera_hipotecaria: 'cartera_total_mdp',
  cartera_hipotecaria_total: 'cartera_total_mdp',
  saldo_total: 'cartera_total_mdp',
  saldo_total_mdp: 'cartera_total_mdp',
  cartera_vigente_vencida: 'cartera_total_mdp',
  cartera_vencida: 'cartera_vencida_mdp',
  cartera_vencida_mdp: 'cartera_vencida_mdp',
  saldo_vencido: 'cartera_vencida_mdp',
  saldo_vencido_mdp: 'cartera_vencida_mdp',
  tasa_promedio: 'tasa_promedio_pct',
  tasa_promedio_pct: 'tasa_promedio_pct',
  tasa_interes_promedio: 'tasa_promedio_pct',
  tasa: 'tasa_promedio_pct',
  plazo_promedio: 'plazo_promedio_meses',
  plazo_promedio_meses: 'plazo_promedio_meses',
  plazo: 'plazo_promedio_meses',
};

export interface CnbvParsedRow {
  metric_name: CnbvMetric;
  series_id: string;
  unit: typeof CNBV_UNIT_MDP | typeof CNBV_UNIT_PCT;
  periodicity: typeof CNBV_PERIODICITY;
  period_start: string;
  period_end: string;
  value: number;
  source_span: {
    raw_row_index: number;
    raw_headers: string[];
    raw_row: Record<string, string>;
    institucion: string;
    mapped_header: CnbvCanonicalHeader;
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

// Quita acentos, lowercase, colapsa non-alphanum a "_". Usado tanto para
// mapear headers como para slug institución.
export function normalizeHeader(h: string): string {
  if (typeof h !== 'string') return '';
  const deaccented = h
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  // Reemplaza grupos de non-alphanum con un solo underscore, luego trim _ edges.
  return deaccented.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function slugifyInstitucion(name: string): string {
  return normalizeHeader(name);
}

// Parser CSV inline. Soporta: comas internas entre comillas, comillas
// escapadas "" dentro de campo entre comillas, espacios preservados.
// NO soporta newlines embebidos en campo entre comillas (CNBV no los usa).
// Suficiente para los outputs estándar de portal CNBV; si aparece un caso
// patológico, escalar a csv-parse en un ADR.
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          // Escaped quote.
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

// Periodo admite: YYYY-MM, YYYY-MM-DD, YYYY/MM, YYYY/MM/DD, "marzo YYYY",
// "mar YYYY". Regresa primer y último día del mes. null si no matchea.
const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  ene: 1,
  febrero: 2,
  feb: 2,
  marzo: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  julio: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  septiembre: 9,
  sep: 9,
  set: 9,
  octubre: 10,
  oct: 10,
  noviembre: 11,
  nov: 11,
  diciembre: 12,
  dic: 12,
};

export function parseCnbvPeriod(
  p: string | null | undefined,
): { period_start: string; period_end: string } | null {
  if (p == null) return null;
  const raw = String(p).trim();
  if (raw === '') return null;

  // YYYY-MM-DD or YYYY/MM/DD
  const m1 = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m1?.[1] && m1[2]) {
    const yyyy = Number(m1[1]);
    const mm = Number(m1[2]);
    if (mm < 1 || mm > 12) return null;
    return {
      period_start: `${yyyy}-${pad2(mm)}-01`,
      period_end: `${yyyy}-${pad2(mm)}-${pad2(lastDayOfMonth(yyyy, mm))}`,
    };
  }

  // YYYY-MM or YYYY/MM
  const m2 = raw.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m2?.[1] && m2[2]) {
    const yyyy = Number(m2[1]);
    const mm = Number(m2[2]);
    if (mm < 1 || mm > 12) return null;
    return {
      period_start: `${yyyy}-${pad2(mm)}-01`,
      period_end: `${yyyy}-${pad2(mm)}-${pad2(lastDayOfMonth(yyyy, mm))}`,
    };
  }

  // "marzo 2026" / "mar 2026" / "Marzo-2026"
  const deaccented = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const m3 = deaccented.match(/^([a-z]+)[\s_\-./]+(\d{4})$/);
  if (m3?.[1] && m3[2]) {
    const mm = SPANISH_MONTHS[m3[1]];
    const yyyy = Number(m3[2]);
    if (mm) {
      return {
        period_start: `${yyyy}-${pad2(mm)}-01`,
        period_end: `${yyyy}-${pad2(mm)}-${pad2(lastDayOfMonth(yyyy, mm))}`,
      };
    }
  }

  // "2026 marzo"
  const m4 = deaccented.match(/^(\d{4})[\s_\-./]+([a-z]+)$/);
  if (m4?.[1] && m4[2]) {
    const mm = SPANISH_MONTHS[m4[2]];
    const yyyy = Number(m4[1]);
    if (mm) {
      return {
        period_start: `${yyyy}-${pad2(mm)}-01`,
        period_end: `${yyyy}-${pad2(mm)}-${pad2(lastDayOfMonth(yyyy, mm))}`,
      };
    }
  }

  return null;
}

function parseNumericCell(v: string | null | undefined): number | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (t === '' || t === '-' || t === '—') return null;
  const upper = t.toUpperCase();
  if (upper === 'N/D' || upper === 'ND' || upper === 'N/E' || upper === 'NE' || upper === 'NA') {
    return null;
  }
  // Admite "1,234.56" (US) y "1.234,56" (MX formal con coma decimal).
  // Heurística: si hay tanto "," como "." → asumir "," es miles, "." decimal.
  // Si solo hay "," → asumir decimal si aparece una vez al final con 1–2 dígitos.
  let norm = t;
  if (t.includes(',') && t.includes('.')) {
    norm = t.replace(/,/g, '');
  } else if (t.includes(',') && !t.includes('.')) {
    const m = t.match(/,(\d{1,2})$/);
    if (m) {
      norm = t.replace(/\./g, '').replace(',', '.');
    } else {
      norm = t.replace(/,/g, '');
    }
  }
  const n = Number.parseFloat(norm);
  return Number.isFinite(n) ? n : null;
}

const METRIC_COLUMNS: Array<{
  col: Extract<
    CnbvCanonicalHeader,
    'cartera_total_mdp' | 'cartera_vencida_mdp' | 'tasa_promedio_pct'
  >;
  metric: CnbvMetric;
  seriesPrefix: string;
  unit: typeof CNBV_UNIT_MDP | typeof CNBV_UNIT_PCT;
}> = [
  {
    col: 'cartera_total_mdp',
    metric: 'cartera_total',
    seriesPrefix: 'cartera_total',
    unit: CNBV_UNIT_MDP,
  },
  {
    col: 'cartera_vencida_mdp',
    metric: 'cartera_vencida',
    seriesPrefix: 'cartera_vencida',
    unit: CNBV_UNIT_MDP,
  },
  {
    col: 'tasa_promedio_pct',
    metric: 'tasa_promedio',
    seriesPrefix: 'tasa',
    unit: CNBV_UNIT_PCT,
  },
];

export function parseCnbvCsv(csvText: string): CnbvParsedRow[] {
  if (typeof csvText !== 'string' || csvText.trim() === '') return [];

  // Soporta \r\n, \n, \r. Descarta líneas completamente vacías.
  const lines = csvText
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  if (firstLine == null) return [];
  const headersRaw = parseCsvLine(firstLine).map((h) => h.trim());
  const headersNorm = headersRaw.map(normalizeHeader);

  // Mapea cada columna raw → canónica. Si varias raw apuntan a la misma
  // canónica, nos quedamos con la primera.
  const colIndex: Partial<Record<CnbvCanonicalHeader, number>> = {};
  for (let i = 0; i < headersNorm.length; i++) {
    const nm = headersNorm[i];
    if (!nm) continue;
    const canon = CNBV_HEADER_MAP[nm];
    if (canon && colIndex[canon] === undefined) {
      colIndex[canon] = i;
    }
  }

  if (colIndex.periodo === undefined || colIndex.institucion === undefined) {
    throw new Error('cnbv_csv_headers_not_recognized');
  }
  // Se requiere al menos una columna de métrica mapeable.
  const anyMetric = METRIC_COLUMNS.some((m) => colIndex[m.col] !== undefined);
  if (!anyMetric) {
    throw new Error('cnbv_csv_headers_not_recognized');
  }

  const out: CnbvParsedRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    if (line == null) continue;
    const cols = parseCsvLine(line).map((c) => c.trim());
    // Row completamente vacía (después de split) → skip.
    if (cols.every((c) => c === '')) continue;

    const periodoRaw = cols[colIndex.periodo] ?? '';
    const institucionRaw = cols[colIndex.institucion] ?? '';
    if (institucionRaw.trim() === '') continue;

    const period = parseCnbvPeriod(periodoRaw);
    if (period == null) continue;

    const slug = slugifyInstitucion(institucionRaw);
    if (slug === '') continue;

    // Construye snapshot raw_row para source_span.
    const rawRow: Record<string, string> = {};
    for (let i = 0; i < headersRaw.length; i++) {
      const key = headersRaw[i];
      if (!key) continue;
      rawRow[key] = cols[i] ?? '';
    }

    for (const mc of METRIC_COLUMNS) {
      const ci = colIndex[mc.col];
      if (ci === undefined) continue;
      const cell = cols[ci];
      const value = parseNumericCell(cell);
      if (value == null) continue;
      out.push({
        metric_name: mc.metric,
        series_id: `${mc.seriesPrefix}_${slug}`,
        unit: mc.unit,
        periodicity: CNBV_PERIODICITY,
        period_start: period.period_start,
        period_end: period.period_end,
        value,
        source_span: {
          raw_row_index: r,
          raw_headers: headersRaw,
          raw_row: rawRow,
          institucion: institucionRaw,
          mapped_header: mc.col,
        },
      });
    }
  }
  return out;
}

export interface CnbvDriverInput {
  csvText: string;
}

export async function upsertCnbvRows(
  rows: CnbvParsedRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: CNBV_SOURCE,
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

export const cnbvDriver: IngestDriver<CnbvDriverInput, string> = {
  source: CNBV_SOURCE,
  category: 'macro',
  defaultPeriodicity: CNBV_PERIODICITY,
  async fetch(_ctx, input) {
    if (!input?.csvText || input.csvText.trim() === '') {
      throw new Error('cnbv_missing_csv');
    }
    return input.csvText;
  },
  async parse(payload) {
    return parseCnbvCsv(payload);
  },
  async upsert(rows, ctx) {
    const parsed = rows as CnbvParsedRow[];
    const { inserted, errors } = await upsertCnbvRows(parsed, ctx);
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

registerDriver(cnbvDriver);

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${yyyy}-${mm}-${dd}`;
}

export interface IngestCnbvOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

export async function ingestCnbvCsv(
  csvText: string,
  options: IngestCnbvOptions = {},
): Promise<IngestResult> {
  if (!csvText || csvText.trim() === '') throw new Error('cnbv_missing_csv');
  const periodEnd = todayISO();

  const job: IngestJob<string> = {
    source: CNBV_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin_upload',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const parsed = parseCnbvCsv(csvText);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<CnbvParsedRow>({ min: 0 }),
          duplicateDetectionGate<CnbvParsedRow>((r) => `${r.series_id}:${r.period_start}`),
          outlierFlagGate<CnbvParsedRow>((r) => r.value),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertCnbvRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: CNBV_SOURCE,
              destinationTable: 'macro_series',
              upstreamUrl: 'https://portafolioinfo.cnbv.gob.mx/',
              transformation: 'cnbv_csv_parse',
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
        rawPayload: csvText,
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
