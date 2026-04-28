// F14.F.8 Sprint 7 BIBLIA Tarea 7.1 — Avatar IA del asesor (HeyGen).
// Agency-plan-only canon (paywall reuse F14.F.7).

import { TRPCError } from '@trpc/server';
import {
  avatarStatusInput,
  deleteAvatarInput,
  generateAvatarVariantsInput,
  setDefaultAvatarVariantInput,
  startAvatarOnboardingInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioAgencyProcedure } from './_agency-procedure';
import { studioProcedure } from './_studio-procedure';

export const studioSprint7AvatarsRouter = router({
  getMyAvatar: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_avatars')
      .select(
        'id, heygen_avatar_id, source_photo_storage_path, voice_sample_storage_path, status, quality_score, cost_usd, linked_voice_clone_id, ready_at, created_at',
      )
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data;
  }),

  startOnboarding: studioAgencyProcedure
    .input(startAvatarOnboardingInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      try {
        const { data: existing } = await supabase
          .from('studio_avatars')
          .select('id')
          .eq('user_id', ctx.user.id)
          .maybeSingle();
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Ya tienes un avatar. Eliminalo antes de crear uno nuevo.',
          });
        }
        const { data, error } = await supabase
          .from('studio_avatars')
          .insert({
            user_id: ctx.user.id,
            source_photo_storage_path: input.photoStoragePath,
            voice_sample_storage_path: input.voiceSampleStoragePath,
            linked_voice_clone_id: input.linkedVoiceCloneId ?? null,
            status: 'pending',
          })
          .select('id, status')
          .single();
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
        return { avatarId: data.id, status: data.status };
      } catch (err) {
        sentry.captureException(err, { tags: { feature: 'dmx-studio.avatar.onboarding' } });
        throw err;
      }
    }),

  getStatus: studioProcedure.input(avatarStatusInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_avatars')
      .select('id, status, heygen_avatar_id, ready_at, failure_reason')
      .eq('id', input.avatarId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    return data;
  }),

  generateVariants: studioAgencyProcedure
    .input(generateAvatarVariantsInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: avatar } = await supabase
        .from('studio_avatars')
        .select('id, status')
        .eq('id', input.avatarId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!avatar) throw new TRPCError({ code: 'NOT_FOUND' });
      if (avatar.status !== 'ready') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Avatar debe estar ready antes de generar variants.',
        });
      }
      const rows = input.styles.map((style, idx) => ({
        avatar_id: input.avatarId,
        style,
        is_default: idx === 0,
      }));
      const { data, error } = await supabase
        .from('studio_avatar_variants')
        .upsert(rows, { onConflict: 'avatar_id,style' })
        .select('id, style, is_default');
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return { variants: data };
    }),

  listVariants: studioProcedure.input(avatarStatusInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: avatar } = await supabase
      .from('studio_avatars')
      .select('id')
      .eq('id', input.avatarId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!avatar) throw new TRPCError({ code: 'NOT_FOUND' });
    const { data, error } = await supabase
      .from('studio_avatar_variants')
      .select(
        'id, style, heygen_variant_id, storage_path, preview_image_url, is_default, created_at',
      )
      .eq('avatar_id', input.avatarId);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { variants: data };
  }),

  setDefaultVariant: studioAgencyProcedure
    .input(setDefaultAvatarVariantInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: variant } = await supabase
        .from('studio_avatar_variants')
        .select('id, avatar_id')
        .eq('id', input.variantId)
        .maybeSingle();
      if (!variant) throw new TRPCError({ code: 'NOT_FOUND' });
      const { data: avatar } = await supabase
        .from('studio_avatars')
        .select('id')
        .eq('id', variant.avatar_id)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (!avatar) throw new TRPCError({ code: 'FORBIDDEN' });
      await supabase
        .from('studio_avatar_variants')
        .update({ is_default: false })
        .eq('avatar_id', variant.avatar_id);
      const { error } = await supabase
        .from('studio_avatar_variants')
        .update({ is_default: true })
        .eq('id', input.variantId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return { ok: true };
    }),

  deleteAvatar: studioAgencyProcedure.input(deleteAvatarInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('studio_avatars')
      .delete()
      .eq('id', input.avatarId)
      .eq('user_id', ctx.user.id);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { ok: true };
  }),
});
