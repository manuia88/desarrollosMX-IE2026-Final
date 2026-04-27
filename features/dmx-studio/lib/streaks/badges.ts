// F14.F.5 Sprint 4 UPGRADE 3 — DMX Studio streaks gamification.
// Badge thresholds canon (Duolingo + Strava style). Ascending order by days.

export interface BadgeDefinition {
  readonly key: 'streak_7' | 'streak_30' | 'streak_100' | 'streak_365';
  readonly days: number;
}

export const BADGE_THRESHOLDS: ReadonlyArray<BadgeDefinition> = [
  { key: 'streak_7', days: 7 },
  { key: 'streak_30', days: 30 },
  { key: 'streak_100', days: 100 },
  { key: 'streak_365', days: 365 },
];

export type BadgeKey = BadgeDefinition['key'];

/**
 * Returns the highest badge unlocked at the given streak day count, or null
 * if the streak has not crossed any threshold yet.
 */
export function badgeForStreak(days: number): BadgeKey | null {
  let unlocked: BadgeKey | null = null;
  for (const def of BADGE_THRESHOLDS) {
    if (days >= def.days) {
      unlocked = def.key;
    }
  }
  return unlocked;
}

/**
 * Returns the next badge above the given streak day count, or null if all
 * badges are already unlocked.
 */
export function nextBadgeForStreak(days: number): BadgeDefinition | null {
  for (const def of BADGE_THRESHOLDS) {
    if (days < def.days) return def;
  }
  return null;
}
