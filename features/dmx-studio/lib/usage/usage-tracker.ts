// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.5 — Usage tracking helpers (server-side only).
// Inserts studio_usage_logs rows + maintains studio_subscriptions.videos_used_this_period
// counter in lockstep. Plan limit fallbacks (FASE 14.F.12 MXN canon): founder=5 /
// pro=15 / agency=50 (override via studio_subscriptions.videos_per_month_limit when
// subscription row exists). Legacy keys (foto=50, plain pro=5/agency=20) preserved
// for backwards compat with H0 historical subscribers.
// RLS bypass intencional via createAdminClient (server-side only). user_id explícito.

import { createAdminClient } from '@/shared/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

export const STUDIO_PLAN_LIMITS: Readonly<Record<string, number>> = {
  // Canon FASE 14.F.12 (MXN tier)
  founder: 5,
  pro: 15,
  agency: 50,
  // Legacy backwards compat (H0 USD tier + B2B2C photographer foto plan)
  foto: 50,
} as const;

const DEFAULT_PLAN_KEY = 'founder';
const DEFAULT_PLAN_LIMIT = 5;

export interface RecordVideoGeneratedInput {
  readonly userId: string;
  readonly projectId: string;
  readonly subscriptionId?: string | null;
  readonly costUsd: number;
  readonly aiModel?: string | null;
}

export interface RecordVideoGeneratedResult {
  readonly ok: boolean;
  readonly thresholdReached: boolean;
}

export interface CheckUsageLimitResult {
  readonly ok: boolean;
  readonly used: number;
  readonly limit: number;
  readonly planKey: string;
}

export interface CostBreakdownResult {
  readonly totalUsd: number;
  readonly perVideoAvg: number;
  readonly byModel: Record<string, number>;
}

function getClient(client?: AdminClient): AdminClient {
  return client ?? createAdminClient();
}

export function currentPeriodMonth(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function planLimitFromKey(planKey: string | null | undefined): number {
  if (!planKey) return DEFAULT_PLAN_LIMIT;
  return STUDIO_PLAN_LIMITS[planKey] ?? DEFAULT_PLAN_LIMIT;
}

export async function recordVideoGenerated(
  input: RecordVideoGeneratedInput,
  opts?: { client?: AdminClient },
): Promise<RecordVideoGeneratedResult> {
  const supabase = getClient(opts?.client);
  const period = currentPeriodMonth();

  const insertPayload = {
    user_id: input.userId,
    project_id: input.projectId,
    subscription_id: input.subscriptionId ?? null,
    metric_type: 'video_generated',
    metric_amount: 1,
    cost_usd: input.costUsd,
    period_month: period,
    meta: { ai_model: input.aiModel ?? 'other' },
  };

  const { error: insertError } = await supabase.from('studio_usage_logs').insert(insertPayload);
  if (insertError) {
    throw new Error(`usage-tracker.recordVideoGenerated insert failed: ${insertError.message}`);
  }

  if (input.subscriptionId) {
    const { data: subRow, error: subFetchError } = await supabase
      .from('studio_subscriptions')
      .select('videos_used_this_period, videos_per_month_limit, plan_key')
      .eq('id', input.subscriptionId)
      .maybeSingle();

    if (subFetchError) {
      throw new Error(
        `usage-tracker.recordVideoGenerated fetch subscription failed: ${subFetchError.message}`,
      );
    }

    const currentUsed = subRow?.videos_used_this_period ?? 0;
    const nextUsed = currentUsed + 1;
    const planLimit =
      subRow?.videos_per_month_limit ?? planLimitFromKey(subRow?.plan_key ?? DEFAULT_PLAN_KEY);

    const { error: updateError } = await supabase
      .from('studio_subscriptions')
      .update({
        videos_used_this_period: nextUsed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.subscriptionId);

    if (updateError) {
      throw new Error(
        `usage-tracker.recordVideoGenerated update subscription failed: ${updateError.message}`,
      );
    }

    return { ok: true, thresholdReached: planLimit > 0 && nextUsed / planLimit >= 0.8 };
  }

  const { count } = await supabase
    .from('studio_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', input.userId)
    .eq('period_month', period)
    .eq('metric_type', 'video_generated');
  const used = count ?? 0;
  return { ok: true, thresholdReached: used / DEFAULT_PLAN_LIMIT >= 0.8 };
}

export async function checkUsageLimit(
  userId: string,
  opts?: { client?: AdminClient },
): Promise<CheckUsageLimitResult> {
  const supabase = getClient(opts?.client);
  const period = currentPeriodMonth();

  const { data: subRow } = await supabase
    .from('studio_subscriptions')
    .select('plan_key, videos_per_month_limit')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const planKey = subRow?.plan_key ?? DEFAULT_PLAN_KEY;
  const planLimit = subRow?.videos_per_month_limit ?? planLimitFromKey(planKey);

  const { count } = await supabase
    .from('studio_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('period_month', period)
    .eq('metric_type', 'video_generated');

  const used = count ?? 0;
  return {
    ok: used < planLimit,
    used,
    limit: planLimit,
    planKey,
  };
}

export async function getCostBreakdown(
  userId: string,
  periodMonth: string,
  opts?: { client?: AdminClient },
): Promise<CostBreakdownResult> {
  const supabase = getClient(opts?.client);

  const { data, error } = await supabase
    .from('studio_usage_logs')
    .select('cost_usd, metric_type, meta')
    .eq('user_id', userId)
    .eq('period_month', periodMonth);

  if (error) {
    throw new Error(`usage-tracker.getCostBreakdown failed: ${error.message}`);
  }

  let totalUsd = 0;
  let videosCount = 0;
  const byModel: Record<string, number> = {};

  for (const row of data ?? []) {
    const cost = Number(row.cost_usd ?? 0);
    const meta = (row.meta ?? {}) as Record<string, unknown>;
    const model =
      typeof meta.ai_model === 'string' && meta.ai_model.length > 0 ? meta.ai_model : 'other';
    totalUsd += cost;
    byModel[model] = (byModel[model] ?? 0) + cost;
    if (row.metric_type === 'video_generated') {
      videosCount += 1;
    }
  }

  const perVideoAvg = videosCount > 0 ? totalUsd / videosCount : 0;
  const round = (n: number): number => Number(n.toFixed(4));
  const roundedByModel: Record<string, number> = {};
  for (const [k, v] of Object.entries(byModel)) {
    roundedByModel[k] = round(v);
  }
  return {
    totalUsd: round(totalUsd),
    perVideoAvg: round(perVideoAvg),
    byModel: roundedByModel,
  };
}
