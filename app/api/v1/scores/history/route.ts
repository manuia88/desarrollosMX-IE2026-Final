// Public REST API v1 — GET /api/v1/scores/history (Time Machine).
// Returns historical values for a given scope + index_code between two periods.
// Cursor-based pagination using opaque base64url({period_date, id}).
//
// Contract: 11.L.2.
// Auth: optional api key → if present uses verified tier; otherwise 'free'.
// Rate limit: daily window per tier (see features/api-v1/lib/rate-limit-tier).

import { extractApiKey, verifyApiKey } from '@/features/api-v1/lib/auth';
import { decodeCursor, encodeCursor } from '@/features/api-v1/lib/cursor';
import { enforceRateLimitForTier } from '@/features/api-v1/lib/rate-limit-tier';
import {
  apiError,
  apiOptions,
  apiRateLimited,
  apiSuccess,
  getClientIp,
} from '@/features/api-v1/lib/responses';
import {
  type HistoryItem,
  historyDataSchema,
  historyQuerySchema,
} from '@/features/api-v1/schemas/history';
import type { ApiTier } from '@/features/api-v1/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const ENDPOINT = 'v1:history';

export async function OPTIONS(): Promise<Response> {
  return apiOptions();
}

function yearMonthToStartDate(ym: string | undefined): string | null {
  if (!ym) return null;
  return `${ym}-01`;
}

function yearMonthToEndExclusive(ym: string | undefined): string | null {
  if (!ym) return null;
  const [y, m] = ym.split('-').map((n) => Number.parseInt(n, 10));
  if (!y || !m) return null;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  return `${nextYear.toString().padStart(4, '0')}-${nextMonth.toString().padStart(2, '0')}-01`;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());

  const parsed = historyQuerySchema.safeParse(rawQuery);
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

  if (!rate.allowed) {
    return apiRateLimited(tier, rate.reset_at);
  }

  const admin = createAdminClient();

  const fromDate = yearMonthToStartDate(q.from);
  const toDateExclusive = yearMonthToEndExclusive(q.to);

  let query = admin
    .from('dmx_indices')
    .select(
      'id, period_date, period_type, value, confidence, confidence_score, percentile, ranking_in_scope, score_band, trend_direction, trend_vs_previous, methodology_version',
    )
    .eq('scope_type', q.scope)
    .eq('scope_id', q.id)
    .eq('index_code', q.indexCode)
    .eq('is_shadow', false);

  if (q.country) query = query.eq('country_code', q.country);
  if (fromDate) query = query.gte('period_date', fromDate);
  if (toDateExclusive) query = query.lt('period_date', toDateExclusive);

  const cursor = decodeCursor(q.cursor);
  if (cursor) {
    // keyset: skip rows with (period_date, id) <= cursor.
    query = query.or(
      `period_date.gt.${cursor.period_date},and(period_date.eq.${cursor.period_date},id.gt.${cursor.id})`,
    );
  }

  const { data, error } = await query
    .order('period_date', { ascending: true })
    .order('id', { ascending: true })
    .limit(q.limit + 1);
  if (error) {
    return apiError('internal_error', 500, { message: error.message });
  }

  const rows = data ?? [];
  const hasMore = rows.length > q.limit;
  const items: HistoryItem[] = rows.slice(0, q.limit).map((r) => ({
    id: r.id,
    period_date: r.period_date,
    period_type: r.period_type,
    value: Number(r.value),
    confidence: r.confidence,
    confidence_score: r.confidence_score === null ? null : Number(r.confidence_score),
    percentile: r.percentile === null ? null : Number(r.percentile),
    ranking_in_scope: r.ranking_in_scope,
    score_band: r.score_band,
    trend_direction: r.trend_direction,
    trend_vs_previous: r.trend_vs_previous === null ? null : Number(r.trend_vs_previous),
    methodology_version: r.methodology_version,
  }));

  const last = hasMore ? items[items.length - 1] : null;
  const next_cursor = last ? encodeCursor({ period_date: last.period_date, id: last.id }) : null;

  const payload = {
    items,
    next_cursor,
    scope: q.scope,
    scope_id: q.id,
    index_code: q.indexCode,
  };

  const validated = historyDataSchema.safeParse(payload);
  if (!validated.success) {
    return apiError('internal_error', 500, { details: validated.error.flatten() });
  }

  return apiSuccess(validated.data, rate);
}
