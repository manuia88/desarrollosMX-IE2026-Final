import { describe, expect, it } from 'vitest';
import {
  clampScore,
  dominantDiscTrait,
  isValidTraitCode,
  normalizeBigFiveProfile,
  normalizeDiscProfile,
} from '@/features/crm/lib/disc-scoring';

describe('clampScore', () => {
  it('clamps negative to 0', () => {
    expect(clampScore(-5)).toBe(0);
  });
  it('clamps over 100 to 100', () => {
    expect(clampScore(150)).toBe(100);
  });
  it('rounds to 2 decimals', () => {
    expect(clampScore(75.456)).toBe(75.46);
  });
  it('handles NaN', () => {
    expect(clampScore(Number.NaN)).toBe(0);
  });
});

describe('isValidTraitCode', () => {
  it('valid DISC codes', () => {
    expect(isValidTraitCode('disc', 'D')).toBe(true);
    expect(isValidTraitCode('disc', 'C')).toBe(true);
  });
  it('invalid DISC code O', () => {
    expect(isValidTraitCode('disc', 'O')).toBe(false);
  });
  it('valid Big Five codes', () => {
    expect(isValidTraitCode('big_five', 'O')).toBe(true);
    expect(isValidTraitCode('big_five', 'N')).toBe(true);
  });
  it('invalid Big Five code D', () => {
    expect(isValidTraitCode('big_five', 'D')).toBe(false);
  });
});

describe('normalizeDiscProfile', () => {
  it('clamps + defaults to 0', () => {
    const profile = normalizeDiscProfile({ D: 200, I: -10, S: 45.789 });
    expect(profile.D).toBe(100);
    expect(profile.I).toBe(0);
    expect(profile.S).toBe(45.79);
    expect(profile.C).toBe(0);
  });
});

describe('normalizeBigFiveProfile', () => {
  it('returns 5-key OCEAN', () => {
    const profile = normalizeBigFiveProfile({ O: 70 });
    expect(profile).toEqual({ O: 70, C: 0, E: 0, A: 0, N: 0 });
  });
});

describe('dominantDiscTrait', () => {
  it('returns code with max value', () => {
    expect(dominantDiscTrait({ D: 80, I: 60, S: 30, C: 50 })).toBe('D');
  });
  it('handles ties (returns first)', () => {
    expect(dominantDiscTrait({ D: 50, I: 50, S: 50, C: 50 })).toBe('D');
  });
});
