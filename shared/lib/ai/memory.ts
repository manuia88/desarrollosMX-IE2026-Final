import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { embedOne } from './embed';

export type MemoryScope = 'user' | 'project' | 'session';

type RememberOpts = {
  ttlSeconds?: number;
  importance?: number;
  embed?: boolean;
};

type RecallOpts = {
  query?: string;
  limit?: number;
  minImportance?: number;
  minSimilarity?: number;
};

export type MemoryRecord = {
  id: string;
  key: string;
  value: unknown;
  importance_score: number;
  similarity?: number;
  updated_at: string;
};

export class MemoryClient {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  namespace(scope: MemoryScope, id?: string): string {
    if (scope === 'user') return `user:${this.userId}`;
    if (!id) throw new Error(`memory_namespace_missing_id:${scope}`);
    return `${scope}:${id}`;
  }

  async remember(
    namespace: string,
    key: string,
    value: unknown,
    opts: RememberOpts = {},
  ): Promise<void> {
    const embedding = opts.embed === false ? null : await embedOne(stringifyValue(value));
    const expires_at = opts.ttlSeconds
      ? new Date(Date.now() + opts.ttlSeconds * 1000).toISOString()
      : null;

    const { error } = await this.supabase.from('ai_memory_store').upsert(
      {
        user_id: this.userId,
        namespace,
        key,
        value: value as Database['public']['Tables']['ai_memory_store']['Insert']['value'],
        embedding: embedding ? embeddingToSql(embedding) : null,
        importance_score: opts.importance ?? 0.5,
        expires_at,
      },
      { onConflict: 'user_id,namespace,key' },
    );

    if (error) throw error;
  }

  async recall(namespace: string, opts: RecallOpts = {}): Promise<MemoryRecord[]> {
    if (opts.query) {
      const embedding = await embedOne(opts.query);
      const { data, error } = await this.supabase.rpc('match_ai_memory', {
        p_namespace: namespace,
        p_embedding: embeddingToSql(embedding),
        p_match_count: opts.limit ?? 10,
        p_min_similarity: opts.minSimilarity ?? 0.6,
      });
      if (error) throw error;
      const records = (data ?? []) as Array<{
        id: string;
        key: string;
        value: unknown;
        importance_score: number;
        similarity: number;
        updated_at: string;
      }>;
      return records.filter((r) => r.importance_score >= (opts.minImportance ?? 0));
    }

    const { data, error } = await this.supabase
      .from('ai_memory_store')
      .select('id, key, value, importance_score, updated_at')
      .eq('user_id', this.userId)
      .eq('namespace', namespace)
      .gte('importance_score', opts.minImportance ?? 0)
      .order('updated_at', { ascending: false })
      .limit(opts.limit ?? 10);

    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      key: r.key,
      value: r.value,
      importance_score: r.importance_score,
      updated_at: r.updated_at,
    }));
  }

  async forget(namespace: string, key: string): Promise<void> {
    const { error } = await this.supabase
      .from('ai_memory_store')
      .delete()
      .eq('user_id', this.userId)
      .eq('namespace', namespace)
      .eq('key', key);
    if (error) throw error;
  }
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function embeddingToSql(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
