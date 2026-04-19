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

// BBVA Research "Situación Inmobiliaria México" extractor. Admin sube PDF
// mensual, pdf-parse extrae texto, GPT-4o-mini devuelve JSON validado vía
// json_schema. source_span (page + quote) es obligatorio para cada número
// no-null — esta restricción bloquea alucinaciones (Constitutional AI GC-7).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.C.4
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2

export const BBVA_SYSTEM_PROMPT = `Eres un extractor estructurado de reportes BBVA Research. Reglas inviolables:
1. NUNCA inventes números. Si un campo no aparece en el PDF, devuelve null.
2. Cada número DEBE venir acompañado de source_span: { page, quote } — quote es cita textual del PDF.
3. Si confidence < 0.7, setea confidence = "low" y flagea en metadata.review_required = true.
4. Si el PDF no contiene el forecast esperado para el período reportado, devuelve el campo como null + razón en metadata.missing_reason.
5. NO interpretes — solo extrae. No extrapoles.`;

// Zod schema + refinement: si value !== null, source_span no puede ser null.
// Este refinement es el enforcement técnico del GC-7 (never hallucinate).
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

export const BbvaExtractSchema = z.object({
  report_period: z.string().regex(/^\d{4}-\d{2}$/, 'report_period must be YYYY-MM'),
  forecast_housing_prices_yoy: metricFieldSchema,
  mortgage_rate_forecast: metricFieldSchema,
  demand_index: metricFieldSchema,
  metadata: z.object({
    review_required: z.boolean(),
    missing_reason: z.string().nullable(),
  }),
});

export type BbvaExtract = z.infer<typeof BbvaExtractSchema>;
export type BbvaMetricField = z.infer<typeof metricFieldSchema>;

