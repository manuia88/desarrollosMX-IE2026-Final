// DMX Studio dentro DMX único entorno (ADR-054).
// Vision wrapper Studio: clasificador fotos inmobiliarias para LATAM.
// Independiente de marketing/photo-classify (canon zero imports cross-feature)
// para permitir evolución divergente (e.g. drone/aerial categories Sprint 6).

import Anthropic from '@anthropic-ai/sdk';
import { sentry } from '@/shared/lib/telemetry/sentry';

const VISION_MODEL = 'claude-haiku-4-5';

export const STUDIO_PHOTO_CATEGORIES = [
  'sala',
  'cocina',
  'recamara',
  'bano',
  'fachada',
  'exterior',
  'plano',
] as const;

export type StudioPhotoCategory = (typeof STUDIO_PHOTO_CATEGORIES)[number];

const SYSTEM_PROMPT_ES = `Eres un clasificador de fotografías inmobiliarias para LATAM.
Tu tarea: clasificar UNA foto en exactamente una de estas 7 categorías canon:
- sala (living/family/lobby/recepción)
- cocina (kitchen, isla, área de comer integrada)
- recamara (bedroom, suite principal o secundaria)
- bano (baño, half-bath, bath master)
- fachada (vista exterior frontal del edificio o casa)
- exterior (jardín, patio, alberca, terraza, vista exterior secundaria)
- plano (planos 2D, layouts, blueprints, isometrías técnicas)

Respondes EXCLUSIVAMENTE JSON con esta forma:
{"category": "<una de las 7>", "confidence": <number 0..1>}

NO incluyas explicación adicional, solo el JSON.`;

const USER_PROMPT_ES = 'Clasifica esta foto en una de las 7 categorías canon.';

export interface ClassifyPhotoArgs {
  imageUrl: string;
}

export interface ClassifyPhotoResult {
  category: StudioPhotoCategory;
  confidence: number;
}

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

const parseResponse = (raw: string): ClassifyPhotoResult => {
  const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
  const parsed = JSON.parse(cleaned) as { category?: string; confidence?: number };
  const category = parsed.category;
  const confidence = parsed.confidence;
  if (
    !category ||
    !(STUDIO_PHOTO_CATEGORIES as readonly string[]).includes(category) ||
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new Error(`studio-vision: invalid response: ${raw.slice(0, 200)}`);
  }
  return {
    category: category as StudioPhotoCategory,
    confidence: Math.round(confidence * 100) / 100,
  };
};

export async function classifyPhoto(
  args: ClassifyPhotoArgs,
  client?: Anthropic,
): Promise<ClassifyPhotoResult> {
  const visionClient = client ?? getVisionClient();
  try {
    const response = await visionClient.messages.create({
      model: VISION_MODEL,
      max_tokens: 100,
      system: SYSTEM_PROMPT_ES,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: args.imageUrl } },
            { type: 'text', text: USER_PROMPT_ES },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) {
      throw new Error('studio-vision: no text block in response');
    }
    return parseResponse(textBlock.text);
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'studio-vision', model: VISION_MODEL },
      extra: { imageUrl: args.imageUrl.slice(0, 200) },
    });
    throw err;
  }
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
