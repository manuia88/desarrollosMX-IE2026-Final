import { TRPCError } from '@trpc/server';
import {
  onboardingStep1Input,
  onboardingStep2Input,
  onboardingStep3Input,
  uploadVoiceSampleInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

export const studioOnboardingRouter = router({
  getStatus: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_users_extension')
      .select('onboarding_completed, onboarding_step, brand_kit_completed, voice_clone_completed')
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return {
      onboardingCompleted: data?.onboarding_completed ?? false,
      onboardingStep: data?.onboarding_step ?? 'step1',
      brandKitCompleted: data?.brand_kit_completed ?? false,
      voiceCloneCompleted: data?.voice_clone_completed ?? false,
    };
  }),

  completeStep1: studioProcedure.input(onboardingStep1Input).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const [firstName, ...rest] = input.name.trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName || 'Asesor';
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        first_name: firstName ?? input.name,
        last_name: lastName,
        phone: input.phone,
      })
      .eq('id', ctx.user.id);
    if (profileErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: profileErr });

    const { data: existingKit } = await supabase
      .from('studio_brand_kits')
      .select('id')
      .eq('user_id', ctx.user.id)
      .eq('is_default', true)
      .maybeSingle();
    if (existingKit?.id) {
      const { error: updateErr } = await supabase
        .from('studio_brand_kits')
        .update({
          display_name: input.name,
          cities: [input.city],
          zones: input.zones,
        })
        .eq('id', existingKit.id);
      if (updateErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: updateErr });
    } else {
      const { error: insertErr } = await supabase.from('studio_brand_kits').insert({
        user_id: ctx.user.id,
        display_name: input.name,
        cities: [input.city],
        zones: input.zones,
        is_default: true,
        tone: 'professional',
      });
      if (insertErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: insertErr });
    }

    const { error: extErr } = await supabase.from('studio_users_extension').upsert(
      {
        user_id: ctx.user.id,
        onboarding_step: 'step2',
        brand_kit_completed: true,
      },
      { onConflict: 'user_id' },
    );
    if (extErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: extErr });

    return { ok: true, nextStep: 'step2' as const };
  }),

  uploadVoiceSample: studioProcedure
    .input(uploadVoiceSampleInput)
    .mutation(async ({ ctx, input }) => {
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const storagePath = `${ctx.user.id}/voice-samples/${Date.now()}_${safeName}`;
      const supabase = createAdminClient();
      const { data: signed, error: signErr } = await supabase.storage
        .from('studio-voice-samples')
        .createSignedUploadUrl(storagePath);
      if (signErr || !signed) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: signErr?.message ?? 'createSignedUploadUrl failed',
        });
      }
      return {
        uploadUrl: signed.signedUrl,
        token: signed.token,
        path: storagePath,
        bucket: 'studio-voice-samples',
      };
    }),

  completeStep2: studioProcedure.input(onboardingStep2Input).mutation(async ({ ctx, input }) => {
    if (!input.consentSigned) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Consent signed required for voice clone',
      });
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_voice_clones')
      .insert({
        user_id: ctx.user.id,
        name: input.voiceName,
        clone_type: 'instant',
        status: 'pending',
        source_audio_url: input.voiceSampleStoragePath,
        language: input.voiceLanguage,
        consent_signed: input.consentSigned,
        consent_signed_at: input.consentSigned ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });

    const { error: extErr } = await supabase
      .from('studio_users_extension')
      .update({ onboarding_step: 'step3', voice_clone_completed: true })
      .eq('user_id', ctx.user.id);
    if (extErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: extErr });

    return { ok: true, voiceCloneId: data.id, nextStep: 'step3' as const };
  }),

  completeStep3: studioProcedure.input(onboardingStep3Input).mutation(async ({ ctx, input }) => {
    if (!input.acknowledgedDisclosure) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Disclosure acknowledgement required',
      });
    }
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('studio_users_extension')
      .update({ onboarding_completed: true, onboarding_step: 'completed' })
      .eq('user_id', ctx.user.id);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { ok: true, onboardingCompleted: true };
  }),
});
