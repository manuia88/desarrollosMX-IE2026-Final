// F14.F.10 Sprint 9 BIBLIA Upgrade 5 — Commission tracking video sales.
// Atomic update studio_photographer_clients (per-client aggregations) +
// studio_photographers (rollup aggregations) cuando fotógrafo registra venta video.
// getPhotographerEarnings agrupa revenue por mes para CommissionDashboard UI.

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface TrackVideoSaleInput {
  readonly photographerId: string;
  readonly clientId: string;
  readonly videoId: string;
  readonly amount: number;
}

export interface TrackVideoSaleResult {
  readonly ok: true;
  readonly photographerId: string;
  readonly clientId: string;
  readonly newClientVideosTotal: number;
  readonly newClientRevenueTotal: number;
  readonly newPhotographerVideosTotal: number;
  readonly newPhotographerRevenueTotal: number;
}

type AdminClient = ReturnType<typeof createAdminClient>;

export interface TrackVideoSaleDeps {
  readonly client?: AdminClient;
}

/**
 * Atomic update video sale: incrementa client + photographer aggregations.
 * Lee valores actuales y aplica delta — no SQL atomic single statement (Supabase
 * SDK no soporta increment SQL functions desde JS sin RPC). Para concurrency
 * safety en H2 considerar Postgres RPC `studio_track_video_sale`.
 */
