import { NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

const EXPORT_TABLES = [
  'profiles',
  'role_requests',
  'auth_sessions_log',
  'ai_memory_store',
  'addresses',
  'subscriptions',
  'api_keys',
  'privacy_exports',
] as const;

type ExportBundle = {
  profile_id: string;
  exported_at: string;
  tables: Record<string, unknown>;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const bundle: ExportBundle = {
    profile_id: user.id,
    exported_at: new Date().toISOString(),
    tables: {},
  };

  for (const table of EXPORT_TABLES) {
    const column = table === 'profiles' ? 'id' : 'profile_id';
    // Supabase columnar union no narrowea; column es correcta por tabla en runtime.
    const { data } = await (
      admin.from(table).select('*') as unknown as {
        eq: (c: string, v: string) => Promise<{ data: unknown }>;
      }
    ).eq(column, user.id);
    bundle.tables[table] = data ?? [];
  }

  const json = JSON.stringify(bundle, null, 2);
  const filename = `data-export-${Date.now()}.json`;
  const path = `${user.id}/${filename}`;

  const { error: uploadError } = await admin.storage
    .from('dossier-exports')
    .upload(path, new Blob([json], { type: 'application/json' }), {
      contentType: 'application/json',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: 'upload_failed', message: uploadError.message },
      { status: 500 },
    );
  }

  const { data: signed, error: signedError } = await admin.storage
    .from('dossier-exports')
    .createSignedUrl(path, 24 * 60 * 60);

  if (signedError || !signed) {
    return NextResponse.json(
      { error: 'signed_url_failed', message: signedError?.message ?? 'unknown' },
      { status: 500 },
    );
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await admin.from('privacy_exports').insert({
    profile_id: user.id,
    storage_path: path,
    expires_at: expiresAt,
    completed_at: new Date().toISOString(),
    meta: { tables: [...EXPORT_TABLES], size_bytes: json.length },
  });

  if (process.env.RESEND_ENABLED === 'true') {
    // FASE 22: integración Resend real (sendgrid template + TTL 24h).
  } else {
    console.info(
      `[privacy/data-export] user=${user.id} link=${signed.signedUrl} expires_at=${expiresAt} (email STUB — RESEND_ENABLED=false)`,
    );
  }

  return NextResponse.json({
    ok: true,
    signed_url: signed.signedUrl,
    expires_at: expiresAt,
    email_sent: process.env.RESEND_ENABLED === 'true',
  });
}
