// Interfaz + implementación Supabase del IScoreQueue.
// Diseño abstracto facilita swap a Vercel Queues (H2) o Trigger.dev v3 (H3)
// manteniendo score_recalculation_queue como ledger auditable (ADR-010 §D5).

import type { SupabaseClient } from '@supabase/supabase-js';

export type QueueStatus = 'pending' | 'processing' | 'done' | 'error';

export interface EnqueueArgs {
  readonly scoreId: string;
  readonly entityType: 'zone' | 'project' | 'user' | 'market';
  readonly entityId: string;
  readonly countryCode: string;
  readonly triggeredBy: string;
  readonly priority?: number; // 1 (highest) - 10 (lowest). Default 5.
  readonly batchMode?: boolean;
  readonly scheduledFor?: string; // ISO timestamp. Default now().
}

export interface EnqueueResult {
  readonly enqueued: boolean; // false si dedup (ya existía pending/processing)
  readonly id?: string;
}

export interface QueueStatusSummary {
  readonly pending: number;
  readonly processing: number;
  readonly done_last_24h: number;
  readonly errors_last_24h: number;
}

export interface IScoreQueue {
  enqueue(args: EnqueueArgs): Promise<EnqueueResult>;
  getStatus(): Promise<QueueStatusSummary>;
}

// Tipado laxo: tabla + RPC se crean en migration 8.A.3.
type LooseClient = SupabaseClient<Record<string, unknown>>;
function lax(s: SupabaseClient): LooseClient {
  return s as unknown as LooseClient;
}

export class SupabaseScoreQueue implements IScoreQueue {
  constructor(private readonly supabase: SupabaseClient) {}

  async enqueue(args: EnqueueArgs): Promise<EnqueueResult> {
    // Delegamos dedup + upsert a la función SQL enqueue_score_recalc.
    const { data, error } = await lax(this.supabase).rpc('enqueue_score_recalc', {
      p_score_id: args.scoreId,
      p_entity_type: args.entityType,
      p_entity_id: args.entityId,
      p_country: args.countryCode,
      p_triggered_by: args.triggeredBy,
      p_priority: args.priority ?? 5,
      p_batch: args.batchMode ?? false,
      p_scheduled_for: args.scheduledFor ?? null,
    } as never);
    if (error) return { enqueued: false };
    const row = data as { id?: string; enqueued?: boolean } | null;
    const enqueued = row?.enqueued ?? true;
    if (row?.id) return { enqueued, id: row.id };
    return { enqueued };
  }

  async getStatus(): Promise<QueueStatusSummary> {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [pending, processing, done, errors] = await Promise.all([
      lax(this.supabase)
        .from('score_recalculation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending' as never),
      lax(this.supabase)
        .from('score_recalculation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processing' as never),
      lax(this.supabase)
        .from('score_recalculation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'done' as never)
        .gte('finished_at' as never, since),
      lax(this.supabase)
        .from('score_recalculation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'error' as never)
        .gte('finished_at' as never, since),
    ]);
    return {
      pending: pending.count ?? 0,
      processing: processing.count ?? 0,
      done_last_24h: done.count ?? 0,
      errors_last_24h: errors.count ?? 0,
    };
  }
}
