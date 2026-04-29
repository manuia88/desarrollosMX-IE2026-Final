// FASE 17.B Anthropic SDK wrapper — prompt caching ephemeral + cost telemetry
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3
//
// Modelo canon F17.B: claude-sonnet-4-20250514 (vision PDF + caching ephemeral).
// Pricing (USD per 1M tokens):
//   input  = $3.00
//   output = $15.00
//   cache_read = $0.30 (10% del input)
// Prompt caching reduce input cost ~10x cuando system prompt ≥ 1024 tokens.

import Anthropic from '@anthropic-ai/sdk';
import { TRPCError } from '@trpc/server';
import {
  type Citation,
  citationSchema,
  type ExtractionResult,
} from '@/features/document-intel/schemas';

export const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

const PRICE_INPUT_PER_M = 3.0;
const PRICE_OUTPUT_PER_M = 15.0;
const PRICE_CACHE_READ_PER_M = 0.3;
const PRICE_CACHE_CREATION_PER_M = 3.75;

export interface ExtractionTelemetry {
  readonly tokens_input: number;
  readonly tokens_output: number;
  readonly tokens_cache_read: number;
  readonly tokens_cache_creation: number;
  readonly cost_usd: number;
  readonly model: string;
  readonly latency_ms: number;
}

export interface ExtractionRunResult {
  readonly result: ExtractionResult;
  readonly telemetry: ExtractionTelemetry;
}

export interface ExtractionCallParams {
  readonly systemPrompt: string;
  readonly pdfBase64: string;
  readonly userMessage?: string;
  readonly maxTokens?: number;
}

let cachedClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'anthropic_api_key_missing',
    });
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export function calculateCostUsd(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): number {
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheCreation = usage.cache_creation_input_tokens ?? 0;
  const cost =
    (usage.input_tokens * PRICE_INPUT_PER_M) / 1_000_000 +
    (usage.output_tokens * PRICE_OUTPUT_PER_M) / 1_000_000 +
    (cacheRead * PRICE_CACHE_READ_PER_M) / 1_000_000 +
    (cacheCreation * PRICE_CACHE_CREATION_PER_M) / 1_000_000;
  return Number(cost.toFixed(6));
}

function extractTextFromContent(
  content: ReadonlyArray<{ type: string; text?: string }>,
): string {
  const texts = content.filter((b) => b.type === 'text' && typeof b.text === 'string');
  return texts.map((b) => b.text ?? '').join('');
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const withoutOpen = trimmed.replace(/^```(?:json)?\s*/i, '');
    return withoutOpen.replace(/\s*```\s*$/i, '').trim();
  }
  return trimmed;
}

function parseExtractionResponse(rawText: string): ExtractionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFences(rawText));
  } catch (err) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `extraction_invalid_json: ${err instanceof Error ? err.message : 'unknown'}`,
    });
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'extraction_invalid_shape',
    });
  }

  const obj = parsed as Record<string, unknown>;
  const extractedRaw = obj.extracted_data;
  const extracted_data: Record<string, unknown> =
    extractedRaw && typeof extractedRaw === 'object' && !Array.isArray(extractedRaw)
      ? (extractedRaw as Record<string, unknown>)
      : {};

  const citationsRaw = Array.isArray(obj.citations) ? obj.citations : [];
  const citations: Citation[] = [];
  for (const cit of citationsRaw) {
    const candidate = cit as Record<string, unknown>;
    const safe = citationSchema.safeParse({
      field: candidate.field,
      page: candidate.page ?? null,
      paragraph: candidate.paragraph ?? null,
      snippet: candidate.snippet ?? null,
    });
    if (safe.success) citations.push(safe.data);
  }

  const confidenceRaw = obj.confidence;
  const confidence =
    typeof confidenceRaw === 'number' && confidenceRaw >= 0 && confidenceRaw <= 1
      ? confidenceRaw
      : 0;

  return { extracted_data, citations, confidence };
}

export async function runExtraction(params: ExtractionCallParams): Promise<ExtractionRunResult> {
  const client = getAnthropicClient();
  const startedAt = Date.now();

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: params.maxTokens ?? 4096,
    system: [
      {
        type: 'text',
        text: params.systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: params.pdfBase64,
            },
          },
          {
            type: 'text',
            text: params.userMessage ?? 'Extract structured data following the schema strictly.',
          },
        ],
      },
    ],
  });

  const latencyMs = Date.now() - startedAt;
  const text = extractTextFromContent(response.content);
  const result = parseExtractionResponse(text);

  const telemetry: ExtractionTelemetry = {
    tokens_input: response.usage.input_tokens,
    tokens_output: response.usage.output_tokens,
    tokens_cache_read: response.usage.cache_read_input_tokens ?? 0,
    tokens_cache_creation: response.usage.cache_creation_input_tokens ?? 0,
    cost_usd: calculateCostUsd(response.usage),
    model: ANTHROPIC_MODEL,
    latency_ms: latencyMs,
  };

  return { result, telemetry };
}
