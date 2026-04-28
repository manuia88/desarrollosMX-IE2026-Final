// F14.F.7 Sprint 6 — ambient-library helpers unit tests (Upgrade 4 / Tarea 6.4).
// DMX Studio dentro DMX único entorno (ADR-054).

import { describe, expect, it } from 'vitest';
import {
  AmbientPresetSchema,
  CANON_AMBIENT_SLUGS,
  isCanonAmbientSlug,
  suggestAmbientForScene,
} from '@/features/dmx-studio/lib/seedance/ambient-library';

describe('ambient-library.CANON_AMBIENT_SLUGS', () => {
  it('exposes exactly 12 canon ambient slugs', () => {
    expect(CANON_AMBIENT_SLUGS).toHaveLength(12);
  });

  it('contains the BIBLIA v4 §6 canon set', () => {
    const expected = [
      'ocean_view',
      'downtown_busy',
      'garden_birds',
      'kitchen_modern',
      'fireplace_cozy',
      'park_kids',
      'rooftop_wind',
      'pool_water',
      'rain_window',
      'cafe_chatter',
      'forest_morning',
      'office_open',
    ];
    for (const slug of expected) {
      expect(CANON_AMBIENT_SLUGS).toContain(slug);
    }
  });
});

describe('ambient-library.suggestAmbientForScene', () => {
  it('maps cocina → kitchen_modern', () => {
    expect(suggestAmbientForScene('cocina')).toBe('kitchen_modern');
  });

  it('maps jardin → garden_birds', () => {
    expect(suggestAmbientForScene('jardin')).toBe('garden_birds');
  });

  it('maps agua → pool_water', () => {
    expect(suggestAmbientForScene('agua')).toBe('pool_water');
  });

  it('maps calle → downtown_busy', () => {
    expect(suggestAmbientForScene('calle')).toBe('downtown_busy');
  });

  it('maps mar / vista_mar → ocean_view', () => {
    expect(suggestAmbientForScene('mar')).toBe('ocean_view');
    expect(suggestAmbientForScene('vista_mar')).toBe('ocean_view');
  });

  it('falls back to forest_morning for unknown scenes', () => {
    expect(suggestAmbientForScene('asteroid')).toBe('forest_morning');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(suggestAmbientForScene('  Cocina  ')).toBe('kitchen_modern');
    expect(suggestAmbientForScene('JARDIN')).toBe('garden_birds');
  });
});

describe('ambient-library.isCanonAmbientSlug', () => {
  it('returns true for a canon slug', () => {
    expect(isCanonAmbientSlug('kitchen_modern')).toBe(true);
  });

  it('returns false for non-canon slug', () => {
    expect(isCanonAmbientSlug('not_a_real_slug')).toBe(false);
  });
});

describe('ambient-library.AmbientPresetSchema', () => {
  it('parses a valid row from studio_audio_ambient_library', () => {
    const row = {
      id: '11111111-1111-4111-8111-111111111111',
      slug: 'ocean_view',
      name: 'Vista al mar',
      description: 'Olas suaves rompiendo, brisa marina relajante',
      context_tags: ['outdoor', 'nature', 'luxury', 'vista'],
      storage_path: 'audio-ambient/ocean_view.mp3',
      duration_seconds: 30,
      is_active: true,
      meta: {},
      created_at: '2026-04-27T00:00:00.000Z',
    };
    const parsed = AmbientPresetSchema.parse(row);
    expect(parsed.slug).toBe('ocean_view');
    expect(parsed.context_tags).toHaveLength(4);
  });

  it('rejects invalid uuid', () => {
    expect(() =>
      AmbientPresetSchema.parse({
        id: 'not-a-uuid',
        slug: 'x',
        name: 'x',
        description: null,
        context_tags: [],
        storage_path: 'x',
        duration_seconds: 1,
        is_active: true,
        meta: {},
        created_at: '2026-04-27T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('accepts null description', () => {
    const parsed = AmbientPresetSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      slug: 'x',
      name: 'x',
      description: null,
      context_tags: [],
      storage_path: 'x',
      duration_seconds: 1,
      is_active: true,
      meta: {},
      created_at: '2026-04-27T00:00:00.000Z',
    });
    expect(parsed.description).toBeNull();
  });
});
