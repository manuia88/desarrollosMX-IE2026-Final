// FASE 17.D Embeddings persist engine — chunk extracted_data + persist document_embeddings
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3
//
// Strategy: serialize extracted_data + metadatos doc_type/file_name → chunks 1500 chars overlap 200.
// Idempotencia: delete existing chunks por job_id antes de insert (re-extraction case).
// Visibility default 'dev_only' (PII no cross-tenant). HNSW index existing solo public_derived.

import { embeddingToPgVector, generateEmbeddings } from '@/shared/lib/openai/embeddings';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Database, Json } from '@/shared/types/database';

export const CHUNK_SIZE = 1500;
export const CHUNK_OVERLAP = 200;

type EmbeddingsInsert = Database['public']['Tables']['document_embeddings']['Insert'];

export interface ChunkOptions {
  readonly extractedData: Record<string, unknown>;
  readonly docType: string;
  readonly fileName: string;
}

export function chunkExtractedData({ extractedData, docType, fileName }: ChunkOptions): string[] {
  const header = `[doc_type=${docType}] [file_name=${fileName}]`;
  const body = JSON.stringify(extractedData, null, 2);
  const fullText = `${header}\n\n${body}`;
  if (fullText.length <= CHUNK_SIZE) return [fullText];

  const chunks: string[] = [];
  const stride = CHUNK_SIZE - CHUNK_OVERLAP;
  for (let start = 0; start < fullText.length; start += stride) {
    const end = Math.min(start + CHUNK_SIZE, fullText.length);
    chunks.push(fullText.slice(start, end));
    if (end >= fullText.length) break;
  }
  return chunks;
}

export interface PersistEmbeddingsOptions {
  readonly jobId: string;
  readonly desarrolladoraId: string;
  readonly proyectoId: string | null;
  readonly visibility: 'dev_only' | 'public_derived';
  readonly extractedData: Record<string, unknown>;
  readonly docType: string;
  readonly fileName: string;
}

export interface PersistEmbeddingsResult {
  readonly chunks_count: number;
  readonly tokens_used: number;
  readonly cost_usd: number;
  readonly model: string;
  readonly skipped?: boolean;
  readonly reason?: string;
}

export async function generateAndPersistEmbeddings(
  opts: PersistEmbeddingsOptions,
): Promise<PersistEmbeddingsResult> {
  const supabase = createAdminClient();

  const chunks = chunkExtractedData({
    extractedData: opts.extractedData,
    docType: opts.docType,
    fileName: opts.fileName,
  });

  if (chunks.length === 0) {
    return {
      chunks_count: 0,
      tokens_used: 0,
      cost_usd: 0,
      model: 'noop',
      skipped: true,
      reason: 'empty_chunks',
    };
  }

  // Idempotencia: borrar embeddings previos del mismo job (re-extracción).
  const { error: deleteErr } = await supabase
    .from('document_embeddings')
    .delete()
    .eq('job_id', opts.jobId);
  if (deleteErr) {
    sentry.captureException(deleteErr, {
      tags: { feature: 'document-intel', stage: 'embeddings.delete_previous', job_id: opts.jobId },
    });
  }

  const { embeddings, telemetry } = await generateEmbeddings(chunks);

  if (embeddings.length !== chunks.length) {
    throw new Error(
      `embeddings_length_mismatch: expected ${chunks.length}, got ${embeddings.length}`,
    );
  }

  const rows: EmbeddingsInsert[] = chunks.map((chunkText, idx) => {
    const vec = embeddings[idx] ?? [];
    return {
      job_id: opts.jobId,
      desarrolladora_id: opts.desarrolladoraId,
      proyecto_id: opts.proyectoId,
      visibility: opts.visibility,
      chunk_index: idx,
      chunk_text: chunkText,
      embedding: embeddingToPgVector(vec),
      metadata: {
        doc_type: opts.docType,
        file_name: opts.fileName,
        chunks_count: chunks.length,
        model: telemetry.model,
        stub: telemetry.stub,
      } as unknown as Json,
    };
  });

  const { error: insertErr } = await supabase.from('document_embeddings').insert(rows);
  if (insertErr) {
    sentry.captureException(insertErr, {
      tags: { feature: 'document-intel', stage: 'embeddings.insert', job_id: opts.jobId },
    });
    throw new Error(`embeddings_insert_failed: ${insertErr.message}`);
  }

  return {
    chunks_count: chunks.length,
    tokens_used: telemetry.tokens_used,
    cost_usd: telemetry.cost_usd,
    model: telemetry.model,
  };
}
