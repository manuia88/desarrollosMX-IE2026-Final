import { describe, expect, it } from 'vitest';
import { isValidTokenFormat } from '../../packages/chrome-extension/src/lib/token-format';

describe('isValidTokenFormat', () => {
  it('acepta token con prefijo dmx_ + 48 hex (52 chars)', () => {
    expect(isValidTokenFormat('dmx_' + 'a'.repeat(48))).toBe(true);
  });

  it('rechaza token <32 chars', () => {
    expect(isValidTokenFormat('dmx_' + 'a'.repeat(20))).toBe(false);
  });

  it('rechaza token >512 chars', () => {
    expect(isValidTokenFormat('dmx_' + 'a'.repeat(600))).toBe(false);
  });

  it('rechaza chars no alfanuméricos no permitidos', () => {
    expect(isValidTokenFormat('dmx_' + '!'.repeat(40))).toBe(false);
    expect(isValidTokenFormat('dmx_' + '/'.repeat(40))).toBe(false);
    expect(isValidTokenFormat('dmx ' + 'a'.repeat(40))).toBe(false);
  });

  it('acepta caracteres . _ -', () => {
    expect(isValidTokenFormat('a'.repeat(20) + '._-' + 'b'.repeat(20))).toBe(true);
  });
});
