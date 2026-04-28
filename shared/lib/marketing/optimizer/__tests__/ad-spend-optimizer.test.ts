import { describe, expect, it } from 'vitest';
import { type CampaignSnapshot, evaluateCampaigns } from '../ad-spend-optimizer';

function snap(over: Partial<CampaignSnapshot>): CampaignSnapshot {
  return {
    campaignId: '00000000-0000-0000-0000-000000000001',
    campaignName: 'Test Campaign',
    channel: 'all',
    spendMxn: 0,
    leads: 0,
    conversions: 0,
    revenueMxn: 0,
    impressions: 0,
    clicks: 0,
    ...over,
  };
}

describe('ad-spend-optimizer evaluateCampaigns', () => {
  it('recommends pause when CPL > 2x media + ROI < 1.5x', () => {
    const campaigns = [
      snap({
        campaignId: 'a',
        spendMxn: 5_000,
        leads: 50,
        conversions: 1,
        revenueMxn: 250_000,
      }),
      snap({
        campaignId: 'b',
        spendMxn: 10_000,
        leads: 50,
        conversions: 1,
        revenueMxn: 250_000,
      }),
      snap({
        campaignId: 'c',
        spendMxn: 50_000,
        leads: 50,
        conversions: 0,
        revenueMxn: 0,
      }),
    ];
    const verdicts = evaluateCampaigns({ campaigns, mediaCplMxn: null });
    const c = verdicts.find((v) => v.campaignId === 'c');
    expect(c?.action).toBe('pause');
    expect(c?.cplRatio).not.toBeNull();
    expect(c?.cplRatio ?? 0).toBeGreaterThan(2);
  });

  it('recommends scale when ROI >= 3x', () => {
    const campaigns = [
      snap({
        campaignId: 'a',
        spendMxn: 10_000,
        leads: 100,
        conversions: 5,
        revenueMxn: 1_500_000,
      }),
    ];
    const verdicts = evaluateCampaigns({ campaigns, mediaCplMxn: null });
    expect(verdicts[0]?.action).toBe('scale');
    expect(verdicts[0]?.roi).toBeCloseTo(150, 0);
  });

  it('recommends optimize when CTR < 0.5% and impressions >= 1000', () => {
    const campaigns = [
      snap({
        campaignId: 'a',
        impressions: 5_000,
        clicks: 10,
        spendMxn: 1_000,
        leads: 1,
        conversions: 0,
      }),
    ];
    const verdicts = evaluateCampaigns({ campaigns, mediaCplMxn: 1000 });
    expect(verdicts[0]?.action).toBe('optimize');
    expect(verdicts[0]?.ctr).toBeLessThan(0.005);
  });

  it('recommends continue when metrics within range', () => {
    const campaigns = [
      snap({
        campaignId: 'a',
        impressions: 10_000,
        clicks: 200,
        spendMxn: 5_000,
        leads: 25,
        conversions: 1,
        revenueMxn: 10_000,
      }),
    ];
    const verdicts = evaluateCampaigns({ campaigns, mediaCplMxn: 200 });
    expect(verdicts[0]?.action).toBe('continue');
  });

  it('handles zero spend without crashing', () => {
    const campaigns = [
      snap({
        campaignId: 'a',
        impressions: 0,
        clicks: 0,
        spendMxn: 0,
        leads: 0,
      }),
    ];
    const verdicts = evaluateCampaigns({ campaigns, mediaCplMxn: null });
    expect(verdicts[0]?.cplMxn).toBeNull();
    expect(verdicts[0]?.roi).toBeNull();
    expect(verdicts[0]?.ctr).toBeNull();
    expect(verdicts[0]?.action).toBe('continue');
  });

  it('produces non-empty reasoning for every verdict', () => {
    const campaigns = [
      snap({ campaignId: 'a', spendMxn: 1, leads: 1, revenueMxn: 100 }),
      snap({ campaignId: 'b', spendMxn: 1, leads: 0 }),
    ];
    const verdicts = evaluateCampaigns({ campaigns, mediaCplMxn: null });
    for (const v of verdicts) {
      expect(v.reasoning.length).toBeGreaterThan(5);
    }
  });
});
