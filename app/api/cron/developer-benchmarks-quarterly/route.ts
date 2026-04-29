// STUB cron · developer-benchmarks-quarterly (15.F UPG 84 — handler real CC-A 15.F)
import { NextResponse } from 'next/server';
export const maxDuration = 300;
export async function GET(request: Request): Promise<Response> {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ ok: true, stub: true, timestamp: new Date().toISOString() });
}
