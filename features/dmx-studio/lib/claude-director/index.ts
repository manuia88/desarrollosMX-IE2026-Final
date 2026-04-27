// DMX Studio dentro DMX único entorno (ADR-054).
// Director creativo: orquesta narrativa video inmobiliario LATAM via @anthropic-ai/sdk.

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { sentry } from '@/shared/lib/telemetry/sentry';
import {
  COPY_PACK_SYSTEM_PROMPT_ES_MX,
  COPY_PACK_USER_PROMPT,
  DIRECTOR_MODEL,
  DIRECTOR_SYSTEM_PROMPT_ES_MX,
  HOOK_VARIANTS_SYSTEM_PROMPT_ES_MX,
  HOOK_VARIANTS_USER_PROMPT,
  NARRATION_SCRIPT_SYSTEM_PROMPT_ES_MX,
  NARRATION_SCRIPT_USER_PROMPT,
  USER_PROMPT_TEMPLATE,
} from './prompts';

let cachedClient: Anthropic | null = null;

export function getDirectorClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('claude-director: ANTHROPIC_API_KEY missing');
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export const PHOTO_CATEGORY_VALUES = [
  'sala',
  'cocina',
  'recamara',
  'bano',
  'fachada',
  'exterior',
  'plano',
] as const;

export const PhotoInputSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  category: z.enum(PHOTO_CATEGORY_VALUES),
});
export type PhotoInput = z.infer<typeof PhotoInputSchema>;

export const COUNTRY_VALUES = ['MX', 'CO', 'AR', 'BR', 'CL', 'US'] as const;

export const PropertyDataSchema = z.object({
  id: z.string().min(1),
  priceUsd: z.number().positive(),
  priceMxn: z.number().positive().optional(),
  areaM2: z.number().positive(),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  zone: z.string().min(1),
  city: z.string().min(1),
  country: z.enum(COUNTRY_VALUES),
});
export type PropertyData = z.infer<typeof PropertyDataSchema>;

export const CAMERA_MOVEMENT_VALUES = [
  'zoom_in',
  'pan_left',
  'pan_right',
  'tilt_up',
  'tilt_down',
  'none',
] as const;

export const KlingPromptSchema = z.object({
  sceneIndex: z.number().int().min(0),
  prompt: z.string().min(1),
  cameraMovement: z.enum(CAMERA_MOVEMENT_VALUES),
  durationSeconds: z.number().positive().max(20),
});
export type KlingPrompt = z.infer<typeof KlingPromptSchema>;

export const MoodMusicSchema = z.object({
  genre: z.string().min(1),
  tempo: z.string().min(1),
  prompt: z.string().min(1),
});
export type MoodMusic = z.infer<typeof MoodMusicSchema>;

export const CopyPackSchema = z.object({
  captionInstagram: z.string().min(1).max(2200),
  hashtags: z.array(z.string().min(1)).min(1).max(20),
  messageWhatsapp: z.string().min(1),
  descriptionPortal: z.string().min(1),
});
export type CopyPack = z.infer<typeof CopyPackSchema>;

export const DirectorOutputSchema = z.object({
  narrativeOrder: z.array(z.string().min(1)).min(1),
  klingPrompts: z.array(KlingPromptSchema).min(1),
  moodMusic: MoodMusicSchema,
  hooks: z.array(z.string().min(1)).length(3),
  copyPack: CopyPackSchema,
  narrationScript: z.string().min(1),
});
export type DirectorOutput = z.infer<typeof DirectorOutputSchema>;

export const AnalyzePhotosInputSchema = z.object({
  photos: z.array(PhotoInputSchema).min(1).max(20),
  propertyData: PropertyDataSchema,
});
export type AnalyzePhotosInput = z.infer<typeof AnalyzePhotosInputSchema>;

export const COPY_PACK_STYLE_VALUES = ['modern', 'luxury', 'family', 'investor'] as const;
export type CopyPackStyle = (typeof COPY_PACK_STYLE_VALUES)[number];

export const CopyPackOutputSchema = CopyPackSchema.extend({
  narrationScript: z.string().min(1),
});
export type CopyPackOutput = z.infer<typeof CopyPackOutputSchema>;

export const HookVariantsOutputSchema = z.object({
  hooks: z.array(z.string().min(1)).min(1).max(20),
});

export const NarrationScriptOutputSchema = z.object({
  script: z.string().min(1),
  estimatedSeconds: z.number().positive(),
});
export type NarrationScriptOutput = z.infer<typeof NarrationScriptOutputSchema>;

export type SceneType = 'static' | 'motion' | 'reveal';
export type RecommendedModel = 'kling' | 'seedance';