export async function trackVideoSale(
  input: TrackVideoSaleInput,
  deps: TrackVideoSaleDeps = {},
): Promise<TrackVideoSaleResult> {
  if (input.amount < 0) {
    throw new Error('commission.tracker.invalid_amount: amount must be >= 0');
  }

  const supabase = deps.client ?? createAdminClient();

  const { data: client, error: clientFetchErr } = await supabase
    .from('studio_photographer_clients')
    .select('id, total_videos_generated, total_revenue_attributed')
    .eq('id', input.clientId)
    .eq('photographer_id', input.photographerId)
    .maybeSingle();

  if (clientFetchErr) {
    sentry.captureException(clientFetchErr, {
      tags: { feature: 'dmx-studio.photographer.commission', op: 'trackVideoSale.fetchClient' },
      extra: { photographerId: input.photographerId, clientId: input.clientId },
    });
    throw new Error(`commission.tracker.fetch_client_failed: ${clientFetchErr.message}`);
  }
  if (!client) {
    throw new Error('commission.tracker.client_not_found');
  }

  const newClientVideos = (client.total_videos_generated ?? 0) + 1;
  const newClientRevenue = Number(client.total_revenue_attributed ?? 0) + input.amount;

  const { error: clientUpdateErr } = await supabase
    .from('studio_photographer_clients')
    .update({
      total_videos_generated: newClientVideos,
      total_revenue_attributed: newClientRevenue,
      last_video_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.clientId)
    .eq('photographer_id', input.photographerId);

  if (clientUpdateErr) {
    sentry.captureException(clientUpdateErr, {
      tags: { feature: 'dmx-studio.photographer.commission', op: 'trackVideoSale.updateClient' },
      extra: { photographerId: input.photographerId, clientId: input.clientId },
    });
    throw new Error(`commission.tracker.update_client_failed: ${clientUpdateErr.message}`);
  }

  const { data: photographer, error: photographerFetchErr } = await supabase
    .from('studio_photographers')
    .select('id, videos_generated_total, revenue_est_total')
    .eq('id', input.photographerId)
    .maybeSingle();

  if (photographerFetchErr) {
    sentry.captureException(photographerFetchErr, {
      tags: {
        feature: 'dmx-studio.photographer.commission',
        op: 'trackVideoSale.fetchPhotographer',
      },
      extra: { photographerId: input.photographerId },
    });
    throw new Error(
      `commission.tracker.fetch_photographer_failed: ${photographerFetchErr.message}`,
    );
  }
  if (!photographer) {
    throw new Error('commission.tracker.photographer_not_found');
  }

  const newPhotographerVideos = (photographer.videos_generated_total ?? 0) + 1;
  const newPhotographerRevenue = Number(photographer.revenue_est_total ?? 0) + input.amount;

  const { error: photographerUpdateErr } = await supabase
    .from('studio_photographers')
    .update({
      videos_generated_total: newPhotographerVideos,
      revenue_est_total: newPhotographerRevenue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.photographerId);

  if (photographerUpdateErr) {
    sentry.captureException(photographerUpdateErr, {
      tags: {
        feature: 'dmx-studio.photographer.commission',
        op: 'trackVideoSale.updatePhotographer',
      },
      extra: { photographerId: input.photographerId },
    });
    throw new Error(
      `commission.tracker.update_photographer_failed: ${photographerUpdateErr.message}`,
    );
  }

  return {
    ok: true,
    photographerId: input.photographerId,
    clientId: input.clientId,
    newClientVideosTotal: newClientVideos,
    newClientRevenueTotal: newClientRevenue,
    newPhotographerVideosTotal: newPhotographerVideos,
    newPhotographerRevenueTotal: newPhotographerRevenue,
  };
}

export interface PhotographerEarningsRange {
  readonly start: string;
  readonly end: string;
}

export interface PhotographerEarningsMonthBucket {
  readonly month: string;
  readonly revenueUsd: number;
  readonly videos: number;
}

export interface PhotographerEarningsResult {
  readonly photographerId: string;
  readonly totalRevenueUsd: number;
  readonly totalVideos: number;
  readonly byMonth: ReadonlyArray<PhotographerEarningsMonthBucket>;
}

export interface GetPhotographerEarningsDeps {
  readonly client?: AdminClient;
}

function bucketMonth(iso: string): string {
  return iso.slice(0, 7);
}

/**
 * Aggregate photographer earnings per-month dentro de range.
 * Usa updated_at de studio_photographer_clients para asignar bucket — heurística
 * H1 sin tabla operaciones (STUB H2 aún). En H2 source via operaciones.fecha.
 */
export async function getPhotographerEarnings(
  photographerId: string,
  range: PhotographerEarningsRange,
  deps: GetPhotographerEarningsDeps = {},
): Promise<PhotographerEarningsResult> {
  const supabase = deps.client ?? createAdminClient();

  const { data: clients, error } = await supabase
    .from('studio_photographer_clients')
    .select('total_videos_generated, total_revenue_attributed, updated_at, last_video_at')
    .eq('photographer_id', photographerId)
    .gte('updated_at', range.start)
    .lte('updated_at', range.end);

  if (error) {
    sentry.captureException(error, {
      tags: { feature: 'dmx-studio.photographer.commission', op: 'getPhotographerEarnings' },
      extra: { photographerId, range },
    });
    throw new Error(`commission.tracker.get_earnings_failed: ${error.message}`);
  }

  const rows = clients ?? [];
  const byMonthMap = new Map<string, { revenueUsd: number; videos: number }>();
  let totalRevenueUsd = 0;
  let totalVideos = 0;

  for (const row of rows) {
    const monthAnchor = row.last_video_at ?? row.updated_at;
    const month = bucketMonth(monthAnchor);
    const revenue = Number(row.total_revenue_attributed ?? 0);
    const videos = row.total_videos_generated ?? 0;
    totalRevenueUsd += revenue;
    totalVideos += videos;
    const existing = byMonthMap.get(month) ?? { revenueUsd: 0, videos: 0 };
    byMonthMap.set(month, {
      revenueUsd: existing.revenueUsd + revenue,
      videos: existing.videos + videos,
    });
  }

  const byMonth: ReadonlyArray<PhotographerEarningsMonthBucket> = Array.from(byMonthMap.entries())
    .map(([month, agg]) => ({ month, revenueUsd: agg.revenueUsd, videos: agg.videos }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    photographerId,
    totalRevenueUsd,
    totalVideos,
    byMonth,
  };
}

export const __test__ = {
  bucketMonth,
};
