// F14.F.5 Sprint 4 UPGRADE 3 — DMX Studio streaks gamification.
// Zod schemas (Single Source of Truth) for badge keys and streak state.

import { z } from 'zod';

export const BadgeKeySchema = z.enum(['streak_7', 'streak_30', 'streak_100', 'streak_365']);
export type BadgeKey = z.infer<typeof BadgeKeySchema>;

export const StreakStateSchema = z.object({
  currentStreakDays: z.number().int().min(0),
  longestStreakDays: z.number().int().min(0),
  totalVideosGenerated: z.number().int().min(0),
  badgesUnlocked: z.array(BadgeKeySchema).readonly(),
  lastActivityDate: z.string().date().nullable(),
});
export type StreakState = z.infer<typeof StreakStateSchema>;

export const RecordActivityResultSchema = z.object({
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  badgesUnlocked: z.array(BadgeKeySchema).readonly(),
  newBadgeUnlocked: BadgeKeySchema.nullable(),
});
export type RecordActivityResult = z.infer<typeof RecordActivityResultSchema>;
