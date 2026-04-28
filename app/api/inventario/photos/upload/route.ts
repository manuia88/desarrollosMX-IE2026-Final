import { NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPTED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const STORAGE_BUCKET = 'project-photos';
const ALLOWED_ROLES = new Set(['admin_desarrolladora', 'superadmin', 'mb_admin']);

// FASE 15.B M11 — Inventario photo upload
// STUB ADR-018: Sharp WebP 320/800/1920 variantes pipeline → L-NEW-PHOTO-PIPELINE-SHARP-VARIANTS H2.
// Por ahora upload directo (un archivo, public URL via project-photos bucket).
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
    .select('id, rol, desarrolladora_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ALLOWED_ROLES.has(profile.rol)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
  }

  const fileEntry = form.get('file');
  const unidadIdRaw = form.get('unidadId');
  const proyectoIdRaw = form.get('proyectoId');

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }
  if (typeof proyectoIdRaw !== 'string') {
    return NextResponse.json({ error: 'missing_proyecto_id' }, { status: 400 });
  }
  if (fileEntry.size === 0) {
    return NextResponse.json({ error: 'empty_file' }, { status: 400 });
  }
  if (fileEntry.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }
  if (!ACCEPTED_MIME.includes(fileEntry.type)) {
    return NextResponse.json(
      { error: 'invalid_mime', expected: ACCEPTED_MIME, received: fileEntry.type },
      { status: 415 },
    );
  }

  const admin = createAdminClient();

  const { data: proy } = await admin
    .from('proyectos')
    .select('id, desarrolladora_id')
    .eq('id', proyectoIdRaw)
    .maybeSingle();
  if (!proy || proy.desarrolladora_id !== profile.desarrolladora_id) {
    return NextResponse.json({ error: 'project_not_owned' }, { status: 403 });
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const subPath =
    unidadIdRaw && typeof unidadIdRaw === 'string'
      ? `unidades/${unidadIdRaw}`
      : `proyectos/${proyectoIdRaw}`;
  const storagePath = `${profile.id}/${subPath}/${Date.now()}-${sanitize(fileEntry.name)}`;

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

  const { data: urlData } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;

  if (typeof unidadIdRaw === 'string' && unidadIdRaw.length > 0) {
    const { data: u } = await admin
      .from('unidades')
      .select('id, photos, proyecto_id')
      .eq('id', unidadIdRaw)
      .maybeSingle();
    if (u && u.proyecto_id === proyectoIdRaw) {
      const next = [...(u.photos ?? []), publicUrl];
      await admin.from('unidades').update({ photos: next }).eq('id', unidadIdRaw);
    }
  }

  return NextResponse.json({
    ok: true,
    storage_path: storagePath,
    public_url: publicUrl,
    size_bytes: fileEntry.size,
    mime_type: fileEntry.type,
  });
}

function sanitize(filename: string): string {
  return filename.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
}

export const maxDuration = 30;
