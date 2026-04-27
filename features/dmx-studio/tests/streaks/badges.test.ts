// F14.F.5 Sprint 4 UPGRADE 3 — badge threshold logic tests.

import { describe, expect, it } from 'vitest';
import {
  BADGE_THRESHOLDS,
  badgeForStreak,
  nextBadgeForStreak,
} from '@/features/dmx-studio/lib/streaks/badges';

describe('badgeForStreak — threshold cross', () => {
  it('returns highest badge crossed at exact and just-above thresholds', () => {
    expect(badgeForStreak(0)).toBeNull();
    expect(badgeForStreak(6)).toBeNull();
    expect(badgeForStreak(7)).toBe('streak_7');
    expect(badgeForStreak(29)).toBe('streak_7');
    expect(badgeForStreak(30)).toBe('streak_30');
    expect(badgeForStreak(99)).toBe('streak_30');
    expect(badgeForStreak(100)).toBe('streak_100');
    expect(badgeForStreak(364)).toBe('streak_100');
    expect(badgeForStreak(365)).toBe('streak_365');
    expect(badgeForStreak(1000)).toBe('streak_365');
  });
});

describe('badgeForStreak — idempotent (pure function)', () => {
  it('same input yields same output across multiple invocations', () => {
    const inputs = [0, 7, 30, 100, 365, 500];
    for (const days of inputs) {
      const a = badgeForStreak(days);
      const b = badgeForStreak(days);
      const c = badgeForStreak(days);
      expect(a).toBe(b);
      expect(b).toBe(c);
    }
    // Threshold list is canon ascending and stable.
    expect(BADGE_THRESHOLDS.map((b) => b.days)).toEqual([7, 30, 100, 365]);
    expect(nextBadgeForStreak(8)?.key).toBe('streak_30');
    expect(nextBadgeForStreak(365)).toBeNull();
  });
});
