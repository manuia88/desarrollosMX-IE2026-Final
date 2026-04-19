import { describe, expect, it } from 'vitest';
import { staffMidpoint } from '../staff';

describe('staffMidpoint', () => {
  it('mapea ranges INEGI a midpoints', () => {
    expect(staffMidpoint('0 a 5 personas')).toBe(3);
    expect(staffMidpoint('6 a 10 personas')).toBe(8);
    expect(staffMidpoint('11 a 30 personas')).toBe(20);
    expect(staffMidpoint('31 a 50 personas')).toBe(40);
    expect(staffMidpoint('51 a 100 personas')).toBe(75);
    expect(staffMidpoint('101 a 250 personas')).toBe(175);
    expect(staffMidpoint('251 y más personas')).toBe(400);
  });

  it('acepta variantes de formato', () => {
    expect(staffMidpoint('0  a  5')).toBe(3);
    expect(staffMidpoint('251+')).toBe(400);
  });

  it('null/undefined/empty → null', () => {
    expect(staffMidpoint(null)).toBeNull();
    expect(staffMidpoint(undefined)).toBeNull();
    expect(staffMidpoint('')).toBeNull();
  });

  it('valor numérico crudo → ese valor', () => {
    expect(staffMidpoint('42')).toBe(42);
  });

  it('formato no reconocido → null', () => {
    expect(staffMidpoint('rango raro')).toBeNull();
  });
});
