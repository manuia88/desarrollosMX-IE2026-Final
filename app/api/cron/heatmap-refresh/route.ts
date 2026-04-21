// L-72 FASE 10 SESIÓN 3/3 — cron endpoint refresh heatmap_cache MV.
// Daily 5am UTC (vercel.json). Invoca exec_refresh_heatmap_cache() SECDEF
// (allowlist v14) que hace REFRESH MATERIALIZED VIEW CONCURRENTLY.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || cronSecret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const started = Date.now();
  try {
    const { error } = await (
      admin as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ error: { message: string } | null }>;
      }
    ).rpc('exec_refresh_heatmap_cache', {});
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          duration_ms: Date.now() - started,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'refresh_failed',
        duration_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, duration_ms: Date.now() - started, timestamp: new Date().toISOString() },
    { status: 200 },
  );
}
