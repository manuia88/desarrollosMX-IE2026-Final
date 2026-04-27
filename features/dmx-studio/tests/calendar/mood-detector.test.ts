// F14.F.5 Sprint 4 — UPGRADE 1 mood detector tests (Modo A: pure logic).

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

import { detectMood } from '@/features/dmx-studio/lib/calendar/mood-detector';

describe('detectMood — bucket rules', () => {
  it('returns "low" when closedDeals7d=0 AND leads7d<3', () => {
    const result = detectMood({ closedDeals7d: 0, closedDeals30d: 1, leads7d: 2 });
    expect(result.mood).toBe('low');
    expect(result.toneHint.length).toBeGreaterThan(10);
    expect(result.toneHint.toLowerCase()).toContain('motivacional');
  });

  it('returns "high" when closedDeals7d>=2 (and not celebratory bucket)', () => {
    const result = detectMood({ closedDeals7d: 3, closedDeals30d: 4, leads7d: 8 });
    expect(result.mood).toBe('high');
    expect(result.toneHint.toLowerCase()).toContain('momentum');
  });

  it('returns "celebratory" when closedDeals30d>=5 (overrides high bucket)', () => {
    const result = detectMood({ closedDeals7d: 4, closedDeals30d: 6, leads7d: 12 });
    expect(result.mood).toBe('celebratory');
    expect(result.toneHint.toLowerCase()).toMatch(/celebratorio|aspiracional/);
  });

  it('returns "neutral" otherwise (e.g. 1 closed7d + leads7d>=3)', () => {
    const result = detectMood({ closedDeals7d: 1, closedDeals30d: 2, leads7d: 5 });
    expect(result.mood).toBe('neutral');
  });

  it('returns "neutral" when closedDeals7d=0 AND leads7d>=3 (low bucket guard)', () => {
    const result = detectMood({ closedDeals7d: 0, closedDeals30d: 2, leads7d: 4 });
    expect(result.mood).toBe('neutral');
  });
});
