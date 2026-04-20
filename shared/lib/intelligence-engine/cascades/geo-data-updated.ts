// Cascade geo_data_updated — manual trigger from code (tests + backfills).
// Trigger SQL primario vive en migration 20260420075500 y dispara en cada
// INSERT into geo_data_points. Este módulo expone interface TS compatible
// con replay + admin tooling.

import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseScoreQueue } from '../queue';
import { getScoresForGeoSource } from './dependency-graph';

export interface GeoDataCascadeInput {
  readonly source: string;
  readonly zoneId: string;
  readonly countryCode: string;
}

export interface GeoDataCascadeResult {
  readonly scoresEnqueued: readonly string[];
  readonly failed: readonly string[];
}

export async function triggerGeoDataUpdatedCascade(
  supabase: SupabaseClient,
  input: GeoDataCascadeInput,
): Promise<GeoDataCascadeResult> {
  const scores = getScoresForGeoSource(input.source);
  if (scores.length === 0) {
    return { scoresEnqueued: [], failed: [] };
  }
  const queue = new SupabaseScoreQueue(supabase);
  const enqueued: string[] = [];
  const failed: string[] = [];
  for (const scoreId of scores) {
    const r = await queue.enqueue({
      scoreId,
      entityType: 'zone',
      entityId: input.zoneId,
      countryCode: input.countryCode,
      triggeredBy: `cascade:geo_data_updated:${input.source}`,
      priority: 8,
      batchMode: true,
    });
    if (r.enqueued) enqueued.push(scoreId);
    else failed.push(scoreId);
  }
  return { scoresEnqueued: enqueued, failed };
}
