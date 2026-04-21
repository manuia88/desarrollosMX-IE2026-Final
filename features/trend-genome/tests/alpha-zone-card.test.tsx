import { describe, expect, it, vi } from 'vitest';
import type { AlphaGenomeComponents, AlphaZonePublicRow } from '../types';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

vi.mock('framer-motion', () => ({
  useReducedMotion: () => true,
}));

function makeComponents(): AlphaGenomeComponents {
  return {
    instagram_heat: {
      key: 'instagram_heat',
      raw_value: 12,
      normalized_0_100: 75,
      weight: 0.3,
      contribution_pct: 22.5,
      available: true,
      source: 'apify',
    },
    denue_alpha: {
      key: 'denue_alpha',
      raw_value: 8,
      normalized_0_100: 60,
      weight: 0.25,
      contribution_pct: 15,
      available: true,
      source: 'denue',
    },
    migration_inflow: {
      key: 'migration_inflow',
      raw_value: 7,
      normalized_0_100: 70,
      weight: 0.2,
      contribution_pct: 14,
      available: true,
      source: 'migration',
    },
    price_velocity_inv: {
      key: 'price_velocity_inv',
      raw_value: null,
      normalized_0_100: null,
      weight: 0.15,
      contribution_pct: 0,
      available: false,
      source: 'stub',
    },
    search_volume: {
      key: 'search_volume',
      raw_value: null,
      normalized_0_100: null,
      weight: 0.1,
      contribution_pct: 0,
      available: false,
      source: 'stub',
    },
    data_sources_available: 3,
    coverage_pct: 60,
    tier: 'confirmed',
    migration_inflow_decile: 8,
    pulse_score: 72,
  };
}

function sampleZone(overrides: Partial<AlphaZonePublicRow> = {}): AlphaZonePublicRow {
  return {
    zone_id: 'roma-norte',
    scope_type: 'colonia',
    country_code: 'MX',
    alpha_score: 82,
    time_to_mainstream_months: 12,
    tier: 'confirmed',
    detected_at: '2026-04-01T00:00:00Z',
    signals_breakdown: makeComponents(),
    needs_review: false,
    ...overrides,
  };
}

describe('AlphaZoneCard — module export smoke', () => {
  it('exports AlphaZoneCard as function', async () => {
    const mod = await import('../components/AlphaZoneCard');
    expect(typeof mod.AlphaZoneCard).toBe('function');
    expect(mod.AlphaZoneCard.name).toBe('AlphaZoneCard');
  });

  it('accepts zone prop (score + tier + ttm)', async () => {
    const mod = await import('../components/AlphaZoneCard');
    const zone = sampleZone();
    expect(zone.alpha_score).toBe(82);
    expect(zone.tier).toBe('confirmed');
    expect(zone.time_to_mainstream_months).toBe(12);
    expect(typeof mod.AlphaZoneCard).toBe('function');
  });

  it('accepts zone with needs_review=true', async () => {
    const mod = await import('../components/AlphaZoneCard');
    const zone = sampleZone({ needs_review: true });
    expect(zone.needs_review).toBe(true);
    expect(typeof mod.AlphaZoneCard).toBe('function');
  });

  it('accepts zone with null time_to_mainstream', async () => {
    const mod = await import('../components/AlphaZoneCard');
    const zone = sampleZone({ time_to_mainstream_months: null });
    expect(zone.time_to_mainstream_months).toBeNull();
    expect(typeof mod.AlphaZoneCard).toBe('function');
  });

  it('accepts all tier variants', async () => {
    const mod = await import('../components/AlphaZoneCard');
    const tiers: ReadonlyArray<AlphaZonePublicRow['tier']> = [
      'confirmed',
      'speculative',
      'golden_opportunity',
      'watchlist',
    ];
    for (const tier of tiers) {
      const zone = sampleZone({ tier });
      expect(zone.tier).toBe(tier);
    }
    expect(typeof mod.AlphaZoneCard).toBe('function');
  });
});

describe('AlphaSignalsBadge — module export smoke', () => {
  it('exports AlphaSignalsBadge as function', async () => {
    const mod = await import('../components/AlphaSignalsBadge');
    expect(typeof mod.AlphaSignalsBadge).toBe('function');
  });

  it('accepts signals with contribution_pct', async () => {
    const components = makeComponents();
    expect(components.instagram_heat.contribution_pct).toBe(22.5);
    expect(components.denue_alpha.contribution_pct).toBe(15);
  });
});
