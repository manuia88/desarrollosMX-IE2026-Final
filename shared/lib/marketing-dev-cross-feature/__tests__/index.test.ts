import { describe, expect, it } from 'vitest';
import {
  exportSeriesToMarketingCampaign,
  getEligibleCampaignsForSeries,
  isMarketingDevReady,
} from '../index';

describe('marketing-dev-cross-feature STUB ADR-018', () => {
  it('isMarketingDevReady returns false (STUB H1)', () => {
    expect(isMarketingDevReady()).toBe(false);
  });

  it('exportSeriesToMarketingCampaign returns NOT_IMPLEMENTED', async () => {
    const result = await exportSeriesToMarketingCampaign({
      seriesId: 'test-series',
      campaignId: 'test-campaign',
      episodeIds: ['ep-1', 'ep-2'],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('NOT_IMPLEMENTED');
    expect(result.message).toContain('FASE 15');
  });

  it('getEligibleCampaignsForSeries returns empty array (STUB)', async () => {
    const campaigns = await getEligibleCampaignsForSeries('test-series');
    expect(campaigns).toEqual([]);
  });
});
