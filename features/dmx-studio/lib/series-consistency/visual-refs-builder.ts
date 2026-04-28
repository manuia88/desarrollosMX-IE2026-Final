// F14.F.9 Sprint 8 BIBLIA Tarea 8.2 — Visual refs builder.
// Construye refs visuales (hasta 12) para Seedance multi-shot consistency.

import { TRPCError } from '@trpc/server';
import { getDesarrolloAssets } from '@/shared/lib/desarrollos-cross-feature';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const MAX_REFS = 12;

export interface BuildVisualRefsResult {
  readonly seriesId: string;
  readonly refs: ReadonlyArray<string>;
  readonly source: 'desarrollo_photos' | 'previous_episodes' | 'hybrid';
}

export async function buildVisualRefs(
  userId: string,
  seriesId: string,
): Promise<BuildVisualRefsResult> {
  const supabase = createAdminClient();
  const { data: serie } = await supabase
    .from('studio_series_projects')
    .select('id, desarrollo_id, episode_project_ids, visual_consistency_refs')
    .eq('id', seriesId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!serie) throw new TRPCError({ code: 'NOT_FOUND' });

  const refs: string[] = [];
  let source: BuildVisualRefsResult['source'] = 'desarrollo_photos';

  const previousEpisodeIds = (serie.episode_project_ids ?? []) as ReadonlyArray<string>;
  if (previousEpisodeIds.length > 0) {
    const { data: previousAssets } = await supabase
      .from('studio_video_assets')
      .select('storage_url')
      .in('project_id', previousEpisodeIds.slice(0, 6))
      .limit(MAX_REFS);
    for (const asset of previousAssets ?? []) {
      if (typeof asset.storage_url === 'string') refs.push(asset.storage_url);
    }
    source = 'previous_episodes';
  }

  if (refs.length < MAX_REFS && serie.desarrollo_id) {
    const desarrolloAssets = await getDesarrolloAssets(serie.desarrollo_id);
    for (const asset of desarrolloAssets) {
      if (refs.length >= MAX_REFS) break;
      refs.push(asset.storagePath);
    }
    source = previousEpisodeIds.length > 0 ? 'hybrid' : 'desarrollo_photos';
  }

  const finalRefs = refs.slice(0, MAX_REFS);
  await supabase
    .from('studio_series_projects')
    .update({ visual_consistency_refs: finalRefs })
    .eq('id', seriesId);

  return { seriesId, refs: finalRefs, source };
}
