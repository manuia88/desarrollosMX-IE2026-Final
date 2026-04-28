// F14.F.7 Sprint 6 BIBLIA v4 §6 — Styles canon constants tests.
// DMX Studio dentro DMX único entorno (ADR-054).

import { describe, expect, it } from 'vitest';

import {
  getStyleBySlug,
  STAGING_STYLES_CANON,
} from '@/features/dmx-studio/lib/virtual-staging/styles-canon';

describe('virtual-staging.styles-canon', () => {
  it('exposes 5 canonical styles with required shape', () => {
    expect(STAGING_STYLES_CANON.length).toBe(5);
    for (const s of STAGING_STYLES_CANON) {
      expect(typeof s.slug).toBe('string');
      expect(typeof s.name).toBe('string');
      expect(typeof s.description).toBe('string');
      expect(['neutral', 'warm', 'cool', 'gold']).toContain(s.tone);
    }
    const slugs = STAGING_STYLES_CANON.map((s) => s.slug);
    expect(slugs).toEqual(['modern', 'classic', 'minimalist', 'luxury', 'family']);
  });

  it('getStyleBySlug returns the matching entry for a known slug', () => {
    const found = getStyleBySlug('luxury');
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Lujoso');
    expect(found?.tone).toBe('gold');
  });

  it('getStyleBySlug returns null for unknown slug', () => {
    expect(getStyleBySlug('industrial')).toBeNull();
    expect(getStyleBySlug('')).toBeNull();
    expect(getStyleBySlug('UNKNOWN')).toBeNull();
  });
});
