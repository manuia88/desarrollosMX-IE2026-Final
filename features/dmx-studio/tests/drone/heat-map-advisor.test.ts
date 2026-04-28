// F14.F.7 Sprint 6 UPGRADE 8 — Heat map advisor tests.

import { describe, expect, it } from 'vitest';
import { suggestPattern } from '@/features/dmx-studio/lib/drone-sim/heat-map-advisor';

describe('suggestPattern (heat map advisor)', () => {
  it('terreno → orbital', () => {
    const r = suggestPattern({ propertyType: 'terreno' });
    expect(r.pattern).toBe('orbital');
    expect(r.reasoning.length).toBeGreaterThan(0);
  });

  it('edificio con varios pisos → flyover', () => {
    const r = suggestPattern({ propertyType: 'edificio', floors: 5 });
    expect(r.pattern).toBe('flyover');
    expect(r.reasoning).toContain('flyover');
  });

  it('casa unifamiliar → approach', () => {
    const r = suggestPattern({ propertyType: 'casa' });
    expect(r.pattern).toBe('approach');
    expect(r.reasoning).toContain('entrada');
  });

  it('panoramica con vistas → reveal', () => {
    const r = suggestPattern({ propertyType: 'panoramica', hasViews: true });
    expect(r.pattern).toBe('reveal');
    expect(r.reasoning).toContain('reveal');
  });

  it('otro o defaults inseguros → orbital', () => {
    const r1 = suggestPattern({ propertyType: 'otro' });
    expect(r1.pattern).toBe('orbital');
    const r2 = suggestPattern({ propertyType: 'edificio', floors: 1 });
    expect(r2.pattern).toBe('orbital');
    const r3 = suggestPattern({ propertyType: 'panoramica', hasViews: false });
    expect(r3.pattern).toBe('orbital');
  });
});
