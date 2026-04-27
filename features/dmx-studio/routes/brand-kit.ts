import { TRPCError } from '@trpc/server';
import { upsertStudioBrandKitInput } from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

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
        accent_color: input.accentColor ?? null,
        tone: input.tone,
        zones: input.zones,
        cities: input.cities,
        contact_phone: input.contactPhone ?? null,
        contact_email: input.contactEmail ?? null,
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
          .update(payload)
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
});
