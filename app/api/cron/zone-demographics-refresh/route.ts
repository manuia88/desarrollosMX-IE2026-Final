// L-69 FASE 10 SESIÓN 2/3 — cron endpoint refresh zone_demographics_cache MV.
// Se ejecuta daily 4am UTC (vercel.json). Usa REFRESH MATERIALIZED VIEW
// CONCURRENTLY para no bloquear lecturas de H13 / C03.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export async function GET(request: Request) {
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
    ).rpc('exec_refresh_zone_demographics_cache', {});
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
