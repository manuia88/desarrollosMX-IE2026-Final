import { NextResponse } from 'next/server';
import { listRecentAlertsForUser } from '@/shared/lib/moonshots/radar-dispatch';
import { withApiKey } from '../_shared';

export const maxDuration = 30;

export async function GET(request: Request): Promise<Response> {
  const auth = await withApiKey(request, 'alerts:read', 'alerts');
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const limit = Math.min(
    200,
    Math.max(1, Number.parseInt(url.searchParams.get('limit') ?? '50', 10) || 50),
  );

  const alerts = await listRecentAlertsForUser(auth.auth.supabase, auth.auth.profileId, limit);

  return NextResponse.json({
    profile_id: auth.auth.profileId,
    alerts,
    count: alerts.length,
    generated_at: new Date().toISOString(),
  });
}
