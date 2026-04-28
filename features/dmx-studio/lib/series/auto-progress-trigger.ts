// F14.F.9 Sprint 8 BIBLIA Upgrade 1 — Auto-progress trigger.
// Cuando obra avanza fase, sugerir generar proximo episodio (Reaccion automatica via cron daily).

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { analyzeProgressForRecommendation } from './narrative-analyst';

export interface ProgressTrigger {
  readonly seriesId: string;
  readonly seriesTitle: string;
  readonly nextEpisodeNumber: number | null;
  readonly recommendedFocus: string;
  readonly urgencyLevel: 'low' | 'medium' | 'high';
  readonly reasoning: string;
}

export interface CheckProgressTriggersResult {
  readonly triggers: ReadonlyArray<ProgressTrigger>;
  readonly checkedAt: string;
}

export async function checkProgressTriggers(
  userId: string,
  manual = false,
): Promise<CheckProgressTriggersResult> {
  const supabase = createAdminClient();
  let query = supabase
    .from('studio_series_projects')
    .select('id, title, desarrollo_id, auto_progress_enabled, status')
    .eq('user_id', userId)
    .in('status', ['draft', 'in_production']);

  if (!manual) {
    query = query.eq('auto_progress_enabled', true);
  }

  const { data: series, error } = await query;
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });

  const triggers: ProgressTrigger[] = [];
  for (const serie of series ?? []) {
    if (!serie.desarrollo_id) continue;
    try {
      const recommendation = await analyzeProgressForRecommendation(serie.id);
      if (recommendation.urgencyLevel === 'medium' || recommendation.urgencyLevel === 'high') {
        triggers.push({
          seriesId: serie.id,
          seriesTitle: serie.title,
          nextEpisodeNumber: recommendation.nextEpisodeNumber,
          recommendedFocus: recommendation.recommendedFocus,
          urgencyLevel: recommendation.urgencyLevel,
          reasoning: recommendation.reasoning,
        });
      }
    } catch (err) {
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.series.auto-progress-check' },
      });
    }
  }

  return {
    triggers,
    checkedAt: new Date().toISOString(),
  };
}

export async function enableAutoProgress(
  userId: string,
  seriesId: string,
  enabled: boolean,
): Promise<{ ok: true; autoProgressEnabled: boolean }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('studio_series_projects')
    .update({ auto_progress_enabled: enabled })
    .eq('id', seriesId)
    .eq('user_id', userId)
    .select('auto_progress_enabled')
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
  return { ok: true, autoProgressEnabled: Boolean(data.auto_progress_enabled) };
}

export async function manualTriggerEpisode(
  userId: string,
  seriesId: string,
): Promise<{
  ok: true;
  episodeId: string | null;
  episodeNumber: number | null;
}> {
  const supabase = createAdminClient();
  const { data: serie } = await supabase
    .from('studio_series_projects')
    .select('id')
    .eq('id', seriesId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!serie) throw new TRPCError({ code: 'NOT_FOUND' });

  const { data: episode } = await supabase
    .from('studio_series_episodes')
    .select('id, episode_number')
    .eq('series_id', seriesId)
    .in('status', ['pending', 'recommended'])
    .order('episode_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!episode) {
    return { ok: true, episodeId: null, episodeNumber: null };
  }

  const { error: updErr } = await supabase
    .from('studio_series_episodes')
    .update({ status: 'in_progress' })
    .eq('id', episode.id);
  if (updErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: updErr });

  return {
    ok: true,
    episodeId: episode.id,
    episodeNumber: episode.episode_number,
  };
}
