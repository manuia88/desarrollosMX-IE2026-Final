import { gzipSync } from 'node:zlib';
import { createAdminClient } from '@/shared/lib/supabase/admin';

// Upgrade #2 §5.A FASE 07. Cada run guarda su raw payload comprimido
// gzip en storage bucket "ingest-raw" (privado, retention 30d via cron).
// replayRun(runId) descarga el payload y lo retorna sin hit API externa.

const BUCKET = 'ingest-raw';

export async function saveRawPayload(
  runId: string,
  source: string,
  payload: unknown,
): Promise<{ url: string; sizeBytes: number } | null> {
  if (payload == null) return null;
  const json = JSON.stringify(payload);
  const compressed = gzipSync(Buffer.from(json, 'utf-8'));
  const path = `${source}/${runId}.json.gz`;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    contentType: 'application/gzip',
    upsert: true,
  });
  if (error) return null;
  return { url: `${BUCKET}/${path}`, sizeBytes: compressed.length };
}

export async function loadRawPayload<T = unknown>(
  source: string,
  runId: string,
): Promise<T | null> {
  const path = `${source}/${runId}.json.gz`;
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  // gzip-decompress y parse.
  const { gunzipSync } = await import('node:zlib');
  const decompressed = gunzipSync(buffer);
  return JSON.parse(decompressed.toString('utf-8')) as T;
}
