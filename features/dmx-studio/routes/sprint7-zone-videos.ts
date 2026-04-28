// F14.F.8 Sprint 7 BIBLIA Tarea 7.5 — Video de Zona con IE DMX integration vía ADR-055.
// Upgrades 5+8+9 (smart selector + heatmap + IE integration).

import { TRPCError } from '@trpc/server';
import {
  generateZoneVideoInput,
  studioPublicGalleryBySlugInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import {
  getZoneMarketData,
  getZoneScores,
  suggestZonesForAsesor,
} from '@/shared/lib/ie-cross-feature';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

export const studioSprint7ZoneVideosRouter = router({
  list: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_zone_videos')
      .select(
        'id, project_id, zone_id, zone_name, ie_scores_snapshot, market_data, heatmap_storage_path, ai_summary, created_at',
      )
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { zoneVideos: data };
  }),

  getZoneSuggestions: studioProcedure.query(async ({ ctx }) => {
    try {
      const suggestions = await suggestZonesForAsesor(ctx.user.id);
      return { suggestions };
    } catch (err) {
      sentry.captureException(err, { tags: { feature: 'dmx-studio.zone-videos.suggest' } });
      return { suggestions: [] };
    }
  }),

  getIeScoresForZone: studioProcedure
    .input(generateZoneVideoInput.pick({ zoneId: true }))
    .query(async ({ input }) => {
      try {
        const [scores, market] = await Promise.all([
          getZoneScores(input.zoneId),
          getZoneMarketData(input.zoneId),
        ]);
        return { scores, market };
      } catch (err) {
        sentry.captureException(err, { tags: { feature: 'dmx-studio.zone-videos.ie' } });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: err });
      }
    }),

  create: studioProcedure.input(generateZoneVideoInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();

    const { data: zone, error: zoneErr } = await supabase
      .from('zones')
      .select('id, name_es')
      .eq('id', input.zoneId)
      .maybeSingle();
    if (zoneErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: zoneErr });
    if (!zone) throw new TRPCError({ code: 'NOT_FOUND', message: 'Zone not found' });

    const [scores, market] = await Promise.all([
      getZoneScores(input.zoneId),
      getZoneMarketData(input.zoneId),
    ]);

    let projectId = input.projectId;
    if (!projectId) {
      const { data: project, error: projErr } = await supabase
        .from('studio_video_projects')
        .insert({
          user_id: ctx.user.id,
          title: `Video de Zona — ${zone.name_es}`,
          status: 'draft',
          project_type: 'standard',
          meta: {
            kind: 'zone_video',
            zone_id: input.zoneId,
            zone_name: zone.name_es,
          } as never,
        })
        .select('id')
        .single();
      if (projErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: projErr });
      projectId = project.id;
    }

    const { data, error } = await supabase
      .from('studio_zone_videos')
      .insert({
        project_id: projectId,
        user_id: ctx.user.id,
        zone_id: input.zoneId,
        zone_name: zone.name_es,
        ie_scores_snapshot: scores as never,
        market_data: market as never,
      })
      .select('id, project_id, zone_name')
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });

    return { zoneVideo: data, scores, market };
  }),

  publicByZone: studioProcedure.input(studioPublicGalleryBySlugInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: gallery } = await supabase
      .from('studio_public_galleries')
      .select('user_id')
      .eq('slug', input.slug)
      .eq('is_active', true)
      .maybeSingle();
    if (!gallery) return { zoneVideos: [] };
    const { data, error } = await supabase
      .from('studio_zone_videos')
      .select('id, zone_id, zone_name, ie_scores_snapshot, market_data, heatmap_storage_path')
      .eq('user_id', gallery.user_id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { zoneVideos: data };
  }),
});
