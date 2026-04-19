// Photo CV Worker — FASE 07b / BLOQUE 7b.H.
//
// Procesa fotos de str_photos_metadata cuyo cv_labels IS NULL llamando a
// Anthropic Vision (Haiku para mantener cost bajo) con prompt Constitutional
// AI (GC-7):
//   - Nunca inventar amenidades no visibles en la foto.
//   - Si confidence < 0.7 → skip sin actualizar.
//   - Quality dimensions: lighting, composition, resolution_ok.
//
// Cost cap: comparte api_budgets.anthropic con 7b.D sentiment ($100/mes prod).
// Sampler agresivo: 20% de fotos por listing — aplicado a nivel de fetch
// (LIMIT + ORDER BY random()). Resto skipped en query.
//
// Output:
//   - str_photos_metadata.cv_labels (jsonb amenities + room_type + quality dims).
//   - str_photos_metadata.cv_quality_score (NUMERIC 0-1).
//   - str_photos_metadata.cv_processed_at (timestamp).
// Aggregate downstream:
//   - str_listings.meta.photo_quality_avg (post-batch, opcional).

import { generateObject } from 'ai';
import { z } from 'zod';
import { resolveModel } from '@/shared/lib/ai/providers';
import { preCheckBudget, recordSpend } from '@/shared/lib/ingest/cost-tracker';
import { BudgetExceededError } from '@/shared/lib/ingest/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { estimateCostUsd } from '@/shared/lib/telemetry/events';

export const PHOTO_CV_CONFIDENCE_THRESHOLD = 0.7;
export const PHOTO_CV_DEFAULT_BATCH_SIZE = 20;
export const PHOTO_CV_PER_LISTING_SAMPLE_PCT = 0.2;
const ANTHROPIC_HAIKU_MODEL_ID = 'claude-haiku-4-5';

// Vision call estimated tokens: ~2K input (image bytes encoded) + 200 output.
// Haiku vision pricing: $0.80/$4.00 per MTok → ~$0.0024/call.
const ESTIMATED_COST_PER_CALL_USD = 0.0024;

const photoCvSchema = z.object({
  amenities: z
    .array(z.string().min(1).max(40))
    .max(20)
    .describe(
      'Amenities VISIBLES en la foto. Lista canónica: pool, hot_tub, kitchen, dishwasher, microwave, washer, dryer, ac, heating, fireplace, tv, wifi, workspace, parking, balcony, terrace, garden, gym, elevator, sea_view, mountain_view, city_view, garden_view, baby_crib, high_chair, soundproof, blackout_curtains, smart_lock. Solo incluir si CLARAMENTE visible.',
    ),
  room_type: z.enum([
    'bedroom',
    'bathroom',
    'kitchen',
    'living_room',
    'dining_room',
    'workspace',
    'balcony',
    'pool',
    'exterior',
    'lobby',
    'common_area',
    'unknown',
  ]),
  quality_dimensions: z.object({
    lighting: z.number().min(0).max(1).describe('0=muy pobre, 1=excelente'),
    composition: z.number().min(0).max(1).describe('0=pobre, 1=profesional'),
    resolution_ok: z.boolean().describe('true si nitidez aceptable'),
  }),
  overall_quality_score: z.number().min(0).max(1),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence en la clasificación. <0.7 → photo skipped.'),
});

export type PhotoCvOutput = z.infer<typeof photoCvSchema>;

const SYSTEM_PROMPT = [
  'Eres analista de calidad visual para fotos de listings short-term-rental.',
  'REGLAS INVIOLABLES (Constitutional AI GC-7):',
  '1. NUNCA inventes amenities que no aparezcan claramente en la foto.',
  '2. Si la foto es ambigua, oscura, recortada o irreconocible → confidence < 0.7.',
  '3. amenities solo desde la lista canónica del schema.',
  '4. quality_dimensions cuantitativas, no etiquetas verbales.',
  '5. overall_quality_score = ponderado de lighting (40%) + composition (40%) + (resolution_ok ? 0.2 : 0).',
].join('\n');

export interface PendingPhoto {
  readonly id: number;
  readonly platform: 'airbnb' | 'vrbo' | 'booking';
  readonly listing_id: string;
  readonly photo_url: string;
  readonly order_index: number;
}

export interface PhotoCvWorkerDeps {
  readonly fetchPendingPhotos?: (batchSize: number) => Promise<readonly PendingPhoto[]>;
  readonly persistResult?: (photo: PendingPhoto, result: PhotoCvOutput) => Promise<void>;
  readonly callModel?: (photo: PendingPhoto) => Promise<{
    object: PhotoCvOutput;
    usage: { inputTokens?: number; outputTokens?: number };
  }>;
  readonly checkBudget?: (
    estimatedCostUsd: number,
  ) => Promise<{ allowed: boolean; alertThresholdReached: boolean }>;
  readonly recordCost?: (costUsd: number) => Promise<void>;
  readonly applyListingSampler?: (
    photos: readonly PendingPhoto[],
    samplePct: number,
  ) => readonly PendingPhoto[];
  readonly nodeEnv?: string;
  readonly random?: () => number;
}

export interface PhotoCvWorkerOptions {
  readonly batchSize?: number;
  readonly samplePctPerListing?: number;
  readonly dryRun?: boolean;
}

