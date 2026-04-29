import { NextResponse } from 'next/server';
import { jsonError, withApiKey } from '../../_shared';

export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ zone_id: string }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const auth = await withApiKey(request, 'scores:read', 'scores');
  if (!auth.ok) return auth.response;

  const { zone_id: zoneId } = await context.params;
  if (!zoneId || zoneId.length < 8) {
    return jsonError('zone_id required', 400);
  }

  const url = new URL(request.url);
  const countryCode = (url.searchParams.get('country') ?? 'MX').toUpperCase();

  const { data } = await auth.auth.supabase
    .from('dmx_indices')
    .select(
      'index_code, value, confidence, score_band, percentile, period_date, methodology_version',
    )
    .eq('scope_type', 'zone')
    .eq('scope_id', zoneId)
    .eq('country_code', countryCode)
    .order('period_date', { ascending: false })
    .limit(60);

  const seen = new Set<string>();
  const indices: Array<Record<string, unknown>> = [];
  for (const row of data ?? []) {
    if (seen.has(row.index_code)) continue;
    seen.add(row.index_code);
    indices.push({
      code: row.index_code,
      value: Number(row.value),
      confidence: row.confidence,
      band: row.score_band,
      percentile: row.percentile,
      period_date: row.period_date,
      methodology_version: row.methodology_version,
    });
  }

  return NextResponse.json({
    zone_id: zoneId,
    country_code: countryCode,
    indices,
    count: indices.length,
    generated_at: new Date().toISOString(),
  });
}
