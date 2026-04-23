// Public REST API v1 — GET /api/v1/colonias/[id].
// Returns all 15 DMX indices (latest per code) + zone_pulse + citations.

import { extractApiKey, verifyApiKey } from '@/features/api-v1/lib/auth';
import { enforceRateLimitForTier } from '@/features/api-v1/lib/rate-limit-tier';
import {
  apiError,
  apiOptions,
  apiRateLimited,
  apiSuccess,
  getClientIp,
} from '@/features/api-v1/lib/responses';
import { coloniaProfileDataSchema } from '@/features/api-v1/schemas/indices';
import type { ApiTier } from '@/features/api-v1/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const ENDPOINT = 'v1:colonias:profile';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function OPTIONS(): Promise<Response> {
  return apiOptions();
}

export async function GET(request: Request, ctx: RouteContext): Promise<Response> {
  const { id } = await ctx.params;
  if (!id || id.length < 1 || id.length > 128) {
    return apiError('invalid_payload', 400, { message: 'Invalid colonia id' });
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

  const { data: indicesRows, error: indicesError } = await admin
    .from('dmx_indices')
    .select(
      'index_code, value, period_date, confidence, percentile, trend_direction, score_band, country_code',
    )
    .eq('scope_type', 'colonia')
    .eq('scope_id', id)
    .eq('is_shadow', false)
    .order('period_date', { ascending: false })
    .limit(500);

  if (indicesError) {
    return apiError('internal_error', 500, { message: indicesError.message });
  }

  const rows = indicesRows ?? [];
  if (rows.length === 0) {
    return apiError('not_found', 404, { message: `No indices found for colonia ${id}` });
  }

  // Take latest per index_code.
  const latestByCode = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const existing = latestByCode.get(row.index_code);
    if (!existing || row.period_date > existing.period_date) {
      latestByCode.set(row.index_code, row);
    }
  }
  const indices = Array.from(latestByCode.values()).map((r) => ({
    index_code: r.index_code,
    value: Number(r.value),
    period_date: r.period_date,
    confidence: r.confidence,
    percentile: r.percentile === null ? null : Number(r.percentile),
    trend_direction: r.trend_direction,
    score_band: r.score_band,
  }));

  const latestPeriod = rows[0]?.period_date ?? null;
  const countryCode = rows[0]?.country_code ?? 'MX';

  const { data: pulseRow } = await admin
    .from('zone_pulse_scores')
    .select('pulse_score, period_date')
    .eq('scope_type', 'colonia')
    .eq('scope_id', id)
    .order('period_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    colonia_id: id,
    country_code: countryCode,
    indices,
    pulse_score:
      pulseRow?.pulse_score === null || pulseRow?.pulse_score === undefined
        ? null
        : Number(pulseRow.pulse_score),
    pulse_period: pulseRow?.period_date ?? null,
    latest_period: latestPeriod,
    citations: [
      { source: 'dmx_indices', accessed_at: new Date().toISOString() },
      ...(pulseRow ? [{ source: 'zone_pulse_scores', accessed_at: new Date().toISOString() }] : []),
    ],
  };

  const validated = coloniaProfileDataSchema.safeParse(payload);
  if (!validated.success) {
    return apiError('internal_error', 500, { details: validated.error.flatten() });
  }
  return apiSuccess(validated.data, rate);
}
