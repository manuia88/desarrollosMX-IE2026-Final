import { NextResponse } from 'next/server';
import { listPipelineSnapshots } from '@/shared/lib/moonshots/pipeline-tracker';
import { jsonError, withApiKey } from '../_shared';

export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const auth = await withApiKey(request, 'pipeline:read', 'pipeline');
  if (!auth.ok) return auth.response;

  const { data: profile } = await auth.auth.supabase
    .from('profiles')
    .select('desarrolladora_id')
    .eq('id', auth.auth.profileId)
    .maybeSingle();

  if (!profile?.desarrolladora_id) {
    return jsonError('developer not associated with desarrolladora', 403);
  }

  const url = new URL(request.url);
  const rangeFromDays = Math.min(
    365,
    Math.max(7, Number.parseInt(url.searchParams.get('range_days') ?? '30', 10) || 30),
  );

  const rows = await listPipelineSnapshots(
    auth.auth.supabase,
    profile.desarrolladora_id,
    rangeFromDays,
  );

  return NextResponse.json({
    desarrolladora_id: profile.desarrolladora_id,
    range_from_days: rangeFromDays,
    snapshots: rows,
    count: rows.length,
    generated_at: new Date().toISOString(),
  });
}
