import { describe, expect, it } from 'vitest';
import { escapeXml, generatePulseSparklineSVG, normalizePoints } from '../lib/pulse-sparkline-svg';

describe('escapeXml', () => {
  it('escapes all reserved characters', () => {
    expect(escapeXml('a&b<c>d"e\'f')).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });
});

describe('normalizePoints', () => {
  it('returns empty array for empty input', () => {
    expect(normalizePoints([], 300, 60, 4)).toEqual([]);
  });

  it('returns centered point for single value', () => {
    const coords = normalizePoints([50], 300, 60, 4);
    expect(coords).toHaveLength(1);
    expect(coords[0]?.x).toBe(150);
    expect(coords[0]?.y).toBe(30);
  });

  it('centers flat series vertically', () => {
    const coords = normalizePoints([50, 50, 50, 50], 300, 60, 4);
    expect(coords).toHaveLength(4);
    for (const c of coords) {
      expect(c.y).toBe(30);
    }
  });

  it('maps max to lowest y and min to highest y (inverted axis)', () => {
    const coords = normalizePoints([0, 100], 300, 60, 4);
    expect(coords).toHaveLength(2);
    const [first, last] = coords;
    expect(first?.y).toBeGreaterThan(last?.y ?? Number.POSITIVE_INFINITY);
  });

  it('distributes x evenly across width', () => {
    const coords = normalizePoints([10, 20, 30, 40, 50], 400, 60, 4);
    expect(coords).toHaveLength(5);
    expect(coords[0]?.x).toBe(0);
    expect(coords[4]?.x).toBe(400);
  });

  it('drops non-finite values', () => {
    const coords = normalizePoints([10, Number.NaN, 30, Number.POSITIVE_INFINITY, 50], 300, 60, 4);
    expect(coords).toHaveLength(3);
  });
});

describe('generatePulseSparklineSVG', () => {
  it('produces a valid SVG string with default dimensions', () => {
    const svg = generatePulseSparklineSVG([10, 20, 30, 40, 50]);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('width="300"');
    expect(svg).toContain('height="60"');
    expect(svg).toContain('viewBox="0 0 300 60"');
  });

  it('respects custom dimensions', () => {
    const svg = generatePulseSparklineSVG([1, 2, 3], { width: 500, height: 120 });
    expect(svg).toContain('width="500"');
    expect(svg).toContain('height="120"');
  });

  it('includes area fill by default', () => {
    const svg = generatePulseSparklineSVG([10, 20, 30]);
    expect(svg).toContain('<path');
    expect(svg).toContain('fill=');
  });

  it('omits area fill when fill=null', () => {
    const svg = generatePulseSparklineSVG([10, 20, 30], { fill: null });
    expect(svg).not.toContain('<path');
  });

  it('emits polyline with correct point count', () => {
    const svg = generatePulseSparklineSVG([1, 2, 3, 4, 5]);
    expect(svg).toContain('<polyline');
    const match = svg.match(/points="([^"]+)"/);
    expect(match).toBeTruthy();
    const pts = match?.[1]?.split(' ') ?? [];
    expect(pts).toHaveLength(5);
  });

  it('escapes aria-label to prevent XML injection', () => {
    const svg = generatePulseSparklineSVG([1, 2], { ariaLabel: '<bad>Roma & "north"' });
    expect(svg).toContain('aria-label="&lt;bad&gt;Roma &amp; &quot;north&quot;"');
  });

  it('handles empty input without throwing', () => {
    const svg = generatePulseSparklineSVG([]);
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<polyline');
  });

  it('is deterministic (same input → same output)', () => {
    const a = generatePulseSparklineSVG([10, 30, 50, 70, 90]);
    const b = generatePulseSparklineSVG([10, 30, 50, 70, 90]);
    expect(a).toBe(b);
  });
});
