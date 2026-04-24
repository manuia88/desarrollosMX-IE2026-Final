import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CausalExplanation, Citation, IndexCode, ScopeType } from '@/shared/types/scores';
import { llmOutputSchema } from '../schemas/causal';
import type { CausalInput } from '../types';
import { parseCitations, validateCitations } from './citations-validator';
import { estimateCost } from './cost-calculator';
import {
  PROMPT_MODEL_PRIMARY,
  PROMPT_VERSION,
  SYSTEM_PROMPT_ES,
  USER_PROMPT_TEMPLATE_ES,
} from './prompt-v1';

type Supabase = SupabaseClient<Database>;

export interface GenerateOpts {
  readonly scoreId: string;
  readonly indexCode: IndexCode;
  readonly scopeType: ScopeType;
  readonly scopeId: string;
  readonly periodDate: string;
  readonly supabase: Supabase;
  readonly forceRegenerate?: boolean;
  readonly anthropic?: Anthropic;
  readonly costGuardAllowed?: boolean;
}

interface DmxIndexRow {
  readonly value: number;
  readonly period_date: string;
  readonly score_band: string | null;
  readonly confidence: string;
  readonly trend_direction: string | null;
  readonly trend_vs_previous: number | null;
  readonly components: Record<string, unknown> | null;
}

interface CacheRow {
  readonly explanation_md: string;
  readonly citations: unknown;
  readonly model: string;
  readonly prompt_version: string;
  readonly generated_at: string;
  readonly ttl_days: number;
  readonly cache_hit_count: number;
}

const INDEX_SELECT =
  'value,period_date,score_band,confidence,trend_direction,trend_vs_previous,components';

function isStillFresh(generatedAt: string, ttlDays: number): boolean {
  const generated = new Date(generatedAt).getTime();
  if (Number.isNaN(generated)) return false;
  const expires = generated + ttlDays * 24 * 60 * 60 * 1000;
  return Date.now() < expires;
}

function normalizeCitation(raw: {
  ref_id: string;
  type: Citation['type'];
  label: string;
  value: string | number | null;
  source: string;
  href?: string | null | undefined;
  as_of?: string | null | undefined;
}): Citation {
  const base = {
    ref_id: raw.ref_id,
    type: raw.type,
    label: raw.label,
    value: raw.value,
    source: raw.source,
  };
  return {
    ...base,
    href: raw.href ?? null,
    as_of: raw.as_of ?? null,
  };
}

function toCitations(raw: unknown): Citation[] {
  if (!Array.isArray(raw)) return [];
  const out: Citation[] = [];
  for (const c of raw) {
    if (typeof c !== 'object' || c === null) continue;
    const obj = c as Record<string, unknown>;
    if (typeof obj.ref_id !== 'string' || typeof obj.type !== 'string') continue;
    out.push(
      normalizeCitation({
        ref_id: obj.ref_id,
        type: obj.type as Citation['type'],
        label: typeof obj.label === 'string' ? obj.label : '',
        value:
          typeof obj.value === 'string' || typeof obj.value === 'number' || obj.value === null
            ? (obj.value as string | number | null)
            : null,
        source: typeof obj.source === 'string' ? obj.source : '',
        href: typeof obj.href === 'string' || obj.href === null ? obj.href : null,
        as_of: typeof obj.as_of === 'string' || obj.as_of === null ? obj.as_of : null,
      }),
    );
  }
  return out;
}

function buildAllowedCitations(
  indexCode: IndexCode,
  scopeId: string,
  periodDate: string,
  current: DmxIndexRow,
  previous: DmxIndexRow | null,
): Citation[] {
  const citations: Citation[] = [
    {
      ref_id: `score:${indexCode}:${scopeId}:${periodDate}`,
      type: 'score',
      label: `${indexCode} actual`,
      value: current.value,
      source: 'dmx_indices',
      href: null,
      as_of: periodDate,
    },
  ];
  if (previous) {
    citations.push({
      ref_id: `score:${indexCode}:${scopeId}:${previous.period_date}`,
      type: 'score',
      label: `${indexCode} anterior`,
      value: previous.value,
      source: 'dmx_indices',
      href: null,
      as_of: previous.period_date,
    });
  }
  const components = current.components ?? {};
  for (const [key, rawVal] of Object.entries(components)) {
    const val = typeof rawVal === 'number' ? rawVal : null;
    if (val === null) continue;
    citations.push({
      ref_id: `subscore:${key}:${scopeId}:${periodDate}`,
      type: 'score',
      label: key,
      value: val,
      source: 'dmx_indices.components',
      href: null,
      as_of: periodDate,
    });
  }
  return citations;
}

