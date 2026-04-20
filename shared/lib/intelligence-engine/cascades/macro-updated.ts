// Cascade macro_updated — manual trigger.
// Trigger SQL primario en migration 20260420075500 al INSERT macro_series.
// Este módulo expone variant callable (backfill tooling, tests).

import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseScoreQueue } from '../queue';
import { getScoresForCascade } from './dependency-graph';

export interface MacroCascadeInput {
  readonly countryCode: string;
  readonly zoneIds: readonly string[];
}

export interface MacroCascadeResult {
  readonly totalEnqueued: number;
  readonly scoresPerZone: number;
}

export async function triggerMacroUpdatedCascade(
  supabase: SupabaseClient,
  input: MacroCascadeInput,
): Promise<MacroCascadeResult> {
  const scores = getScoresForCascade('macro_updated');
  const queue = new SupabaseScoreQueue(supabase);
  let total = 0;
  for (const zoneId of input.zoneIds) {
    for (const scoreId of scores) {
      const r = await queue.enqueue({
        scoreId,
        entityType: 'zone',
        entityId: zoneId,
        countryCode: input.countryCode,
        triggeredBy: 'cascade:macro_updated',
        priority: 8,
        batchMode: true,
      });
      if (r.enqueued) total++;
    }
  }
  return { totalEnqueued: total, scoresPerZone: scores.length };
}
