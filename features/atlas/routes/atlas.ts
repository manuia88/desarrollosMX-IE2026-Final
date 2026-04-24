// BLOQUE 11.S — Living Atlas tRPC router (público).
//
// Endpoints:
//   - getByColoniaSlug({slug}) → WikiEntry | null
//   - listPublishedColonias({countryCode, limit}) → AtlasListedColonia[]
//
// Ambos usan publicProcedure (contenido es producto editorial abierto
// post-seed LLM). RLS de colonia_wiki_entries restringe a
// published=true. zone_slugs es íntegramente public_read.

import { TRPCError } from '@trpc/server';
import {
  getByColoniaSlugInputSchema,
  listPublishedColoniasInputSchema,
} from '@/features/atlas/schemas/atlas';
import type { AtlasListedColonia, WikiEntry, WikiSection } from '@/features/atlas/types';
import { WIKI_SECTION_KEYS, type WikiSectionKey } from '@/features/atlas/types';
import { publicProcedure, router } from '@/server/trpc/init';
import { batchResolveZoneLabels } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClientExt } from '@/shared/lib/supabase/admin-ext';

interface JsonbSection {
  readonly heading?: unknown;
  readonly content_md?: unknown;
}

function parseSections(raw: unknown): ReadonlyArray<WikiSection> {
  if (!raw || typeof raw !== 'object') return [];
  const record = raw as Record<string, unknown>;
  const out: WikiSection[] = [];
  for (const key of WIKI_SECTION_KEYS) {
    const value = record[key] as JsonbSection | undefined;
    if (!value || typeof value !== 'object') continue;
    const heading = typeof value.heading === 'string' ? value.heading : null;
    const content = typeof value.content_md === 'string' ? value.content_md : null;
    if (!heading || !content) continue;
    out.push({ key: key as WikiSectionKey, heading, content_md: content });
  }
  return out;
}

export const atlasRouter = router({
  getByColoniaSlug: publicProcedure
    .input(getByColoniaSlugInputSchema)
    .query(async ({ input }): Promise<WikiEntry | null> => {
      const supabase = createAdminClientExt();

      const { data: slugRow, error: slugError } = await supabase
        .from('zone_slugs')
        .select('zone_id, slug, scope_type, country_code, source_label')
        .eq('slug', input.slug)
        .eq('scope_type', 'colonia')
        .limit(1)
        .maybeSingle();
      if (slugError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `zone_slugs lookup failed: ${slugError.message}`,
        });
      }
      if (!slugRow) return null;

      const { data: wikiRow, error: wikiError } = await supabase
        .from('colonia_wiki_entries')
        .select('id, colonia_id, version, content_md, sections, published, reviewed, edited_at')
        .eq('colonia_id', slugRow.zone_id)
        .eq('published', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (wikiError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `colonia_wiki_entries lookup failed: ${wikiError.message}`,
        });
      }
      if (!wikiRow) return null;

      const sections = parseSections(wikiRow.sections);
      const entry: WikiEntry = {
        id: wikiRow.id,
        colonia_id: wikiRow.colonia_id,
        slug: slugRow.slug,
        label: slugRow.source_label,
        version: wikiRow.version,
        content_md: wikiRow.content_md,
        sections,
        published: wikiRow.published,
        reviewed: wikiRow.reviewed,
        edited_at: wikiRow.edited_at,
      };
      return entry;
    }),

  listPublishedColonias: publicProcedure
    .input(listPublishedColoniasInputSchema)
    .query(async ({ input }): Promise<ReadonlyArray<AtlasListedColonia>> => {
      const supabase = createAdminClientExt();

      const { data: publishedRows, error: wikiError } = await supabase
        .from('colonia_wiki_entries')
        .select('colonia_id, published')
        .eq('published', true);
      if (wikiError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `colonia_wiki_entries list failed: ${wikiError.message}`,
        });
      }
      const publishedIds = new Set<string>();
      for (const row of publishedRows ?? []) {
        if (row.colonia_id) publishedIds.add(row.colonia_id);
      }
      if (publishedIds.size === 0) return [];

      const { data: slugRows, error: slugError } = await supabase
        .from('zone_slugs')
        .select('zone_id, slug, country_code, source_label')
        .eq('scope_type', 'colonia')
        .eq('country_code', input.countryCode)
        .in('zone_id', Array.from(publishedIds))
        .order('source_label', { ascending: true })
        .limit(input.limit);
      if (slugError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `zone_slugs list failed: ${slugError.message}`,
        });
      }
      const rows = (slugRows ?? []) as ReadonlyArray<{
        zone_id: string;
        slug: string;
        country_code: string;
        source_label: string;
      }>;
      if (rows.length === 0) return [];

      const labels = await batchResolveZoneLabels(
        rows.map((r) => ({
          scopeType: 'colonia',
          scopeId: r.zone_id,
          countryCode: r.country_code,
        })),
        { supabase },
      );

      return rows.map((row, idx) => ({
        slug: row.slug,
        colonia_id: row.zone_id,
        label: row.source_label || labels[idx] || row.slug,
        alcaldia: null,
        country_code: row.country_code,
      }));
    }),
});
