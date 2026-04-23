// Public REST API v1 — GET /api/v1/similar/[coloniaId].
// Returns top-5 nearest colonias by cosine similarity of colonia_dna_vectors.
// Stub: if vectors unavailable/empty, returns empty list + note. Does NOT fake.

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
import { createAdminClient } from '@/shared/lib/supabase/admin';

const ENDPOINT = 'v1:similar';
const TOP_K = 5;

interface RouteContext {
  params: Promise<{ coloniaId: string }>;
}

export async function OPTIONS(): Promise<Response> {
  return apiOptions();
}

function parseVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    const arr = raw.map((x) => Number(x));
    if (arr.every((x) => Number.isFinite(x))) return arr;
    return null;
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/^\[/, '').replace(/\]$/, '');
  if (!trimmed) return null;
  const parts = trimmed.split(',').map((s) => Number.parseFloat(s.trim()));
  if (parts.some((x) => Number.isNaN(x))) return null;
  return parts;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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

  const { data: sourceRow, error: sourceError } = await admin
    .from('colonia_dna_vectors')
    .select('colonia_id, vector, country_code')
    .eq('colonia_id', coloniaId)
    .maybeSingle();

  if (sourceError) {
    const payload = {
      items: [],
      source_colonia_id: coloniaId,
      note: 'colonia_dna_vectors unavailable (H2 pending)',
    };
    const validated = similarColoniaDataSchema.safeParse(payload);
    if (!validated.success) {
      return apiError('internal_error', 500, { details: validated.error.flatten() });
    }
    return apiSuccess(validated.data, rate);
  }

  if (!sourceRow) {
    const payload = {
      items: [],
      source_colonia_id: coloniaId,
      note: 'source vector not found',
    };
    return apiSuccess(similarColoniaDataSchema.parse(payload), rate);
  }

  const sourceVec = parseVector(sourceRow.vector);
  if (!sourceVec) {
    return apiSuccess(
      similarColoniaDataSchema.parse({
        items: [],
        source_colonia_id: coloniaId,
        note: 'source vector malformed',
      }),
      rate,
    );
  }

  const { data: candidates, error: candError } = await admin
    .from('colonia_dna_vectors')
    .select('colonia_id, vector')
    .eq('country_code', sourceRow.country_code)
    .neq('colonia_id', coloniaId)
    .limit(2000);

  if (candError || !candidates) {
    return apiSuccess(
      similarColoniaDataSchema.parse({
        items: [],
        source_colonia_id: coloniaId,
        note: 'H2 pending',
      }),
      rate,
    );
  }

  const scored = candidates
    .map((row) => {
      const v = parseVector(row.vector);
      if (!v) return null;
      return { colonia_id: row.colonia_id, similarity: cosineSimilarity(sourceVec, v) };
    })
    .filter((x): x is { colonia_id: string; similarity: number } => x !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, TOP_K);

  const payload = {
    items: scored,
    source_colonia_id: coloniaId,
  };

  const validated = similarColoniaDataSchema.safeParse(payload);
  if (!validated.success) {
    return apiError('internal_error', 500, { details: validated.error.flatten() });
  }
  return apiSuccess(validated.data, rate);
}
