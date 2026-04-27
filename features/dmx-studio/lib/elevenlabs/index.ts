// DMX Studio dentro DMX único entorno (ADR-054). ElevenLabs wrapper canon (TTS + Music + Voice clone).
// Verify-before-spend canon: testConnection lee user.get() sin gastar credits.
// Voice cloning gated por FEATURE_FLAGS.ELEVENLABS_VOICE_CLONE_ENABLED (default false hasta primer cliente Pro).

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { z } from 'zod';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { FEATURE_FLAGS } from '../feature-flags';
import {
  type CanonVoice,
  DEFAULT_VOICE_ID_ES_MX,
  ELEVENLABS_CANON_VOICES_ES_MX,
} from './voices-canon';

let cachedClient: ElevenLabsClient | null = null;

export function getElevenLabsClient(): ElevenLabsClient {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  cachedClient = new ElevenLabsClient({ apiKey });
  return cachedClient;
}

// Cost ref ElevenLabs Flash v2.5 ~$0.30 per 1k chars, multilingual ~$0.60 per 1k.
const ELEVENLABS_COST_PER_1K_CHARS_USD: Readonly<Record<string, number>> = {
  eleven_flash_v2_5: 0.3,
  eleven_multilingual_v2: 0.6,
  eleven_turbo_v2_5: 0.3,
} as const;

export const GenerateSpeechInputSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().optional(),
  modelId: z
    .enum(['eleven_flash_v2_5', 'eleven_multilingual_v2', 'eleven_turbo_v2_5'])
    .optional()
    .default('eleven_flash_v2_5'),
  languageCode: z.string().optional().default('es'),
  outputFormat: z
    .enum(['mp3_44100_128', 'mp3_22050_32', 'pcm_16000'])
    .optional()
    .default('mp3_44100_128'),
});

export type GenerateSpeechInput = z.input<typeof GenerateSpeechInputSchema>;

export const GenerateSpeechResultSchema = z.object({
  audioBuffer: z.custom<Uint8Array>((value) => value instanceof Uint8Array, {
    message: 'expected Uint8Array',
  }),
  durationSecondsEstimate: z.number(),
  costUsd: z.number(),
});

export interface GenerateSpeechResult {
  audioBuffer: Uint8Array;
  durationSecondsEstimate: number;
  costUsd: number;
}

export const GenerateMusicInputSchema = z.object({
  prompt: z.string().min(1).max(1000),
  durationSeconds: z.number().int().min(5).max(300),
  genre: z.string().optional(),
});

export type GenerateMusicInput = z.infer<typeof GenerateMusicInputSchema>;

export const CloneVoiceInputSchema = z.object({
  name: z.string().min(1).max(100),
  audioSampleUrls: z.array(z.string().url()).min(1).max(5),
});

export type CloneVoiceInput = z.infer<typeof CloneVoiceInputSchema>;

async function readableStreamToUint8Array(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let done = false;
  while (!done) {
    const result = await reader.read();
    done = result.done;
    if (result.value) {
      chunks.push(result.value);
      total += result.value.byteLength;
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

export async function generateSpeech(
  input: GenerateSpeechInput,
  opts?: { client?: ElevenLabsClient },
): Promise<GenerateSpeechResult> {
  const parsed = GenerateSpeechInputSchema.parse(input);
  const client = opts?.client ?? getElevenLabsClient();
  const voiceId = parsed.voiceId ?? DEFAULT_VOICE_ID_ES_MX;

  try {
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text: parsed.text,
      modelId: parsed.modelId,
      languageCode: parsed.languageCode,
      outputFormat: parsed.outputFormat,
    });
    const audioBuffer = await readableStreamToUint8Array(audioStream);
    const costPer1k = ELEVENLABS_COST_PER_1K_CHARS_USD[parsed.modelId] ?? 0.3;
    const costUsd = Math.round((parsed.text.length / 1000) * costPer1k * 10000) / 10000;
    // Heurística aprox: 15 chars ≈ 1s speech a ritmo natural ES.
    const durationSecondsEstimate = Math.round((parsed.text.length / 15) * 10) / 10;
    return { audioBuffer, durationSecondsEstimate, costUsd };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.elevenlabs', op: 'generateSpeech', model: parsed.modelId },
      extra: { textLength: parsed.text.length, voiceId },
    });
    throw err;
  }
}

