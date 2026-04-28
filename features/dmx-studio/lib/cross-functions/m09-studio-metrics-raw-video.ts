// F14.F.6 Sprint 5 BIBLIA CROSS-FUNCTION 10 — M09 Studio metrics expand raw video.
// Hours raw processed + filler reduction % + bad takes removed.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export type AdminSupabase = SupabaseClient<Database>;

export interface RawVideoMetrics {
  hoursRawProcessed: number;
  fillerReductionAvgPct: number | null;
  badTakesRemovedTotal: number;
  videosProcessedCount: number;
}

interface RawVideoRow {
  duration_seconds: number | null;
  cuts_applied: boolean;
}

interface AnalyticsRow {
  filler_ratio_pct: number | null;
}

interface EdlCutRow {
  edl: unknown;
}

export async function computeRawVideoMetrics(
  supabase: AdminSupabase,
  userId: string,
): Promise<RawVideoMetrics> {
  const { data: videos } = await supabase
    .from('studio_raw_videos')
    .select('duration_seconds, cuts_applied')
    .eq('user_id', userId)
    .returns<RawVideoRow[]>();

  const totalSeconds = (videos ?? []).reduce((sum, v) => sum + Number(v.duration_seconds ?? 0), 0);
  const hoursRawProcessed = Math.round((totalSeconds / 3600) * 100) / 100;
  const videosProcessedCount = (videos ?? []).filter((v) => v.cuts_applied).length;

  const { data: analyticsRows } = await supabase
    .from('studio_speech_analytics')
    .select('filler_ratio_pct')
    .eq('user_id', userId)
    .returns<AnalyticsRow[]>();
  const ratios = (analyticsRows ?? [])
    .map((r) => r.filler_ratio_pct)
    .filter((r): r is number => typeof r === 'number');
  const fillerReductionAvgPct =
    ratios.length === 0
      ? null
      : Math.round((ratios.reduce((s, r) => s + r, 0) / ratios.length) * 100) / 100;

  const { data: cutsRows } = await supabase
    .from('studio_raw_videos')
    .select('edl')
    .eq('user_id', userId)
    .eq('cuts_applied', true)
    .returns<EdlCutRow[]>();
  let badTakesRemovedTotal = 0;
  for (const row of cutsRows ?? []) {
    const edl = Array.isArray(row.edl) ? row.edl : [];
    badTakesRemovedTotal += edl.filter((c) => {
      const cut = c as { reason?: string };
      return cut.reason === 'bad_take' || cut.reason === 'repetition';
    }).length;
  }

  return {
    hoursRawProcessed,
    fillerReductionAvgPct,
    badTakesRemovedTotal,
    videosProcessedCount,
  };
}
