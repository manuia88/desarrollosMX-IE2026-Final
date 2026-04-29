// STUB cron · document-jobs-process (F17 sesión 17.A pre-registro)
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3
// Sesión 17.B CC-A.1 reemplaza body real con loop AI extraction.
//
// Schedule canon: NO Vercel cron sub-daily (Hobby blocker).
// Memoria 25: pg_cron Supabase para frecuencia alta (cada 1-5 min).
// Sesión 17.B agendará via SELECT cron.schedule() en migration.

import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    stub: true,
    feature: 'F17.B',
    message: 'STUB sesión 17.A — handler real CC-A.1 sesión 17.B',
    timestamp: new Date().toISOString(),
  });
}
