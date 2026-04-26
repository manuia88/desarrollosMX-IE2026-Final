import { describe, expect, it } from 'vitest';
import { haversineMeters } from '../spatial-resolver';

describe('haversineMeters', () => {
  it('zero distance for identical points', () => {
    expect(haversineMeters(19.4, -99.18, 19.4, -99.18)).toBe(0);
  });

  it('CDMX → Toluca ~50 km', () => {
    const d = haversineMeters(19.4, -99.18, 19.2833, -99.7);
    expect(d).toBeGreaterThan(45_000);
    expect(d).toBeLessThan(60_000);
  });

  it('CDMX → Tlaxcala ~95 km', () => {
    const d = haversineMeters(19.4, -99.18, 19.3167, -98.2333);
    expect(d).toBeGreaterThan(85_000);
    expect(d).toBeLessThan(110_000);
  });
});
