import { describe, expect, it } from 'vitest';
import { parseCitations, validateCitations } from '../lib/citations-validator';

describe('parseCitations', () => {
  it('returns empty array for empty string', () => {
    expect(parseCitations('')).toEqual([]);
  });

  it('returns empty array when no refs present', () => {
    expect(parseCitations('This has no citations at all.')).toEqual([]);
  });

  it('extracts a single score citation', () => {
    const md = 'El IPV subió [[score:IPV:roma-norte:2026-03]] en marzo.';
    expect(parseCitations(md)).toEqual(['score:IPV:roma-norte:2026-03']);
  });

  it('extracts multiple distinct refs across types', () => {
    const md =
      'Ver [[score:IPV:x:2026-03]] y también [[macro:banxico-tiie:2026-03]] y [[geo:ageb-123:2026-03]].';
    expect(parseCitations(md)).toEqual([
      'score:IPV:x:2026-03',
      'macro:banxico-tiie:2026-03',
      'geo:ageb-123:2026-03',
    ]);
  });

  it('deduplicates repeated refs', () => {
    const md = '[[score:A:b:c]] y de nuevo [[score:A:b:c]].';
    expect(parseCitations(md)).toEqual(['score:A:b:c']);
  });

  it('ignores malformed refs', () => {
    const md = '[[unknown:foo:bar]] y [[score:valid:ref:1]]';
    expect(parseCitations(md)).toEqual(['score:valid:ref:1']);
  });
});

describe('validateCitations', () => {
  it('is valid when extracted is subset of allowed', () => {
    const result = validateCitations(['score:a:b:c'], ['score:a:b:c', 'score:x:y:z']);
    expect(result).toEqual({ valid: true, missing: [] });
  });

  it('is valid when nothing extracted', () => {
    const result = validateCitations([], ['score:a:b:c']);
    expect(result).toEqual({ valid: true, missing: [] });
  });

  it('flags missing refs not in allowed list', () => {
    const result = validateCitations(['score:a:b:c', 'score:ghost:x:y'], ['score:a:b:c']);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['score:ghost:x:y']);
  });

  it('reports multiple missing refs', () => {
    const result = validateCitations(['a', 'b', 'c'], ['a']);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['b', 'c']);
  });
});
