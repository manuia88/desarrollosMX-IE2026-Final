// F14.F.5 Sprint 4 — streak milestone template render test.

import { describe, expect, it } from 'vitest';
import {
  renderStreakMilestoneHtml,
  renderStreakMilestoneSubject,
  STREAK_MILESTONE_SUBJECT_PREFIX,
} from '@/features/dmx-studio/lib/resend/templates/streak-milestone';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1F900}-\u{1F9FF}]/u;

describe('renderStreakMilestoneHtml', () => {
  it('badge name and day count present in subject + body', () => {
    const subject = renderStreakMilestoneSubject('streak_30');
    const html = renderStreakMilestoneHtml({
      name: 'Diana',
      badgeKey: 'streak_30',
      currentStreakDays: 30,
    });

    expect(subject.startsWith(STREAK_MILESTONE_SUBJECT_PREFIX)).toBe(true);
    expect(subject).toContain('Un mes imparable');
    expect(html).toContain('Hola Diana');
    expect(html).toContain('Un mes imparable');
    expect(html).toContain('30');
    expect(html).toContain('dias seguidos');
    expect(html).toContain('<!doctype html>');
    expect(EMOJI_REGEX.test(html)).toBe(false);
  });
});
