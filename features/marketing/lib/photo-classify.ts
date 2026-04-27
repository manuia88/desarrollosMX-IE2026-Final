import Anthropic from '@anthropic-ai/sdk';
import { PHOTO_CATEGORIES, type PhotoCategory } from '@/features/marketing/schemas/photos';
import { sentry } from '@/shared/lib/telemetry/sentry';

const MODEL = 'claude-haiku-4-5';

const SYSTEM_PROMPT_ES = `Eres un clasificador de fotografías inmobiliarias para México.
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
  category: PhotoCategory;
  confidence: number;
}

const responseShape = (raw: string): ClassifyPhotoResult => {
  const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
  const parsed = JSON.parse(cleaned) as { category?: string; confidence?: number };
  const category = parsed.category;
  const confidence = parsed.confidence;
  if (
    !category ||
    !(PHOTO_CATEGORIES as readonly string[]).includes(category) ||
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new Error(`photo-classify: invalid LLM response: ${raw.slice(0, 200)}`);
  }
  return {
    category: category as PhotoCategory,
    confidence: Math.round(confidence * 100) / 100,
  };
};

export async function classifyPhoto(
  args: ClassifyPhotoArgs,
  client?: Anthropic,
): Promise<ClassifyPhotoResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  if (!apiKey && !client) {
    throw new Error('photo-classify: ANTHROPIC_API_KEY missing');
  }

  const anthropic = client ?? new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 100,
      system: SYSTEM_PROMPT_ES,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: args.imageUrl,
              },
            },
            {
              type: 'text',
              text: USER_PROMPT_ES,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) {
      throw new Error('photo-classify: no text block in response');
    }
    return responseShape(textBlock.text);
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'photo-classify', model: MODEL },
      extra: { imageUrl: args.imageUrl.slice(0, 200) },
    });
    throw err;
  }
}
