// F14.F.9 Sprint 8 BIBLIA Upgrade 2 — Music continuity engine.
// Tema musical compartido entre episodios + variations per phase (intro/desarrollo/climax/cierre).

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export type MusicPhaseVariation = 'intro' | 'desarrollo' | 'climax' | 'cierre';

export interface GenerateThemeTrackResult {
  readonly seriesId: string;
  readonly themeTrackId: string | null;
  readonly status: 'pending' | 'completed';
  readonly costUsd: number;
  readonly mood: string;
}

export interface GenerateEpisodeVariationResult {
  readonly seriesId: string;
  readonly episodeNumber: number;
  readonly phase: MusicPhaseVariation;
  readonly variationTrackId: string | null;
  readonly costUsd: number;
}

const ELEVENLABS_MUSIC_COST_PER_TRACK_USD = 0.25;

const MOOD_BY_PHASE: Record<MusicPhaseVariation, string> = {
  intro: 'motivacional anticipatorio crescendo',
  desarrollo: 'sostenido equilibrado optimista',
  climax: 'epico emotivo inspirador',
  cierre: 'resolucion reflexiva calida',
};

export async function generateThemeTrack(
  userId: string,
  seriesId: string,
  mood?: string,
): Promise<GenerateThemeTrackResult> {
  const supabase = createAdminClient();

  const { data: serie } = await supabase
    .from('studio_series_projects')
    .select('id, music_theme_track_id, template_id')
    .eq('id', seriesId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!serie) throw new TRPCError({ code: 'NOT_FOUND' });

  let themeMood = mood;
  if (!themeMood && serie.template_id) {
    const { data: tpl } = await supabase
      .from('studio_series_templates')
      .select('music_theme_mood')
      .eq('id', serie.template_id)
      .maybeSingle();
    themeMood = tpl?.music_theme_mood ?? undefined;
  }
  if (!themeMood) themeMood = 'cinematic_uplifting';

  const { data: track, error: trackErr } = await supabase
    .from('studio_music_tracks')
    .insert({
      name: `Series theme ${seriesId.slice(0, 8)}`,
      provider: 'elevenlabs_music',
      mood: themeMood,
      duration_seconds: 90,
      uploaded_by: userId,
      meta: {
        kind: 'series_theme',
        series_id: seriesId,
        status: 'pending',
        cost_usd: ELEVENLABS_MUSIC_COST_PER_TRACK_USD,
      } as never,
    })
    .select('id')
    .single();
  if (trackErr) {
    sentry.captureException(trackErr, {
      tags: { feature: 'dmx-studio.series.music-theme' },
    });
    return {
      seriesId,
      themeTrackId: null,
      status: 'pending',
      costUsd: 0,
      mood: themeMood,
    };
  }

  await supabase
    .from('studio_series_projects')
    .update({ music_theme_track_id: track.id })
    .eq('id', seriesId);

  return {
    seriesId,
    themeTrackId: track.id,
    status: 'pending',
    costUsd: ELEVENLABS_MUSIC_COST_PER_TRACK_USD,
    mood: themeMood,
  };
}

export async function generateEpisodeVariation(
  userId: string,
  seriesId: string,
  episodeNumber: number,
  phase: MusicPhaseVariation,
): Promise<GenerateEpisodeVariationResult> {
  const supabase = createAdminClient();
  const { data: serie } = await supabase
    .from('studio_series_projects')
    .select('id, music_theme_track_id')
    .eq('id', seriesId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!serie) throw new TRPCError({ code: 'NOT_FOUND' });

  const variationMood = MOOD_BY_PHASE[phase];
  const { data: track, error } = await supabase
    .from('studio_music_tracks')
    .insert({
      name: `Series variation ${seriesId.slice(0, 8)} ep${episodeNumber} ${phase}`,
      provider: 'elevenlabs_music',
      mood: variationMood,
      duration_seconds: 30,
      uploaded_by: userId,
      meta: {
        kind: 'series_variation',
        series_id: seriesId,
        episode_number: episodeNumber,
        phase,
        base_theme_track_id: serie.music_theme_track_id,
        status: 'pending',
        cost_usd: ELEVENLABS_MUSIC_COST_PER_TRACK_USD,
      } as never,
    })
    .select('id')
    .single();
  if (error) {
    sentry.captureException(error, {
      tags: { feature: 'dmx-studio.series.music-variation' },
    });
    return {
      seriesId,
      episodeNumber,
      phase,
      variationTrackId: null,
      costUsd: 0,
    };
  }

  return {
    seriesId,
    episodeNumber,
    phase,
    variationTrackId: track.id,
    costUsd: ELEVENLABS_MUSIC_COST_PER_TRACK_USD,
  };
}
