import { describe, expect, it } from 'vitest';
import { ensureUniqueSlug, SLUG_MAX_LENGTH, slugify } from '../lib/slugify';

describe('slugify', () => {
  it('lowercases and converts spaces to hyphens', () => {
    expect(slugify('Roma Norte')).toBe('roma-norte');
  });

  it('strips spanish diacritics', () => {
    expect(slugify('Polanco V Sección')).toBe('polanco-v-seccion');
    expect(slugify('Cuauhtémoc')).toBe('cuauhtemoc');
    expect(slugify('Álvaro Obregón')).toBe('alvaro-obregon');
  });

  it('strips portuguese diacritics', () => {
    expect(slugify('São Paulo')).toBe('sao-paulo');
    expect(slugify('Coração Velho')).toBe('coracao-velho');
  });

  it('replaces non-alphanumeric with single hyphen', () => {
    expect(slugify('San Ángel (Inn)')).toBe('san-angel-inn');
    expect(slugify('Del Valle Norte, CDMX')).toBe('del-valle-norte-cdmx');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('--Roma--')).toBe('roma');
    expect(slugify('  Centro  ')).toBe('centro');
  });

  it('collapses multiple consecutive separators', () => {
    expect(slugify('Roma    Norte')).toBe('roma-norte');
    expect(slugify('Roma---Norte')).toBe('roma-norte');
  });

  it('returns empty for empty or non-string input', () => {
    expect(slugify('')).toBe('');
    // @ts-expect-error intentional runtime guard test
    expect(slugify(null)).toBe('');
    // @ts-expect-error intentional runtime guard test
    expect(slugify(undefined)).toBe('');
  });

  it('caps slug at max length without trailing hyphen', () => {
    const long = 'a'.repeat(120);
    const out = slugify(long);
    expect(out.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(out.endsWith('-')).toBe(false);
  });

  it('preserves digits', () => {
    expect(slugify('Sección 16')).toBe('seccion-16');
    expect(slugify('Polanco V')).toBe('polanco-v');
  });
});

describe('ensureUniqueSlug', () => {
  it('returns base when not in existing set', () => {
    expect(ensureUniqueSlug('roma-norte', new Set())).toBe('roma-norte');
  });

  it('appends counter when base collides', () => {
    const existing = new Set(['roma-norte']);
    expect(ensureUniqueSlug('roma-norte', existing)).toBe('roma-norte-2');
  });

  it('walks counter until free', () => {
    const existing = new Set(['roma-norte', 'roma-norte-2', 'roma-norte-3']);
    expect(ensureUniqueSlug('roma-norte', existing)).toBe('roma-norte-4');
  });

  it('falls back to "colonia" when base empty', () => {
    expect(ensureUniqueSlug('', new Set())).toBe('colonia');
  });
});
