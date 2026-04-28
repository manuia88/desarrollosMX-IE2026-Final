// F14.F.8 Sprint 7 BIBLIA Upgrade 6 — Public gallery analytics shared.
// Asesor share link con clientes potenciales: views + rating visible "social proof real".

import { TRPCError } from '@trpc/server';
import { galleryAnalyticsRangeInput, galleryStatsInput } from '@/features/dmx-studio/schemas';
import { publicProcedure, router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

export const studioSprint7GalleryAnalyticsRouter = router({
  getPublicStats: publicProcedure.input(galleryStatsInput).query(async ({ input }) => {
    const supabase = createAdminClient();
    const { data: gallery } = await supabase
      .from('studio_public_galleries')
      .select('user_id, view_count, slug')
      .eq('slug', input.asesorSlug)
      .eq('is_active', true)
      .maybeSingle();
    if (!gallery) throw new TRPCError({ code: 'NOT_FOUND' });

    const since = new Date();
    since.setMonth(since.getMonth() - 1);

    let viewsQuery = supabase
      .from('studio_gallery_views_log')
      .select('id', { count: 'exact', head: true })
      .eq('asesor_slug', input.asesorSlug)
      .gte('created_at', since.toISOString());
    if (input.videoId) {
      viewsQuery = viewsQuery.eq('video_id', input.videoId);
    }
    const { count: viewsLast30d } = await viewsQuery;

    const { count: leadsCount } = await supabase
      .from('studio_referral_form_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('asesor_user_id', gallery.user_id)
      .gte('submitted_at', since.toISOString());

    return {
      slug: gallery.slug,
      viewsLast30d: viewsLast30d ?? 0,
      leadsLast30d: leadsCount ?? 0,
      totalViewsAllTime: gallery.view_count ?? 0,
    };
  }),

  getViewsStats: studioProcedure.input(galleryAnalyticsRangeInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const since = new Date();
    since.setMonth(since.getMonth() - input.monthsBack);
    const { data, error } = await supabase
      .from('studio_gallery_views_log')
      .select('created_at, country_code, device_type, video_id')
      .eq('asesor_user_id', ctx.user.id)
      .gte('created_at', since.toISOString());
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    const total = data?.length ?? 0;
    const byCountry = countBy(data ?? [], 'country_code');
    const byDevice = countBy(data ?? [], 'device_type');
    const byVideo = countBy(data ?? [], 'video_id');
    return { total, byCountry, byDevice, byVideo };
  }),

  getReferralStats: studioProcedure
    .input(galleryAnalyticsRangeInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const since = new Date();
      since.setMonth(since.getMonth() - input.monthsBack);
      const { data, error } = await supabase
        .from('studio_referral_form_submissions')
        .select('id, lead_created_id, source, submitted_interest_type, submitted_at')
        .eq('asesor_user_id', ctx.user.id)
        .gte('submitted_at', since.toISOString());
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      const total = data?.length ?? 0;
      const withLead = (data ?? []).filter((r) => r.lead_created_id).length;
      const conversionRatePct = total === 0 ? 0 : Number(((withLead / total) * 100).toFixed(1));
      const bySource = countBy(data ?? [], 'source');
      const byInterest = countBy(data ?? [], 'submitted_interest_type');
      return { total, withLead, conversionRatePct, bySource, byInterest };
    }),
});

function countBy(
  rows: ReadonlyArray<Record<string, unknown>>,
  key: string,
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = String(row[key] ?? 'unknown');
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}
