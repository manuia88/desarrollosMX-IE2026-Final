// 15.X.2 Radar Trend Genome B2B — subscribe + dispatch
//
// Pipeline:
//   - subscribeRadar: idempotent insert zone_alert_subscriptions.
//   - listAlerts: cross-join subscriptions × zone_alpha_alerts.
//   - dispatchAlerts (cron-callable): notify subscribers when new alpha alerts cross threshold.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

type AdminClient = SupabaseClient<Database>;

export type RadarAlertRow = {
  id: string;
  zoneId: string;
  alphaScore: number;
  detectedAt: string;
  signals: Record<string, unknown>;
  timeToMainstreamMonths: number | null;
};

export type RadarSubscriptionRow = {
  id: string;
  zoneId: string;
  channel: string;
  thresholdPct: number;
  active: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
};

export async function subscribeRadar(
  supabase: AdminClient,
  args: {
    userId: string;
    zoneId: string;
    channel: string;
    thresholdPct: number;
    countryCode: string;
  },
): Promise<{ subscribed: true; subscriptionId: string } | { subscribed: false; reason: string }> {
  const { data, error } = await supabase
    .from('zone_alert_subscriptions')
    .upsert(
      {
        user_id: args.userId,
        zone_id: args.zoneId,
        channel: args.channel,
        threshold_pct: args.thresholdPct,
        country_code: args.countryCode,
        active: true,
      },
      { onConflict: 'user_id,zone_id,channel', ignoreDuplicates: false },
    )
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return { subscribed: false, reason: error?.message ?? 'unknown' };
  }
  return { subscribed: true, subscriptionId: data.id };
}

export async function unsubscribeRadar(
  supabase: AdminClient,
  args: { userId: string; subscriptionId: string },
): Promise<boolean> {
  const { error } = await supabase
    .from('zone_alert_subscriptions')
    .update({ active: false })
    .eq('id', args.subscriptionId)
    .eq('user_id', args.userId);
  return !error;
}

export async function listSubscriptions(
  supabase: AdminClient,
  userId: string,
): Promise<ReadonlyArray<RadarSubscriptionRow>> {
  const { data } = await supabase
    .from('zone_alert_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!data) return [];
  return data.map((s) => ({
    id: s.id,
    zoneId: s.zone_id,
    channel: s.channel,
    thresholdPct: Number(s.threshold_pct),
    active: s.active,
    lastTriggeredAt: s.last_triggered_at,
    createdAt: s.created_at,
  }));
}

export async function listRecentAlertsForUser(
  supabase: AdminClient,
  userId: string,
  limit: number,
): Promise<ReadonlyArray<RadarAlertRow>> {
  const { data: subs } = await supabase
    .from('zone_alert_subscriptions')
    .select('zone_id')
    .eq('user_id', userId)
    .eq('active', true);

  const zoneIds = (subs ?? []).map((s) => s.zone_id);
  if (zoneIds.length === 0) return [];

  const { data } = await supabase
    .from('zone_alpha_alerts')
    .select('*')
    .in('zone_id', zoneIds)
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map((a) => ({
    id: a.id,
    zoneId: a.zone_id,
    alphaScore: Number(a.alpha_score),
    detectedAt: a.detected_at,
    signals: (a.signals ?? {}) as Record<string, unknown>,
    timeToMainstreamMonths: a.time_to_mainstream_months,
  }));
}

export type DispatchResult = {
  alertsScanned: number;
  notificationsSent: number;
  errors: number;
};

export async function dispatchPendingAlerts(supabase: AdminClient): Promise<DispatchResult> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: alerts } = await supabase
    .from('zone_alpha_alerts')
    .select('id, zone_id, alpha_score, detected_at')
    .eq('is_active', true)
    .gte('detected_at', since)
    .limit(500);

  if (!alerts || alerts.length === 0) {
    return { alertsScanned: 0, notificationsSent: 0, errors: 0 };
  }

  let notificationsSent = 0;
  let errors = 0;

  for (const alert of alerts) {
    const { data: subs } = await supabase
      .from('zone_alert_subscriptions')
      .select('id, user_id, channel, threshold_pct, last_triggered_at')
      .eq('zone_id', alert.zone_id)
      .eq('active', true);

    if (!subs || subs.length === 0) continue;

    for (const sub of subs) {
      try {
        if (Number(alert.alpha_score) < Number(sub.threshold_pct)) continue;

        await supabase
          .from('zone_alert_subscriptions')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', sub.id);

        notificationsSent += 1;
      } catch {
        errors += 1;
      }
    }
  }

  await supabase
    .from('zone_alpha_alerts')
    .update({ subscribers_notified: notificationsSent })
    .in(
      'id',
      alerts.map((a) => a.id),
    );

  return { alertsScanned: alerts.length, notificationsSent, errors };
}
