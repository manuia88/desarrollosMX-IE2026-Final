import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('devMarketingRouter — module export smoke', () => {
  it('exports the expected procedures', async () => {
    const mod = await import('../routes/dev-marketing');
    const r = mod.devMarketingRouter as unknown as Record<string, unknown>;
    expect(r.listCampaigns).toBeDefined();
    expect(r.getCampaign).toBeDefined();
    expect(r.createCampaign).toBeDefined();
    expect(r.updateCampaign).toBeDefined();
    expect(r.pauseCampaign).toBeDefined();
    expect(r.cancelCampaign).toBeDefined();
    expect(r.getCampaignAnalytics).toBeDefined();
    expect(r.getAttributionReport).toBeDefined();
    expect(r.getOptimizerRecommendations).toBeDefined();
    expect(r.applyOptimizerAction).toBeDefined();
    expect(r.requestStudioVideoJob).toBeDefined();
  });
});
