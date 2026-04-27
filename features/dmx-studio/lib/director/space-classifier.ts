// FASE 14.F.2 Sprint 1 — DMX Studio space classifier (server-only).
// Bridges existing Vision wrapper (features/dmx-studio/lib/vision) with
// studio_video_assets.ai_classification jsonb. Called from
// trpc.studio.projects.classifyAsset to keep client free of admin client.

import {
  type StudioPhotoCategory,
  classifyPhoto as visionClassifyPhoto,
} from '@/features/dmx-studio/lib/vision';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const STUDIO_DIRECTOR_SPACE_TYPES = [
  'sala',
  'cocina',
  'recamara',
  'bano',
  'fachada',
  'exterior',
  'plano',
  'terraza',
  'amenidad',
  'otro',
] as const;
export type StudioDirectorSpaceType = (typeof STUDIO_DIRECTOR_SPACE_TYPES)[number];

export interface ClassifyAssetArgs {
  readonly storagePath: string;
  readonly assetId: string;
  readonly userId: string;
  readonly bucket?: string;
}

export interface ClassifyAssetResult {
  readonly spaceType: StudioDirectorSpaceType;
  readonly confidence: number;
  readonly source: 'vision';
}

const VISION_TO_DIRECTOR: Record<StudioPhotoCategory, StudioDirectorSpaceType> = {
  sala: 'sala',
  cocina: 'cocina',
  recamara: 'recamara',
  bano: 'bano',
  fachada: 'fachada',
  exterior: 'exterior',
  plano: 'plano',
};

const DEFAULT_BUCKET = 'studio-project-assets';

async function resolveImageUrl(
  supabase: ReturnType<typeof createAdminClient>,
  bucket: string,
  storagePath: string,
): Promise<string> {
  if (/^https?:\/\//i.test(storagePath)) {
    return storagePath;
  }
  const { data: signed, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 600);
  if (error || !signed?.signedUrl) {
    throw new Error(
      `space-classifier: createSignedUrl failed for ${bucket}/${storagePath}: ${error?.message ?? 'unknown'}`,
    );
  }
  return signed.signedUrl;
}

export async function classifyAsset(args: ClassifyAssetArgs): Promise<ClassifyAssetResult> {
  const bucket = args.bucket ?? DEFAULT_BUCKET;
  const supabase = createAdminClient();
  const imageUrl = await resolveImageUrl(supabase, bucket, args.storagePath);

  let visionResult: { category: StudioPhotoCategory; confidence: number };
  try {
    visionResult = await visionClassifyPhoto({ imageUrl });
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.director', op: 'classifyAsset' },
      extra: { assetId: args.assetId, userId: args.userId },
    });
    throw err;
  }

  const mapped = VISION_TO_DIRECTOR[visionResult.category] ?? 'otro';
  const result: ClassifyAssetResult = {
    spaceType: mapped,
    confidence: visionResult.confidence,
    source: 'vision',
  };

  const { error: updateErr } = await supabase
    .from('studio_video_assets')
    .update({
      ai_classification: {
        space_type: result.spaceType,
        confidence: result.confidence,
        source: result.source,
        classified_at: new Date().toISOString(),
      },
    })
    .eq('id', args.assetId)
    .eq('user_id', args.userId);

  if (updateErr) {
    sentry.captureException(updateErr, {
      tags: { feature: 'dmx-studio.director', op: 'classifyAsset.update' },
      extra: { assetId: args.assetId, userId: args.userId },
    });
    throw new Error(`space-classifier: update failed: ${updateErr.message}`);
  }

  return result;
}

export const STUDIO_DIRECTOR_NARRATIVE_ORDER: readonly StudioDirectorSpaceType[] = [
  'fachada',
  'sala',
  'cocina',
  'recamara',
  'bano',
  'terraza',
  'exterior',
  'amenidad',
  'plano',
  'otro',
];

export interface SmartOrderItem {
  readonly assetId: string;
  readonly spaceType: StudioDirectorSpaceType | null;
  readonly orderIndex: number;
}

export function suggestNarrativeOrder(items: readonly SmartOrderItem[]): readonly string[] {
  const buckets = new Map<StudioDirectorSpaceType | 'unclassified', SmartOrderItem[]>();
  for (const item of items) {
    const key: StudioDirectorSpaceType | 'unclassified' = item.spaceType ?? 'unclassified';
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }
  for (const [, list] of buckets) {
    list.sort((a, b) => a.orderIndex - b.orderIndex);
  }
  const ordered: string[] = [];
  for (const space of STUDIO_DIRECTOR_NARRATIVE_ORDER) {
    const list = buckets.get(space);
    if (list) {
      for (const item of list) ordered.push(item.assetId);
    }
  }
  const unclassified = buckets.get('unclassified');
  if (unclassified) {
    for (const item of unclassified) ordered.push(item.assetId);
  }
  return ordered;
}
