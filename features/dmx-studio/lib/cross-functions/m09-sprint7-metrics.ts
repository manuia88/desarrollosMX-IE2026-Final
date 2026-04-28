// F14.F.8 Sprint 7 BIBLIA Upgrade 11 CROSS-FN — M09 Estadísticas Sprint 7 metrics.
// Sigue pattern m09-studio-metrics.ts (F14.F.5) + m09-sprint6-metrics.ts (F14.F.7).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export type AdminSupabase = SupabaseClient<Database>;

export interface StudioSprint7MetricsForAsesor {
  readonly avatarReady: boolean;
  readonly avatarVariantsCount: number;
  readonly galleryVisitsLast30d: number;
  readonly galleryReferralLeadsLast30d: number;
  readonly zoneVideosCount: number;
}

export async function getStudioSprint7MetricsForAsesor(
  supabase: AdminSupabase,
  userId: string,
): Promise<StudioSprint7MetricsForAsesor> {
  const since30d = new Date();
  since30d.setMonth(since30d.getMonth() - 1);

  const avatarResp = await supabase
    .from('studio_avatars')
    .select('id, status')
    .eq('user_id', userId)
    .maybeSingle();
  if (avatarResp.error) {
    throw new Error(`getStudioSprint7MetricsForAsesor avatar failed: ${avatarResp.error.message}`);
  }

  let avatarVariantsCount = 0;
  if (avatarResp.data?.id) {
    const variantsResp = await supabase
      .from('studio_avatar_variants')
      .select('id', { count: 'exact', head: true })
      .eq('avatar_id', avatarResp.data.id);
    if (variantsResp.error) {
      throw new Error(
        `getStudioSprint7MetricsForAsesor variants failed: ${variantsResp.error.message}`,
      );
    }
    avatarVariantsCount = variantsResp.count ?? 0;
  }

  const visitsResp = await supabase
    .from('studio_gallery_views_log')
    .select('id', { count: 'exact', head: true })
    .eq('asesor_user_id', userId)
    .gte('created_at', since30d.toISOString());
  if (visitsResp.error) {
    throw new Error(`getStudioSprint7MetricsForAsesor visits failed: ${visitsResp.error.message}`);
  }

  const referralsResp = await supabase
    .from('studio_referral_form_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('asesor_user_id', userId)
    .gte('submitted_at', since30d.toISOString());
  if (referralsResp.error) {
    throw new Error(
      `getStudioSprint7MetricsForAsesor referrals failed: ${referralsResp.error.message}`,
    );
  }

  const zoneVideosResp = await supabase
    .from('studio_zone_videos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (zoneVideosResp.error) {
    throw new Error(
      `getStudioSprint7MetricsForAsesor zone videos failed: ${zoneVideosResp.error.message}`,
    );
  }

  return {
    avatarReady: avatarResp.data?.status === 'ready',
    avatarVariantsCount,
    galleryVisitsLast30d: visitsResp.count ?? 0,
    galleryReferralLeadsLast30d: referralsResp.count ?? 0,
    zoneVideosCount: zoneVideosResp.count ?? 0,
  };
}
