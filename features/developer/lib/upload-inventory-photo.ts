export interface UploadInventoryPhotoArgs {
  file: File;
  proyectoId: string;
  unidadId?: string;
}

export interface UploadInventoryPhotoResult {
  ok: boolean;
  publicUrl: string;
  storagePath: string;
  sizeBytes: number;
  mimeType: string;
}

export async function uploadInventoryPhoto(
  args: UploadInventoryPhotoArgs,
): Promise<UploadInventoryPhotoResult> {
  const form = new FormData();
  form.append('file', args.file);
  form.append('proyectoId', args.proyectoId);
  if (args.unidadId) form.append('unidadId', args.unidadId);

  const res = await fetch('/api/inventario/photos/upload', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => 'unknown');
    throw new Error(`upload_failed_${res.status}_${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    ok: boolean;
    public_url: string;
    storage_path: string;
    size_bytes: number;
    mime_type: string;
  };
  return {
    ok: json.ok,
    publicUrl: json.public_url,
    storagePath: json.storage_path,
    sizeBytes: json.size_bytes,
    mimeType: json.mime_type,
  };
}
