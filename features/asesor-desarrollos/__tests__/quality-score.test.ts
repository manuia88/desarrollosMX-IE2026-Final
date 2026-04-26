import { describe, expect, it } from 'vitest';
import { QUALITY_LEVEL_KEYS, qualityScoreLabel } from '../lib/quality-score';

describe('qualityScoreLabel', () => {
  it('returns competitivo for score >= 80', () => {
    expect(qualityScoreLabel(80)).toBe('competitivo');
    expect(qualityScoreLabel(95)).toBe('competitivo');
    expect(qualityScoreLabel(100)).toBe('competitivo');
  });

  it('returns moderado for 60 <= score < 80', () => {
    expect(qualityScoreLabel(60)).toBe('moderado');
    expect(qualityScoreLabel(79.9)).toBe('moderado');
    expect(qualityScoreLabel(70)).toBe('moderado');
  });

  it('returns fueraMercado for score < 60', () => {
    expect(qualityScoreLabel(0)).toBe('fueraMercado');
    expect(qualityScoreLabel(59.9)).toBe('fueraMercado');
    expect(qualityScoreLabel(30)).toBe('fueraMercado');
  });

  it('returns sinACM when score is null or undefined', () => {
    expect(qualityScoreLabel(null)).toBe('sinACM');
    expect(qualityScoreLabel(undefined)).toBe('sinACM');
  });

  it('exposes 4 canonical level keys', () => {
    expect(QUALITY_LEVEL_KEYS).toEqual(['competitivo', 'moderado', 'fueraMercado', 'sinACM']);
  });

  it('does NOT invert semantics (Pulppo gap canon)', () => {
    expect(qualityScoreLabel(85)).not.toBe('fueraMercado');
    expect(qualityScoreLabel(40)).not.toBe('competitivo');
  });
});