export async function generateMusic(
  input: GenerateMusicInput,
  opts?: { client?: ElevenLabsClient },
): Promise<{ audioBuffer: Uint8Array; durationSeconds: number }> {
  const parsed = GenerateMusicInputSchema.parse(input);
  const client = opts?.client ?? getElevenLabsClient();

  try {
    // ElevenLabs Music API path (v2 SDK): client.music.compose. Verify F14.F.X migration when SDK upgrades.
    const composeRequest: { prompt: string; musicLengthMs: number } = {
      prompt: parsed.genre ? `${parsed.prompt} (genre: ${parsed.genre})` : parsed.prompt,
      musicLengthMs: parsed.durationSeconds * 1000,
    };
    const audioStream = await client.music.compose(
      composeRequest as unknown as Parameters<typeof client.music.compose>[0],
    );
    const audioBuffer = await readableStreamToUint8Array(audioStream);
    return { audioBuffer, durationSeconds: parsed.durationSeconds };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.elevenlabs', op: 'generateMusic' },
      extra: { durationSeconds: parsed.durationSeconds },
    });
    throw err;
  }
}

export async function cloneVoice(
  input: CloneVoiceInput,
  opts?: { client?: ElevenLabsClient },
): Promise<{ voiceId: string; status: string; qualityScore?: number }> {
  if (!FEATURE_FLAGS.ELEVENLABS_VOICE_CLONE_ENABLED) {
    throw new Error(
      'Voice cloning disabled. Activable cuando primer cliente Pro suscribe (ElevenLabs Starter $5/mes requerido).',
    );
  }
  const parsed = CloneVoiceInputSchema.parse(input);
  const client = opts?.client ?? getElevenLabsClient();

  try {
    const fileBlobs = await Promise.all(
      parsed.audioSampleUrls.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`cloneVoice: failed to fetch sample ${url} (${res.status})`);
        }
        return res.blob();
      }),
    );
    const created = await client.voices.ivc.create({
      name: parsed.name,
      files: fileBlobs as unknown as Parameters<typeof client.voices.ivc.create>[0]['files'],
    });
    const result = created as {
      voiceId?: string;
      voice_id?: string;
      requiresVerification?: boolean;
    };
    const voiceId = result.voiceId ?? result.voice_id ?? '';
    if (!voiceId) {
      throw new Error('cloneVoice: ElevenLabs response missing voiceId');
    }
    return { voiceId, status: result.requiresVerification ? 'pending_verification' : 'ready' };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.elevenlabs', op: 'cloneVoice' },
      extra: { name: parsed.name, samples: parsed.audioSampleUrls.length },
    });
    throw err;
  }
}

export async function testConnection(opts?: { client?: ElevenLabsClient }): Promise<{
  ok: boolean;
  subscriptionTier?: string;
  characterBalance?: number;
  voiceCloneAvailable?: boolean;
  error?: string;
}> {
  const client = opts?.client ?? getElevenLabsClient();
  try {
    const user = await client.user.get();
    const sub = user.subscription;
    const tier = sub?.tier ?? 'unknown';
    const charCount = typeof sub?.characterCount === 'number' ? sub.characterCount : 0;
    const charLimit = typeof sub?.characterLimit === 'number' ? sub.characterLimit : 0;
    const balance = Math.max(charLimit - charCount, 0);
    return {
      ok: true,
      subscriptionTier: tier,
      characterBalance: balance,
      voiceCloneAvailable: FEATURE_FLAGS.ELEVENLABS_VOICE_CLONE_ENABLED,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.elevenlabs', op: 'testConnection' },
    });
    const message = err instanceof Error ? err.message : 'unknown error';
    return { ok: false, error: message };
  }
}

export async function getCanonVoices(): Promise<readonly CanonVoice[]> {
  return ELEVENLABS_CANON_VOICES_ES_MX;
}
