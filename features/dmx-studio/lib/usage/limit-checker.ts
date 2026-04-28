// FASE 14.F.12 Sprint 11+12 BIBLIA — Premium/Basic video limit checker per plan.
// Reads studio_usage_logs filtered by meta->>'category' jsonb operator and
// computes remaining vs limit per category (premium | basic).
//
// Plan canon FASE 14.F.12:
//   - founder: 2 premium + 3 basic = 5 total
//   - pro: 5 premium + 10 basic = 15 total
//   - agency: 20 premium + 30 basic = 50 total
//
// RLS bypass intencional via supabase admin client (server-side only). user_id explícito.

import {
  getBasicLimit,
  getPremiumLimit,
  type StudioPlanKey,
} from '@/features/dmx-studio/lib/stripe-products';
import type { createAdminClient } from '@/shared/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

export type VideoCategory = 'premium' | 'basic';

export interface CheckVideoLimitResult {
  readonly ok: boolean;
  readonly remaining: number;
  readonly limit: number;
  readonly used: number;
  readonly category: VideoCategory;
}

function currentPeriodMonth(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function limitForCategory(planKey: StudioPlanKey, category: VideoCategory): number {
  if (category === 'premium') return getPremiumLimit(planKey);
  return getBasicLimit(planKey);
}

/**
 * Check whether the user has remaining quota for a given video category in the
 * current billing period (UTC month).
 *
 * Filters studio_usage_logs by:
 *   - user_id = userId
 *   - period_month = current YYYY-MM
 *   - metric_type = 'video_render'
 *   - meta->>'category' = category
 *
 * Returns ok=true when used < limit; ok=false when exactly at or over limit.
 */
export async function checkVideoLimitByCategory(
  supabase: AdminClient,
  userId: string,
  planKey: StudioPlanKey,
  category: VideoCategory,
): Promise<CheckVideoLimitResult> {
  const limit = limitForCategory(planKey, category);
  const period = currentPeriodMonth();

  const { count, error } = await supabase
    .from('studio_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('period_month', period)
    .eq('metric_type', 'video_render')
    .eq('meta->>category', category);

  if (error) {
    throw new Error(`checkVideoLimitByCategory query failed: ${error.message}`);
  }

  const used = count ?? 0;
  const remaining = Math.max(limit - used, 0);
  const ok = used < limit;

  return { ok, remaining, limit, used, category };
}
