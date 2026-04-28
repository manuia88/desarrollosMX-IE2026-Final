// F14.F.9 Sprint 8 BIBLIA — Modo Serie/Documental router.
// Agency-plan-only canon (paywall reuse F14.F.7).

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  checkProgressTriggers,
  enableAutoProgress,
  manualTriggerEpisode,
} from '@/features/dmx-studio/lib/series/auto-progress-trigger';
import { createSeries } from '@/features/dmx-studio/lib/series/manager';
import { analyzeProgressForRecommendation } from '@/features/dmx-studio/lib/series/narrative-analyst';
import { generateNarrativeArc } from '@/features/dmx-studio/lib/series/narrative-generator';
import { generateMultiAngleClip } from '@/features/dmx-studio/lib/series-consistency/multi-camera';
import { generateConsistentEpisode } from '@/features/dmx-studio/lib/series-consistency/multi-shot-engine';
import {
  generateEpisodeVariation,
  generateThemeTrack,
} from '@/features/dmx-studio/lib/series-consistency/music-continuity-engine';
import { buildVisualRefs } from '@/features/dmx-studio/lib/series-consistency/visual-refs-builder';
import { inviteGuestToEpisode } from '@/features/dmx-studio/lib/series-crowdsourcing/guest-invite';
import { getTemplateBySlug, listTemplates } from '@/features/dmx-studio/lib/series-templates/seeds';
import { generateTitleCard } from '@/features/dmx-studio/lib/series-ui/title-card-generator';
import {
  addEpisodeInput,
  buildVisualRefsInput,
  checkProgressTriggersInput,
  createSeriesInput,
  enableAutoProgressInput,
  exportSeriesToCampaignInput,
  generateConsistentEpisodeInput,
  generateEpisodeMusicVariationInput,
  generateMultiAngleClipInput,
  generateNarrativeArcInput,
  generateThemeTrackInput,
  generateTitleCardInput,
  inviteGuestToEpisodeInput,
  listTemplatesByCategoryInput,
  publishSeriesPubliclyInput,
  seriesIdInput,
  updateEpisodeInput,
  updateSeriesInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { exportSeriesToMarketingCampaign } from '@/shared/lib/marketing-dev-cross-feature';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioAgencyProcedure } from './_agency-procedure';

const templateSlugInput = z.object({ slug: z.string().trim().min(1).max(120) });

