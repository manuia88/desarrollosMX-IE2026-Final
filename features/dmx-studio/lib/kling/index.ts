// DMX Studio dentro DMX único entorno (ADR-054). Kling 3.0/2.1 wrapper Replicate.
// Verify-before-spend canon: testConnection usa lectura models.list() sin gastar credits.

import Replicate from 'replicate';
import { z } from 'zod';
import { sentry } from '@/shared/lib/telemetry/sentry';
import {
  DEFAULT_KLING_MODEL,
  KLING_COST_PER_SECOND_USD,
  KLING_DEFAULT_ASPECT_RATIO,
  KLING_DEFAULT_DURATION_SECONDS,
} from './config';

let cachedClient: Replicate | null = null;

export function getReplicateClient(): Replicate {
  if (cachedClient) return cachedClient;
  const token = process.env.REPLICATE_API_TOKEN ?? '';
  cachedClient = new Replicate({ auth: token });
  return cachedClient;
}

export const GenerateVideoFromImageInputSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().min(1).max(2000),
  cameraMovement: z
    .enum(['none', 'pan_left', 'pan_right', 'zoom_in', 'zoom_out', 'tilt_up', 'tilt_down'])
    .optional()
    .default('none'),
  durationSeconds: z
    .number()
    .int()
    .min(3)
    .max(10)
    .optional()
    .default(KLING_DEFAULT_DURATION_SECONDS),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default(KLING_DEFAULT_ASPECT_RATIO),
  model: z.string().optional(),
});

export type GenerateVideoFromImageInput = z.input<typeof GenerateVideoFromImageInputSchema>;

export const GenerateVideoResultSchema = z.object({
  videoUrl: z.string().url(),
  durationSeconds: z.number(),
  costUsd: z.number(),
  model: z.string(),
  requestId: z.string(),
});

export type GenerateVideoResult = z.infer<typeof GenerateVideoResultSchema>;

type ReplicateModelIdentifier = `${string}/${string}` | `${string}/${string}:${string}`;

function isModelIdentifier(value: string): value is ReplicateModelIdentifier {
  return /^[^/]+\/[^/]+(:[^/]+)?$/.test(value);
}

function pickVideoUrl(output: unknown): string | null {
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    const first = output[0];
    if (typeof first === 'string') return first;
  }
  if (output && typeof output === 'object') {
    const maybe = output as { url?: unknown };
    if (typeof maybe.url === 'string') return maybe.url;
  }
  return null;
}

export async function generateVideoFromImage(
  input: GenerateVideoFromImageInput,
  opts?: { client?: Replicate },
): Promise<GenerateVideoResult> {
  const parsed = GenerateVideoFromImageInputSchema.parse(input);
  const client = opts?.client ?? getReplicateClient();
  const modelSlug = parsed.model ?? DEFAULT_KLING_MODEL;
  if (!isModelIdentifier(modelSlug)) {
    throw new Error(`kling: invalid model identifier "${modelSlug}"`);
  }

  const replicateInput: Record<string, unknown> = {
    image: parsed.imageUrl,
    prompt: parsed.prompt,
    duration: parsed.durationSeconds,
    aspect_ratio: parsed.aspectRatio,
  };
  if (parsed.cameraMovement !== 'none') {
    replicateInput.camera_movement = parsed.cameraMovement;
  }

  try {
    const output = await client.run(modelSlug, { input: replicateInput });
    const videoUrl = pickVideoUrl(output);
    if (!videoUrl) {
      throw new Error('kling: replicate output did not include a video url');
    }
    const requestId = `kling_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return {
      videoUrl,
      durationSeconds: parsed.durationSeconds,
      costUsd: Math.round(parsed.durationSeconds * KLING_COST_PER_SECOND_USD * 100) / 100,
      model: modelSlug,
      requestId,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.kling', op: 'generateVideoFromImage' },
      extra: { model: modelSlug, durationSeconds: parsed.durationSeconds },
    });
    throw err;
  }
}

export async function testConnection(opts?: {
  client?: Replicate;
}): Promise<{ ok: boolean; modelsAvailable?: number; error?: string }> {
  const client = opts?.client ?? getReplicateClient();
  try {
    const page = await client.models.list();
    return { ok: true, modelsAvailable: page.results.length };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.kling', op: 'testConnection' },
    });
    const message = err instanceof Error ? err.message : 'unknown error';
    return { ok: false, error: message };
  }
}
