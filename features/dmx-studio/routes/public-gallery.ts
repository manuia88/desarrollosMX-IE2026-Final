import { TRPCError } from '@trpc/server';
import {
  studioPublicGalleryBySlugInput,
  togglePublicGalleryInput,
} from '@/features/dmx-studio/schemas';
import { publicProcedure, router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const studioPublicGalleryRouter = router({
  getBySlug: publicProcedure.input(studioPublicGalleryBySlugInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_public_galleries')
      .select('id, slug, title, bio, cover_image_url, featured_video_ids, view_count')
      .eq('slug', input.slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    return data;
  }),
  toggleActive: authenticatedProcedure
    .input(togglePublicGalleryInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('studio_public_galleries')
        .update({ is_active: input.active })
        .eq('user_id', ctx.user.id);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      return { ok: true, active: input.active };
    }),
});
