// F14.F.5 Sprint 4 UPGRADE 11 CROSS-FN — M09 Estadísticas Studio metrics.
// Owned por sub-agent 5. Función standalone para que features/estadisticas/
// pueda consumir y mostrar Studio KPIs (racha + remarketing + challenges).
// NO modifica features/estadisticas/ — sólo expone la función pura.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export type AdminSupabase = SupabaseClient<Database>;

export interface StudioMetricsForAsesor {
  readonly streakCurrentDays: number;
  readonly streakLongestDays: number;
  readonly totalVideosGenerated: number;
  readonly remarketingAutoCount: number;
  readonly challengesCompletedCount: number;
}

export async function getStudioMetricsForAsesor(
  supabase: AdminSupabase,
  userId: string,
): Promise<StudioMetricsForAsesor> {
  const streakResp = await supabase
    .from('studio_streaks')
    .select('current_streak_days, longest_streak_days, total_videos_generated')
    .eq('user_id', userId)
    .maybeSingle();
  if (streakResp.error) {
    throw new Error(`getStudioMetricsForAsesor streaks failed: ${streakResp.error.message}`);
  }

  const remarketingResp = await supabase
    .from('studio_remarketing_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');
  if (remarketingResp.error) {
    throw new Error(
      `getStudioMetricsForAsesor remarketing count failed: ${remarketingResp.error.message}`,
    );
  }

  const challengesResp = await supabase
    .from('studio_challenge_participations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('completed_at', 'is', null);
  if (challengesResp.error) {
    throw new Error(
      `getStudioMetricsForAsesor challenges count failed: ${challengesResp.error.message}`,
    );
  }

  return {
    streakCurrentDays: streakResp.data?.current_streak_days ?? 0,
    streakLongestDays: streakResp.data?.longest_streak_days ?? 0,
    totalVideosGenerated: streakResp.data?.total_videos_generated ?? 0,
    remarketingAutoCount: remarketingResp.count ?? 0,
    challengesCompletedCount: challengesResp.count ?? 0,
  };
}
