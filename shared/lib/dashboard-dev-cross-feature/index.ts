// ADR-056 — Studio Sprint 8 cross-feature M10 Dashboard Dev integration.
// Read-only API: si user developer tiene serie en produccion vinculada a desarrollo,
// el dashboard developer expone widget "Serie activa" via este module.

import { createAdminClient } from '@/shared/lib/supabase/admin';

export type DashboardWidgetType = 'studio_serie_activa' | 'studio_metrics' | 'studio_streaks';

export interface ActiveSeriesWidgetData {
  readonly seriesId: string;
  readonly title: string;
  readonly nextEpisodeNumber: number | null;
  readonly nextEpisodeTitle: string | null;
  readonly totalEpisodes: number;
  readonly publishedEpisodes: number;
  readonly desarrolloId: string | null;
  readonly desarrolloNombre: string | null;
  readonly autoProgressEnabled: boolean;
}

export async function getActiveSeriesForDeveloper(
  userId: string,
): Promise<ActiveSeriesWidgetData | null> {
  const supabase = createAdminClient();
  const { data: series } = await supabase
    .from('studio_series_projects')
    .select(
      'id, title, episodes_count, status, desarrollo_id, auto_progress_enabled, episode_project_ids, updated_at',
    )
    .eq('user_id', userId)
    .in('status', ['in_production', 'draft'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!series) return null;

  const { data: episodes } = await supabase
    .from('studio_series_episodes')
    .select('episode_number, title, status')
    .eq('series_id', series.id)
    .order('episode_number', { ascending: true });

  const eps = episodes ?? [];
  const total = Math.max(series.episodes_count ?? 0, eps.length);
  const published = eps.filter((e) => e.status === 'published').length;
  const next =
    eps.find(
      (e) => e.status === 'pending' || e.status === 'recommended' || e.status === 'in_progress',
    ) ?? null;

  let desarrolloNombre: string | null = null;
  if (series.desarrollo_id) {
    const { data: desarrollo } = await supabase
      .from('proyectos')
      .select('nombre')
      .eq('id', series.desarrollo_id)
      .maybeSingle();
    desarrolloNombre = desarrollo?.nombre ?? null;
  }

  return {
    seriesId: series.id,
    title: series.title,
    nextEpisodeNumber: next?.episode_number ?? null,
    nextEpisodeTitle: next?.title ?? null,
    totalEpisodes: total,
    publishedEpisodes: published,
    desarrolloId: series.desarrollo_id ?? null,
    desarrolloNombre,
    autoProgressEnabled: Boolean(series.auto_progress_enabled),
  };
}

export async function shouldShowStudioWidget(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('studio_series_projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) return false;
  return (count ?? 0) > 0;
}