export const studioSprint8SeriesRouter = router({
  list: studioAgencyProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_series_projects')
      .select(
        'id, title, status, episodes_count, desarrollo_id, auto_progress_enabled, is_published_publicly, public_slug, created_at, updated_at',
      )
      .eq('user_id', ctx.user.id)
      .order('updated_at', { ascending: false });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { series: data ?? [] };
  }),

  create: studioAgencyProcedure.input(createSeriesInput).mutation(async ({ ctx, input }) => {
    try {
      return await createSeries(ctx.user.id, input);
    } catch (err) {
      sentry.captureException(err, { tags: { feature: 'dmx-studio.series.create' } });
      throw err;
    }
  }),

  getById: studioAgencyProcedure.input(seriesIdInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_series_projects')
      .select('*')
      .eq('id', input.seriesId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    return data;
  }),

  update: studioAgencyProcedure.input(updateSeriesInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    type SeriesPatch = {
      title?: string;
      meta?: { description: string };
      status?: 'draft' | 'in_production' | 'published' | 'archived';
      auto_progress_enabled?: boolean;
    };
    const patch: SeriesPatch = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.meta = { description: input.description };
    if (input.status !== undefined) patch.status = input.status;
    if (input.autoProgressEnabled !== undefined)
      patch.auto_progress_enabled = input.autoProgressEnabled;
    const { data, error } = await supabase
      .from('studio_series_projects')
      .update(patch)
      .eq('id', input.seriesId)
      .eq('user_id', ctx.user.id)
      .select('id')
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    return { ok: true };
  }),

  delete: studioAgencyProcedure.input(seriesIdInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('studio_series_projects')
      .delete()
      .eq('id', input.seriesId)
      .eq('user_id', ctx.user.id);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { ok: true };
  }),

  listEpisodes: studioAgencyProcedure.input(seriesIdInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_series_episodes')
      .select(
        'id, episode_number, title, description, narrative_phase, status, real_progress_pct, shoot_recommended_date, shoot_completed_date, title_card_storage_path, project_id, music_track_id, created_at',
      )
      .eq('series_id', input.seriesId)
      .order('episode_number', { ascending: true });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { episodes: data ?? [] };
  }),

  addEpisode: studioAgencyProcedure.input(addEpisodeInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: serieRow } = await supabase
      .from('studio_series_projects')
      .select('id')
      .eq('id', input.seriesId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!serieRow) throw new TRPCError({ code: 'NOT_FOUND' });
    const { data, error } = await supabase
      .from('studio_series_episodes')
      .insert({
        series_id: input.seriesId,
        episode_number: input.episodeNumber,
        title: input.title,
        description: input.description ?? null,
        narrative_phase: input.narrativePhase ?? null,
      })
      .select('id, episode_number')
      .single();
    if (error) throw new TRPCError({ code: 'CONFLICT', cause: error });
    return { episode: data };
  }),

  updateEpisode: studioAgencyProcedure.input(updateEpisodeInput).mutation(async ({ input }) => {
    const supabase = createAdminClient();
    type EpisodePatch = {
      title?: string;
      description?: string;
      status?: 'pending' | 'recommended' | 'in_progress' | 'published' | 'archived';
      real_progress_pct?: number;
      shoot_recommended_date?: string;
      shoot_completed_date?: string;
    };
    const patch: EpisodePatch = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.status !== undefined) patch.status = input.status;
    if (input.realProgressPct !== undefined) patch.real_progress_pct = input.realProgressPct;
    if (input.shootRecommendedDate !== undefined)
      patch.shoot_recommended_date = input.shootRecommendedDate;
    if (input.shootCompletedDate !== undefined)
      patch.shoot_completed_date = input.shootCompletedDate;
    const { error } = await supabase
      .from('studio_series_episodes')
      .update(patch)
      .eq('id', input.episodeId);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { ok: true };
  }),

  getNarrativeArc: studioAgencyProcedure
    .input(generateNarrativeArcInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateNarrativeArc(ctx.user.id, input.seriesId, input.episodesCount);
      } catch (err) {
        sentry.captureException(err, { tags: { feature: 'dmx-studio.series.narrative' } });
        throw err;
      }
    }),

  suggestNextEpisode: studioAgencyProcedure.input(seriesIdInput).query(async ({ input }) => {
    try {
      return await analyzeProgressForRecommendation(input.seriesId);
    } catch (err) {
      sentry.captureException(err, { tags: { feature: 'dmx-studio.series.analyst' } });
      throw err;
    }
  }),

  enableAutoProgress: studioAgencyProcedure
    .input(enableAutoProgressInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await enableAutoProgress(ctx.user.id, input.seriesId, input.enabled);
      } catch (err) {
        sentry.captureException(err, { tags: { feature: 'dmx-studio.series.auto-progress' } });
        throw err;
      }
    }),

  getProgressTriggers: studioAgencyProcedure
    .input(checkProgressTriggersInput)
    .query(async ({ ctx, input }) => {
      try {
        return await checkProgressTriggers(ctx.user.id, input.manual);
      } catch (err) {
        sentry.captureException(err, { tags: { feature: 'dmx-studio.series.triggers' } });
        return { triggers: [] };
      }
    }),

  manualTriggerEpisode: studioAgencyProcedure
    .input(seriesIdInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await manualTriggerEpisode(ctx.user.id, input.seriesId);
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'dmx-studio.series.manual-trigger' },
        });
        throw err;
      }
    }),

  generateConsistentEpisode: studioAgencyProcedure
    .input(generateConsistentEpisodeInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateConsistentEpisode(ctx.user.id, input.seriesId, input.episodeId);
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'dmx-studio.series.multi-shot' },
        });
        throw err;
      }
    }),

  buildVisualRefs: studioAgencyProcedure
    .input(buildVisualRefsInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await buildVisualRefs(ctx.user.id, input.seriesId);
      } catch (err) {
        sentry.captureException(err, { tags: { feature: 'dmx-studio.series.visual-refs' } });
        throw err;
      }
    }),

  generateThemeTrack: studioAgencyProcedure
    .input(generateThemeTrackInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateThemeTrack(ctx.user.id, input.seriesId, input.mood);
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'dmx-studio.series.music-theme' },
        });
        throw err;
      }
    }),

  generateEpisodeMusicVariation: studioAgencyProcedure
    .input(generateEpisodeMusicVariationInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateEpisodeVariation(
          ctx.user.id,
          input.seriesId,
          input.episodeNumber,
          input.phase,
        );
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'dmx-studio.series.music-variation' },
        });
        throw err;
      }
    }),

  generateMultiAngleClip: studioAgencyProcedure
    .input(generateMultiAngleClipInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateMultiAngleClip(ctx.user.id, input.assetId, input.angles);
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'dmx-studio.series.multi-camera' },
        });
        throw err;
      }
    }),

  generateTitleCard: studioAgencyProcedure
    .input(generateTitleCardInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateTitleCard(ctx.user.id, input.episodeId);
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'dmx-studio.series.title-card' },
        });
        throw err;
      }
    }),

  inviteGuestToEpisode: studioAgencyProcedure
    .input(inviteGuestToEpisodeInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await inviteGuestToEpisode(ctx.user.id, input);
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'dmx-studio.series.guest-invite' },
        });
        throw err;
      }
    }),

  publishPublicly: studioAgencyProcedure
    .input(publishSeriesPubliclyInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_series_projects')
        .update({ is_published_publicly: true, public_slug: input.publicSlug })
        .eq('id', input.seriesId)
        .eq('user_id', ctx.user.id)
        .select('public_slug')
        .maybeSingle();
      if (error) {
        if (error.code === '23505') {
          throw new TRPCError({ code: 'CONFLICT', message: 'Slug ya en uso, prueba otro.' });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      }
      if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
      return { publicSlug: data.public_slug };
    }),

  listTemplates: studioAgencyProcedure
    .input(listTemplatesByCategoryInput)
    .query(async ({ input }) => {
      try {
        return { templates: await listTemplates(input.category) };
      } catch (err) {
        sentry.captureException(err, { tags: { feature: 'dmx-studio.series.templates' } });
        return { templates: [] };
      }
    }),

  getTemplateBySlug: studioAgencyProcedure.input(templateSlugInput).query(async ({ input }) => {
    const tpl = await getTemplateBySlug(input.slug);
    if (!tpl) throw new TRPCError({ code: 'NOT_FOUND' });
    return tpl;
  }),

  exportToMarketingCampaign: studioAgencyProcedure
    .input(exportSeriesToCampaignInput)
    .mutation(async ({ input }) => {
      // STUB ADR-018 — activar FASE 15 cuando M14 Marketing Dev shipped.
      const result = await exportSeriesToMarketingCampaign(input);
      if (!result.ok) {
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: result.message,
        });
      }
      return result;
    }),
});
