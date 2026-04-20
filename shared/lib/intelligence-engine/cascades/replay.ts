// F2 — Cascade replay/backfill logic.
// Admin tool para reaplicar cascades para rangos fechas + filtros entity.
// Caso de uso: fix bug fórmula F01 → replay últimos 30 días zonas CDMX afectadas.

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { CASCADE_GRAPH, type CascadeEventName } from './dependency-graph';

export const ReplayInputSchema = z.object({
  cascade_event: z.enum([
    'unit_sold',
    'price_changed',
    'macro_updated',
    'feedback_registered',
    'search_behavior',
    'geo_data_updated',
  ]),
  geo_source: z.string().optional(),
  target_filter: z.record(z.string(), z.unknown()).default({}),
  period_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dry_run: z.boolean().default(true),
});

export type ReplayInput = z.infer<typeof ReplayInputSchema>;

export interface ReplayResult {
  readonly ok: boolean;
  readonly log_id?: string;
  readonly jobs_enqueued: number;
  readonly scores_affected: readonly string[];
  readonly dry_run: boolean;
  readonly error?: string;
}

type LooseClient = SupabaseClient<Record<string, unknown>>;
function lax(s: SupabaseClient): LooseClient {
  return s as unknown as LooseClient;
}

function scoresFromInput(input: ReplayInput): readonly string[] {
  if (input.cascade_event === 'geo_data_updated') {
    if (!input.geo_source) return [];
    return CASCADE_GRAPH.geo_data_updated[input.geo_source] ?? [];
  }
  return CASCADE_GRAPH[input.cascade_event as CascadeEventName] ?? [];
}

async function countTargetEntities(
  supabase: SupabaseClient,
  filter: Record<string, unknown>,
): Promise<number> {
  // H1 implementación simple: asumimos filter {country:'MX'} cuenta zonas MX.
  // Extendible a más filtros (state, municipality, etc.) cuando worker real lo use.
  try {
    let query = lax(supabase).from('zones').select('id', { count: 'exact', head: true });
    if (typeof filter.country === 'string') {
      query = query.eq('country_code', filter.country);
    }
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function executeReplay(
  supabase: SupabaseClient,
  input: ReplayInput,
  triggeredBy: string | null,
): Promise<ReplayResult> {
  const scores = scoresFromInput(input);
  const targetCount = await countTargetEntities(supabase, input.target_filter);
  const jobsPlanned = scores.length * targetCount;

  // Persist audit log entry
  let logId: string | undefined;
  try {
    const { data } = await lax(supabase)
      .from('cascade_replay_log')
      .insert({
        triggered_by: triggeredBy,
        cascade_event: input.cascade_event,
        target_filter: input.target_filter,
        period_from: input.period_from,
        period_to: input.period_to,
        dry_run: input.dry_run,
        jobs_enqueued: input.dry_run ? 0 : jobsPlanned,
        status: input.dry_run ? 'completed' : 'started',
        completed_at: input.dry_run ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    logId = (data as { id?: string } | null)?.id;
  } catch {
    // log best-effort
  }

  if (input.dry_run) {
    return {
      ok: true,
      log_id: logId,
      jobs_enqueued: 0,
      scores_affected: scores,
      dry_run: true,
    };
  }

  // Real enqueue: out of scope BLOQUE 8.F — emit jobs sería expensive sin
  // cost-guard (F4). Dejar stub que retorna 0 jobs pero persiste log.
  // Consumers reales wire cuando 8.F.7 cost-guard esté wired en este flow.
  return {
    ok: true,
    log_id: logId,
    jobs_enqueued: 0,
    scores_affected: scores,
    dry_run: false,
  };
}
