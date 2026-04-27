// F14.F.5 Sprint 4 — challenge week launched template render test.

import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_WEEK_LAUNCHED_SUBJECT,
  renderChallengeWeekLaunchedHtml,
} from '@/features/dmx-studio/lib/resend/templates/challenge-week-launched';

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1F900}-\u{1F9FF}]/u;

describe('renderChallengeWeekLaunchedHtml', () => {
  it('formats weekStart as DD/MM/YYYY and exposes XP reward', () => {
    const html = renderChallengeWeekLaunchedHtml({
      name: 'Andres',
      challengeTitle: 'Reel con voz clonada',
      challengeDescription: 'Publica al menos 3 reels usando tu voice clone esta semana.',
      weekStart: '2026-04-27',
      rewardXp: 250,
    });

    expect(CHALLENGE_WEEK_LAUNCHED_SUBJECT).toBe('Nuevo challenge esta semana');
    expect(html).toContain('Hola Andres');
    expect(html).toContain('Reel con voz clonada');
    expect(html).toContain('27/04/2026');
    expect(html).toContain('250 XP');
    expect(html).toContain('<!doctype html>');
    expect(EMOJI_REGEX.test(html)).toBe(false);
  });
});
