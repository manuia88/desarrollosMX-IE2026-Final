// F14.F.5 Sprint 4 — UPGRADE 4 smart timing tests (Modo A: pure logic).

import { describe, expect, it } from 'vitest';
import { getOptimalTiming } from '@/features/dmx-studio/lib/calendar/smart-timing';

describe('getOptimalTiming — platform differentiation (IG vs FB)', () => {
  it('returns different hour for instagram vs facebook on same dayOfWeek', () => {
    const ig = getOptimalTiming('instagram', 1); // Lunes
    const fb = getOptimalTiming('facebook', 1);
    expect(ig.hour).toBeGreaterThanOrEqual(0);
    expect(ig.hour).toBeLessThanOrEqual(23);
    expect(fb.hour).toBeGreaterThanOrEqual(0);
    expect(fb.hour).toBeLessThanOrEqual(23);
    // IG lunes = 19, FB lunes = 13 — distintos por canon table.
    expect(ig.hour).not.toBe(fb.hour);
    expect(ig.reason.length).toBeGreaterThan(10);
    expect(fb.reason.length).toBeGreaterThan(10);
  });

  it('returns plausible LinkedIn weekday morning slot (B2B 9-12)', () => {
    const li = getOptimalTiming('linkedin', 2); // Martes
    expect(li.hour).toBeGreaterThanOrEqual(9);
    expect(li.hour).toBeLessThanOrEqual(12);
  });
});

describe('getOptimalTiming — weekday vs weekend differentiation', () => {
  it('returns valid hour for sabado (6) and lunes (1) on instagram (canon table)', () => {
    const sat = getOptimalTiming('instagram', 6);
    const mon = getOptimalTiming('instagram', 1);
    expect(sat.hour).toBeGreaterThanOrEqual(0);
    expect(sat.hour).toBeLessThanOrEqual(23);
    expect(mon.hour).toBeGreaterThanOrEqual(0);
    expect(mon.hour).toBeLessThanOrEqual(23);
    // Diferentes slots semana → fin de semana.
    expect(sat.hour).not.toBe(mon.hour);
  });

  it('normalizes out-of-range dayOfWeek (e.g. 8 → 1) without throwing', () => {
    const out = getOptimalTiming('tiktok', 8);
    expect(out.hour).toBeGreaterThanOrEqual(0);
    expect(out.hour).toBeLessThanOrEqual(23);
  });
});
