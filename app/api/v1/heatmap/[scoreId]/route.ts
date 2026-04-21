// L-72 FASE 10 SESIÓN 3/3 — public heatmap endpoint.
// GET /api/v1/heatmap/[scoreId]?country=MX&bbox=minLng,minLat,maxLng,maxLat
// Response: { score_id, country_code, points: HeatmapPoint[] }
//
// Tier público Free: rate-limited 30 req/min por IP. No auth required
// (heatmaps son data pública como índices /indices). FASE 12 consume desde
// Mapbox client-side.
//
// Data viene de heatmap_cache MV (refresh daily 5am UTC).

import { NextResponse } from 'next/server';
import { getHeatmapData } from '@/shared/lib/intelligence-engine/heatmaps/zone-heatmap-data';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const VALID_SCORE_ID = /^[A-Z]\d{2}$/;
const VALID_COUNTRY = /^[A-Z]{2}$/;

export async function GET(
  request: Request,
  context: { params: Promise<{ scoreId: string }> },
): Promise<NextResponse> {
  const params = await context.params;
  const scoreId = params.scoreId.toUpperCase();
  if (!VALID_SCORE_ID.test(scoreId)) {
    return NextResponse.json({ error: 'invalid_score_id' }, { status: 400 });
  }

  const url = new URL(request.url);
  const countryCode = (url.searchParams.get('country') ?? 'MX').toUpperCase();
  if (!VALID_COUNTRY.test(countryCode)) {
    return NextResponse.json({ error: 'invalid_country' }, { status: 400 });
  }

  const bboxParam = url.searchParams.get('bbox');
  let bbox: [number, number, number, number] | undefined;
  if (bboxParam) {
    const parts = bboxParam.split(',').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      return NextResponse.json({ error: 'invalid_bbox' }, { status: 400 });
    }
    bbox = [parts[0] as number, parts[1] as number, parts[2] as number, parts[3] as number];
  }

  const admin = createAdminClient();
  const queryParams = bbox
    ? ({ score_id: scoreId, country_code: countryCode, bbox } as const)
    : ({ score_id: scoreId, country_code: countryCode } as const);
  const points = await getHeatmapData(admin, queryParams);

  return NextResponse.json(
    {
      score_id: scoreId,
      country_code: countryCode,
      points,
      count: points.length,
      cache_refresh: 'daily_5am_utc',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  );
}
