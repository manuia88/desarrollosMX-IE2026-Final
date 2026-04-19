import * as XLSX from 'xlsx';
import { z } from 'zod';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { correlationHeaders } from '../correlation';
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

// FOVISSSTE informe trimestral. Admin upload dual: PDF (principal) + XLSX
// complementario. El driver acepta un discriminated-union input { kind, buffer }
// y enruta a parser SheetJS (XLSX) o a pdf-parse + GPT-4o-mini con schema Zod
// + refinement GC-7 (PDF). source_span persiste sheet_row (XLSX) o page_quote
// (PDF) — el refinement value !== null → source_span !== null es enforcement
// técnico del principio Constitutional AI: never hallucinate.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.C.7
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2

export const FOVISSSTE_SOURCE = 'fovissste' as const;
export const FOVISSSTE_PERIODICITY = 'quarterly' as const;

export type FovisssteMetric =
  | 'creditos_otorgados'
  | 'monto_mdp'
  | 'vsm_promedio'
  | 'valor_vivienda_promedio';

export const FOVISSSTE_METRIC_UNITS: Record<FovisssteMetric, string> = {
  creditos_otorgados: 'count',
  monto_mdp: 'mxn_mdp',
  vsm_promedio: 'vsm',
  valor_vivienda_promedio: 'mxn',
};

