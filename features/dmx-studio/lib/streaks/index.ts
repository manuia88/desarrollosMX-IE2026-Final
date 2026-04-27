// F14.F.5 Sprint 4 UPGRADE 3 — DMX Studio streaks gamification.
// recordActivity: idempotent per day, +1 on consecutive day, reset on broken
// streak. On crossing a badge threshold for the first time, unlocks badge and
// fires sendStreakMilestone email best-effort (errors swallowed to Sentry).
//
// Future invocation: PM should call recordActivity inside a post-INSERT trigger
// or service hook on `studio_video_projects` once a project moves to status
// 'completed'. This module is pure and side-effect free except for the optional
// email fire-and-forget.

import type { SupabaseClient } from '@supabase/supabase-js';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Database } from '@/shared/types/database';
import { sendStreakMilestone } from '../resend';
import { badgeForStreak } from './badges';
import type { BadgeKey, RecordActivityResult } from './types';

type AdminClient = SupabaseClient<Database>;

interface RecordActivityArgs {
  readonly userId: string;
  readonly today?: string; // ISO date YYYY-MM-DD (test injection); defaults to UTC today
  readonly notifyEmail?: string | null;
  readonly notifyName?: string | null;
}

function todayIsoUtc(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function diffDaysIso(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function isBadgeKey(value: unknown): value is BadgeKey {
  return (
    value === 'streak_7' ||
    value === 'streak_30' ||
    value === 'streak_100' ||
    value === 'streak_365'
  );
}

/**
 * Records one activity day for the user and returns the new streak state.
 * - Same day: no-op (idempotent).
 * - Consecutive day (yesterday): current_streak += 1.
 * - Broken (>1 day gap or first ever): current_streak = 1.
 * Updates longest_streak when surpassed. Unlocks badges crossing thresholds.
 * Side effect: when a new badge is unlocked AND notifyEmail is provided, fires
 * sendStreakMilestone (errors swallowed to Sentry).
 */
export async function recordActivity(
  supabase: AdminClient,
  args: RecordActivityArgs,
): Promise<RecordActivityResult> {
  const today = args.today ?? todayIsoUtc();

  const existing = await supabase
    .from('studio_streaks')
    .select(
      'current_streak_days, longest_streak_days, last_activity_date, badges_unlocked, total_videos_generated',
    )
    .eq('user_id', args.userId)
    .maybeSingle();

  if (existing.error) {
    sentry.captureException(existing.error, {
      tags: { feature: 'dmx-studio.streaks', op: 'select' },
    });
    throw existing.error;
  }

  const row = existing.data;

  let currentStreak = 1;
  let longestStreak = 1;
  let badges: BadgeKey[] = [];
  let totalVideos = 1;

  if (row) {
    const last = row.last_activity_date ?? null;
    badges = (row.badges_unlocked ?? []).filter(isBadgeKey);
    totalVideos = (row.total_videos_generated ?? 0) + 1;

    if (last === today) {
      // Same day: idempotent. Return current snapshot, no email fire.
      return {
        currentStreak: row.current_streak_days,
        longestStreak: row.longest_streak_days,
        badgesUnlocked: badges,
        newBadgeUnlocked: null,
      };
    }

    if (last !== null) {
      const gap = diffDaysIso(last, today);
      if (gap === 1) {
        currentStreak = row.current_streak_days + 1;
      } else {
        // gap > 1 day OR negative (clock skew): reset.
        currentStreak = 1;
      }
    } else {
      currentStreak = 1;
    }
    longestStreak = Math.max(row.longest_streak_days, currentStreak);
  } else {
    currentStreak = 1;
    longestStreak = 1;
    badges = [];
    totalVideos = 1;
  }

  const earned = badgeForStreak(currentStreak);
  let newBadgeUnlocked: BadgeKey | null = null;
  if (earned !== null && !badges.includes(earned)) {
    badges = [...badges, earned];
    newBadgeUnlocked = earned;
  }

  if (row) {
    const upd = await supabase
      .from('studio_streaks')
      .update({
        current_streak_days: currentStreak,
        longest_streak_days: longestStreak,
        last_activity_date: today,
        badges_unlocked: badges,
        total_videos_generated: totalVideos,
      })
      .eq('user_id', args.userId);
    if (upd.error) {
      sentry.captureException(upd.error, {
        tags: { feature: 'dmx-studio.streaks', op: 'update' },
      });
      throw upd.error;
    }
  } else {
    const ins = await supabase.from('studio_streaks').insert({
      user_id: args.userId,
      current_streak_days: currentStreak,
      longest_streak_days: longestStreak,
      last_activity_date: today,
      badges_unlocked: badges,
      total_videos_generated: totalVideos,
    });
    if (ins.error) {
      sentry.captureException(ins.error, {
        tags: { feature: 'dmx-studio.streaks', op: 'insert' },
      });
      throw ins.error;
    }
  }

  if (newBadgeUnlocked !== null && args.notifyEmail) {
    try {
      await sendStreakMilestone({
        to: args.notifyEmail,
        name: args.notifyName ?? null,
        badgeKey: newBadgeUnlocked,
        currentStreakDays: currentStreak,
      });
    } catch (err) {
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.streaks', op: 'milestone-email' },
        extra: { badgeKey: newBadgeUnlocked },
      });
    }
  }

  return {
    currentStreak,
    longestStreak,
    badgesUnlocked: badges,
    newBadgeUnlocked,
  };
}

export { BADGE_THRESHOLDS, badgeForStreak, nextBadgeForStreak } from './badges';
export type { BadgeKey, RecordActivityResult, StreakState } from './types';
