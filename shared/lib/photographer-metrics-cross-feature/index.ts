// ADR-057 — Studio Sprint 9 cross-feature M09 Estadísticas integration.
// Read-only API aggregations photographer KPIs para Studio + futuras dashboards.

import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface PhotographerKpis {
  readonly clientsActive: number;
  readonly clientsTotal: number;
  readonly videosGenerated: number;
  readonly revenueEstUsd: number;
  readonly commissionEarnedUsd: number;
  readonly ratingAvg: number | null;
}

export interface PhotographerStatsRange {
  readonly start: string;
  readonly end: string;
}

export async function getPhotographerKpis(photographerId: string): Promise<PhotographerKpis> {
  const supabase = createAdminClient();

  const { data: photographer } = await supabase
    .from('studio_photographers')
    .select('clients_count, videos_generated_total, revenue_est_total, rating_avg')
    .eq('id', photographerId)
    .maybeSingle();

  const { data: activeClients } = await supabase
    .from('studio_photographer_clients')
    .select('id', { count: 'exact', head: true })
    .eq('photographer_id', photographerId)
    .eq('relation_status', 'active');

  const { data: commissions } = await supabase
    .from('studio_photographer_invites')
    .select('commission_earned_usd')
    .eq('photographer_id', photographerId)
    .eq('invitation_type', 'referral_program')
    .eq('subscribed_to_pro', true);

  const commissionTotal = (commissions ?? []).reduce(
    (sum, row) => sum + Number(row.commission_earned_usd ?? 0),
    0,
  );

  return {
    clientsActive: (activeClients as unknown as { count?: number } | null)?.count ?? 0,
    clientsTotal: photographer?.clients_count ?? 0,
    videosGenerated: photographer?.videos_generated_total ?? 0,
    revenueEstUsd: Number(photographer?.revenue_est_total ?? 0),
    commissionEarnedUsd: commissionTotal,
    ratingAvg: photographer?.rating_avg ? Number(photographer.rating_avg) : null,
  };
}

export async function aggregatePhotographerStats(
  photographerId: string,
  range: PhotographerStatsRange,
): Promise<PhotographerKpis> {
  const supabase = createAdminClient();

  const { data: clients } = await supabase
    .from('studio_photographer_clients')
    .select('relation_status, total_videos_generated, total_revenue_attributed')
    .eq('photographer_id', photographerId)
    .gte('updated_at', range.start)
    .lte('updated_at', range.end);

  const clientsList = clients ?? [];
  const clientsActive = clientsList.filter((c) => c.relation_status === 'active').length;
  const clientsTotal = clientsList.length;
  const videosGenerated = clientsList.reduce((sum, c) => sum + (c.total_videos_generated ?? 0), 0);
  const revenueEstUsd = clientsList.reduce(
    (sum, c) => sum + Number(c.total_revenue_attributed ?? 0),
    0,
  );

  const { data: commissions } = await supabase
    .from('studio_photographer_invites')
    .select('commission_earned_usd')
    .eq('photographer_id', photographerId)
    .eq('invitation_type', 'referral_program')
    .eq('subscribed_to_pro', true)
    .gte('accepted_at', range.start)
    .lte('accepted_at', range.end);

  const commissionEarnedUsd = (commissions ?? []).reduce(
    (sum, row) => sum + Number(row.commission_earned_usd ?? 0),
    0,
  );

  const { data: photographer } = await supabase
    .from('studio_photographers')
    .select('rating_avg')
    .eq('id', photographerId)
    .maybeSingle();

  return {
    clientsActive,
    clientsTotal,
    videosGenerated,
    revenueEstUsd,
    commissionEarnedUsd,
    ratingAvg: photographer?.rating_avg ? Number(photographer.rating_avg) : null,
  };
}
