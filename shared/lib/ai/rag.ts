import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { embedOne } from './embed';

export type RagMatch = {
  id: string;
  source_type: string;
  source_id: string;
  content: string;
  similarity: number;
  meta: Record<string, unknown>;
  citation: string;
};

export type RagOpts = {
  sourceTypes?: string[];
  country?: string;
  limit?: number;
  minSimilarity?: number;
};

function embeddingToSql(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

export async function rag(
  supabase: SupabaseClient<Database>,
  query: string,
  opts: RagOpts = {},
): Promise<RagMatch[]> {
  const embedding = await embedOne(query);
  const { data, error } = await supabase.rpc('match_embeddings', {
    p_embedding: embeddingToSql(embedding),
    ...(opts.sourceTypes ? { p_source_types: opts.sourceTypes } : {}),
    ...(opts.country ? { p_country_code: opts.country } : {}),
    p_match_count: opts.limit ?? 8,
    p_min_similarity: opts.minSimilarity ?? 0.7,
  });

  if (error) throw error;

  return (data ?? []).map((m) => ({
    id: m.id,
    source_type: m.source_type,
    source_id: m.source_id,
    content: m.content,
    similarity: m.similarity,
    meta: (m.meta ?? {}) as Record<string, unknown>,
    citation: `${m.source_type}:${m.source_id}`,
  }));
}
