import { z } from 'zod';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { correlationHeaders } from '../correlation';
import { recordLineage } from '../lineage';
import { type RunIngestOptions, runIngest } from '../orchestrator';
import {
  duplicateDetectionGate,
  outlierFlagGate,
  rowCountSanityGate,
  runQualityGates,
} from '../quality-gates';
import type { IngestCtx, IngestJob, IngestResult } from '../types';

// Extractor compartido para reports trimestrales de mercado inmobiliario
// (Cushman / CBRE / Tinsa / JLL / Softec). Pipeline: pdf-parse → GPT-4o-mini
// con json_schema strict → Zod validation. Cada metric_field requiere
// source_span { page, quote } si value !== null (Constitutional AI GC-7).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.4 / §7.E.8
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-018_E2E_CONNECTEDNESS.md §6.bis

export const MARKET_SYSTEM_PROMPT = `Eres un extractor estructurado de reports inmobiliarios institucionales (Cushman, CBRE, Tinsa, JLL, Softec). Reglas inviolables:
1. NUNCA inventes números. Si un campo no aparece literalmente en el PDF, devuelve value = null.
2. Cada value no-null DEBE venir con source_span: { page, quote } donde quote es cita textual del PDF.
3. Confidence por campo: "high" si dato explícito sin ambigüedad; "medium" si requiere inferencia ligera; "low" si ambiguo. Si confidence < 0.8 → metadata.review_required = true.
4. Si el PDF no contiene el dato esperado para el período, value = null + source_span = null.
5. NO interpretes. NO extrapoles. NO calcules métricas derivadas.`;

const sourceSpanSchema = z.object({
  page: z.number().int().nonnegative(),
  quote: z.string().min(1),
});

// Refinement técnico del GC-7: value no-null requiere source_span no-null.
export const metricFieldSchema = z
  .object({
    value: z.number().nullable(),
    confidence: z.enum(['high', 'medium', 'low']),
    source_span: sourceSpanSchema.nullable(),
  })
  .refine((v) => v.value === null || v.source_span !== null, {
    message: 'value_requires_source_span',
    path: ['source_span'],
  });

export type MarketMetricField = z.infer<typeof metricFieldSchema>;

export interface MarketMetricSpec {
  name: string;
  unit: string;
  description: string;
}

export interface MarketPublisherConfig {
  source: 'cushman' | 'cbre' | 'tinsa' | 'jll' | 'softec';
  displayName: string;
  periodicity: 'monthly' | 'quarterly';
  metrics: readonly MarketMetricSpec[];
  confidenceThreshold?: number;
  estimatedCostUsd?: number;
}

interface MarketExtractBase {
  report_period: string;
  metadata: { review_required: boolean; missing_reason: string | null };
}

export type MarketExtract = MarketExtractBase &
  Record<string, MarketMetricField | MarketExtractBase[keyof MarketExtractBase]>;

export function buildExtractSchema(config: MarketPublisherConfig) {
  const shape: Record<string, z.ZodTypeAny> = {
    report_period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'report_period must be YYYY-MM'),
    metadata: z.object({
      review_required: z.boolean(),
      missing_reason: z.string().nullable(),
    }),
  };
  for (const m of config.metrics) shape[m.name] = metricFieldSchema;
  return z.object(shape);
}

export function buildOpenAiJsonSchema(config: MarketPublisherConfig) {
  const properties: Record<string, unknown> = {
    report_period: { type: 'string' },
    metadata: {
      type: 'object',
      additionalProperties: false,
      required: ['review_required', 'missing_reason'],
      properties: {
        review_required: { type: 'boolean' },
        missing_reason: { type: ['string', 'null'] },
      },
    },
  };
  const required: string[] = ['report_period', 'metadata'];
  const metricFieldJsonSchema = {
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
  } as const;
  for (const m of config.metrics) {
    properties[m.name] = metricFieldJsonSchema;
    required.push(m.name);
  }
  return {
    name: `${config.source}_extract`,
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required,
      properties,
    },
  };
}

