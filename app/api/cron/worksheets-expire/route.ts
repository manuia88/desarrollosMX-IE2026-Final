// STUB cron · worksheets-expire-30min (B.1 FASE 15 ola 3 — handler real CC-A 15.C)
// Reference: ADR-060 + 03.7 cron canon append v3
//
// Auth: Authorization: Bearer ${CRON_SECRET}.
// Schedule: vercel.json `*/30 * * * *` (cada 30 min).
// Observability: ingest_runs INSERT (memoria 23) — cuerpo real CC-A 15.C:
// UPDATE unit_worksheets SET status='expired' WHERE expires_at < now() AND status='pending'.

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
    message:
      'STUB FASE 15 ola 3 — implementación real CC-A 15.C (B.1 worksheets expire 30min cron)',
    timestamp: new Date().toISOString(),
  });
}
