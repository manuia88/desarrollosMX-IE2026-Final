// F14.F.9 Sprint 8 BIBLIA LATERAL 7 — Public series page router.
// publicProcedure cero auth para /studio/[asesor-slug]/serie/[serie-slug] binge-watch.

import { createHash } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { publicSeriesBySlugInput, recordSeriesViewInput } from '@/features/dmx-studio/schemas';
import { publicProcedure, router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const studioSprint8PublicSeriesRouter = router({
  getBySlug: publicProcedure.input(publicSeriesBySlugInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: gallery } = await supabase
      .from('studio_public_galleries')
      .select('user_id, title, bio')
      .eq('slug', input.asesorSlug)
      .eq('is_active', true)
      .maybeSingle();
    if (!gallery) throw new TRPCError({ code: 'NOT_FOUND', message: 'Asesor not found' });

    const { data: serie } = await supabase
      .from('studio_series_projects')
      .select(
        'id, title, episodes_count, status, desarrollo_id, public_slug, created_at, narrative_arc, meta',
      )
      .eq('public_slug', input.serieSlug)
      .eq('user_id', gallery.user_id)
      .eq('is_published_publicly', true)
      .maybeSingle();
    if (!serie) throw new TRPCError({ code: 'NOT_FOUND', message: 'Series not found' });

    return {
      asesor: {
        userId: gallery.user_id,
        title: gallery.title,
        bio: gallery.bio,
      },
      series: serie,
    };
  }),

  listEpisodesPublic: publicProcedure.input(publicSeriesBySlugInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: gallery } = await supabase
      .from('studio_public_galleries')
      .select('user_id')
      .eq('slug', input.asesorSlug)
      .eq('is_active', true)
      .maybeSingle();
    if (!gallery) return { episodes: [] };

    const { data: serie } = await supabase
      .from('studio_series_projects')
      .select('id')
      .eq('public_slug', input.serieSlug)
      .eq('user_id', gallery.user_id)
      .eq('is_published_publicly', true)
      .maybeSingle();
    if (!serie) return { episodes: [] };

    const { data: episodes } = await supabase
      .from('studio_series_episodes')
      .select(
        'id, episode_number, title, description, narrative_phase, project_id, title_card_storage_path',
      )
      .eq('series_id', serie.id)
      .eq('status', 'published')
      .order('episode_number', { ascending: true });

    return { episodes: episodes ?? [] };
  }),

  recordView: publicProcedure.input(recordSeriesViewInput).mutation(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    const { data: gallery } = await supabase
      .from('studio_public_galleries')
      .select('user_id')
      .eq('slug', input.asesorSlug)
      .eq('is_active', true)
      .maybeSingle();
    if (!gallery) return { ok: false as const };

    const { data: serie } = await supabase
      .from('studio_series_projects')
      .select('id')
      .eq('public_slug', input.serieSlug)
      .eq('user_id', gallery.user_id)
      .maybeSingle();
    if (!serie) return { ok: false as const };

    const headers = ctx.headers;
    const ipRaw =
      (typeof headers?.get === 'function' ? headers.get('x-forwarded-for') : null) ??
      (typeof headers?.get === 'function' ? headers.get('x-real-ip') : null) ??
      'unknown';
    const ipHash = createHash('sha256').update(String(ipRaw)).digest('hex');

    await supabase.from('studio_gallery_views_log').insert({
      asesor_user_id: gallery.user_id,
      asesor_slug: input.asesorSlug,
      video_id: input.episodeId ?? null,
      ip_hash: ipHash,
      referer: input.referer ?? null,
    });

    return { ok: true as const };
  }),
});