// JSON schema equivalente para OpenAI response_format. Mantener sincronizado
// con BbvaExtractSchema — el refinement se valida client-side con Zod.parse.
const OPENAI_JSON_SCHEMA = {
  name: 'BbvaExtract',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'report_period',
      'forecast_housing_prices_yoy',
      'mortgage_rate_forecast',
      'demand_index',
      'metadata',
    ],
    properties: {
      report_period: { type: 'string' },
      forecast_housing_prices_yoy: {
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
      mortgage_rate_forecast: {
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
      demand_index: {
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

export interface BbvaParsedRow {
  metric_name: 'forecast_housing_prices_yoy' | 'mortgage_rate_forecast' | 'demand_index';
  series_id: string;
  unit: string;
  periodicity: 'monthly';
  period_start: string;
  period_end: string;
  value: number;
  source_span: {
    page: number;
    quote: string;
    confidence: 'high' | 'medium' | 'low';
    report_period: string;
  };
}

const METRIC_UNITS: Record<BbvaParsedRow['metric_name'], string> = {
  forecast_housing_prices_yoy: 'pct_yoy',
  mortgage_rate_forecast: 'pct',
  demand_index: 'index',
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function periodRangeFromYYYYMM(reportPeriod: string): { start: string; end: string } {
  const [yyyyStr, mmStr] = reportPeriod.split('-');
  const yyyy = Number(yyyyStr);
  const mm = Number(mmStr);
  const last = lastDayOfMonth(yyyy, mm);
  return {
    start: `${yyyyStr}-${mmStr}-01`,
    end: `${yyyyStr}-${mmStr}-${pad2(last)}`,
  };
}

export function extractRowsFromBbvaExtract(extract: BbvaExtract): BbvaParsedRow[] {
  const { start, end } = periodRangeFromYYYYMM(extract.report_period);
  const out: BbvaParsedRow[] = [];
  const metrics: BbvaParsedRow['metric_name'][] = [
    'forecast_housing_prices_yoy',
    'mortgage_rate_forecast',
    'demand_index',
  ];
  for (const m of metrics) {
    const field = extract[m];
    if (field.value === null || field.source_span === null) continue;
    out.push({
      metric_name: m,
      series_id: m,
      unit: METRIC_UNITS[m],
      periodicity: 'monthly',
      period_start: start,
      period_end: end,
      value: field.value,
      source_span: {
        page: field.source_span.page,
        quote: field.source_span.quote,
        confidence: field.confidence,
        report_period: extract.report_period,
      },
    });
  }
  return out;
}

// pdf-parse está en el stack H1 (docs/00_FOUNDATION/00.2_STACK). Dynamic import
// para mantener el test suite sin el peso del PDF runtime cuando los tests usan
// pdfParserImpl mock. Si el paquete se desinstala → bbva_pdf_parser_not_installed;
// si el PDF es inválido → el error real de pdf-parse propaga sin máscara.
export type PdfParserImpl = (buffer: Buffer) => Promise<{ text: string; numpages?: number }>;

async function defaultPdfParser(buffer: Buffer): Promise<{ text: string; numpages?: number }> {
  let mod: unknown;
  try {
    mod = await import('pdf-parse' as string);
  } catch {
    throw new Error('bbva_pdf_parser_not_installed');
  }
  const PDFParseCtor = (mod as { PDFParse?: new (opts: { data: Buffer }) => PdfParseInstance })
    .PDFParse;
  if (typeof PDFParseCtor !== 'function') throw new Error('bbva_pdf_parser_not_installed');
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

export interface ExtractBbvaPdfOptions {
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

export async function extractBbvaPdf(
  pdfBuffer: Buffer,
  options: ExtractBbvaPdfOptions = {},
): Promise<BbvaExtract> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('missing_env: OPENAI_API_KEY');

  const parser = options.pdfParserImpl ?? defaultPdfParser;
  const parsed = await parser(pdfBuffer);
  const pdfText = parsed.text ?? '';
  if (pdfText.trim().length === 0) throw new Error('bbva_pdf_empty_text');

  const model = options.model ?? 'gpt-4o-mini';
  const doFetch = options.fetchImpl ?? fetch;

  const body = {
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: BBVA_SYSTEM_PROMPT },
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
    throw new Error(`bbva_llm_http_${res.status}`);
  }

  const json = (await res.json()) as OpenAiChatResponse;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('bbva_llm_empty_content');
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(content);
  } catch {
    throw new Error('bbva_llm_invalid_json');
  }

  const result = BbvaExtractSchema.safeParse(rawParsed);
  if (!result.success) {
    throw new Error('bbva_llm_validation_failed');
  }
  return result.data;
}

export async function upsertBbvaRows(
  rows: BbvaParsedRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: 'bbva_research',
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

export const bbvaDriver: IngestDriver<{ pdfBuffer: Buffer }, BbvaExtract> = {
  source: 'bbva_research',
  category: 'macro',
  defaultPeriodicity: 'monthly',
  async fetch(_ctx, input) {
    if (!input?.pdfBuffer) throw new Error('bbva_missing_pdf_buffer');
    return await extractBbvaPdf(input.pdfBuffer, { runId: _ctx.runId });
  },
  async parse(payload) {
    return extractRowsFromBbvaExtract(payload as BbvaExtract);
  },
  async upsert(rows, ctx) {
    const parsed = rows as BbvaParsedRow[];
    const { inserted, errors } = await upsertBbvaRows(parsed, ctx);
    return {
      rows_inserted: inserted,
      rows_updated: 0,
      rows_skipped: 0,
      rows_dlq: 0,
      errors,
      cost_estimated_usd: 0.01,
    };
  },
};

registerDriver(bbvaDriver);

export interface IngestBbvaPdfOptions {
  triggeredBy?: string;
  saveRaw?: boolean;
  retries?: number;
  model?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  pdfParserImpl?: PdfParserImpl;
}

// PDF medium ≈ 15K tokens input × $0.15/1M + 1K output × $0.60/1M ≈ $0.003.
// Redondeamos a 0.01 USD por run para margen de seguridad contra PDFs largos.
const BBVA_ESTIMATED_COST_USD = 0.01;

export async function ingestBbvaPdf(
  pdfBuffer: Buffer,
  options: IngestBbvaPdfOptions = {},
): Promise<IngestResult> {
  const job: IngestJob<BbvaExtract> = {
    source: 'bbva_research',
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin:upload',
    estimatedCostUsd: BBVA_ESTIMATED_COST_USD,
    async run(ctx: IngestCtx) {
      const extractOpts: ExtractBbvaPdfOptions = { runId: ctx.runId };
      if (options.model !== undefined) extractOpts.model = options.model;
      if (options.apiKey !== undefined) extractOpts.apiKey = options.apiKey;
      if (options.fetchImpl !== undefined) extractOpts.fetchImpl = options.fetchImpl;
      if (options.pdfParserImpl !== undefined) extractOpts.pdfParserImpl = options.pdfParserImpl;

      const extract = await extractBbvaPdf(pdfBuffer, extractOpts);
      const parsed = extractRowsFromBbvaExtract(extract);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<BbvaParsedRow>({ min: 0 }),
          duplicateDetectionGate<BbvaParsedRow>((r) => `${r.series_id}:${r.period_start}`),
          outlierFlagGate<BbvaParsedRow>((r) => r.value),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertBbvaRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.map((r) => ({
              runId: ctx.runId,
              source: 'bbva_research',
              destinationTable: 'macro_series',
              upstreamUrl: 'admin:upload://bbva_research/situacion_inmobiliaria',
              transformation: 'bbva_pdf_gpt4o_mini_extract',
              sourceSpan: r.source_span as unknown as Record<string, unknown>,
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
        cost_estimated_usd: BBVA_ESTIMATED_COST_USD,
        meta: {
          quality_gate_warnings: gates.warnings,
          rows_parsed: parsed.length,
          report_period: extract.report_period,
          review_required: extract.metadata.review_required,
          missing_reason: extract.metadata.missing_reason,
        },
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
