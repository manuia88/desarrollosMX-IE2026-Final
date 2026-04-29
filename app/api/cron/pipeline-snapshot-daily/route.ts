// STUB cron · pipeline-snapshot-daily (15.X.4 FASE 15 ola 4 — handler real CC-A 15.X)
import { NextResponse } from 'next/server';
export const maxDuration = 300;
export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, stub: true, timestamp: new Date().toISOString() });
}
