// F14.F.8 Sprint 7 BIBLIA Tarea 7.2 — Galería pública SEO + Referral form (Upgrades 3+10).
// publicProcedure cero auth gate canon.

import { TRPCError } from '@trpc/server';
import { createLeadFromReferral } from '@/features/dmx-studio/lib/cross-functions/m03-referral-lead-create';
import {
  recordGalleryViewInput,
  studioPublicGalleryBySlugInput,
  submitReferralFormInput,
} from '@/features/dmx-studio/schemas';
import { publicProcedure, router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const studioSprint7PublicGalleryRouter = router({
  getBySlug: publicProcedure.input(studioPublicGalleryBySlugInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: gallery, error } = await supabase
      .from('studio_public_galleries')
      .select(
        'id, user_id, slug, title, bio, cover_image_url, featured_video_ids, view_count, meta',
      )
      .eq('slug', input.slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!gallery) throw new TRPCError({ code: 'NOT_FOUND' });

    const { data: brandKit } = await supabase
      .from('studio_brand_kits')
      .select('display_name, tagline, logo_url, primary_color, secondary_color, accent_color')
      .eq('user_id', gallery.user_id)
      .maybeSingle();

    const { data: avatar } = await supabase
      .from('studio_avatars')
      .select('source_photo_storage_path, status')
      .eq('user_id', gallery.user_id)
      .maybeSingle();

    return { gallery, brandKit, avatar };
  }),

  listVideos: publicProcedure.input(studioPublicGalleryBySlugInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: gallery } = await supabase
      .from('studio_public_galleries')
      .select('user_id, featured_video_ids')
      .eq('slug', input.slug)
      .eq('is_active', true)
      .maybeSingle();
    if (!gallery) return { videos: [] };
    const ids = gallery.featured_video_ids ?? [];
    if (ids.length === 0) {
      const { data: latest } = await supabase
        .from('studio_video_outputs')
        .select(
          'id, hook_variant, format, storage_url, thumbnail_url, duration_seconds, created_at',
        )
        .eq('user_id', gallery.user_id)
        .eq('render_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(12);
      return { videos: latest ?? [] };
    }
    const { data: videos } = await supabase
      .from('studio_video_outputs')
      .select('id, hook_variant, format, storage_url, thumbnail_url, duration_seconds, created_at')
      .in('id', ids);
    return { videos: videos ?? [] };
  }),

  recordView: publicProcedure.input(recordGalleryViewInput).mutation(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: gallery } = await supabase
      .from('studio_public_galleries')
      .select('user_id')
      .eq('slug', input.asesorSlug)
      .eq('is_active', true)
      .maybeSingle();
    if (!gallery) throw new TRPCError({ code: 'NOT_FOUND' });

    const { error } = await supabase.from('studio_gallery_views_log').insert({
      asesor_slug: input.asesorSlug,
      asesor_user_id: gallery.user_id,
      video_id: input.videoId ?? null,
      referer: input.referer ?? null,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      country_code: input.countryCode ?? null,
      device_type: input.deviceType,
    });
    if (error) {
      sentry.captureException(error, { tags: { feature: 'dmx-studio.gallery.view' } });
    }
    await supabase.rpc('increment_gallery_view_count' as never).then(() => {
      supabase
        .from('studio_public_galleries')
        .update({ view_count: (gallery as { view_count?: number }).view_count ?? 0 })
        .eq('user_id', gallery.user_id);
    });
    return { ok: true };
  }),

  submitReferralForm: publicProcedure.input(submitReferralFormInput).mutation(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: gallery } = await supabase
      .from('studio_public_galleries')
      .select('user_id')
      .eq('slug', input.asesorSlug)
      .eq('is_active', true)
      .maybeSingle();
    if (!gallery) throw new TRPCError({ code: 'NOT_FOUND' });

    const { data: submission, error } = await supabase
      .from('studio_referral_form_submissions')
      .insert({
        asesor_user_id: gallery.user_id,
        source: input.source,
        source_video_id: input.sourceVideoId ?? null,
        submitted_name: input.submittedName,
        submitted_email: input.submittedEmail,
        submitted_phone: input.submittedPhone ?? null,
        submitted_message: input.submittedMessage ?? null,
        submitted_interest_type: input.submittedInterestType ?? null,
      })
      .select('id, asesor_user_id')
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });

    try {
      const { leadId } = await createLeadFromReferral({
        submissionId: submission.id,
        asesorUserId: submission.asesor_user_id,
        submittedName: input.submittedName,
        submittedEmail: input.submittedEmail,
        submittedPhone: input.submittedPhone ?? null,
        submittedMessage: input.submittedMessage ?? null,
      });
      if (leadId) {
        await supabase
          .from('studio_referral_form_submissions')
          .update({ lead_created_id: leadId })
          .eq('id', submission.id);
      }
    } catch (err) {
      sentry.captureException(err, { tags: { feature: 'dmx-studio.referral.lead-create' } });
    }
    return { submissionId: submission.id, ok: true };
  }),
});