export interface MarketParsedRow {
  source: MarketPublisherConfig['source'];
  metric_name: string;
  unit: string;
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function periodRangeFromYYYYMM(
  reportPeriod: string,
  periodicity: 'monthly' | 'quarterly',
): { start: string; end: string } {
  const [yyyyStr, mmStr] = reportPeriod.split('-');
  const yyyy = Number(yyyyStr);
  const mm = Number(mmStr);
  if (periodicity === 'monthly') {
    const last = new Date(Date.UTC(yyyy, mm, 0)).getUTCDate();
    return { start: `${yyyyStr}-${mmStr}-01`, end: `${yyyyStr}-${mmStr}-${pad2(last)}` };
  }
  const qStart = mm - ((mm - 1) % 3);
  const qEnd = qStart + 2;
  const lastDay = new Date(Date.UTC(yyyy, qEnd, 0)).getUTCDate();
  return {
    start: `${yyyyStr}-${pad2(qStart)}-01`,
    end: `${yyyyStr}-${pad2(qEnd)}-${pad2(lastDay)}`,
  };
}

export function extractRowsFromMarketExtract(
  extract: Record<string, unknown>,
  config: MarketPublisherConfig,
): MarketParsedRow[] {
  const reportPeriod = String(extract.report_period);
  const { start, end } = periodRangeFromYYYYMM(reportPeriod, config.periodicity);
  const out: MarketParsedRow[] = [];
  for (const spec of config.metrics) {
    const field = extract[spec.name] as MarketMetricField | undefined;
    if (!field || field.value === null || field.source_span === null) continue;
    out.push({
      source: config.source,
      metric_name: spec.name,
      unit: spec.unit,
      period_start: start,
      period_end: end,
      value: field.value,
      source_span: {
        page: field.source_span.page,
        quote: field.source_span.quote,
        confidence: field.confidence,
        report_period: reportPeriod,
      },
    });
  }
  return out;
}

export type PdfParserImpl = (buffer: Buffer) => Promise<{ text: string; numpages?: number }>;

async function defaultPdfParser(buffer: Buffer): Promise<{ text: string; numpages?: number }> {
  let mod: unknown;
  try {
    mod = await import('pdf-parse' as string);
  } catch {
    throw new Error('market_pdf_parser_not_installed');
  }
  const PDFParseCtor = (mod as { PDFParse?: new (opts: { data: Buffer }) => PdfParseInstance })
    .PDFParse;
  if (typeof PDFParseCtor !== 'function') throw new Error('market_pdf_parser_not_installed');
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

export interface ExtractMarketPdfOptions {
  model?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  pdfParserImpl?: PdfParserImpl;
  runId?: string;
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
}

export async function extractMarketPdf(
  pdfBuffer: Buffer,
  config: MarketPublisherConfig,
  options: ExtractMarketPdfOptions = {},
): Promise<Record<string, unknown>> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('missing_env: OPENAI_API_KEY');

  const parser = options.pdfParserImpl ?? defaultPdfParser;
  const parsed = await parser(pdfBuffer);
  const pdfText = parsed.text ?? '';
  if (pdfText.trim().length === 0) throw new Error('market_pdf_empty_text');

  const model = options.model ?? 'gpt-4o-mini';
  const doFetch = options.fetchImpl ?? fetch;

  const metricHints = config.metrics
    .map((m) => `- ${m.name} (${m.unit}): ${m.description}`)
    .join('\n');
  const userPrompt = `Publisher: ${config.displayName}\nPeriodicidad esperada: ${config.periodicity}\nMétricas a extraer:\n${metricHints}\n\n---\nContenido del PDF:\n${pdfText}`;

  const body = {
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: MARKET_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: buildOpenAiJsonSchema(config),
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

  if (!res.ok) throw new Error(`market_llm_http_${res.status}`);

  const json = (await res.json()) as OpenAiChatResponse;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('market_llm_empty_content');
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(content);
  } catch {
    throw new Error('market_llm_invalid_json');
  }

  const schema = buildExtractSchema(config);
  const result = schema.safeParse(rawParsed);
  if (!result.success) throw new Error('market_llm_validation_failed');
  return result.data as Record<string, unknown>;
}

// market_pulse tiene unique index funcional con COALESCE(zone_id,...) que
// PostgREST no soporta como onConflict target. Idempotencia: borrar rows
// (country, source, period_start, zone_id NULL) previas + insertar fresh.
// Una sola transacción conceptual: una subida completa reemplaza la anterior
// del mismo report_period.
export async function upsertMarketRows(
  rows: MarketParsedRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();

  const periodStart = rows[0]?.period_start;
  const sourceKey = rows[0]?.source;
  if (!periodStart || !sourceKey) {
    return { inserted: 0, errors: ['market_pulse_missing_period_or_source'] };
  }

  const { error: delErr } = await supabase
    .from('market_pulse')
    .delete()
    .eq('country_code', ctx.countryCode)
    .eq('source', sourceKey)
    .eq('period_start', periodStart)
    .is('zone_id', null);
  if (delErr) {
    return { inserted: 0, errors: [`market_pulse_delete: ${delErr.message}`] };
  }

  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    zone_id: null,
    source: r.source,
    metric: r.metric_name,
    period_start: r.period_start,
    period_end: r.period_end,
    value: r.value,
    run_id: ctx.runId,
    meta: { source_span: r.source_span, unit: r.unit },
  }));
  const { error, count } = await supabase
    .from('market_pulse')
    .insert(payload as never, { count: 'exact' });
  if (error) return { inserted: 0, errors: [`market_pulse_insert: ${error.message}`] };
  return { inserted: count ?? rows.length, errors: [] };
}

