// F14.F.10 Sprint 9 BIBLIA — Cross-function M09 Estadísticas photographer KPIs.
// Compose shared/lib/photographer-metrics-cross-feature (read-only).
//
// L-NEW-M09-PHOTOGRAPHER-WIDGET-INTEGRATION (H2): integrar widget photographer
// dentro features/estadisticas/* dashboards. H1 path: KPIs surfaced solo dentro
// Studio CommissionDashboard via tRPC api.studio.sprint9Photographer.getEarnings
// + este wrapper.

import {
  aggregatePhotographerStats,
  getPhotographerKpis,
  type PhotographerKpis,
  type PhotographerStatsRange,
} from '@/shared/lib/photographer-metrics-cross-feature';

export type { PhotographerKpis, PhotographerStatsRange };

export interface PhotographerKpisFiveDigest {
  readonly clientsActive: number;
  readonly videosGenerated: number;
  readonly revenueEstUsd: number;
  readonly commissionEarnedUsd: number;
  readonly ratingAvg: number | null;
}

/**
 * Read-only wrapper getPhotographerKpis (rollup global desde studio_photographers).
 * Shape canon 5 KPIs Sprint 9:
 *   - clientsActive
 *   - videosGenerated
 *   - revenueEstUsd
 *   - commissionEarnedUsd
 *   - ratingAvg
 */
export async function getPhotographerKpisDigest(
  photographerId: string,
): Promise<PhotographerKpisFiveDigest> {
  const kpis = await getPhotographerKpis(photographerId);
  return {
    clientsActive: kpis.clientsActive,
    videosGenerated: kpis.videosGenerated,
    revenueEstUsd: kpis.revenueEstUsd,
    commissionEarnedUsd: kpis.commissionEarnedUsd,
    ratingAvg: kpis.ratingAvg,
  };
}

/**
 * Read-only wrapper aggregatePhotographerStats (range filter por updated_at).
 * Útil para CommissionDashboard month-by-month + filter UI selector.
 */
export async function getPhotographerKpisRange(
  photographerId: string,
  range: PhotographerStatsRange,
): Promise<PhotographerKpisFiveDigest> {
  const kpis = await aggregatePhotographerStats(photographerId, range);
  return {
    clientsActive: kpis.clientsActive,
    videosGenerated: kpis.videosGenerated,
    revenueEstUsd: kpis.revenueEstUsd,
    commissionEarnedUsd: kpis.commissionEarnedUsd,
    ratingAvg: kpis.ratingAvg,
  };
}
