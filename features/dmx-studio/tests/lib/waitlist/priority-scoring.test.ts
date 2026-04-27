// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Priority scoring unit tests.

import { describe, expect, it } from 'vitest';
import {
  calculatePriorityScore,
  PRIORITY_SCORE_CAP,
} from '@/features/dmx-studio/lib/waitlist/priority-scoring';

describe('calculatePriorityScore', () => {
  it('asesor existing user with leads + closed deals scores higher than asesor external', () => {
    const existing = calculatePriorityScore({
      role: 'asesor',
      currentLeadsCount: 20,
      currentClosedDealsCount: 5,
      isExistingUser: true,
    });
    const external = calculatePriorityScore({
      role: 'asesor',
      isExistingUser: false,
    });
    expect(existing).toBeGreaterThan(external);
    // existing: (20*0.5 + 5*2 + 10) * 1.5 = (10 + 10 + 10) * 1.5 = 45
    expect(existing).toBe(45);
    // external asesor: 5
    expect(external).toBe(5);
  });

  it('caps at 100 for extreme inputs', () => {
    const huge = calculatePriorityScore({
      role: 'asesor',
      currentLeadsCount: 9999,
      currentClosedDealsCount: 9999,
      isExistingUser: true,
    });
    expect(huge).toBe(PRIORITY_SCORE_CAP);
    expect(huge).toBeLessThanOrEqual(100);
  });
});
