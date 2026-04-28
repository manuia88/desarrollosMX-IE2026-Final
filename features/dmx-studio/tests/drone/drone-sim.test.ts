// F14.F.7 Sprint 6 — Drone sim prompt builder + cost estimator tests.

import { describe, expect, it } from 'vitest';
import {
  buildKlingPromptForPattern,
  estimateDroneCostUsd,
  SimulateDroneInputSchema,
} from '@/features/dmx-studio/lib/drone-sim';

describe('SimulateDroneInputSchema', () => {
  it('accepts valid input', () => {
    const parsed = SimulateDroneInputSchema.parse({
      imageUrl: 'https://example.com/foto.jpg',
      pattern: 'orbital',
      durationSeconds: 8,
    });
    expect(parsed.pattern).toBe('orbital');
    expect(parsed.durationSeconds).toBe(8);
  });

  it('rejects invalid imageUrl + invalid pattern + out-of-range duration', () => {
    expect(() =>
      SimulateDroneInputSchema.parse({
        imageUrl: 'not-a-url',
        pattern: 'orbital',
        durationSeconds: 8,
      }),
    ).toThrow();
    expect(() =>
      SimulateDroneInputSchema.parse({
        imageUrl: 'https://example.com/x.jpg',
        pattern: 'invalid-pattern',
        durationSeconds: 8,
      }),
    ).toThrow();
    expect(() =>
      SimulateDroneInputSchema.parse({
        imageUrl: 'https://example.com/x.jpg',
        pattern: 'orbital',
        durationSeconds: 99,
      }),
    ).toThrow();
  });
});

describe('buildKlingPromptForPattern', () => {
  it('produces canon prompt fragment for each pattern', () => {
    expect(buildKlingPromptForPattern('orbital')).toContain('orbital drone shot');
    expect(buildKlingPromptForPattern('orbital')).toContain('360');
    expect(buildKlingPromptForPattern('flyover')).toContain('flyover');
    expect(buildKlingPromptForPattern('flyover')).toContain('top-down');
    expect(buildKlingPromptForPattern('approach')).toContain('approach');
    expect(buildKlingPromptForPattern('approach')).toContain('zoom-in');
    expect(buildKlingPromptForPattern('reveal')).toContain('reveal');
    expect(buildKlingPromptForPattern('reveal')).toContain('wide vista');
  });

  it('appends basePrompt when provided', () => {
    const out = buildKlingPromptForPattern('orbital', 'modern villa with pool');
    expect(out).toContain('orbital drone shot');
    expect(out).toContain('modern villa with pool');
  });

  it('falls back to orbital fragment for unknown pattern', () => {
    const out = buildKlingPromptForPattern('does-not-exist');
    expect(out).toContain('orbital drone shot');
  });
});

describe('estimateDroneCostUsd', () => {
  it('computes 0.05 * seconds rounded to 2 decimals', () => {
    expect(estimateDroneCostUsd(0)).toBe(0);
    expect(estimateDroneCostUsd(8)).toBe(0.4);
    expect(estimateDroneCostUsd(15)).toBe(0.75);
  });

  it('clamps negative to zero and floors fractional seconds', () => {
    expect(estimateDroneCostUsd(-5)).toBe(0);
    expect(estimateDroneCostUsd(7.9)).toBe(0.35);
  });
});
