// F14.F.7 Sprint 6 BIBLIA v4 §6 — Seedance video con audio ambiente nativo (Tarea 6.1).
// DMX Studio dentro DMX único entorno (ADR-054). Specific module para Seedance via fal-gateway.

import { z } from 'zod';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { DEFAULT_SEEDANCE_MODEL, getFalClient } from './index';
import type { FalClient } from '@fal-ai/client';

export const SEEDANCE_COST_PER_SECOND_USD = 0.08;

export const GenerateSeedanceClipInputSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().min(1).max(2000),
  audioContext: z
    .enum([
      'kitchen',
      'outdoor_garden',
      'urban_downtown',
      'ocean_view',
      'fireplace_cozy',
      'park_kids',
      'rooftop_wind',
      'pool_water',
      'rain_window',
      'cafe_chatter',
      'forest_morning',
      'office_open',
      'auto',
    ])
    .optional()
    .default('auto'),
  durationSeconds: z.number().int().min(3).max(10).optional().default(5),
  resolution: z.enum(['720p', '1080p', '4k']).optional().default('1080p'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9'),
  refs: z.array(z.string().url()).max(12).optional(),
  multiShot: z.boolean().optional().default(false),
});

export type GenerateSeedanceClipInput = z.input<typeof GenerateSeedanceClipInputSchema>;

export const SeedanceClipResultSchema = z.object({
  videoUrl: z.string().url(),
  durationSeconds: z.number(),
  hasNativeAudio: z.literal(true),
  costUsd: z.number(),
  requestId: z.string(),
  model: z.string(),
});

export type SeedanceClipResult = z.infer<typeof SeedanceClipResultSchema>;

function pickVideoUrl(output: unknown): string | null {
  if (!output || typeof output !== 'object') return null;
  const maybe = output as { video?: { url?: string }; videos?: Array<{ url?: string }> };
  if (typeof maybe.video?.url === 'string') return maybe.video.url;
  if (Array.isArray(maybe.videos) && typeof maybe.videos[0]?.url === 'string') {
    return maybe.videos[0].url;
  }
  return null;
}

function buildPrompt(parsed: z.infer<typeof GenerateSeedanceClipInputSchema>): string {
  if (parsed.audioContext === 'auto') return parsed.prompt;
  const audioHint: Record<string, string> = {
    kitchen: 'with subtle kitchen ambient sounds',
    outdoor_garden: 'with garden birds and gentle wind',
    urban_downtown: 'with downtown urban ambient sounds',
    ocean_view: 'with ocean waves background ambient',
    fireplace_cozy: 'with crackling fireplace ambient',
    park_kids: 'with distant park family sounds',
    rooftop_wind: 'with rooftop wind ambient',
    pool_water: 'with gentle pool water ambient',
    rain_window: 'with rain on window ambient',
    cafe_chatter: 'with cafe ambient sounds',
    forest_morning: 'with forest morning ambient',
    office_open: 'with subtle office ambient',
  };
  return `${parsed.prompt}, ${audioHint[parsed.audioContext] ?? ''}`;
}

export interface GenerateClipOptions {
  client?: FalClient;
}

export async function generateVideoWithAudio(
  input: GenerateSeedanceClipInput,
  opts?: GenerateClipOptions,
): Promise<SeedanceClipResult> {
  const parsed = GenerateSeedanceClipInputSchema.parse(input);
  const client = opts?.client ?? getFalClient();

  const falInput: Record<string, unknown> = {
    prompt: buildPrompt(parsed),
    image_url: parsed.imageUrl,
    duration: String(parsed.durationSeconds),
    resolution: parsed.resolution,
    aspect_ratio: parsed.aspectRatio,
  };

  if (parsed.refs && parsed.refs.length > 0) {
    falInput.reference_image_urls = parsed.refs;
  }
  if (parsed.multiShot) {
    falInput.multi_shot_mode = true;
  }

  try {
    const result = await client.subscribe(DEFAULT_SEEDANCE_MODEL, {
      input: falInput as never,
      logs: true,
    });
    const videoUrl = pickVideoUrl(result.data);
    if (!videoUrl) {
      throw new Error('seedance: fal output did not include a video url');
    }
    const cost = Math.round(parsed.durationSeconds * SEEDANCE_COST_PER_SECOND_USD * 1000) / 1000;
    return {
      videoUrl,
      durationSeconds: parsed.durationSeconds,
      hasNativeAudio: true,
      costUsd: cost,
      requestId: result.requestId,
      model: DEFAULT_SEEDANCE_MODEL,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.fal-gateway.seedance', op: 'generateVideoWithAudio' },
      extra: { durationSeconds: parsed.durationSeconds, multiShot: parsed.multiShot },
    });
    throw err;
  }
}
