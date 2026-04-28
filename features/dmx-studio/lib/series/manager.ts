// F14.F.9 Sprint 8 BIBLIA Tarea 8.1 — Series manager.
// Crea series asociadas a desarrollo M02 (cross-feature ADR-056) con narrative arc Claude.

import { TRPCError } from '@trpc/server';
import type { CreateSeriesInput } from '@/features/dmx-studio/schemas';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { generateNarrativeArc, type NarrativeArcEpisode } from './narrative-generator';

export interface CreatedSeriesResult {
  readonly seriesId: string;
  readonly title: string;
  readonly totalEpisodes: number;
  readonly templateUsed: string | null;
}

export async function createSeries(
  userId: string,
  input: CreateSeriesInput,
): Promise<CreatedSeriesResult> {
  const supabase = createAdminClient();

  let narrativeArc: ReadonlyArray<NarrativeArcEpisode> = [];
  let totalEpisodes = input.totalEpisodes ?? 0;
  let templateUsedSlug: string | null = null;

  if (input.templateId) {
    const { data: tpl, error: tplErr } = await supabase
      .from('studio_series_templates')
      .select('slug, default_total_episodes, narrative_arc')
      .eq('id', input.templateId)
      .eq('is_active', true)
      .maybeSingle();
    if (tplErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: tplErr });
    if (!tpl) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' });
    templateUsedSlug = tpl.slug;
    totalEpisodes = totalEpisodes || tpl.default_total_episodes;
    narrativeArc = (tpl.narrative_arc as unknown as ReadonlyArray<NarrativeArcEpisode>) ?? [];
  } else {
    if (totalEpisodes < 2) totalEpisodes = 5;
    const opts: { desarrolloId?: string; title?: string } = { title: input.title };
    if (input.desarrolloId !== undefined) opts.desarrolloId = input.desarrolloId;
    const arc = await generateNarrativeArc(userId, null, totalEpisodes, opts);
    narrativeArc = arc.arc;
  }

  const { data: serie, error } = await supabase
    .from('studio_series_projects')
    .insert({
      user_id: userId,
      title: input.title,
      series_type: 'documentary',
      episodes_count: totalEpisodes,
      template_id: input.templateId ?? null,
      desarrollo_id: input.desarrolloId ?? null,
      narrative_arc: narrativeArc as never,
      auto_progress_enabled: input.enableAutoProgress,
      meta: input.description ? { description: input.description } : {},
    })
    .select('id, title, episodes_count')
    .single();
  if (error || !serie)
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error ?? undefined });

  const episodeRows = narrativeArc.map((ep) => ({
    series_id: serie.id,
    episode_number: ep.episode_number,
    title: ep.suggested_title,
    narrative_phase: ep.phase,
    status: 'pending' as const,
  }));
  if (episodeRows.length > 0) {
    const { error: epErr } = await supabase.from('studio_series_episodes').insert(episodeRows);
    if (epErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: epErr });
  }

  return {
    seriesId: serie.id,
    title: serie.title,
    totalEpisodes: serie.episodes_count,
    templateUsed: templateUsedSlug,
  };
}
