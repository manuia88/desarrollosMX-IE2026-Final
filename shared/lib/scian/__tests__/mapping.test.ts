import { describe, expect, it } from 'vitest';
import { macroCategoryForScian, tierForScian } from '../mapping';

describe('tierForScian', () => {
  it('clasifica restaurantes premium 7225 como high', () => {
    expect(tierForScian('722513')).toBe('high');
  });

  it('clasifica restaurantes familiar 7221 como standard', () => {
    expect(tierForScian('722110')).toBe('standard');
  });

  it('clasifica fondas/taquerías 7222 como basic', () => {
    expect(tierForScian('722211')).toBe('basic');
  });

  it('clasifica abarrotes 4611 como standard', () => {
    expect(tierForScian('461110')).toBe('standard');
  });

  it('rechaza códigos no numéricos', () => {
    expect(tierForScian('abc')).toBeNull();
    expect(tierForScian('')).toBeNull();
    expect(tierForScian(null)).toBeNull();
    expect(tierForScian(undefined)).toBeNull();
  });

  it('retorna null para códigos sin match', () => {
    expect(tierForScian('999999')).toBeNull();
  });
});

describe('macroCategoryForScian', () => {
  it('mapea 7225 a gastronomia', () => {
    expect(macroCategoryForScian('722513')).toBe('gastronomia');
  });

  it('mapea 461110 a retail', () => {
    expect(macroCategoryForScian('461110')).toBe('retail');
  });

  it('mapea 621 a salud', () => {
    expect(macroCategoryForScian('621112')).toBe('salud');
  });

  it('mapea 611 a educacion', () => {
    expect(macroCategoryForScian('611112')).toBe('educacion');
  });

  it('mapea 541 a servicios_profesionales', () => {
    expect(macroCategoryForScian('541110')).toBe('servicios_profesionales');
  });

  it('mapea 7139 a fitness_wellness (más específico que 711 cultura)', () => {
    expect(macroCategoryForScian('713940')).toBe('fitness_wellness');
  });

  it('retorna null para códigos sin match', () => {
    expect(macroCategoryForScian('999')).toBeNull();
    expect(macroCategoryForScian(null)).toBeNull();
  });
});
