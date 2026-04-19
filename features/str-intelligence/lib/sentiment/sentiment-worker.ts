// FASE 07b / BLOQUE 7b.D / MÓDULO 7b.D.1 — Sentiment worker.
//
// Procesa batches de str_reviews donde sentiment_score IS NULL llamando a
// Anthropic Haiku con prompt Constitutional AI (GC-7):
//   - Nunca inventar tópicos no presentes en el texto.
//   - Extraer source_span (snippet exacto que justifica el sentiment).
//   - Reportar confidence ∈ [0,1]; descartar si < 0.75.
//
// Cost cap (plan §7b.D consequences):
//   - $100/mes prod (api_budgets.anthropic — enforced via preCheckBudget).
//   - $20/mes dev — enforced via SAMPLER (process.env.NODE_ENV !== 'production'
//     && Math.random() > DEV_SAMPLE_RATE → skip).
//
// Reusa el orchestrator pipeline:
//   - preCheckBudget('anthropic', estimatedCallCost)
//   - generateObject + Haiku via providers.ts
//   - recordSpend('anthropic', actualCost) post-call
//   - estimateCostUsd para convertir tokens → USD
//
// Output: contadores + reviews actualizadas (sentiment_score, sentiment_confidence,
// sentiment_source_span, topics jsonb).

import { generateObject } from 'ai';
import { z } from 'zod';
import { resolveModel } from '@/shared/lib/ai/providers';
import { preCheckBudget, recordSpend } from '@/shared/lib/ingest/cost-tracker';
import { BudgetExceededError } from '@/shared/lib/ingest/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { estimateCostUsd } from '@/shared/lib/telemetry/events';

export const SENTIMENT_CONFIDENCE_THRESHOLD = 0.75;
export const SENTIMENT_DEFAULT_BATCH_SIZE = 50;
export const SENTIMENT_DEV_SAMPLE_RATE = 0.05;

const ANTHROPIC_HAIKU_MODEL_ID = 'claude-haiku-4-5';

// Per-call estimate (input ~250 tokens prompt + ~150 review + 80 tokens output).
// Real cost reconciled post-call via recordSpend con tokens reales.
const ESTIMATED_COST_PER_CALL_USD = 0.0008;

const sentimentSchema = z.object({
  sentiment: z
    .number()
    .min(-1)
    .max(1)
    .describe('Sentiment score: -1 (muy negativo) a 1 (muy positivo). 0 = neutro.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confianza del modelo en la asignación. <0.75 → review descartada.'),
  source_span: z
    .string()
    .min(0)
    .max(280)
    .describe(
      'Snippet exacto del review que justifica el sentiment (≤280 chars). NUNCA inventar texto que no aparezca literalmente.',
    ),
  topics: z
    .array(z.string().min(1).max(40))
    .max(10)
    .describe(
      'Tópicos detectados (lista cerrada). Solo incluir los presentes literalmente o por sinónimo evidente.',
    ),
});

export type SentimentOutput = z.infer<typeof sentimentSchema>;

const SYSTEM_PROMPT = [
  'Eres analista de sentiment para reviews de short-term-rental (Airbnb/VRBO/Booking).',
  'REGLAS INVIOLABLES (Constitutional AI GC-7):',
  '1. Nunca inventes información ausente en el texto del review.',
  '2. source_span DEBE ser un fragmento literal del review (copia-pega), no una paráfrasis.',
  '3. Si el texto es muy corto, ambiguo, en idioma que no entiendes, o sarcástico de difícil lectura → confidence < 0.75.',
  '4. topics solo desde la lista canónica: cleanliness, location, host, communication, value, noise, wifi, amenities, checkin, accuracy, safety, neighborhood, view, kitchen, bathroom, bed, ac, heating, parking, transport, walkability, coworking, long_stay, family_friendly, pet_friendly. Si un tópico no encaja, omítelo.',
  '5. Sentiment numérico en [-1, 1], no etiquetas verbales.',
].join('\n');

