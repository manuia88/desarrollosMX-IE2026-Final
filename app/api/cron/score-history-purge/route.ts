// D34 FASE 10 SESIÓN 3/3 — cron endpoint purge score_history > 5 años.
// Weekly Sunday 2am UTC (vercel.json). Invoca purge_expired_score_history()
// SECDEF function (allowlist v14). Retorna deleted_count para telemetría.

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
    const { data, error } = await (
      admin as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: number | null; error: { message: string } | null }>;
      }
    ).rpc('purge_expired_score_history', {});
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
    const deleted = typeof data === 'number' ? data : 0;
    return NextResponse.json(
      {
        ok: true,
        deleted_count: deleted,
        duration_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : 'purge_failed',
        duration_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
