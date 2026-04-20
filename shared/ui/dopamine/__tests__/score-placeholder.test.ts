import { describe, expect, it } from 'vitest';
import { canBypassPlaceholder } from '../score-placeholder';

describe('canBypassPlaceholder', () => {
  it('requiere gated=true, superadmin y flag para bypass', () => {
    expect(canBypassPlaceholder({ gated: true, isSuperadmin: true, forceFlag: true })).toBe(true);
  });

  it('no bypass si no está gated', () => {
    expect(canBypassPlaceholder({ gated: false, isSuperadmin: true, forceFlag: true })).toBe(false);
  });

  it('no bypass si no es superadmin', () => {
    expect(canBypassPlaceholder({ gated: true, isSuperadmin: false, forceFlag: true })).toBe(false);
  });

  it('no bypass si falta force flag', () => {
    expect(canBypassPlaceholder({ gated: true, isSuperadmin: true, forceFlag: false })).toBe(false);
  });

  it('no bypass con valores undefined', () => {
    expect(canBypassPlaceholder({ gated: true })).toBe(false);
  });
});
