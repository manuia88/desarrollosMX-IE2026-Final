// F14.F.7 Sprint 6 — Drone patterns canon tests.

import { describe, expect, it } from 'vitest';
import {
  DRONE_PATTERNS_CANON,
  getPatternBySlug,
} from '@/features/dmx-studio/lib/drone-sim/patterns';

describe('drone patterns canon', () => {
  it('exposes exactly 4 patterns', () => {
    expect(DRONE_PATTERNS_CANON).toHaveLength(4);
    const slugs = DRONE_PATTERNS_CANON.map((p) => p.slug).sort();
    expect(slugs).toEqual(['approach', 'flyover', 'orbital', 'reveal']);
  });

  it('getPatternBySlug returns the pattern when slug exists', () => {
    const orbital = getPatternBySlug('orbital');
    expect(orbital).not.toBeNull();
    expect(orbital?.name).toBe('Orbital');
    expect(orbital?.defaultDurationSeconds).toBe(8);
  });

  it('getPatternBySlug returns null for unknown slug', () => {
    expect(getPatternBySlug('unknown')).toBeNull();
    expect(getPatternBySlug('')).toBeNull();
  });
});
