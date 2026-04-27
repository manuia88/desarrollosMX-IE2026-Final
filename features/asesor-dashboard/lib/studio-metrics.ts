// FASE 14.F.3 Sprint 2 BIBLIA — Cross-function M09 Estadísticas integration (F.3.7).
// KPI summary Studio para integrar en M09 (videos generados + rating promedio).
// Fail-soft: si user no tiene actividad Studio retorna null counts.

import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface StudioMetricsSummary {
  readonly videosGeneratedThisMonth: number;
  readonly videosGeneratedAllTime: number;
  readonly avgRating: number | null;
  readonly hasStudioActivity: boolean;
}

interface StudioFeedbackRow {
  readonly rating: number | null;
}

interface StudioVideoOutputRow {
  readonly created_at: string;
}

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function deriveStudioMetrics(
  outputs: ReadonlyArray<StudioVideoOutputRow>,
  feedback: ReadonlyArray<StudioFeedbackRow>,
): StudioMetricsSummary {
  const start = currentPeriodStart();
  const videosThisMonth = outputs.filter((o) => o.created_at >= start).length;
  const videosAllTime = outputs.length;

  const ratings = feedback
    .map((r) => r.rating)
    .filter((r): r is number => typeof r === 'number' && r >= 1 && r <= 5);
  const avgRating =
    ratings.length > 0
      ? Number((ratings.reduce((acc, r) => acc + r, 0) / ratings.length).toFixed(2))
      : null;

  return {
    videosGeneratedThisMonth: videosThisMonth,
    videosGeneratedAllTime: videosAllTime,
    avgRating,
    hasStudioActivity: videosAllTime > 0,
  };
}

export async function fetchStudioMetricsForUser(userId: string): Promise<StudioMetricsSummary> {
  const supabase = createAdminClient();
  const { data: outputs } = await supabase
    .from('studio_video_outputs')
    .select('created_at')
    .eq('user_id', userId)
    .eq('render_status', 'completed');
  const { data: feedback } = await supabase
    .from('studio_feedback')
    .select('rating')
    .eq('user_id', userId);
  return deriveStudioMetrics(outputs ?? [], feedback ?? []);
}
