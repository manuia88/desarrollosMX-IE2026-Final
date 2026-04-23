// Public REST API v1 — GET /api/v1/indices/[code]/[scope]/[id].
// Single value detail: ranking + percentile + trend for a scope at a period.

import { extractApiKey, verifyApiKey } from '@/features/api-v1/lib/auth';
import { enforceRateLimitForTier } from '@/features/api-v1/lib/rate-limit-tier';
import {
  apiError,
  apiOptions,
  apiRateLimited,
  apiSuccess,
  getClientIp,
} from '@/features/api-v1/lib/responses';
import { indexCodeSchema, scopeTypeSchema } from '@/features/api-v1/schemas/common';
import {
  indicesDetailDataSchema,
  indicesDetailQuerySchema,
} from '@/features/api-v1/schemas/indices';
import type { ApiTier } from '@/features/api-v1/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const ENDPOINT = 'v1:indices:detail';

interface RouteContext {
  params: Promise<{ code: string; scope: string; id: string }>;
}

export async function OPTIONS(): Promise<Response> {
  return apiOptions();
}

export async function GET(request: Request, ctx: RouteContext): Promise<Response> {
  const { code: rawCode, scope: rawScope, id } = await ctx.params;

  const codeParsed = indexCodeSchema.safeParse(rawCode.toUpperCase());
  if (!codeParsed.success) {
    return apiError('not_found', 404, { message: `Unknown index_code: ${rawCode}` });
  }
  const scopeParsed = scopeTypeSchema.safeParse(rawScope);
  if (!scopeParsed.success) {
    return apiError('not_found', 404, { message: `Unknown scope: ${rawScope}` });
  }

  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());
  const parsedQ = indicesDetailQuerySchema.safeParse(rawQuery);
  if (!parsedQ.success) {
    return apiError('invalid_payload', 400, { details: parsedQ.error.flatten() });
  }
  const q = parsedQ.data;

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

  let query = admin
    .from('dmx_indices')
    .select(
      'index_code, scope_type, scope_id, period_date, value, ranking_in_scope, percentile, score_band, confidence, confidence_score, trend_direction, trend_vs_previous, methodology_version, components',
    )
    .eq('index_code', codeParsed.data)
    .eq('scope_type', scopeParsed.data)
    .eq('scope_id', id)
    .eq('is_shadow', false);

  if (q.period) {
    query = query.eq('period_date', `${q.period}-01`);
  } else {
    query = query.order('period_date', { ascending: false });
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) return apiError('internal_error', 500, { message: error.message });
  if (!data) return apiError('not_found', 404, { message: 'No index value for this scope/period' });

  const payload = {
    index_code: data.index_code as typeof codeParsed.data,
    scope_type: data.scope_type as typeof scopeParsed.data,
    scope_id: data.scope_id,
    period_date: data.period_date,
    value: Number(data.value),
    ranking_in_scope: data.ranking_in_scope,
    percentile: data.percentile === null ? null : Number(data.percentile),
    score_band: data.score_band,
    confidence: data.confidence,
    confidence_score: data.confidence_score === null ? null : Number(data.confidence_score),
    trend_direction: data.trend_direction,
    trend_vs_previous: data.trend_vs_previous === null ? null : Number(data.trend_vs_previous),
    methodology_version: data.methodology_version,
    components: data.components,
  };

  const validated = indicesDetailDataSchema.safeParse(payload);
  if (!validated.success) {
    return apiError('internal_error', 500, { details: validated.error.flatten() });
  }
  return apiSuccess(validated.data, rate);
}
