import { describe, expect, it } from 'vitest';
import type { IngestCtx } from '../../types';
import {
  AIRDNA_FEATURE_FLAG,
  AirdnaNotImplementedError,
  airdnaDriver,
  ingestAirdna,
} from '../airdna';
import {
  GOOGLE_TRENDS_FEATURE_FLAG,
  GoogleTrendsNotImplementedError,
  googleTrendsDriver,
  ingestGoogleTrends,
} from '../google-trends';
import {
  ingestPartnershipFeed,
  PARTNERSHIP_FEED_FEATURE_FLAG,
  PartnershipFeedNotImplementedError,
  partnershipFeedDriver,
} from '../partnership-feed';

function mockCtx(source: string): IngestCtx {
  return {
    runId: 'r-stub',
    source,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: null,
    startedAt: new Date(),
  };
}

describe('MARKET stubs (ADR-018 compliant)', () => {
  it('google_trends stub: driver registered, category=market/weekly, lib pendiente autorización', async () => {
    expect(googleTrendsDriver.source).toBe('google_trends');
    expect(googleTrendsDriver.category).toBe('market');
    expect(googleTrendsDriver.defaultPeriodicity).toBe('weekly');
    expect(GOOGLE_TRENDS_FEATURE_FLAG).toBe('ingest.google_trends.enabled');
    await expect(googleTrendsDriver.fetch(mockCtx('google_trends'), undefined)).rejects.toThrow(
      'google_trends_not_implemented_lib_pending',
    );
    await expect(ingestGoogleTrends()).rejects.toBeInstanceOf(GoogleTrendsNotImplementedError);
  });

  it('airdna stub: driver registered, category=market/monthly, plan H2 pin', async () => {
    expect(airdnaDriver.source).toBe('airdna');
    expect(airdnaDriver.category).toBe('market');
    expect(airdnaDriver.defaultPeriodicity).toBe('monthly');
    expect(AIRDNA_FEATURE_FLAG).toBe('ingest.airdna.enabled');
    await expect(airdnaDriver.fetch(mockCtx('airdna'), undefined)).rejects.toThrow(
      'airdna_not_implemented_h2',
    );
    await expect(ingestAirdna()).rejects.toBeInstanceOf(AirdnaNotImplementedError);
  });

  it('partnership_feed stub: driver registered, category=market/daily, H2+ pin', async () => {
    expect(partnershipFeedDriver.source).toBe('partnership_feed');
    expect(partnershipFeedDriver.category).toBe('market');
    expect(partnershipFeedDriver.defaultPeriodicity).toBe('daily');
    expect(PARTNERSHIP_FEED_FEATURE_FLAG).toBe('market.partnership_feed.enabled');
    await expect(
      partnershipFeedDriver.fetch(mockCtx('partnership_feed'), undefined),
    ).rejects.toThrow('partnership_feed_not_implemented_h2');
    await expect(ingestPartnershipFeed()).rejects.toBeInstanceOf(
      PartnershipFeedNotImplementedError,
    );
  });
});
