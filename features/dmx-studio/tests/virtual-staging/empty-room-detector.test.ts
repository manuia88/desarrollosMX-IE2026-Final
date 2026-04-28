// F14.F.7 Sprint 6 BIBLIA v4 §6 UPGRADE 7 — Empty room heuristic detector tests.
// DMX Studio dentro DMX único entorno (ADR-054).

import { describe, expect, it } from 'vitest';

import {
  detectEmptyByMeta,
  EmptyRoomCandidateSchema,
} from '@/features/dmx-studio/lib/virtual-staging/empty-room-detector';

describe('virtual-staging.empty-room-detector', () => {
  it('returns false when no tags are present anywhere', () => {
    expect(detectEmptyByMeta({})).toBe(false);
    expect(detectEmptyByMeta({ ai_classification: null, meta: null })).toBe(false);
    expect(detectEmptyByMeta({ ai_classification: { tags: [] }, meta: { tags: [] } })).toBe(false);
  });

  it('detects empty via ai_classification.tags keywords (case-insensitive)', () => {
    expect(detectEmptyByMeta({ ai_classification: { tags: ['VACIO', 'living'] } })).toBe(true);
    expect(detectEmptyByMeta({ ai_classification: { tags: ['empty_room'] } })).toBe(true);
    expect(detectEmptyByMeta({ ai_classification: { tags: ['unfurnished'] } })).toBe(true);
    expect(detectEmptyByMeta({ ai_classification: { tags: ['sin_muebles'] } })).toBe(true);
  });

  it('detects empty via meta.tags fallback', () => {
    expect(detectEmptyByMeta({ meta: { tags: ['kitchen', 'empty'] } })).toBe(true);
    expect(detectEmptyByMeta({ meta: { tags: ['bedroom', 'sin_muebles'] } })).toBe(true);
  });

  it('returns false when tags exist but no empty keyword matches; ignores non-string tags', () => {
    expect(
      detectEmptyByMeta({ ai_classification: { tags: ['living', 'furnished', 'cozy'] } }),
    ).toBe(false);
    expect(detectEmptyByMeta({ ai_classification: { tags: [123, true, null] } })).toBe(false);
  });

  it('EmptyRoomCandidateSchema validates expected shape', () => {
    const ok = EmptyRoomCandidateSchema.safeParse({
      id: 'a1',
      storage_url: 'https://example.com/x.jpg',
    });
    expect(ok.success).toBe(true);
    const bad = EmptyRoomCandidateSchema.safeParse({ id: 'a1', storage_url: 'not-a-url' });
    expect(bad.success).toBe(false);
  });
});
