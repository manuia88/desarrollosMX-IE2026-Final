import { describe, expect, it } from 'vitest';
import { detectHostMigrations, type ListingFingerprint } from '../lib/host-migration/matcher';

function fp(overrides: Partial<ListingFingerprint> = {}): ListingFingerprint {
  return {
    platform: 'airbnb',
    listing_id: 'L-airbnb-1',
    host_id: 'H-1',
    market_id: '00000000-0000-0000-0000-000000000001',
    zone_id: null,
    lon: -99.1,
    lat: 19.4,
    bedrooms: 2,
    bathrooms: 1.5,
    capacity: 4,
    listing_name: 'Loft moderno en Roma Sur con cocina equipada',
    first_seen_at: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('detectHostMigrations', () => {
  it('detecta match cross-platform con confidence alta', () => {
    const matches = detectHostMigrations(
      [
        fp({ platform: 'airbnb', listing_id: 'AB-1', first_seen_at: '2025-01-01T00:00:00Z' }),
        fp({ platform: 'vrbo', listing_id: 'VR-1', first_seen_at: '2025-09-01T00:00:00Z' }),
      ],
      { minConfidence: 0.7 },
    );
    expect(matches).toHaveLength(1);
    const match = matches[0];
    if (!match) throw new Error('expected match');
    expect(match.from_platform).toBe('airbnb');
    expect(match.to_platform).toBe('vrbo');
    expect(match.confidence).toBeGreaterThanOrEqual(0.9);
    expect(match.match_features.geom_match).toBe(true);
    expect(match.match_features.bedrooms_match).toBe(true);
  });

  it('orden FROM/TO basado en first_seen_at', () => {
    const matches = detectHostMigrations(
      [
        fp({ platform: 'vrbo', listing_id: 'VR-1', first_seen_at: '2025-01-01T00:00:00Z' }),
        fp({ platform: 'airbnb', listing_id: 'AB-1', first_seen_at: '2025-09-01T00:00:00Z' }),
      ],
      { minConfidence: 0.7 },
    );
    expect(matches).toHaveLength(1);
    const match = matches[0];
    if (!match) throw new Error('expected match');
    expect(match.from_platform).toBe('vrbo');
    expect(match.to_platform).toBe('airbnb');
  });

  it('omite listings de la misma plataforma', () => {
    const matches = detectHostMigrations(
      [
        fp({ platform: 'airbnb', listing_id: 'AB-1', first_seen_at: '2025-01-01T00:00:00Z' }),
        fp({ platform: 'airbnb', listing_id: 'AB-2', first_seen_at: '2025-09-01T00:00:00Z' }),
      ],
      { minConfidence: 0.7 },
    );
    expect(matches).toHaveLength(0);
  });

  it('rechaza match con confidence bajo', () => {
    const matches = detectHostMigrations(
      [
        fp({
          platform: 'airbnb',
          listing_id: 'AB-1',
          listing_name: 'Casa muy distinta tropical',
          bedrooms: 2,
          bathrooms: 1.5,
          capacity: 4,
          first_seen_at: '2025-01-01T00:00:00Z',
        }),
        fp({
          platform: 'vrbo',
          listing_id: 'VR-1',
          listing_name: 'algo completamente diferente',
          bedrooms: null,
          bathrooms: null,
          capacity: null,
          first_seen_at: '2025-09-01T00:00:00Z',
        }),
      ],
      { minConfidence: 0.95 },
    );
    expect(matches).toHaveLength(0);
  });

  it('respeta minDelayDays', () => {
    const matches = detectHostMigrations(
      [
        fp({ platform: 'airbnb', listing_id: 'AB-1', first_seen_at: '2025-01-01T00:00:00Z' }),
        fp({ platform: 'vrbo', listing_id: 'VR-1', first_seen_at: '2025-01-15T00:00:00Z' }),
      ],
      { minConfidence: 0.7, minDelayDays: 30 },
    );
    expect(matches).toHaveLength(0);
  });

  it('no matchea cuando geom dista > 10m', () => {
    const matches = detectHostMigrations(
      [
        fp({
          platform: 'airbnb',
          listing_id: 'AB-1',
          lon: -99.1,
          lat: 19.4,
          first_seen_at: '2025-01-01T00:00:00Z',
        }),
        fp({
          platform: 'vrbo',
          listing_id: 'VR-1',
          lon: -99.2, // ~10km diferencia
          lat: 19.5,
          first_seen_at: '2025-09-01T00:00:00Z',
        }),
      ],
      { minConfidence: 0.7 },
    );
    expect(matches).toHaveLength(0);
  });

  it('signature_hash determinista (mismo input → mismo hash)', () => {
    const a = detectHostMigrations(
      [
        fp({ platform: 'airbnb', listing_id: 'AB-1', first_seen_at: '2025-01-01T00:00:00Z' }),
        fp({ platform: 'vrbo', listing_id: 'VR-1', first_seen_at: '2025-09-01T00:00:00Z' }),
      ],
      { minConfidence: 0.7 },
    );
    const b = detectHostMigrations(
      [
        fp({ platform: 'airbnb', listing_id: 'AB-1', first_seen_at: '2025-01-01T00:00:00Z' }),
        fp({ platform: 'vrbo', listing_id: 'VR-1', first_seen_at: '2025-09-01T00:00:00Z' }),
      ],
      { minConfidence: 0.7 },
    );
    const matchA = a[0];
    const matchB = b[0];
    if (!matchA || !matchB) throw new Error('expected matches');
    expect(matchA.signature_hash).toBe(matchB.signature_hash);
  });
});
