import { TRPCError } from '@trpc/server';
import {
  previewBrandMockupInput,
  uploadBrandLogoInput,
  upsertStudioBrandKitInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const BRAND_ASSETS_BUCKET = 'studio-brand-assets';

export const studioBrandKitRouter = router({
  get: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_brand_kits')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('is_default', true)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? null;
  }),

  upsert: authenticatedProcedure
    .input(upsertStudioBrandKitInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const payload = {
        user_id: ctx.user.id,
        display_name: input.displayName ?? null,
        tagline: input.tagline ?? null,
        primary_color: input.primaryColor ?? null,
        secondary_color: input.secondaryColor ?? null,
        accent_color: input.accentColor ?? null,
        font_preference: input.fontPreference,
        tone: input.tone,
        zones: input.zones,
        cities: input.cities,
        contact_phone: input.contactPhone ?? null,
        contact_email: input.contactEmail ?? null,
        intro_text: input.introText ?? null,
        outro_text: input.outroText ?? null,
        is_default: true,
      };
      const { data: existing } = await supabase
        .from('studio_brand_kits')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('is_default', true)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from('studio_brand_kits')
          .update({ ...payload, preview_storage_path: null })
          .eq('id', existing.id);
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
        return { id: existing.id, action: 'updated' as const };
      }
      const { data, error } = await supabase
        .from('studio_brand_kits')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return { id: data.id, action: 'created' as const };
    }),

  uploadLogo: authenticatedProcedure
    .input(uploadBrandLogoInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const path = `${ctx.user.id}/logo/${Date.now()}-${input.fileName}`;
      const { data: signed, error } = await supabase.storage
        .from(BRAND_ASSETS_BUCKET)
        .createSignedUploadUrl(path);
      if (error || !signed) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'createSignedUploadUrl failed',
        });
      }
      return {
        uploadUrl: signed.signedUrl,
        token: signed.token,
        path,
        bucket: BRAND_ASSETS_BUCKET,
        contentType: input.contentType,
      };
    }),

  setLogoUrl: authenticatedProcedure
    .input(
      uploadBrandLogoInput.pick({ fileName: true }).extend({
        storagePath: uploadBrandLogoInput.shape.fileName,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: existing } = await supabase
        .from('studio_brand_kits')
        .select('id')
        .eq('user_id', ctx.user.id)
        .eq('is_default', true)
        .maybeSingle();
      if (!existing?.id) {
        const { data: created, error } = await supabase
          .from('studio_brand_kits')
          .insert({
            user_id: ctx.user.id,
            logo_url: input.storagePath,
            is_default: true,
          })
          .select('id')
          .single();
        if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
        return { id: created.id };
      }
      const { error } = await supabase
        .from('studio_brand_kits')
        .update({ logo_url: input.storagePath, preview_storage_path: null })
        .eq('id', existing.id);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return { id: existing.id };
    }),

  deleteLogo: authenticatedProcedure.mutation(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data: kit } = await supabase
      .from('studio_brand_kits')
      .select('id, logo_url')
      .eq('user_id', ctx.user.id)
      .eq('is_default', true)
      .maybeSingle();
    if (!kit?.id) throw new TRPCError({ code: 'NOT_FOUND' });
    if (kit.logo_url) {
      await supabase.storage.from(BRAND_ASSETS_BUCKET).remove([kit.logo_url]);
    }
    const { error } = await supabase
      .from('studio_brand_kits')
      .update({ logo_url: null, preview_storage_path: null })
      .eq('id', kit.id);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { ok: true };
  }),

  previewMockup: authenticatedProcedure
    .input(previewBrandMockupInput)
    .query(async ({ ctx }) => {
      const supabase = createAdminClient();
      const { data: kit } = await supabase
        .from('studio_brand_kits')
        .select(
          'id, display_name, tagline, primary_color, secondary_color, accent_color, font_preference, logo_url, tone, intro_text, outro_text, contact_phone',
        )
        .eq('user_id', ctx.user.id)
        .eq('is_default', true)
        .maybeSingle();
      return {
        kit: kit ?? null,
        sample: {
          headline: kit?.tagline ?? 'Tu próximo hogar te espera',
          price: '$4,850,000 MXN',
          area: '125 m² · 3 rec · 2 baños',
          zone: 'Polanco, CDMX',
        },
      };
    }),
});
