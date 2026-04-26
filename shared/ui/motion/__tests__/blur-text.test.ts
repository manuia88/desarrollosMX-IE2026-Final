import { describe, expect, it } from 'vitest';
import { splitWords } from '../blur-text';

describe('BlurText — splitWords', () => {
  it('splits string by whitespace', () => {
    expect(splitWords('hola mundo bonito')).toEqual(['hola', 'mundo', 'bonito']);
  });

  it('collapses multiple spaces', () => {
    expect(splitWords('hola   mundo')).toEqual(['hola', 'mundo']);
  });

  it('returns empty array for empty input', () => {
    expect(splitWords('')).toEqual([]);
  });

  it('handles single word', () => {
    expect(splitWords('DesarrollosMX')).toEqual(['DesarrollosMX']);
  });

  it('preserves punctuation in word', () => {
    expect(splitWords('hola, mundo.')).toEqual(['hola,', 'mundo.']);
  });
});

describe('BlurText — module export', () => {
  it('exports BlurText as function', async () => {
    const mod = await import('../blur-text');
    expect(typeof mod.BlurText).toBe('function');
    expect(mod.BlurText.name).toBe('BlurText');
  });
});
