// F14.F.5 Sprint 4 UPGRADE 3 — DMX Studio streaks gamification tRPC router.
// Procedures: getCurrent, getLongest, getBadges. All authenticated via studioProcedure.

import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import {
  BADGE_THRESHOLDS,
  type BadgeKey,
  badgeForStreak,
  nextBadgeForStreak,
} from '../lib/streaks/badges';
import { studioProcedure } from './_studio-procedure';

interface StreakRow {
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string | null;
  badges_unlocked: string[];
  total_videos_generated: number;
}

const VALID_BADGE_KEYS = new Set<BadgeKey>(BADGE_THRESHOLDS.map((b) => b.key));

function filterBadges(values: ReadonlyArray<string>): ReadonlyArray<BadgeKey> {
  return values.filter((v): v is BadgeKey => VALID_BADGE_KEYS.has(v as BadgeKey));
}

async function fetchRow(userId: string): Promise<StreakRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('studio_streaks')
    .select(
      'current_streak_days, longest_streak_days, last_activity_date, badges_unlocked, total_videos_generated',
    )
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  return data ?? null;
}

export const studioStreaksRouter = router({
  getCurrent: studioProcedure.query(async ({ ctx }) => {
    const row = await fetchRow(ctx.user.id);
    if (!row) {
      return {
        currentStreakDays: 0,
        longestStreakDays: 0,
        lastActivityDate: null,
        totalVideosGenerated: 0,
      } as const;
    }
    return {
      currentStreakDays: row.current_streak_days,
      longestStreakDays: row.longest_streak_days,
      lastActivityDate: row.last_activity_date,
      totalVideosGenerated: row.total_videos_generated,
    } as const;
  }),

  getLongest: studioProcedure.query(async ({ ctx }) => {
    const row = await fetchRow(ctx.user.id);
    return { longestStreakDays: row?.longest_streak_days ?? 0 } as const;
  }),

  getBadges: studioProcedure.query(async ({ ctx }) => {
    const row = await fetchRow(ctx.user.id);
    const current = row?.current_streak_days ?? 0;
    const unlocked = row ? filterBadges(row.badges_unlocked) : [];
    const next = nextBadgeForStreak(current);
    return {
      badgesUnlocked: unlocked,
      currentStreakDays: current,
      highestUnlocked: badgeForStreak(current),
      nextBadge: next
        ? {
            key: next.key,
            days: next.days,
            daysRemaining: Math.max(0, next.days - current),
          }
        : null,
    } as const;
  }),
});
