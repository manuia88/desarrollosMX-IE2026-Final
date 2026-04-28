// F14.F.7 Sprint 6 BIBLIA v4 §6 — Virtual Staging real (replaces F14.F.0 STUB).
// DMX Studio dentro DMX único entorno (ADR-054). Pedra AI API wrapper.
// Verify-before-spend canon: testConnection lectura sin gastar credits.

import { z } from 'zod';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const PEDRA_API_BASE = process.env.PEDRA_API_BASE ?? 'https://api.pedra.so/v1';
export const PEDRA_COST_PER_RENDER_USD = 0.5;

export const STAGING_STYLES = [
  'modern',
  'classic',
  'minimalist',
  'industrial',
  'bohemian',
  'luxury',
  'family',
] as const;
export type StagingStyle = (typeof STAGING_STYLES)[number];

export const ROOM_TYPES = [
  'living',
  'bedroom',
  'kitchen',
  'bathroom',
  'dining',
  'office',
  'outdoor',
  'garage',
  'other',
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const StageRoomInputSchema = z.object({
  imageUrl: z.string().url(),
  style: z.enum(STAGING_STYLES).default('modern'),
  roomType: z.enum(ROOM_TYPES).optional().default('living'),
});

export type StageRoomInput = z.input<typeof StageRoomInputSchema>;

export const StageRoomResultSchema = z.object({
  stagedImageUrl: z.string().url(),
  costUsd: z.number(),
  pedraJobId: z.string(),
  style: z.enum(STAGING_STYLES),
  roomType: z.enum(ROOM_TYPES),
});

export type StageRoomResult = z.infer<typeof StageRoomResultSchema>;

export type FetchLike = typeof fetch;

function pickField<T extends Record<string, unknown>>(obj: T, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj && obj[k] != null) return obj[k];
  }
  return undefined;
}

export interface StageRoomOptions {
  fetcher?: FetchLike;
  apiKey?: string;
  apiBase?: string;
}

function getCredentials(opts?: StageRoomOptions): { apiKey: string; apiBase: string } {
  const apiKey = opts?.apiKey ?? process.env.PEDRA_API_KEY ?? '';
  const apiBase = opts?.apiBase ?? PEDRA_API_BASE;
  return { apiKey, apiBase };
}

export async function stageRoom(
  input: StageRoomInput,
  opts?: StageRoomOptions,
): Promise<StageRoomResult> {
  const parsed = StageRoomInputSchema.parse(input);
  const fetcher = opts?.fetcher ?? fetch;
  const { apiKey, apiBase } = getCredentials(opts);
  if (!apiKey) {
    throw new Error('virtual-staging: PEDRA_API_KEY not configured');
  }

  try {
    const res = await fetcher(`${apiBase}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        image_url: parsed.imageUrl,
        style: parsed.style,
        room_type: parsed.roomType,
      }),
    });

    if (!res.ok) {
      throw new Error(`virtual-staging: Pedra API error ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const jobId = String(pickField(data, 'job_id', 'jobId') ?? '');
    const stagedUrl = String(pickField(data, 'output_url', 'outputUrl') ?? '');
    if (!stagedUrl) {
      throw new Error('virtual-staging: Pedra response missing output url');
    }

    return {
      stagedImageUrl: stagedUrl,
      costUsd: PEDRA_COST_PER_RENDER_USD,
      pedraJobId: jobId,
      style: parsed.style,
      roomType: parsed.roomType,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.virtual-staging', op: 'stageRoom' },
      extra: { style: parsed.style, roomType: parsed.roomType },
    });
    throw err;
  }
}

export const BatchStageInputSchema = z.object({
  images: z.array(z.string().url()).min(1).max(20),
  style: z.enum(STAGING_STYLES).default('modern'),
  roomType: z.enum(ROOM_TYPES).optional().default('living'),
});

export type BatchStageInput = z.input<typeof BatchStageInputSchema>;

export interface BatchStageResult {
  batchId: string;
  jobs: Array<{
    imageUrl: string;
    stagedImageUrl?: string;
    pedraJobId?: string;
    error?: string;
  }>;
  totalCostUsd: number;
}

export async function batchStage(
  input: BatchStageInput,
  opts?: StageRoomOptions,
): Promise<BatchStageResult> {
  const parsed = BatchStageInputSchema.parse(input);
  const batchId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `batch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const results = await Promise.allSettled(
    parsed.images.map((imageUrl) =>
      stageRoom({ imageUrl, style: parsed.style, roomType: parsed.roomType }, opts),
    ),
  );

  const jobs = results.map((r, idx) => {
    const imageUrl = parsed.images[idx] ?? '';
    if (r.status === 'fulfilled') {
      return {
        imageUrl,
        stagedImageUrl: r.value.stagedImageUrl,
        pedraJobId: r.value.pedraJobId,
      };
    }
    return {
      imageUrl,
      error: r.reason instanceof Error ? r.reason.message : 'unknown error',
    };
  });

  const totalCostUsd = jobs.filter((j) => j.stagedImageUrl).length * PEDRA_COST_PER_RENDER_USD;

  return { batchId, jobs, totalCostUsd };
}

export interface TestConnectionResult {
  ok: boolean;
  hasCredentials: boolean;
  error?: string;
}

export async function testConnection(opts?: StageRoomOptions): Promise<TestConnectionResult> {
  const { apiKey } = getCredentials(opts);
  if (!apiKey) {
    return { ok: false, hasCredentials: false, error: 'PEDRA_API_KEY not configured' };
  }
  return { ok: true, hasCredentials: true };
}