export interface IngestMarketPdfOptions {
  triggeredBy?: string;
  saveRaw?: boolean;
  retries?: number;
  model?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  pdfParserImpl?: PdfParserImpl;
}

export async function ingestMarketPdfWithConfig(
  pdfBuffer: Buffer,
  config: MarketPublisherConfig,
  options: IngestMarketPdfOptions = {},
): Promise<IngestResult> {
  const estimatedCost = config.estimatedCostUsd ?? 0.01;
  const job: IngestJob = {
    source: config.source,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin:upload:market',
    estimatedCostUsd: estimatedCost,
    async run(ctx: IngestCtx) {
      const extractOpts: ExtractMarketPdfOptions = { runId: ctx.runId };
      if (options.model !== undefined) extractOpts.model = options.model;
      if (options.apiKey !== undefined) extractOpts.apiKey = options.apiKey;
      if (options.fetchImpl !== undefined) extractOpts.fetchImpl = options.fetchImpl;
      if (options.pdfParserImpl !== undefined) extractOpts.pdfParserImpl = options.pdfParserImpl;

      const extract = await extractMarketPdf(pdfBuffer, config, extractOpts);
      const parsed = extractRowsFromMarketExtract(extract, config);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<MarketParsedRow>({ min: 0 }),
          duplicateDetectionGate<MarketParsedRow>(
            (r) => `${r.source}:${r.metric_name}:${r.period_start}`,
          ),
          outlierFlagGate<MarketParsedRow>((r) => r.value),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertMarketRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.map((r) => ({
              runId: ctx.runId,
              source: config.source,
              destinationTable: 'market_pulse',
              upstreamUrl: `admin:upload://${config.source}/market_report`,
              transformation: `${config.source}_pdf_gpt4o_mini_extract`,
              sourceSpan: r.source_span as unknown as Record<string, unknown>,
            })),
          );
        } catch {
          /* lineage best-effort */
        }
      }

      const meta = extract.metadata as { review_required: boolean; missing_reason: string | null };
      return {
        rows_inserted: inserted,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: 0,
        errors,
        cost_estimated_usd: estimatedCost,
        meta: {
          quality_gate_warnings: gates.warnings,
          rows_parsed: parsed.length,
          report_period: extract.report_period,
          review_required: meta.review_required,
          missing_reason: meta.missing_reason,
          publisher: config.displayName,
        },
        rawPayload: extract,
      };
    },
  };

  const runOpts: RunIngestOptions = { saveRaw: options.saveRaw ?? true };
  if (typeof options.retries === 'number') runOpts.retries = options.retries;
  return await runIngest(job, runOpts);
}
