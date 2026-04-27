import { foldersRouter } from '@/features/marketing/routes/folders';
import { landingsRouter } from '@/features/marketing/routes/landings';
import { photosRouter } from '@/features/marketing/routes/photos';
import { portalsRouter } from '@/features/marketing/routes/portals';
import { qrCodesRouter } from '@/features/marketing/routes/qr-codes';
import { waTemplatesRouter } from '@/features/marketing/routes/wa-templates';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const marketingRouter = router({
  landings: landingsRouter,
  qrCodes: qrCodesRouter,
  waTemplates: waTemplatesRouter,
  folders: foldersRouter,
  photos: photosRouter,
  portals: portalsRouter,

  getDashboardStats: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);
    const sinceIso = sinceDate.toISOString();

    const [landings, qrs, publications, analytics] = await Promise.all([
      supabase
        .from('landings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .eq('is_published', true),
      supabase.from('qr_codes').select('scan_count').eq('user_id', ctx.user.id),
      supabase
        .from('marketing_publications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .eq('status', 'published')
        .gte('created_at', sinceIso),
      supabase
        .from('landing_analytics')
        .select('event_type, landing_id')
        .gte('created_at', sinceIso),
    ]);

    const ownedLandingIds = new Set<string>();
    {
      const { data: owned } = await supabase
        .from('landings')
        .select('id')
        .eq('user_id', ctx.user.id);
      for (const r of owned ?? []) ownedLandingIds.add(r.id);
    }

    const visits = (analytics.data ?? []).filter(
      (r) => r.event_type === 'page_view' && ownedLandingIds.has(r.landing_id),
    ).length;
    const leads = (analytics.data ?? []).filter(
      (r) => r.event_type === 'lead_submit' && ownedLandingIds.has(r.landing_id),
    ).length;
    const totalScans = (qrs.data ?? []).reduce((acc, r) => acc + (r.scan_count ?? 0), 0);

    return {
      publishedLandings: landings.count ?? 0,
      totalScans,
      visits30d: visits,
      leads30d: leads,
      publishedToPortals30d: publications.count ?? 0,
    };
  }),
});