// Mapa entidad → clave INEGI (CVE_ENT 2 dígitos). Nacional='00'.
// Alias cubren "Ciudad de México"/"CDMX"/"Distrito Federal" y variantes
// con/sin acentos, iguales a SHF para consistencia cross-source.
export const FOVISSSTE_ENTIDAD_CVE: Record<string, string> = {
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

export const FOVISSSTE_SYSTEM_PROMPT = `Eres un extractor estructurado de informes trimestrales FOVISSSTE. Reglas inviolables:
1. NUNCA inventes números. Si un campo no aparece en el PDF, devuelve null.
2. Cada número DEBE venir acompañado de source_span: { page, quote } — quote es cita textual del PDF.
3. Si confidence < 0.7, setea confidence = "low" y flagea en metadata.review_required = true.
4. Si el PDF no contiene el dato esperado para el trimestre reportado, devuelve el campo como null + razón en metadata.missing_reason.
5. NO interpretes — solo extrae. No extrapoles. No conviertas unidades. Monto en millones de pesos (MDP) se reporta tal cual aparece; VSM = Veces Salario Mínimo se reporta tal cual aparece.`;

// Zod schema + refinement: GC-7 enforcement técnico.
const sourceSpanSchema = z.object({
  page: z.number().int().nonnegative(),
  quote: z.string().min(1),
});

const metricFieldSchema = z
  .object({
    value: z.number().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
    source_span: sourceSpanSchema.nullable(),
  })
  .refine((v) => v.value === null || v.source_span !== null, {
    message: 'value_requires_source_span',
    path: ['source_span'],
  });

export const FovisssteExtractSchema = z.object({
  report_period: z.string().regex(/^\d{4}-T[1-4]$/, 'report_period must be YYYY-TT (ej: 2026-T1)'),
  creditos_otorgados_nacional: metricFieldSchema,
  monto_mdp_nacional: metricFieldSchema,
  vsm_promedio: metricFieldSchema,
  valor_vivienda_promedio: metricFieldSchema,
  metadata: z.object({
    review_required: z.boolean(),
    missing_reason: z.string().nullable(),
  }),
});

export type FovisssteExtract = z.infer<typeof FovisssteExtractSchema>;
export type FovisssteMetricField = z.infer<typeof metricFieldSchema>;

// JSON schema equivalente para OpenAI response_format. Mantener sincronizado
// con FovisssteExtractSchema — el refinement se valida client-side con Zod.parse.
const OPENAI_JSON_SCHEMA = {
  name: 'FovisssteExtract',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'report_period',
      'creditos_otorgados_nacional',
      'monto_mdp_nacional',
      'vsm_promedio',
      'valor_vivienda_promedio',
      'metadata',
    ],
    properties: {
      report_period: { type: 'string' },
      creditos_otorgados_nacional: {
        type: 'object',
        additionalProperties: false,
        required: ['value', 'confidence', 'source_span'],
        properties: {
          value: { type: ['number', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          source_span: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['page', 'quote'],
            properties: {
              page: { type: 'integer', minimum: 0 },
              quote: { type: 'string' },
            },
          },
        },
      },
      monto_mdp_nacional: {
        type: 'object',
        additionalProperties: false,
        required: ['value', 'confidence', 'source_span'],
        properties: {
          value: { type: ['number', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          source_span: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['page', 'quote'],
            properties: {
              page: { type: 'integer', minimum: 0 },
              quote: { type: 'string' },
            },
          },
        },
      },
      vsm_promedio: {
        type: 'object',
        additionalProperties: false,
        required: ['value', 'confidence', 'source_span'],
        properties: {
          value: { type: ['number', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          source_span: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['page', 'quote'],
            properties: {
              page: { type: 'integer', minimum: 0 },
              quote: { type: 'string' },
            },
          },
        },
      },
      valor_vivienda_promedio: {
        type: 'object',
        additionalProperties: false,
        required: ['value', 'confidence', 'source_span'],
        properties: {
          value: { type: ['number', 'null'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          source_span: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['page', 'quote'],
            properties: {
              page: { type: 'integer', minimum: 0 },
              quote: { type: 'string' },
            },
          },
        },
      },
      metadata: {
        type: 'object',
        additionalProperties: false,
        required: ['review_required', 'missing_reason'],
        properties: {
          review_required: { type: 'boolean' },
          missing_reason: { type: ['string', 'null'] },
        },
      },
    },
  },
} as const;

export interface FovisssteParsedRow {
  metric_name: FovisssteMetric;
  series_id: string;
  unit: string;
  periodicity: typeof FOVISSSTE_PERIODICITY;
  period_start: string;
  period_end: string;
  value: number;
  source_span:
    | {
        kind: 'sheet_row';
        raw_sheet: string;
        raw_row: number;
        raw_header: string;
        raw_value: string;
        report_period: string;
        entidad: string;
      }
    | {
        kind: 'page_quote';
        page: number;
        quote: string;
        confidence: 'high' | 'medium' | 'low';
        report_period: string;
      };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

// Parsea YYYY-TT, YYYY-T1, 2026/Q1, 2026/01, 2026/1 → { period_start, period_end }.
// Formatos inválidos (Q5, 2026-13, abc) → null.
export function parseFovisssteQuarter(
  yyyyTT: string,
): { period_start: string; period_end: string } | null {
  if (typeof yyyyTT !== 'string') return null;
  const s = yyyyTT.trim();
  if (s === '') return null;
  // YYYY-TT / YYYY-T1..T4 / YYYY/T1 / YYYY_T1
  const m1 = s.match(/^(\d{4})[-_/\s.]+T?([1-4])$/i);
  // YYYY/Q1 / YYYYQ1 / YYYY-Q1
  const m2 = s.match(/^(\d{4})[-_/\s.]*Q([1-4])$/i);
  // 2026/01..2026/04 (trimestre 01..04)
  const m3 = s.match(/^(\d{4})[-_/\s.]+0?([1-4])$/);
  const match = m1 ?? m2 ?? m3;
  if (!match?.[1] || !match[2]) return null;
  const year = Number(match[1]);
  const qn = Number(match[2]) as 1 | 2 | 3 | 4;
  if (!Number.isFinite(year) || year < 1900 || year > 2999) return null;
  if (qn < 1 || qn > 4) return null;
  const startMonth = (qn - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    period_start: `${year}-${pad2(startMonth)}-01`,
    period_end: `${year}-${pad2(endMonth)}-${pad2(lastDayOfMonth(year, endMonth))}`,
  };
}

function parseFovisssteValue(v: unknown): number | null {
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
  const direct = FOVISSSTE_ENTIDAD_CVE[name];
  if (direct) return direct;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(FOVISSSTE_ENTIDAD_CVE)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function seriesIdFor(metric: FovisssteMetric, cve: string): string {
  const suffix = cve === '00' ? 'nacional' : cve;
  return `${metric}_${suffix}`;
}

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .trim()
    .toLowerCase();
}

const METRIC_HEADER_ALIASES: Record<FovisssteMetric, string[]> = {
  creditos_otorgados: [
    'creditos_otorgados',
    'créditos_otorgados',
    'creditos otorgados',
    'créditos otorgados',
    'creditos',
    'créditos',
  ],
  monto_mdp: ['monto_mdp', 'monto mdp', 'monto', 'monto_millones', 'monto (mdp)'],
  vsm_promedio: [
    'vsm_promedio',
    'vsm promedio',
    'vsm',
    'veces_salario_minimo',
    'veces salario mínimo',
    'veces salario minimo',
  ],
  valor_vivienda_promedio: [
    'valor_vivienda_promedio',
    'valor vivienda promedio',
    'valor vivienda',
    'valor_vivienda',
    'valor promedio vivienda',
  ],
};

function matchMetricColumn(header: string): FovisssteMetric | null {
  const h = header.trim().toLowerCase();
  for (const [metric, aliases] of Object.entries(METRIC_HEADER_ALIASES) as Array<
    [FovisssteMetric, string[]]
  >) {
    if (aliases.includes(h)) return metric;
  }
  return null;
}

// XLSX layout esperado: headers periodo | entidad | creditos_otorgados |
// monto_mdp | vsm_promedio | valor_vivienda_promedio. Soporta reordenamientos
// y aliases comunes (acentos / snake_case / con espacios).
export function parseFovisssteWorkbook(buffer: Buffer): FovisssteParsedRow[] {
  if (!buffer || buffer.length === 0) return [];
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetNames = wb.SheetNames ?? [];
  const out: FovisssteParsedRow[] = [];
  for (const name of sheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = parseFovisssteSheet(sheet, name);
    if (rows.length > 0) out.push(...rows);
  }
  return out;
}

function parseFovisssteSheet(sheet: XLSX.WorkSheet, sheetName: string): FovisssteParsedRow[] {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  if (aoa.length < 2) return [];

  let headerRowIdx = -1;
  let idxPeriodo = -1;
  let idxEntidad = -1;
  const metricCols: Array<{ col: number; metric: FovisssteMetric; header: string }> = [];

  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const row = aoa[i] ?? [];
    const norm = row.map(normalizeHeader);
    const pi = norm.findIndex((c) => c === 'periodo' || c === 'trimestre' || c === 'period');
    const ei = norm.findIndex(
      (c) => c === 'entidad' || c === 'estado' || c === 'entidad federativa',
    );
    if (pi < 0 || ei < 0) continue;
    const cols: typeof metricCols = [];
    for (let j = 0; j < row.length; j++) {
      if (j === pi || j === ei) continue;
      const cell = row[j];
      if (cell == null) continue;
      const m = matchMetricColumn(String(cell));
      if (m) cols.push({ col: j, metric: m, header: String(cell) });
    }
    if (cols.length > 0) {
      headerRowIdx = i;
      idxPeriodo = pi;
      idxEntidad = ei;
      metricCols.push(...cols);
      break;
    }
  }

  if (headerRowIdx < 0) return [];

  const out: FovisssteParsedRow[] = [];
  for (let r = headerRowIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] ?? [];
    const periodoRaw = row[idxPeriodo];
    const entidadRaw = row[idxEntidad];
    if (periodoRaw == null || entidadRaw == null) continue;
    const period = parseFovisssteQuarter(String(periodoRaw));
    if (!period) continue;
    const cve = resolveCve(String(entidadRaw));
    if (cve == null) continue;

    for (const mc of metricCols) {
      const cell = row[mc.col];
      const value = parseFovisssteValue(cell);
      if (value == null) continue;
      out.push({
        metric_name: mc.metric,
        series_id: seriesIdFor(mc.metric, cve),
        unit: FOVISSSTE_METRIC_UNITS[mc.metric],
        periodicity: FOVISSSTE_PERIODICITY,
        period_start: period.period_start,
        period_end: period.period_end,
        value,
        source_span: {
          kind: 'sheet_row',
          raw_sheet: sheetName,
          raw_row: r + 1,
          raw_header: mc.header,
          raw_value: String(cell ?? ''),
          report_period: String(periodoRaw),
          entidad: String(entidadRaw),
        },
      });
    }
  }
  return out;
}

function extractRowsFromFovisstePdfExtract(extract: FovisssteExtract): FovisssteParsedRow[] {
  const period = parseFovisssteQuarter(extract.report_period);
  if (!period) return [];
  const out: FovisssteParsedRow[] = [];
  // Métricas nacional-level extraídas del PDF (cve='00').
  const pdfMetrics: Array<{
    field: keyof Pick<
      FovisssteExtract,
      | 'creditos_otorgados_nacional'
      | 'monto_mdp_nacional'
      | 'vsm_promedio'
      | 'valor_vivienda_promedio'
    >;
    metric: FovisssteMetric;
  }> = [
    { field: 'creditos_otorgados_nacional', metric: 'creditos_otorgados' },
    { field: 'monto_mdp_nacional', metric: 'monto_mdp' },
    { field: 'vsm_promedio', metric: 'vsm_promedio' },
    { field: 'valor_vivienda_promedio', metric: 'valor_vivienda_promedio' },
  ];

  for (const { field, metric } of pdfMetrics) {
    const m = extract[field];
    if (m.value === null || m.source_span === null) continue;
    out.push({
      metric_name: metric,
      series_id: seriesIdFor(metric, '00'),
      unit: FOVISSSTE_METRIC_UNITS[metric],
      periodicity: FOVISSSTE_PERIODICITY,
      period_start: period.period_start,
      period_end: period.period_end,
      value: m.value,
      source_span: {
        kind: 'page_quote',
        page: m.source_span.page,
        quote: m.source_span.quote,
        confidence: m.confidence,
        report_period: extract.report_period,
      },
    });
  }
  return out;
}

// pdf-parse está en el stack H1 (docs/00_FOUNDATION/00.2_STACK). Dynamic import
// para mantener el test suite sin el peso del PDF runtime cuando los tests usan
// pdfParserImpl mock. Si el paquete se desinstala → fovissste_pdf_parser_not_installed;
// si el PDF es inválido → el error real de pdf-parse propaga sin máscara.
export type PdfParserImpl = (buffer: Buffer) => Promise<{ text: string; numpages?: number }>;

async function defaultPdfParser(buffer: Buffer): Promise<{ text: string; numpages?: number }> {
  let mod: unknown;
  try {
    mod = await import('pdf-parse' as string);
  } catch {
    throw new Error('fovissste_pdf_parser_not_installed');
  }
  const PDFParseCtor = (mod as { PDFParse?: new (opts: { data: Buffer }) => PdfParseInstance })
    .PDFParse;
  if (typeof PDFParseCtor !== 'function') throw new Error('fovissste_pdf_parser_not_installed');
  const instance = new PDFParseCtor({ data: buffer });
  try {
    const result = await instance.getText();
    const pages = result?.pages ?? [];
    const text = pages.map((p) => p.text ?? '').join('\n');
    return { text, numpages: pages.length };
  } finally {
    try {
      await instance.destroy?.();
    } catch {
      /* best-effort */
    }
  }
}

interface PdfParseInstance {
  getText(): Promise<{ pages?: { text?: string }[] }>;
  destroy?(): Promise<void>;
}

export interface ExtractFovisstePdfOptions {
  model?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  pdfParserImpl?: PdfParserImpl;
  runId?: string;
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export async function extractFovisstePdf(
  pdfBuffer: Buffer,
  options: ExtractFovisstePdfOptions = {},
): Promise<FovisssteExtract> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('missing_env: OPENAI_API_KEY');

  const parser = options.pdfParserImpl ?? defaultPdfParser;
  const parsed = await parser(pdfBuffer);
  const pdfText = parsed.text ?? '';
  if (pdfText.trim().length === 0) throw new Error('fovissste_pdf_empty_text');

  const model = options.model ?? 'gpt-4o-mini';
  const doFetch = options.fetchImpl ?? fetch;

  const body = {
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: FOVISSSTE_SYSTEM_PROMPT },
      { role: 'user', content: pdfText },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: OPENAI_JSON_SCHEMA,
    },
  };

  const res = await doFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(options.runId ? correlationHeaders(options.runId) : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`fovissste_llm_http_${res.status}`);
  }

  const json = (await res.json()) as OpenAiChatResponse;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('fovissste_llm_empty_content');
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(content);
  } catch {
    throw new Error('fovissste_llm_invalid_json');
  }

  const result = FovisssteExtractSchema.safeParse(rawParsed);
  if (!result.success) {
    throw new Error('fovissste_llm_validation_failed');
  }
  return result.data;
}