export interface SentimentWorkerDeps {
  // Inyectable para tests.
  readonly fetchPendingReviews?: (batchSize: number) => Promise<readonly PendingReview[]>;
  readonly persistResult?: (review: PendingReview, result: SentimentOutput) => Promise<void>;
  readonly callModel?: (review: PendingReview) => Promise<{
    object: SentimentOutput;
    usage: { inputTokens?: number; outputTokens?: number };
  }>;
  readonly checkBudget?: (
    estimatedCostUsd: number,
  ) => Promise<{ allowed: boolean; alertThresholdReached: boolean }>;
  readonly recordCost?: (costUsd: number) => Promise<void>;
  readonly nodeEnv?: string;
  readonly random?: () => number;
}

export interface PendingReview {
  readonly id: number;
  readonly platform: 'airbnb' | 'vrbo' | 'booking';
  readonly listing_id: string;
  readonly review_id: string;
  readonly review_text: string | null;
  readonly language: string | null;
  readonly posted_at: string;
}

export interface SentimentWorkerOptions {
  readonly batchSize?: number;
  readonly dryRun?: boolean;
}

export interface SentimentWorkerResult {
  readonly processed: number;
  readonly updated: number;
  readonly rejected_low_confidence: number;
  readonly rejected_no_text: number;
  readonly skipped_sampler: number;
  readonly cost_usd_estimated: number;
  readonly cost_usd_actual: number;
  readonly stopped_reason?: 'budget_exceeded' | 'no_pending_reviews' | 'batch_completed';
  readonly alert_threshold_reached: boolean;
}

async function defaultFetchPendingReviews(batchSize: number): Promise<PendingReview[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('str_reviews')
    .select('id, platform, listing_id, review_id, review_text, language, posted_at')
    .is('sentiment_score', null)
    .not('review_text', 'is', null)
    .order('posted_at', { ascending: false })
    .limit(batchSize);
  if (error) throw error;
  return (data ?? []) as PendingReview[];
}

async function defaultPersistResult(review: PendingReview, result: SentimentOutput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('str_reviews')
    .update({
      sentiment_score: result.sentiment,
      sentiment_confidence: result.confidence,
      sentiment_source_span: result.source_span,
      topics: result.topics,
    })
    .eq('id', review.id)
    .eq('posted_at', review.posted_at);
  if (error) throw error;
}