export interface SceneInput {
  index: number;
  type: SceneType;
}

export interface RoutedScene {
  index: number;
  recommendedModel: RecommendedModel;
}

export interface AnalyzePhotosOpts {
  client?: Anthropic;
}

export interface TestConnectionOpts {
  client?: Anthropic;
}

export interface TestConnectionResult {
  ok: boolean;
  accountActive: boolean;
  error?: string;
}

function stripCodeFences(raw: string): string {
  return raw.replace(/```json\s*|\s*```/g, '').trim();
}

function extractText(response: Anthropic.Message): string {
  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) {
    throw new Error('claude-director: no text block in response');
  }
  return textBlock.text;
}

function parseJsonStrict(raw: string): unknown {
  return JSON.parse(stripCodeFences(raw));
}

export async function analyzePhotos(
  input: AnalyzePhotosInput,
  opts: AnalyzePhotosOpts = {},
): Promise<DirectorOutput> {
  const parsedInput = AnalyzePhotosInputSchema.parse(input);
  const client = opts.client ?? getDirectorClient();

  try {
    const response = await client.messages.create({
      model: DIRECTOR_MODEL,
      max_tokens: 4000,
      system: DIRECTOR_SYSTEM_PROMPT_ES_MX,
      messages: [
        {
          role: 'user',
          content: USER_PROMPT_TEMPLATE(parsedInput.propertyData, parsedInput.photos),
        },
      ],
    });
    const text = extractText(response);
    const json = parseJsonStrict(text);
    return DirectorOutputSchema.parse(json);
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'studio-director', op: 'analyzePhotos', model: DIRECTOR_MODEL },
      extra: { propertyId: parsedInput.propertyData.id, photosCount: parsedInput.photos.length },
    });
    throw err;
  }
}

export async function generateCopyPack(
  propertyData: PropertyData,
  style: CopyPackStyle = 'modern',
  opts: AnalyzePhotosOpts = {},
): Promise<CopyPackOutput> {
  const parsedProperty = PropertyDataSchema.parse(propertyData);
  const client = opts.client ?? getDirectorClient();

  try {
    const response = await client.messages.create({
      model: DIRECTOR_MODEL,
      max_tokens: 1500,
      system: COPY_PACK_SYSTEM_PROMPT_ES_MX,
      messages: [
        {
          role: 'user',
          content: COPY_PACK_USER_PROMPT(parsedProperty, style),
        },
      ],
    });
    const text = extractText(response);
    const json = parseJsonStrict(text);
    return CopyPackOutputSchema.parse(json);
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'studio-director', op: 'generateCopyPack', model: DIRECTOR_MODEL },
      extra: { propertyId: parsedProperty.id, style },
    });
    throw err;
  }
}

export async function generateHookVariants(
  propertyData: PropertyData,
  count = 3,
  opts: AnalyzePhotosOpts = {},
): Promise<string[]> {
  const parsedProperty = PropertyDataSchema.parse(propertyData);
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error('claude-director: count must be integer between 1 and 20');
  }
  const client = opts.client ?? getDirectorClient();

  try {
    const response = await client.messages.create({
      model: DIRECTOR_MODEL,
      max_tokens: 800,
      system: HOOK_VARIANTS_SYSTEM_PROMPT_ES_MX,
      messages: [
        {
          role: 'user',
          content: HOOK_VARIANTS_USER_PROMPT(parsedProperty, count),
        },
      ],
    });
    const text = extractText(response);
    const json = parseJsonStrict(text);
    const parsed = HookVariantsOutputSchema.parse(json);
    return parsed.hooks;
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'studio-director', op: 'generateHookVariants', model: DIRECTOR_MODEL },
      extra: { propertyId: parsedProperty.id, count },
    });
    throw err;
  }
}

export async function generateNarrationScript(
  propertyData: PropertyData,
  maxChars = 600,
  opts: AnalyzePhotosOpts = {},
): Promise<NarrationScriptOutput> {
  const parsedProperty = PropertyDataSchema.parse(propertyData);
  if (!Number.isInteger(maxChars) || maxChars < 100 || maxChars > 5000) {
    throw new Error('claude-director: maxChars must be integer between 100 and 5000');
  }
  const client = opts.client ?? getDirectorClient();

  try {
    const response = await client.messages.create({
      model: DIRECTOR_MODEL,
      max_tokens: 1000,
      system: NARRATION_SCRIPT_SYSTEM_PROMPT_ES_MX,
      messages: [
        {
          role: 'user',
          content: NARRATION_SCRIPT_USER_PROMPT(parsedProperty, maxChars),
        },
      ],
    });
    const text = extractText(response);
    const json = parseJsonStrict(text);
    return NarrationScriptOutputSchema.parse(json);
  } catch (err) {
    sentry.captureException(err, {
      tags: {
        feature: 'studio-director',
        op: 'generateNarrationScript',
        model: DIRECTOR_MODEL,
      },
      extra: { propertyId: parsedProperty.id, maxChars },
    });
    throw err;
  }
}