export interface PhotoCvWorkerResult {
  readonly fetched: number;
  readonly sampled: number;
  readonly processed: number;
  readonly updated: number;
  readonly rejected_low_confidence: number;
  readonly cost_usd_estimated: number;
  readonly cost_usd_actual: number;
  readonly stopped_reason?: 'budget_exceeded' | 'no_pending_photos' | 'batch_completed';
  readonly alert_threshold_reached: boolean;
}

async function defaultFetchPendingPhotos(batchSize: number): Promise<PendingPhoto[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('str_photos_metadata')
    .select('id, platform, listing_id, photo_url, order_index')
    .is('cv_labels', null)
    .order('id', { ascending: true })
    .limit(batchSize);
  if (error) throw error;
  return (data ?? []) as PendingPhoto[];
}

async function defaultPersistResult(photo: PendingPhoto, result: PhotoCvOutput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('str_photos_metadata')
    .update({
      cv_labels: result as unknown as never,
      cv_quality_score: result.overall_quality_score,
      cv_processed_at: new Date().toISOString(),
    })
    .eq('id', photo.id);
  if (error) throw error;
}

async function defaultCallModel(photo: PendingPhoto): Promise<{
  object: PhotoCvOutput;
  usage: { inputTokens?: number; outputTokens?: number };
}> {
  const res = await generateObject({
    model: resolveModel('haiku'),
    schema: photoCvSchema,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', image: new URL(photo.photo_url) },
          { type: 'text', text: 'Analiza esta foto del listing.' },
        ],
      },
    ],
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

// Sampler 20% per listing: agrupa por listing_id, toma máx N=ceil(count*pct)
// fotos por listing. Orden estable por order_index para reproducibilidad.
export function defaultApplyListingSampler(
  photos: readonly PendingPhoto[],
  samplePct: number,
): readonly PendingPhoto[] {
  const byListing = new Map<string, PendingPhoto[]>();
  for (const photo of photos) {
    const key = `${photo.platform}:${photo.listing_id}`;
    const arr = byListing.get(key);
    if (arr) {
      arr.push(photo);
    } else {
      byListing.set(key, [photo]);
    }
  }

  const sampled: PendingPhoto[] = [];
  for (const [, listingPhotos] of byListing) {
    const sortedByIndex = [...listingPhotos].sort((a, b) => a.order_index - b.order_index);
    const takeCount = Math.max(1, Math.ceil(sortedByIndex.length * samplePct));
    sampled.push(...sortedByIndex.slice(0, takeCount));
  }
  return sampled;
}

export async function processPhotoCvBatch(
  options: PhotoCvWorkerOptions = {},
  deps: PhotoCvWorkerDeps = {},
): Promise<PhotoCvWorkerResult> {
  const batchSize = options.batchSize ?? PHOTO_CV_DEFAULT_BATCH_SIZE;
  const samplePct = options.samplePctPerListing ?? PHOTO_CV_PER_LISTING_SAMPLE_PCT;
  const dryRun = options.dryRun ?? false;

  const fetchPendingPhotos = deps.fetchPendingPhotos ?? defaultFetchPendingPhotos;
  const persistResult = deps.persistResult ?? defaultPersistResult;
  const callModel = deps.callModel ?? defaultCallModel;
  const checkBudget = deps.checkBudget ?? defaultCheckBudget;
  const recordCost = deps.recordCost ?? defaultRecordCost;
  const applyListingSampler = deps.applyListingSampler ?? defaultApplyListingSampler;

  const fetched = await fetchPendingPhotos(batchSize);
  if (fetched.length === 0) {
    return {
      fetched: 0,
      sampled: 0,
      processed: 0,
      updated: 0,
      rejected_low_confidence: 0,
      cost_usd_estimated: 0,
      cost_usd_actual: 0,
      stopped_reason: 'no_pending_photos',
      alert_threshold_reached: false,
    };
  }

  const sampled = applyListingSampler(fetched, samplePct);

  let processed = 0;
  let updated = 0;
  let rejectedLowConfidence = 0;
  let costEstimated = 0;
  let costActual = 0;
  let alertThresholdReached = false;
  let stoppedReason: PhotoCvWorkerResult['stopped_reason'] = 'batch_completed';

  for (const photo of sampled) {
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
      object: PhotoCvOutput;
      usage: { inputTokens?: number; outputTokens?: number };
    };
    try {
      modelResult = await callModel(photo);
    } catch {
      rejectedLowConfidence += 1;
      continue;
    }

    if (modelResult.object.confidence < PHOTO_CV_CONFIDENCE_THRESHOLD) {
      rejectedLowConfidence += 1;
      continue;
    }

    const actualCost = estimateCostUsd({
      model: ANTHROPIC_HAIKU_MODEL_ID,
      ...(modelResult.usage.inputTokens !== undefined
        ? { tokensIn: modelResult.usage.inputTokens }
        : {}),
      ...(modelResult.usage.outputTokens !== undefined
        ? { tokensOut: modelResult.usage.outputTokens }
        : {}),
    });
    costActual += actualCost;

    if (!dryRun) {
      await persistResult(photo, modelResult.object);
      if (actualCost > 0) {
        await recordCost(actualCost);
      }
    }
    updated += 1;
  }

  return {
    fetched: fetched.length,
    sampled: sampled.length,
    processed,
    updated,
    rejected_low_confidence: rejectedLowConfidence,
    cost_usd_estimated: Math.round(costEstimated * 1_000_000) / 1_000_000,
    cost_usd_actual: Math.round(costActual * 1_000_000) / 1_000_000,
    stopped_reason: stoppedReason,
    alert_threshold_reached: alertThresholdReached,
  };
}
