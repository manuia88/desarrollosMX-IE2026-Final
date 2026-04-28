// STUB cron · ad-spend-optimizer-daily (B.4 FASE 15 ola 2 — handler real CC-A 15.D.2)
// Reference: ADR-060 + 03.7 cron canon append v3
//
// Auth: Authorization: Bearer ${CRON_SECRET}.
// Schedule: vercel.json `0 6 * * *` (6am UTC daily).
// Observability: ingest_runs INSERT (memoria 23) — cuerpo real implementado por
// CC-A ventana 15.D.2: Claude Sonnet evalúa CPL/ROI vs media → pause/scale.

import { NextResponse } from 'next/server';

export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    stub: true,
    message:
      'STUB FASE 15 ola 2 — implementación real CC-A 15.D.2 (B.4 multi-touch attribution + Claude IA optimizer)',
    timestamp: new Date().toISOString(),
  });
}
