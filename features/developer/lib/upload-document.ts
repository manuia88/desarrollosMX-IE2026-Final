'use client';

import type { DocTipo } from '@/features/developer/schemas';
import { createClient } from '@/shared/lib/supabase/client';

// FASE 15.G — Client uploader for project-documents bucket.
// Path canon: {desarrolladoraId}/{proyectoId}/{tipo}/{timestamp}-{safeFilename}
// RLS shipped (4 policies). Bucket private — signed URLs por documentSignedUrl tRPC mutation.

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPTED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'image/tiff',
];

export type UploadDocResult =
  | { ok: true; storagePath: string }
  | {
      ok: false;
      error: 'too_large' | 'invalid_mime' | 'invalid_filename' | 'upload_failed';
      detail?: string;
    };

function safeFilename(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\-() ]/g, '_')
    .slice(0, 120);
}

export async function uploadDocument(args: {
  desarrolladoraId: string;
  proyectoId: string;
  tipo: DocTipo;
  file: File;
}): Promise<UploadDocResult> {
  if (args.file.size > MAX_BYTES) {
    return { ok: false, error: 'too_large' };
  }
  if (!ACCEPTED_MIME.includes(args.file.type)) {
    return { ok: false, error: 'invalid_mime', detail: args.file.type };
  }
  const base = safeFilename(args.file.name);
  if (!base || base.startsWith('.')) {
    return { ok: false, error: 'invalid_filename' };
  }
  const path = `${args.desarrolladoraId}/${args.proyectoId}/${args.tipo}/${Date.now()}-${base}`;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('project-documents')
    .upload(path, args.file, { upsert: false, contentType: args.file.type });
  if (error || !data) {
    return { ok: false, error: 'upload_failed', detail: error?.message };
  }
  return { ok: true, storagePath: data.path };
}
