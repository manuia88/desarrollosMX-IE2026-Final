// Public REST API v1 — GET /api/v1/indices/[code].
// Returns ranking for a given index_code + scope_type + period.

import { extractApiKey, verifyApiKey } from '@/features/api-v1/lib/auth';
import { enforceRateLimitForTier } from '@/features/api-v1/lib/rate-limit-tier';
import {
  apiError,
  apiOptions,
  apiRateLimited,
  apiSuccess,
  getClientIp,
} from '@/features/api-v1/lib/responses';
import { indexCodeSchema } from '@/features/api-v1/schemas/common';
import {
  indicesRankingDataSchema,
  indicesRankingQuerySchema,
} from '@/features/api-v1/schemas/indices';
import type { ApiTier } from '@/features/api-v1/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const ENDPOINT = 'v1:indices:ranking';

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function OPTIONS(): Promise<Response> {
  return apiOptions();
}

export async function GET(request: Request, ctx: RouteContext): Promise<Response> {
  const { code: rawCode } = await ctx.params;
  const codeParsed = indexCodeSchema.safeParse(rawCode.toUpperCase());
  if (!codeParsed.success) {
    return apiError('not_found', 404, { message: `Unknown index_code: ${rawCode}` });
  }
  const indexCode = codeParsed.data;

  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());
  const parsed = indicesRankingQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return apiError('invalid_payload', 400, { details: parsed.error.flatten() });
  }
  const q = parsed.data;

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

  let period = q.period ? `${q.period}-01` : null;
  if (!period) {
    const { data: latest } = await admin
      .from('dmx_indices')
      .select('period_date')
      .eq('index_code', indexCode)
      .eq('scope_type', q.scope)
      .eq('country_code', q.country)
      .eq('is_shadow', false)
      .order('period_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    period = latest?.period_date ?? null;
  }

  if (!period) {
    return apiSuccess(
      {
        items: [],
        period: '',
        index_code: indexCode,
        scope: q.scope,
        country: q.country,
        total: 0,
      },
      rate,
    );
  }

  const { data, error, count } = await admin
    .from('dmx_indices')
    .select(
      'scope_id, scope_type, index_code, period_date, value, ranking_in_scope, percentile, score_band, confidence, trend_direction',
      { count: 'exact' },
    )
    .eq('index_code', indexCode)
    .eq('scope_type', q.scope)
    .eq('country_code', q.country)
    .eq('period_date', period)
    .eq('is_shadow', false)
    .order('value', { ascending: q.order === 'asc' })
    .limit(q.limit);

  if (error) return apiError('internal_error', 500, { message: error.message });

  const items = (data ?? []).map((r) => ({
    scope_id: r.scope_id,
    scope_type: r.scope_type,
    index_code: r.index_code,
    period_date: r.period_date,
    value: Number(r.value),
    ranking_in_scope: r.ranking_in_scope,
    percentile: r.percentile === null ? null : Number(r.percentile),
    score_band: r.score_band,
    confidence: r.confidence,
    trend_direction: r.trend_direction,
  }));

  const payload = {
    items,
    period,
    index_code: indexCode,
    scope: q.scope,
    country: q.country,
    total: count ?? items.length,
  };

  const validated = indicesRankingDataSchema.safeParse(payload);
  if (!validated.success) {
    return apiError('internal_error', 500, { details: validated.error.flatten() });
  }
  return apiSuccess(validated.data, rate);
}
