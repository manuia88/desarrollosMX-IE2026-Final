import { createHash } from 'node:crypto';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { DedupeResult } from '../schemas/validation';

export type FileBuffer = ArrayBuffer | Uint8Array | Buffer;

function toBuffer(buffer: FileBuffer): Buffer {
  if (Buffer.isBuffer(buffer)) return buffer;
  if (buffer instanceof Uint8Array) return Buffer.from(buffer);
  return Buffer.from(new Uint8Array(buffer));
}

export function sha256(buffer: FileBuffer): string {
  return createHash('sha256').update(toBuffer(buffer)).digest('hex');
}

export interface CheckDuplicateOptions {
  readonly desarrolladoraId: string;
  readonly fileBuffer: FileBuffer;
}

export async function checkDuplicate({
  desarrolladoraId,
  fileBuffer,
}: CheckDuplicateOptions): Promise<DedupeResult> {
  const hash = sha256(fileBuffer);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('document_doc_hashes')
    .select('job_id')
    .eq('desarrolladora_id', desarrolladoraId)
    .eq('file_hash_sha256', hash)
    .maybeSingle();

  if (error) {
    return { duplicate: false };
  }
  if (!data || !data.job_id) return { duplicate: false };
  return { duplicate: true, existingJobId: data.job_id };
}

export interface PageHashOptions {
  readonly fileBuffer: FileBuffer;
  readonly pageCount?: number;
  readonly pageBuffers?: ReadonlyArray<FileBuffer>;
}

export function computePageHashes({
  fileBuffer,
  pageBuffers,
}: PageHashOptions): string[] {
  if (pageBuffers && pageBuffers.length > 0) {
    return pageBuffers.map((p) => sha256(p));
  }
  return [sha256(fileBuffer)];
}

export interface DiffPagesOptions {
  readonly currentHashes: ReadonlyArray<string>;
  readonly previousJobId: string;
}

export async function diffPages({
  currentHashes,
  previousJobId,
}: DiffPagesOptions): Promise<number[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('document_doc_hashes')
    .select('page_hashes')
    .eq('job_id', previousJobId)
    .single();

  if (error || !data) return currentHashes.map((_, i) => i);

  const previous = Array.isArray(data.page_hashes)
    ? (data.page_hashes as unknown[]).filter((h): h is string => typeof h === 'string')
    : [];

  const changed: number[] = [];
  for (let i = 0; i < currentHashes.length; i += 1) {
    if (currentHashes[i] !== previous[i]) changed.push(i);
  }
  return changed;
}

export interface RecordHashOptions {
  readonly desarrolladoraId: string;
  readonly jobId: string;
  readonly fileHash: string;
  readonly pageHashes: ReadonlyArray<string>;
}

export async function recordDocumentHash({
  desarrolladoraId,
  jobId,
  fileHash,
  pageHashes,
}: RecordHashOptions): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('document_doc_hashes').insert({
    desarrolladora_id: desarrolladoraId,
    file_hash_sha256: fileHash,
    job_id: jobId,
    page_hashes: [...pageHashes],
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
