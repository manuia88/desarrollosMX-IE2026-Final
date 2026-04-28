// F14.F.9 Sprint 8 BIBLIA Tarea 8.2 — Seedance multi-shot consistency engine.
// Genera episodio video con consistencia visual previa (12 refs).

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface GenerateConsistentEpisodeResult {
  readonly episodeId: string;
  readonly seedanceJobId: string | null;
  readonly status: 'pending' | 'in_progress';
  readonly refsCount: number;
  readonly costEstimateUsd: number;
}

const SEEDANCE_COST_PER_CLIP_USD = 0.35;

export async function generateConsistentEpisode(
  userId: string,
  seriesId: string,
  episodeId: string,
): Promise<GenerateConsistentEpisodeResult> {
  const supabase = createAdminClient();

  const { data: serie } = await supabase
    .from('studio_series_projects')
    .select('id, visual_consistency_refs')
    .eq('id', seriesId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!serie) throw new TRPCError({ code: 'NOT_FOUND', message: 'Series not found' });

  const { data: episode } = await supabase
    .from('studio_series_episodes')
    .select('id, episode_number, title, narrative_phase, project_id')
    .eq('id', episodeId)
    .eq('series_id', seriesId)
    .maybeSingle();
  if (!episode) throw new TRPCError({ code: 'NOT_FOUND', message: 'Episode not found' });

  const refs = (serie.visual_consistency_refs ?? []) as ReadonlyArray<string>;
  if (refs.length === 0) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Construye refs visuales antes de generar episodio (buildVisualRefs).',
    });
  }

  let projectId = episode.project_id;
  if (!projectId) {
    const { data: project, error: projErr } = await supabase
      .from('studio_video_projects')
      .insert({
        user_id: userId,
        title: `${episode.title} (Cap ${episode.episode_number})`,
        status: 'draft',
        project_type: 'series_episode',
        meta: {
          kind: 'series_episode',
          series_id: seriesId,
          episode_id: episodeId,
          narrative_phase: episode.narrative_phase,
        } as never,
      })
      .select('id')
      .single();
    if (projErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: projErr });
    projectId = project.id;
  }

  const { data: job, error: jobErr } = await supabase
    .from('studio_api_jobs')
    .insert({
      user_id: userId,
      provider: 'fal_ai',
      job_type: 'seedance_multi_shot',
      status: 'pending',
      estimated_cost_usd: SEEDANCE_COST_PER_CLIP_USD,
      input_payload: {
        series_id: seriesId,
        episode_id: episodeId,
        project_id: projectId,
        refs_count: refs.length,
        narrative_phase: episode.narrative_phase,
      } as never,
    })
    .select('id')
    .single();
  if (jobErr)
    sentry.captureException(jobErr, { tags: { feature: 'dmx-studio.series.multi-shot-job' } });

  await supabase
    .from('studio_series_episodes')
    .update({ project_id: projectId, status: 'in_progress' })
    .eq('id', episodeId);

  return {
    episodeId,
    seedanceJobId: job?.id ?? null,
    status: 'in_progress',
    refsCount: refs.length,
    costEstimateUsd: SEEDANCE_COST_PER_CLIP_USD,
  };
}
