// F14.F.9 Sprint 8 BIBLIA Tarea 8.4 — Series templates accessor helpers.
// 4 templates canon insertados via seed migration 20260428031149_studio_series_templates_seeds.sql.

import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface SeriesTemplate {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly category: 'residencial' | 'comercial' | 'mixto' | 'custom';
  readonly description: string | null;
  readonly defaultTotalEpisodes: number;
  readonly narrativeArc: ReadonlyArray<{
    readonly episode_number: number;
    readonly phase: string;
    readonly suggested_title: string;
    readonly suggested_duration_sec: number;
    readonly key_visuals: ReadonlyArray<string>;
  }>;
  readonly visualStyle: Record<string, unknown>;
  readonly musicThemeMood: string | null;
  readonly thumbnailStoragePath: string | null;
}

export const TEMPLATE_SLUGS_CANON = [
  'residencial-clasico',
  'residencial-premium',
  'comercial-oficinas',
  'mixto-residencial-comercial',
] as const;

export async function listTemplates(
  category?: SeriesTemplate['category'],
): Promise<ReadonlyArray<SeriesTemplate>> {
  const supabase = createAdminClient();
  let query = supabase
    .from('studio_series_templates')
    .select(
      'id, slug, name, category, description, default_total_episodes, narrative_arc, visual_style, music_theme_mood, thumbnail_storage_path',
    )
    .eq('is_active', true)
    .order('default_total_episodes', { ascending: true });
  if (category) {
    query = query.eq('category', category);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(toSeriesTemplate);
}

export async function getTemplateBySlug(slug: string): Promise<SeriesTemplate | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('studio_series_templates')
    .select(
      'id, slug, name, category, description, default_total_episodes, narrative_arc, visual_style, music_theme_mood, thumbnail_storage_path',
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error || !data) return null;
  return toSeriesTemplate(data);
}

function toSeriesTemplate(row: Record<string, unknown>): SeriesTemplate {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    category: row.category as SeriesTemplate['category'],
    description: (row.description as string | null) ?? null,
    defaultTotalEpisodes: Number(row.default_total_episodes),
    narrativeArc: Array.isArray(row.narrative_arc)
      ? (row.narrative_arc as SeriesTemplate['narrativeArc'])
      : [],
    visualStyle: (row.visual_style as Record<string, unknown>) ?? {},
    musicThemeMood: (row.music_theme_mood as string | null) ?? null,
    thumbnailStoragePath: (row.thumbnail_storage_path as string | null) ?? null,
  };
}
