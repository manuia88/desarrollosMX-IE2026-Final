// FASE 14.F.12 — auto-import-asesor.isStep1Complete helper unit tests.
// Pattern: Modo A pure-function (zero mocks). Drives skip_step1=true redirect en
// app/[locale]/(asesor)/studio-app/layout.tsx tras applyAutoImportToBrandKit().

import { describe, expect, it } from 'vitest';
import { isStep1Complete } from '../auto-import-asesor';

describe('isStep1Complete — F14.F.12 onboarding skip predicate', () => {
  it('returns true cuando display_name + contact_phone + zones.length >= 1', () => {
    expect(
      isStep1Complete({
        display_name: 'Manuel Acosta',
        contact_phone: '+525555555555',
        zones: ['Polanco'],
      }),
    ).toBe(true);
  });

  it('returns true con múltiples zonas', () => {
    expect(
      isStep1Complete({
        display_name: 'Manuel',
        contact_phone: '5555555555',
        zones: ['Polanco', 'Roma Norte', 'Condesa'],
      }),
    ).toBe(true);
  });

  it('returns false cuando display_name es null', () => {
    expect(
      isStep1Complete({
        display_name: null,
        contact_phone: '5555555555',
        zones: ['Polanco'],
      }),
    ).toBe(false);
  });

  it('returns false cuando display_name es empty string', () => {
    expect(
      isStep1Complete({
        display_name: '',
        contact_phone: '5555555555',
        zones: ['Polanco'],
      }),
    ).toBe(false);
  });

  it('returns false cuando display_name es solo whitespace', () => {
    expect(
      isStep1Complete({
        display_name: '   ',
        contact_phone: '5555555555',
        zones: ['Polanco'],
      }),
    ).toBe(false);
  });

  it('returns false cuando contact_phone es null', () => {
    expect(
      isStep1Complete({
        display_name: 'Manuel',
        contact_phone: null,
        zones: ['Polanco'],
      }),
    ).toBe(false);
  });

  it('returns false cuando contact_phone es empty string', () => {
    expect(
      isStep1Complete({
        display_name: 'Manuel',
        contact_phone: '',
        zones: ['Polanco'],
      }),
    ).toBe(false);
  });

  it('returns false cuando zones es null', () => {
    expect(
      isStep1Complete({
        display_name: 'Manuel',
        contact_phone: '5555555555',
        zones: null,
      }),
    ).toBe(false);
  });

  it('returns false cuando zones es empty array', () => {
    expect(
      isStep1Complete({
        display_name: 'Manuel',
        contact_phone: '5555555555',
        zones: [],
      }),
    ).toBe(false);
  });
});
