import { NextResponse } from 'next/server';
import {
  AUTOFETCH_CONFIGS,
  AUTOFETCH_SOURCES,
  isAutoFetchSource,
  runAutoFetch,
} from '@/shared/lib/ingest/auto-fetch';

// Cron handler universal para autofetch. Vercel cron dispara GET con header
// Authorization: Bearer $CRON_SECRET. Este endpoint delega al wrapper
// runAutoFetch que maneja discovery + hash diff + storage + ingestor.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.M

export async function GET(request: Request, context: { params: Promise<{ source: string }> }) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  if (secret) {
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const { source } = await context.params;
  if (!isAutoFetchSource(source)) {
    return NextResponse.json(
      {
        error: 'source_not_autofetchable',
        source,
        runnable: AUTOFETCH_SOURCES,
      },
      { status: 400 },
    );
  }

  try {
    const config = AUTOFETCH_CONFIGS[source];
    const result = await runAutoFetch(config);
    const status = result.status === 'discovery_failed' ? 500 : 200;
    return NextResponse.json(
      {
        ok: result.status !== 'discovery_failed',
        source,
        status: result.status,
        reason: result.reason,
        etag: result.etag,
        sha256: result.sha256,
        file_url: result.fileUrl,
        storage_path: result.storagePath,
        ingest: result.ingest
          ? {
              rows_inserted: result.ingest.rows_inserted,
              rows_updated: result.ingest.rows_updated,
              rows_skipped: result.ingest.rows_skipped,
              errors: result.ingest.errors,
            }
          : undefined,
      },
      { status },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'autofetch_failed';
    return NextResponse.json({ ok: false, source, error: message }, { status: 500 });
  }
}

export const maxDuration = 300;
