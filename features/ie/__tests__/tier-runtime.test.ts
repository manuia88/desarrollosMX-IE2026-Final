import { describe, expect, it } from 'vitest';
import { readForceIeFlag } from '../hooks/use-force-ie-flag';

function makeParams(obj: Record<string, string>) {
  return new URLSearchParams(obj);
}

describe('readForceIeFlag — admin bypass URL helper', () => {
  it('false cuando searchParams null', () => {
    expect(readForceIeFlag(null)).toBe(false);
  });

  it('false cuando no existe force_ie', () => {
    expect(readForceIeFlag(makeParams({}))).toBe(false);
  });

  it('true con force_ie=1', () => {
    expect(readForceIeFlag(makeParams({ force_ie: '1' }))).toBe(true);
  });

  it('true con force_ie=true (case insensitive)', () => {
    expect(readForceIeFlag(makeParams({ force_ie: 'TRUE' }))).toBe(true);
    expect(readForceIeFlag(makeParams({ force_ie: 'yes' }))).toBe(true);
  });

  it('false con force_ie=0 o valor inesperado', () => {
    expect(readForceIeFlag(makeParams({ force_ie: '0' }))).toBe(false);
    expect(readForceIeFlag(makeParams({ force_ie: 'no' }))).toBe(false);
    expect(readForceIeFlag(makeParams({ force_ie: 'other' }))).toBe(false);
  });

  it('tolera whitespace', () => {
    expect(readForceIeFlag(makeParams({ force_ie: '  1  ' }))).toBe(true);
  });
});

describe('ScorePlaceholder bypass contract — runtime acceptance', () => {
  // Import dinámico para evitar costo si el archivo no exporta helper.
  it('canBypassPlaceholder requiere gated + superadmin + forceFlag', async () => {
    const { canBypassPlaceholder } = await import('@/shared/ui/dopamine/score-placeholder');
    expect(canBypassPlaceholder({ gated: true, isSuperadmin: true, forceFlag: true })).toBe(true);
    expect(canBypassPlaceholder({ gated: true, isSuperadmin: false, forceFlag: true })).toBe(false);
    expect(canBypassPlaceholder({ gated: true, isSuperadmin: true, forceFlag: false })).toBe(false);
    expect(canBypassPlaceholder({ gated: false, isSuperadmin: true, forceFlag: true })).toBe(false);
  });
});
