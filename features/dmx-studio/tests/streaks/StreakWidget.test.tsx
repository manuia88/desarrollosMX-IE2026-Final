// F14.F.5 Sprint 4 UPGRADE 3 — StreakWidget renders current streak number.
// Modo A: lightweight render via React renderer mock + module export smoke.

import { describe, expect, it } from 'vitest';

describe('StreakWidget — module export smoke + props contract', () => {
  it('exports StreakWidget as a function and the rendered tree includes current streak number text', async () => {
    const mod = await import('@/features/dmx-studio/components/streaks/StreakWidget');
    expect(typeof mod.StreakWidget).toBe('function');
    expect(mod.StreakWidget.name).toBe('StreakWidget');

    const element = mod.StreakWidget({
      currentStreakDays: 14,
      longestStreakDays: 30,
      badgesUnlocked: ['streak_7'],
      nextBadge: { key: 'streak_30', days: 30, daysRemaining: 16 },
    });

    // Element is a React element tree; we serialize the relevant subset to verify
    // the value 14 surfaces in the rendered children.
    const serialized = JSON.stringify(element);
    expect(serialized).toContain('14');
    expect(serialized).toContain('30');
    expect(serialized).toContain('streak-widget');
  });
});
