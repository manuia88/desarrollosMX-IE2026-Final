// F14.F.8 Sprint 7 BIBLIA Upgrade 6 — Public gallery analytics shared.

import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface PublicGalleryStats {
  readonly slug: string;
  readonly viewsLast30d: number;
  readonly leadsLast30d: number;
  readonly totalViewsAllTime: number;
  readonly avgEngagementSeconds: number | null;
}

export async function getPublicGalleryStats(
  asesorSlug: string,
  videoId?: string,
): Promise<PublicGalleryStats | null> {
  const supabase = createAdminClient();
  const galleryResp = await supabase
    .from('studio_public_galleries')
    .select('user_id, slug, view_count')
    .eq('slug', asesorSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!galleryResp.data) return null;

  const since30d = new Date();
  since30d.setMonth(since30d.getMonth() - 1);

  let viewsQuery = supabase
    .from('studio_gallery_views_log')
    .select('id', { count: 'exact', head: true })
    .eq('asesor_slug', asesorSlug)
    .gte('created_at', since30d.toISOString());
  if (videoId) viewsQuery = viewsQuery.eq('video_id', videoId);
  const viewsResp = await viewsQuery;

  const leadsResp = await supabase
    .from('studio_referral_form_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('asesor_user_id', galleryResp.data.user_id)
    .gte('submitted_at', since30d.toISOString());

  return {
    slug: galleryResp.data.slug,
    viewsLast30d: viewsResp.count ?? 0,
    leadsLast30d: leadsResp.count ?? 0,
    totalViewsAllTime: galleryResp.data.view_count ?? 0,
    avgEngagementSeconds: null,
  };
}
