import { NextResponse } from 'next/server';
import { fetchAndStoreRates } from '@/shared/lib/currency/fx';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (secret) {
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await fetchAndStoreRates();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fx_snapshot_failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
