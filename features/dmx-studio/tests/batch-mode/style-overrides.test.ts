// F14.F.5 Sprint 4 — Batch Mode style overrides canon test.
// Verifies the 3 canon styles (lujo, familiar, inversionista) are defined
// with required override fields.

import { describe, expect, it } from 'vitest';
import {
  BATCH_STYLE_KEYS,
  STYLE_OVERRIDES,
} from '@/features/dmx-studio/lib/batch-mode/style-overrides';

describe('STYLE_OVERRIDES — 3 canon styles', () => {
  it('exposes lujo, familiar, inversionista with required override fields', () => {
    expect(BATCH_STYLE_KEYS).toEqual(['lujo', 'familiar', 'inversionista']);
    for (const key of BATCH_STYLE_KEYS) {
      const ov = STYLE_OVERRIDES[key];
      expect(ov.key).toBe(key);
      expect(typeof ov.displayName).toBe('string');
      expect(ov.displayName.length).toBeGreaterThan(2);
      expect(typeof ov.camera).toBe('string');
      expect(typeof ov.colorGrade).toBe('string');
      expect(typeof ov.musicMood).toBe('string');
      expect(typeof ov.styleTemplateKey).toBe('string');
      expect(typeof ov.narrationTone).toBe('string');
    }
    expect(STYLE_OVERRIDES.lujo.styleTemplateKey).toBe('luxe_editorial');
    expect(STYLE_OVERRIDES.familiar.styleTemplateKey).toBe('family_friendly');
    expect(STYLE_OVERRIDES.inversionista.styleTemplateKey).toBe('investor_pitch');
  });
});
