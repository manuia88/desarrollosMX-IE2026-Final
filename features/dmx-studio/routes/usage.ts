// FASE 14.F.3 Sprint 2 BIBLIA — Usage tracking router (Tarea 2.5).
// Plan limits: Pro 5 / Foto 50 / Agency 20 videos/mes.
// Predictive 80% warning canon (memoria upgrade DIRECTO).

import { TRPCError } from '@trpc/server';
import { usageHistoryInput } from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

const PLAN_LIMITS: Readonly<Record<string, number>> = {
  pro: 5,
  foto: 50,
  agency: 20,
} as const;

function currentPeriodMonth(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

export const studioUsageRouter = router({
  getCurrent: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const period = currentPeriodMonth();

    const { data: subscription } = await supabase
      .from('studio_subscriptions')
      .select('plan_key, videos_per_month_limit, videos_used_this_period, status')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const planKey = subscription?.plan_key ?? 'pro';
    const planLimit = subscription?.videos_per_month_limit ?? PLAN_LIMITS[planKey] ?? 5;

    const { count: usedCount, error: countErr } = await supabase
      .from('studio_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .eq('period_month', period)
      .eq('metric_type', 'video_generated');
    if (countErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: countErr });

    const used = usedCount ?? 0;
    const remaining = Math.max(planLimit - used, 0);
    const usedPct = planLimit > 0 ? used / planLimit : 0;

    return {
      planKey,
      subscriptionStatus: subscription?.status ?? null,
      period,
      used,
      limit: planLimit,
      remaining,
      usedPct,
      thresholdReached80: usedPct >= 0.8,
      thresholdReached100: usedPct >= 1,
    };
  }),

  getHistory: studioProcedure.input(usageHistoryInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - input.monthsBack);
    since.setUTCDate(1);

    const { data, error } = await supabase
      .from('studio_usage_logs')
      .select('id, metric_type, metric_amount, cost_usd, period_month, created_at, meta')
      .eq('user_id', ctx.user.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });

    const buckets = new Map<
      string,
      { period: string; videos: number; costUsd: number; byModel: Record<string, number> }
    >();
    let totalCost = 0;
    let totalVideos = 0;

    for (const row of data ?? []) {
      const period = row.period_month;
      const cost = Number(row.cost_usd ?? 0);
      const isVideo = row.metric_type === 'video_generated';
      const meta = (row.meta ?? {}) as Record<string, unknown>;
      const model = typeof meta.ai_model === 'string' ? meta.ai_model : 'other';

      if (!buckets.has(period)) {
        buckets.set(period, { period, videos: 0, costUsd: 0, byModel: {} });
      }
      const bucket = buckets.get(period);
      if (!bucket) continue;
      bucket.costUsd += cost;
      if (isVideo) {
        bucket.videos += 1;
        totalVideos += 1;
      }
      bucket.byModel[model] = (bucket.byModel[model] ?? 0) + cost;
      totalCost += cost;
    }

    return {
      months: Array.from(buckets.values()).sort((a, b) => a.period.localeCompare(b.period)),
      totals: {
        totalCostUsd: Number(totalCost.toFixed(4)),
        totalVideos,
        avgPerVideo: totalVideos > 0 ? Number((totalCost / totalVideos).toFixed(4)) : 0,
      },
    };
  }),

  checkLimit: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const period = currentPeriodMonth();

    const { data: subscription } = await supabase
      .from('studio_subscriptions')
      .select('plan_key, videos_per_month_limit, status')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const planKey = subscription?.plan_key ?? 'pro';
    const planLimit = subscription?.videos_per_month_limit ?? PLAN_LIMITS[planKey] ?? 5;

    const { count } = await supabase
      .from('studio_usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .eq('period_month', period)
      .eq('metric_type', 'video_generated');

    const used = count ?? 0;
    const ok = used < planLimit;
    return { ok, used, limit: planLimit, remaining: Math.max(planLimit - used, 0), planKey };
  }),
});
