import { NextResponse } from 'next/server';
import {
  dispatchMarketUpload,
  isMarketUploadSource,
  MARKET_ACCEPTED_MIME,
  type MarketUploadSource,
} from '@/features/ingest-admin/lib/market-upload-dispatch';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

const MAX_BYTES = 100 * 1024 * 1024;
const ADMIN_ROLES = new Set(['superadmin', 'mb_admin']);
const STORAGE_BUCKET = 'ingest-uploads';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ADMIN_ROLES.has(profile.rol)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
  }

  const sourceRaw = form.get('source');
  const fileEntry = form.get('file');
  if (typeof sourceRaw !== 'string' || !isMarketUploadSource(sourceRaw)) {
    return NextResponse.json({ error: 'invalid_source' }, { status: 400 });
  }
  const source: MarketUploadSource = sourceRaw;
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }
  if (fileEntry.size === 0) {
    return NextResponse.json({ error: 'empty_file' }, { status: 400 });
  }
  if (fileEntry.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }
  const accepted = MARKET_ACCEPTED_MIME[source];
  if (!accepted.includes(fileEntry.type)) {
    return NextResponse.json(
      { error: 'invalid_mime', expected: accepted, received: fileEntry.type },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const admin = createAdminClient();

  const storagePath = `market/${source}/${profile.id}/${Date.now()}-${sanitize(fileEntry.name)}`;
  const { error: uploadErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: fileEntry.type,
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json(
      { error: 'storage_upload_failed', detail: uploadErr.message },
      { status: 500 },
    );
  }

  try {
    const result = await dispatchMarketUpload({
      source,
      buffer,
      uploadedByProfileId: profile.id,
    });
    const meta = (result.meta ?? {}) as {
      report_period?: string;
      review_required?: boolean;
    };
    return NextResponse.json({
      ok: true,
      source,
      storage_path: storagePath,
      rows_inserted: result.rows_inserted,
      rows_updated: result.rows_updated,
      rows_skipped: result.rows_skipped,
      report_period: meta.report_period,
      review_required: meta.review_required,
      errors: result.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ingest_failed';
    return NextResponse.json(
      { ok: false, source, storage_path: storagePath, error: message },
      { status: 500 },
    );
  }
}

function sanitize(filename: string): string {
  return filename.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
}

export const maxDuration = 300;
