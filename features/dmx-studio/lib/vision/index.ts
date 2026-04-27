// DMX Studio dentro DMX único entorno (ADR-054).
// Vision wrapper Studio: reusa pattern F14.C marketing/photo-classify (mismo SDK + key).

import Anthropic from '@anthropic-ai/sdk';
import { sentry } from '@/shared/lib/telemetry/sentry';

export {
  type ClassifyPhotoArgs,
  type ClassifyPhotoResult,
  classifyPhoto,
} from '@/features/marketing/lib/photo-classify';

const VISION_MODEL = 'claude-haiku-4-5';

let cachedClient: Anthropic | null = null;

function getVisionClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('studio-vision: ANTHROPIC_API_KEY missing');
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export interface TestConnectionOpts {
  client?: Anthropic;
}

export interface TestConnectionResult {
  ok: boolean;
  error?: string;
}

export async function testConnection(opts: TestConnectionOpts = {}): Promise<TestConnectionResult> {
  let client: Anthropic;
  try {
    client = opts.client ?? getVisionClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return { ok: false, error: message };
  }

  try {
    await client.messages.countTokens({
      model: VISION_MODEL,
      messages: [{ role: 'user', content: 'ping' }],
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    sentry.captureException(err, {
      tags: { feature: 'studio-vision', op: 'testConnection', model: VISION_MODEL },
    });
    return { ok: false, error: message };
  }
}