function buildSubscores(current: DmxIndexRow): CausalInput['subscores'] {
  const components = current.components ?? {};
  return Object.entries(components).map(([key, rawVal]) => ({
    key,
    label: key,
    value: typeof rawVal === 'number' ? rawVal : null,
    weight: null,
  }));
}

function coerceTrendDirection(value: string | null): CausalInput['trend_direction'] {
  if (value === 'mejorando' || value === 'estable' || value === 'empeorando') return value;
  return null;
}

function extractLlmText(content: Anthropic.Messages.ContentBlock[]): string {
  for (const block of content) {
    if (block.type === 'text') return block.text;
  }
  return '';
}

async function callLlm(
  anthropic: Anthropic,
  causalInput: CausalInput,
  userNudge?: string,
): Promise<{
  text: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const userContent = userNudge
    ? `${USER_PROMPT_TEMPLATE_ES(causalInput)}\n\n${userNudge}`
    : USER_PROMPT_TEMPLATE_ES(causalInput);

  const response = await anthropic.messages.create({
    model: PROMPT_MODEL_PRIMARY,
    max_tokens: 1200,
    system: SYSTEM_PROMPT_ES,
    messages: [{ role: 'user', content: userContent }],
  });

  return {
    text: extractLlmText(response.content),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function generateCausalExplanation(opts: GenerateOpts): Promise<CausalExplanation> {
  const {
    scoreId,
    indexCode,
    scopeType,
    scopeId,
    periodDate,
    supabase,
    forceRegenerate = false,
    costGuardAllowed,
  } = opts;

  const anthropic =
    opts.anthropic ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });

  if (!forceRegenerate) {
    const { data: cached } = await supabase
      .from('causal_explanations')
      .select('explanation_md,citations,model,prompt_version,generated_at,ttl_days,cache_hit_count')
      .eq('score_id', scoreId)
      .eq('scope_type', scopeType)
      .eq('scope_id', scopeId)
      .eq('period_date', periodDate)
      .eq('prompt_version', PROMPT_VERSION)
      .maybeSingle();

    const row = cached as CacheRow | null;
    if (row && isStillFresh(row.generated_at, row.ttl_days)) {
      void supabase
        .from('causal_explanations')
        .update({ cache_hit_count: row.cache_hit_count + 1 })
        .eq('score_id', scoreId)
        .eq('scope_type', scopeType)
        .eq('scope_id', scopeId)
        .eq('period_date', periodDate)
        .eq('prompt_version', PROMPT_VERSION)
        .then(() => undefined);
      return {
        explanation_md: row.explanation_md,
        citations: toCitations(row.citations),
        model: row.model,
        prompt_version: row.prompt_version,
        generated_at: row.generated_at,
        cached: true,
      };
    }
  }

  const { data: currentRaw, error: currentErr } = await supabase
    .from('dmx_indices')
    .select(INDEX_SELECT)
    .eq('index_code', indexCode)
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .eq('period_date', periodDate)
    .maybeSingle();

  if (currentErr) throw new Error('CAUSAL_INDEX_READ_FAILED');
  if (!currentRaw) throw new Error('CAUSAL_INDEX_NOT_FOUND');
  const current = currentRaw as DmxIndexRow;

  const { data: previousRaw } = await supabase
    .from('dmx_indices')
    .select(INDEX_SELECT)
    .eq('index_code', indexCode)
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .lt('period_date', periodDate)
    .order('period_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previous = (previousRaw as DmxIndexRow | null) ?? null;

  const allowedCitations = buildAllowedCitations(indexCode, scopeId, periodDate, current, previous);
  const allowedRefs = allowedCitations.map((c) => c.ref_id);

  const trendDelta =
    previous && typeof previous.value === 'number'
      ? Number((current.value - previous.value).toFixed(4))
      : null;

  const causalInput: CausalInput = {
    score_id: scoreId,
    index_code: indexCode,
    scope_type: scopeType,
    scope_id: scopeId,
    scope_label: scopeId,
    period_date: periodDate,
    current_value: current.value,
    previous_value: previous?.value ?? null,
    trend_direction: coerceTrendDirection(current.trend_direction),
    trend_delta: trendDelta,
    score_band: current.score_band,
    confidence: current.confidence,
    subscores: buildSubscores(current),
    allowed_citations: allowedCitations,
  };

  // Cost guard must be explicitly true; `false` blocks the call. `undefined`
  // means the caller does not participate in the guard (legacy/tests).
  if (costGuardAllowed === false) {
    throw new Error('COST_BUDGET_EXCEEDED');
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Attempt #1.
  let attempt = await callLlm(anthropic, causalInput);
  totalInputTokens += attempt.inputTokens;
  totalOutputTokens += attempt.outputTokens;
  let parsedRaw = safeJsonParse(attempt.text);

  // Retry once if JSON parse failed.
  if (parsedRaw === null) {
    attempt = await callLlm(
      anthropic,
      causalInput,
      'Tu respuesta anterior no fue JSON válido. Devuelve JSON puro.',
    );
    totalInputTokens += attempt.inputTokens;
    totalOutputTokens += attempt.outputTokens;
    parsedRaw = safeJsonParse(attempt.text);
    if (parsedRaw === null) throw new Error('LLM_VALIDATION_FAILED');
  }

  let zodParsed = llmOutputSchema.safeParse(parsedRaw);

  // Retry once on schema failure.
  if (!zodParsed.success) {
    attempt = await callLlm(
      anthropic,
      causalInput,
      'Tu JSON no cumple el schema. Devuelve { explanation_md, citations[] } respetando límites.',
    );
    totalInputTokens += attempt.inputTokens;
    totalOutputTokens += attempt.outputTokens;
    const retryParsedRaw = safeJsonParse(attempt.text);
    if (retryParsedRaw === null) throw new Error('LLM_VALIDATION_FAILED');
    zodParsed = llmOutputSchema.safeParse(retryParsedRaw);
    if (!zodParsed.success) throw new Error('LLM_VALIDATION_FAILED');
  }

  let parsed = zodParsed.data;

  const extractedRefs = parseCitations(parsed.explanation_md);
  let citationCheck = validateCitations(extractedRefs, allowedRefs);

  // Retry once on bad citations.
  if (!citationCheck.valid) {
    attempt = await callLlm(
      anthropic,
      causalInput,
      `Usaste citations fuera de allowed_citations: ${citationCheck.missing.join(', ')}. Repite usando solo ref_ids permitidos.`,
    );
    totalInputTokens += attempt.inputTokens;
    totalOutputTokens += attempt.outputTokens;
    const retryParsedRaw = safeJsonParse(attempt.text);
    if (retryParsedRaw === null) throw new Error('LLM_CITATION_INVALID');
    const retryZod = llmOutputSchema.safeParse(retryParsedRaw);
    if (!retryZod.success) throw new Error('LLM_CITATION_INVALID');
    parsed = retryZod.data;
    const retryExtracted = parseCitations(parsed.explanation_md);
    citationCheck = validateCitations(retryExtracted, allowedRefs);
    if (!citationCheck.valid) throw new Error('LLM_CITATION_INVALID');
  }

  const generatedAt = new Date().toISOString();
  const tokensUsed = totalInputTokens + totalOutputTokens;
  const costUsd = estimateCost({
    model: PROMPT_MODEL_PRIMARY,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  });

  const normalizedCitations = parsed.citations.map((c) => normalizeCitation(c));
  const citationsJson = JSON.parse(
    JSON.stringify(normalizedCitations),
  ) as Database['public']['Tables']['causal_explanations']['Row']['citations'];

  const insertPayload = {
    score_id: scoreId,
    scope_type: scopeType,
    scope_id: scopeId,
    period_date: periodDate,
    explanation_md: parsed.explanation_md,
    citations: citationsJson,
    model: PROMPT_MODEL_PRIMARY,
    prompt_version: PROMPT_VERSION,
    generated_at: generatedAt,
    cache_hit_count: 0,
  };

  const { error: upsertErr } = await supabase
    .from('causal_explanations')
    .upsert(insertPayload as never, {
      onConflict: 'score_id,scope_type,scope_id,period_date,prompt_version',
    });
  if (upsertErr) throw new Error('CAUSAL_PERSIST_FAILED');

  return {
    explanation_md: parsed.explanation_md,
    citations: normalizedCitations,
    model: PROMPT_MODEL_PRIMARY,
    prompt_version: PROMPT_VERSION,
    generated_at: generatedAt,
    cached: false,
    tokens_used: tokensUsed,
    cost_usd: costUsd,
  };
}
