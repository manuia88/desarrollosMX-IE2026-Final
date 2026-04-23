// Public REST API v1 — GET /api/v1/similar/[coloniaId].
// BLOQUE 11.M: usa findSimilarColonias (pgvector cosine) + cross-ref vibe tags
// + dmx_indices + zone-label-resolver. Fallback graceful si faltan embeddings.

import { extractApiKey, verifyApiKey } from '@/features/api-v1/lib/auth';
import { enforceRateLimitForTier } from '@/features/api-v1/lib/rate-limit-tier';
import {
  apiError,
  apiOptions,
  apiRateLimited,
  apiSuccess,
  getClientIp,
} from '@/features/api-v1/lib/responses';
import { similarColoniaDataSchema } from '@/features/api-v1/schemas/indices';
import type { ApiTier } from '@/features/api-v1/types';
import { findSimilarColonias } from '@/shared/lib/intelligence-engine/genome/similarity-engine';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const ENDPOINT = 'v1:similar';
const TOP_K = 5;

interface RouteContext {
  params: Promise<{ coloniaId: string }>;
}

export async function OPTIONS(): Promise<Response> {
  return apiOptions();
}

export async function GET(request: Request, ctx: RouteContext): Promise<Response> {
  const { coloniaId } = await ctx.params;
  if (!coloniaId) {
    return apiError('invalid_payload', 400, { message: 'Missing coloniaId' });
  }

  const rawKey = extractApiKey(request);
  const verified = await verifyApiKey(rawKey);
  const tier: ApiTier = verified?.tier ?? 'free';

  const rate = await enforceRateLimitForTier({
    tier,
    apiKeyId: verified?.apiKeyId ?? null,
    ip: getClientIp(request),
    endpoint: ENDPOINT,
  });
  if (!rate.allowed) return apiRateLimited(tier, rate.reset_at);

  const admin = createAdminClient();

  try {
    const results = await findSimilarColonias({
      coloniaId,
      supabase: admin,
      topN: TOP_K,
      minSimilarity: 0.7,
    });

    const payload =
      results.length === 0
        ? {
            items: [],
            source_colonia_id: coloniaId,
            note: 'no similar colonias found (embeddings pending or below threshold)',
          }
        : {
            items: results.map((r) => ({
              colonia_id: r.colonia_id,
              similarity: r.similarity,
              colonia_label: r.colonia_label,
              distance: r.distance,
              top_shared_vibe_tags: r.top_shared_vibe_tags.map((t) => ({
                vibe_tag_id: t.vibe_tag_id,
                weight_self: t.weight_self,
                weight_other: t.weight_other,
              })),
              top_dmx_indices: r.top_dmx_indices.map((d) => ({
                code: d.code,
                value: d.value,
              })),
            })),
            source_colonia_id: coloniaId,
          };

    const validated = similarColoniaDataSchema.safeParse(payload);
    if (!validated.success) {
      return apiError('internal_error', 500, { details: validated.error.flatten() });
    }
    return apiSuccess(validated.data, rate);
  } catch (err) {
    return apiError('internal_error', 500, {
      message: err instanceof Error ? err.message : 'similarity lookup failed',
    });
  }
}
