import { NextResponse } from 'next/server';
import {
  CRON_RUNNABLE_SOURCES,
  isCronRunnableSource,
  runCronIngest,
} from '@/shared/lib/ingest/cron-registry';

export async function GET(request: Request, context: { params: Promise<{ source: string }> }) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (secret) {
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const { source } = await context.params;
  if (!isCronRunnableSource(source)) {
    return NextResponse.json(
      {
        error: 'source_not_cron_runnable',
        source,
        runnable: CRON_RUNNABLE_SOURCES,
      },
      { status: 400 },
    );
  }

  try {
    const result = await runCronIngest(source);
    return NextResponse.json({
      ok: true,
      source,
      rows_inserted: result.rows_inserted,
      rows_updated: result.rows_updated,
      rows_skipped: result.rows_skipped,
      errors: result.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'cron_ingest_failed';
    return NextResponse.json({ ok: false, source, error: message }, { status: 500 });
  }
}

export const maxDuration = 300;
