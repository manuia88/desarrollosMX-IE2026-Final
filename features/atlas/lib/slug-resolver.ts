import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export interface SlugResolution {
  readonly colonia_id: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly country_code: string;
  readonly source_label: string;
}

export async function resolveColoniaIdBySlug(
  slug: string,
  supabase: SupabaseClient<Database>,
): Promise<SlugResolution | null> {
  if (!slug || typeof slug !== 'string') return null;
  const { data, error } = await supabase
    .from('zone_slugs')
    .select('zone_id, slug, scope_type, country_code, source_label')
    .eq('slug', slug)
    .eq('scope_type', 'colonia')
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    colonia_id: data.zone_id,
    slug: data.slug,
    scope_type: data.scope_type,
    country_code: data.country_code,
    source_label: data.source_label,
  };
}

export async function resolveSlugByColoniaId(
  coloniaId: string,
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  if (!coloniaId || typeof coloniaId !== 'string') return null;
  const { data, error } = await supabase
    .from('zone_slugs')
    .select('slug')
    .eq('zone_id', coloniaId)
    .eq('scope_type', 'colonia')
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.slug;
}