// Seedance H2 Sprint 6 — H1 default kling all scenes (router stub).
export function routeModels(scenes: ReadonlyArray<SceneInput>): RoutedScene[] {
  return scenes.map((s) => ({ index: s.index, recommendedModel: 'kling' }));
}

export interface DirectorAnalysisAsset {
  readonly id: string;
  readonly storageUrl: string;
  readonly mimeType: string;
  readonly orderIndex: number;
  readonly spaceType: string | null;
}

export interface RunDirectorAnalysisInput {
  readonly projectId: string;
  readonly userId: string;
  readonly title: string;
  readonly projectType: string;
  readonly sourceMetadata: Record<string, unknown>;
  readonly styleTemplateKey: string;
  readonly assets: ReadonlyArray<DirectorAnalysisAsset>;
}

const VALID_PHOTO_CATEGORIES = new Set<string>([...PHOTO_CATEGORY_VALUES]);

function normalizeCategory(spaceType: string | null): (typeof PHOTO_CATEGORY_VALUES)[number] {
  if (spaceType && VALID_PHOTO_CATEGORIES.has(spaceType)) {
    return spaceType as (typeof PHOTO_CATEGORY_VALUES)[number];
  }
  return 'sala';
}

function pickPropertyData(input: RunDirectorAnalysisInput): PropertyData {
  const property = (input.sourceMetadata.property ?? {}) as Record<string, unknown>;
  const priceRaw = property['price'];
  const priceMxn =
    typeof priceRaw === 'number' && Number.isFinite(priceRaw) && priceRaw > 0 ? priceRaw : 0;
  const priceUsd = priceMxn > 0 ? Math.max(priceMxn / 17, 1000) : 1000;

  const areaRaw = property['area_m2'];
  const areaM2 =
    typeof areaRaw === 'number' && Number.isFinite(areaRaw) && areaRaw > 0 ? areaRaw : 60;

  const bedroomsRaw = property['bedrooms'];
  const bedrooms =
    typeof bedroomsRaw === 'number' && bedroomsRaw >= 0 && bedroomsRaw <= 20
      ? Math.floor(bedroomsRaw)
      : 2;

  const bathroomsRaw = property['bathrooms'];
  const bathrooms =
    typeof bathroomsRaw === 'number' && bathroomsRaw >= 0 && bathroomsRaw <= 20 ? bathroomsRaw : 1;

  const zoneRaw = property['zone'];
  const zone = typeof zoneRaw === 'string' && zoneRaw.length > 0 ? zoneRaw : 'Zona sin especificar';

  return {
    id: input.projectId,
    priceUsd,
    priceMxn: priceMxn > 0 ? priceMxn : undefined,
    areaM2,
    bedrooms,
    bathrooms,
    zone,
    city: typeof property['city'] === 'string' ? (property['city'] as string) : 'Ciudad de México',
    country: 'MX',
  };
}

export async function runDirectorAnalysis(
  input: RunDirectorAnalysisInput,
  opts: AnalyzePhotosOpts = {},
): Promise<DirectorOutput> {
  const photos: PhotoInput[] = input.assets.slice(0, 20).map((asset) => ({
    id: asset.id,
    url: asset.storageUrl.startsWith('http')
      ? asset.storageUrl
      : `https://storage.placeholder/${asset.storageUrl}`,
    category: normalizeCategory(asset.spaceType),
  }));

  const propertyData = pickPropertyData(input);

  return analyzePhotos({ photos, propertyData }, opts);
}

export async function testConnection(opts: TestConnectionOpts = {}): Promise<TestConnectionResult> {
  let client: Anthropic;
  try {
    client = opts.client ?? getDirectorClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return { ok: false, accountActive: false, error: message };
  }

  try {
    await client.messages.countTokens({
      model: DIRECTOR_MODEL,
      messages: [{ role: 'user', content: 'ping' }],
    });
    return { ok: true, accountActive: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    sentry.captureException(err, {
      tags: { feature: 'studio-director', op: 'testConnection', model: DIRECTOR_MODEL },
    });
    return { ok: false, accountActive: false, error: message };
  }
}