async function defaultCallModel(review: PendingReview): Promise<{
  object: SentimentOutput;
  usage: { inputTokens?: number; outputTokens?: number };
}> {
  const userPrompt = [
    `Plataforma: ${review.platform}`,
    `Idioma declarado: ${review.language ?? 'desconocido'}`,
    `Review:`,
    review.review_text ?? '',
  ].join('\n');

  const res = await generateObject({
    model: resolveModel('haiku'),
    schema: sentimentSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  return {
    object: res.object,
    usage: {
      ...(res.usage?.inputTokens !== undefined ? { inputTokens: res.usage.inputTokens } : {}),
      ...(res.usage?.outputTokens !== undefined ? { outputTokens: res.usage.outputTokens } : {}),
    },
  };
}

async function defaultCheckBudget(estimatedCostUsd: number) {
  const result = await preCheckBudget('anthropic', estimatedCostUsd);
  return {
    allowed: result.allowed,
    alertThresholdReached: result.alertThresholdReached,
  };
}

async function defaultRecordCost(costUsd: number): Promise<void> {
  await recordSpend('anthropic', costUsd);
}

function shouldSampleSkip(
  nodeEnv: string,
  random: () => number,
  rate: number = SENTIMENT_DEV_SAMPLE_RATE,
): boolean {
  if (nodeEnv === 'production') return false;
  return random() > rate;
}

function validateSourceSpan(span: string, reviewText: string | null): boolean {
  if (!reviewText) return false;
  if (span.length === 0) return true;
  // Constitutional AI guard: source_span debe ser fragmento literal del texto.
  // Tolerancia: case-insensitive y normalización de whitespace.
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(reviewText).includes(norm(span));
}

export async function processSentimentBatch(
  options: SentimentWorkerOptions = {},
  deps: SentimentWorkerDeps = {},
): Promise<SentimentWorkerResult> {
  const batchSize = options.batchSize ?? SENTIMENT_DEFAULT_BATCH_SIZE;
  const dryRun = options.dryRun ?? false;

  const fetchPendingReviews = deps.fetchPendingReviews ?? defaultFetchPendingReviews;
  const persistResult = deps.persistResult ?? defaultPersistResult;
  const callModel = deps.callModel ?? defaultCallModel;
  const checkBudget = deps.checkBudget ?? defaultCheckBudget;
  const recordCost = deps.recordCost ?? defaultRecordCost;
  const nodeEnv = deps.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const random = deps.random ?? Math.random;

  const reviews = await fetchPendingReviews(batchSize);
  if (reviews.length === 0) {
    return {
      processed: 0,
      updated: 0,
      rejected_low_confidence: 0,
      rejected_no_text: 0,
      skipped_sampler: 0,
      cost_usd_estimated: 0,
      cost_usd_actual: 0,
      stopped_reason: 'no_pending_reviews',
      alert_threshold_reached: false,
    };
  }

  let processed = 0;
  let updated = 0;
  let rejectedLowConfidence = 0;
  let rejectedNoText = 0;
  let skippedSampler = 0;
  let costEstimated = 0;
  let costActual = 0;
  let alertThresholdReached = false;
  let stoppedReason: SentimentWorkerResult['stopped_reason'] = 'batch_completed';

  for (const review of reviews) {
    if (!review.review_text || review.review_text.trim().length < 5) {
      rejectedNoText += 1;
      continue;
    }
    if (shouldSampleSkip(nodeEnv, random)) {
      skippedSampler += 1;
      continue;
    }

    let budgetCheck: { allowed: boolean; alertThresholdReached: boolean };
    try {
      budgetCheck = await checkBudget(ESTIMATED_COST_PER_CALL_USD);
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        stoppedReason = 'budget_exceeded';
        break;
      }
      throw err;
    }
    if (!budgetCheck.allowed) {
      stoppedReason = 'budget_exceeded';
      break;
    }
    if (budgetCheck.alertThresholdReached) {
      alertThresholdReached = true;
    }

    processed += 1;
    costEstimated += ESTIMATED_COST_PER_CALL_USD;

    let modelResult: {
      object: SentimentOutput;
      usage: { inputTokens?: number; outputTokens?: number };
    };
    try {
      modelResult = await callModel(review);
    } catch {
      rejectedLowConfidence += 1;
      continue;
    }

    const { object, usage } = modelResult;

    if (object.confidence < SENTIMENT_CONFIDENCE_THRESHOLD) {
      rejectedLowConfidence += 1;
      continue;
    }

    if (!validateSourceSpan(object.source_span, review.review_text)) {
      rejectedLowConfidence += 1;
      continue;
    }

    const actualCost = estimateCostUsd({
      model: ANTHROPIC_HAIKU_MODEL_ID,
      ...(usage.inputTokens !== undefined ? { tokensIn: usage.inputTokens } : {}),
      ...(usage.outputTokens !== undefined ? { tokensOut: usage.outputTokens } : {}),
    });
    costActual += actualCost;

    if (!dryRun) {
      await persistResult(review, object);
      if (actualCost > 0) {
        await recordCost(actualCost);
      }
    }
    updated += 1;
  }

  return {
    processed,
    updated,
    rejected_low_confidence: rejectedLowConfidence,
    rejected_no_text: rejectedNoText,
    skipped_sampler: skippedSampler,
    cost_usd_estimated: Math.round(costEstimated * 1_000_000) / 1_000_000,
    cost_usd_actual: Math.round(costActual * 1_000_000) / 1_000_000,
    stopped_reason: stoppedReason,
    alert_threshold_reached: alertThresholdReached,
  };
}