export async function upsertFovisssteRows(
  rows: FovisssteParsedRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: FOVISSSTE_SOURCE,
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

export type FovisssteInput = { kind: 'xlsx'; buffer: Buffer } | { kind: 'pdf'; buffer: Buffer };

export type FovisssteDriverPayload =
  | { kind: 'xlsx'; rows: FovisssteParsedRow[] }
  | { kind: 'pdf'; extract: FovisssteExtract };

export const fovisssteDriver: IngestDriver<FovisssteInput, FovisssteDriverPayload> = {
  source: FOVISSSTE_SOURCE,
  category: 'macro',
  defaultPeriodicity: FOVISSSTE_PERIODICITY,
  async fetch(ctx, input) {
    if (!input?.buffer || input.buffer.length === 0) {
      throw new Error('fovissste_missing_buffer');
    }
    if (input.kind === 'xlsx') {
      return { kind: 'xlsx', rows: parseFovisssteWorkbook(input.buffer) };
    }
    if (input.kind === 'pdf') {
      const extract = await extractFovisstePdf(input.buffer, { runId: ctx.runId });
      return { kind: 'pdf', extract };
    }
    throw new Error('fovissste_invalid_input_kind');
  },
  async parse(payload) {
    const p = payload as FovisssteDriverPayload;
    if (p.kind === 'xlsx') return p.rows;
    return extractRowsFromFovisstePdfExtract(p.extract);
  },
  async upsert(rows, ctx) {
    const parsed = rows as FovisssteParsedRow[];
    const { inserted, errors } = await upsertFovisssteRows(parsed, ctx);
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

registerDriver(fovisssteDriver);

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${yyyy}-${mm}-${dd}`;
}

export interface IngestFovisssteXlsxOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

// PDF medium ≈ 15K tokens input × $0.15/1M + 1K output × $0.60/1M ≈ $0.003.
// Redondeamos a 0.01 USD/run para margen contra informes trimestrales largos.
const FOVISSSTE_PDF_ESTIMATED_COST_USD = 0.01;

export async function ingestFovisssteXlsx(
  buffer: Buffer,
  options: IngestFovisssteXlsxOptions = {},
): Promise<IngestResult> {
  if (!buffer || buffer.length === 0) throw new Error('fovissste_missing_buffer');
  const periodEnd = todayISO();

  const job: IngestJob<Buffer> = {
    source: FOVISSSTE_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin_upload',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const parsed = parseFovisssteWorkbook(buffer);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<FovisssteParsedRow>({ min: 0 }),
          duplicateDetectionGate<FovisssteParsedRow>((r) => `${r.series_id}:${r.period_start}`),
          outlierFlagGate<FovisssteParsedRow>((r) => r.value),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertFovisssteRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: FOVISSSTE_SOURCE,
              destinationTable: 'macro_series',
              upstreamUrl: 'admin:upload://fovissste/informe_trimestral_xlsx',
              transformation: 'fovissste_xlsx_parse',
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
        input_kind: 'xlsx',
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

export interface IngestFovisstePdfOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
  model?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  pdfParserImpl?: PdfParserImpl;
}

export async function ingestFovisstePdf(
  pdfBuffer: Buffer,
  options: IngestFovisstePdfOptions = {},
): Promise<IngestResult> {
  if (!pdfBuffer || pdfBuffer.length === 0) throw new Error('fovissste_missing_buffer');

  const job: IngestJob<FovisssteExtract> = {
    source: FOVISSSTE_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin:upload',
    estimatedCostUsd: FOVISSSTE_PDF_ESTIMATED_COST_USD,
    async run(ctx: IngestCtx) {
      const extractOpts: ExtractFovisstePdfOptions = { runId: ctx.runId };
      if (options.model !== undefined) extractOpts.model = options.model;
      if (options.apiKey !== undefined) extractOpts.apiKey = options.apiKey;
      if (options.fetchImpl !== undefined) extractOpts.fetchImpl = options.fetchImpl;
      if (options.pdfParserImpl !== undefined) extractOpts.pdfParserImpl = options.pdfParserImpl;

      const extract = await extractFovisstePdf(pdfBuffer, extractOpts);
      const parsed = extractRowsFromFovisstePdfExtract(extract);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<FovisssteParsedRow>({ min: 0 }),
          duplicateDetectionGate<FovisssteParsedRow>((r) => `${r.series_id}:${r.period_start}`),
          outlierFlagGate<FovisssteParsedRow>((r) => r.value),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertFovisssteRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.map((r) => ({
              runId: ctx.runId,
              source: FOVISSSTE_SOURCE,
              destinationTable: 'macro_series',
              upstreamUrl: 'admin:upload://fovissste/informe_trimestral_pdf',
              transformation: 'fovissste_pdf_gpt4o_mini_extract',
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
        report_period: extract.report_period,
        review_required: extract.metadata.review_required,
        missing_reason: extract.metadata.missing_reason,
        input_kind: 'pdf',
      };
      if (options.uploadedBy) meta.uploaded_by = options.uploadedBy;

      return {
        rows_inserted: inserted,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: 0,
        errors,
        cost_estimated_usd: FOVISSSTE_PDF_ESTIMATED_COST_USD,
        meta,
        rawPayload: extract,
      };
    },
  };

  const runOpts: RunIngestOptions = {
    saveRaw: options.saveRaw ?? true,
  };
  if (typeof options.retries === 'number') runOpts.retries = options.retries;

  return await runIngest(job, runOpts);
}
