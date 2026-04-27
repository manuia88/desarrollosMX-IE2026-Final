// F14.F.5 Sprint 4 Tarea 4.3 — Angle rotator pure logic tests.
// Cubre: rotation cycle (general -> cocina -> ... -> lujo -> general) + no-history default.

import { describe, expect, it } from 'vitest';
import { nextAngle } from '@/features/dmx-studio/lib/remarketing/angle-rotator';
import { REMARKETING_ANGLES } from '@/features/dmx-studio/lib/remarketing/types';

describe('nextAngle — rotation cycle canon', () => {
  it('returns "general" when history is empty (default)', () => {
    expect(nextAngle([])).toBe('general');
  });

  it('rotates through full canon cycle deterministically', () => {
    // Walk the rotation: feed each previous angle as most-recent and assert next.
    const expectedCycle: Record<string, string> = {
      general: 'cocina',
      cocina: 'zona',
      zona: 'inversionista',
      inversionista: 'familiar',
      familiar: 'lujo',
      lujo: 'general',
    };
    for (const angle of REMARKETING_ANGLES) {
      const next = nextAngle([angle]);
      expect(next).toBe(expectedCycle[angle]);
    }
  });

  it('ignores invalid history entries and falls back to "general"', () => {
    expect(nextAngle(['unknown_angle_xx'])).toBe('general');
  });

  it('uses most-recent valid angle when history mixes valid + invalid', () => {
    // Most recent valid is "cocina" -> next should be "zona".
    expect(nextAngle(['cocina', 'unknown', 'general'])).toBe('zona');
  });
});
