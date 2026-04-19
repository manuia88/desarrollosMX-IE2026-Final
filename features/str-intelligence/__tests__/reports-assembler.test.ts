import { describe, expect, it } from 'vitest';
import {
  assembleTier1IndividualOwner,
  assembleTier2Alcaldia,
  assembleTier3GovCDMX,
  assembleTier4ApiAccess,
} from '../lib/reports/assembler';

describe('Tier1 assembler', () => {
  it('produce sections esperadas', () => {
    const payload = assembleTier1IndividualOwner(
      { tier: 1, country_code: 'MX' },
      {
        viability: {
          cap_rate: 0.08,
          breakeven_months: 120,
          net_revenue_annual_minor: 360_000_00,
        },
        comparables_count: 18,
        pricing_advisor_summary: {
          avg_suggested_price_minor: 2_500_00,
          peak_event_count: 3,
        },
        listing_metadata: { listing_id: 'L-1', bedrooms: 2, capacity: 4 },
      },
    );
    expect(payload.tier).toBe(1);
    expect(payload.sections.length).toBeGreaterThan(0);
    expect(payload.compliance.lfpdppp_compliant).toBe(true);
    expect(payload.title).toContain('L-1');
  });

  it('rechaza tier_mismatch', () => {
    expect(() =>
      assembleTier1IndividualOwner(
        { tier: 2, country_code: 'MX' },
        {
          viability: { cap_rate: 0.08, breakeven_months: 120, net_revenue_annual_minor: 0 },
          comparables_count: 0,
          pricing_advisor_summary: { avg_suggested_price_minor: 0, peak_event_count: 0 },
          listing_metadata: { listing_id: 'L-1', bedrooms: null, capacity: null },
        },
      ),
    ).toThrow();
  });
});

describe('Tier2 assembler', () => {
  it('requiere alcaldia_name', () => {
    expect(() =>
      assembleTier2Alcaldia(
        { tier: 2, country_code: 'MX' },
        {
          zis_summary: { score: 75, confidence: 'high' },
          invisible_hotels: { clusters_count: 12, listings_in_clusters: 87 },
          nomad_demand_score: 68,
          active_listings_count: 1200,
        },
      ),
    ).toThrow();
  });

  it('produce title con alcaldía', () => {
    const payload = assembleTier2Alcaldia(
      { tier: 2, country_code: 'MX', alcaldia_name: 'Cuauhtémoc' },
      {
        zis_summary: { score: 75, confidence: 'high' },
        invisible_hotels: { clusters_count: 12, listings_in_clusters: 87 },
        nomad_demand_score: 68,
        active_listings_count: 1200,
      },
    );
    expect(payload.title).toContain('Cuauhtémoc');
    expect(payload.tier).toBe(2);
  });
});

describe('Tier3 assembler', () => {
  it('produce sections con quarterly addenda', () => {
    const payload = assembleTier3GovCDMX(
      { tier: 3, country_code: 'MX' },
      {
        city_zis_avg: 70,
        invisible_hotels_total: 245,
        migration_alerts_count: 3,
        env_score_avg: 60,
        nomad_score_avg: 75,
        markets_covered: 16,
        quarterly_addenda: [
          { quarter: '2026-Q1', highlights: 'F1 spike pricing' },
          { quarter: '2026-Q2', highlights: 'Roma Norte regulatorio' },
        ],
      },
    );
    expect(payload.tier).toBe(3);
    expect(payload.sections.some((s) => s.title.includes('Trimestral'))).toBe(true);
  });
});

describe('Tier4 assembler', () => {
  it('produce sections con endpoints + rate limit', () => {
    const payload = assembleTier4ApiAccess(
      { tier: 4, country_code: 'MX' },
      {
        api_endpoints: ['/v1/str/markets', '/v1/str/listings', '/v1/str/scores/zis'],
        rate_limit_per_minute: 600,
        bearer_token_required: true,
      },
    );
    expect(payload.tier).toBe(4);
    expect(payload.sections.length).toBeGreaterThanOrEqual(2);
  });
});
