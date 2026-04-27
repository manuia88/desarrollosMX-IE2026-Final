import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('developerRouter — module export smoke', () => {
  it('exports the 6 expected procedures', async () => {
    const mod = await import('../routes/developer');
    const r = mod.developerRouter as unknown as Record<string, unknown>;
    expect(r.getDashboard).toBeDefined();
    expect(r.getTrustScore).toBeDefined();
    expect(r.getInventorySnapshot).toBeDefined();
    expect(r.getPendientes).toBeDefined();
    expect(r.getKpis).toBeDefined();
    expect(r.generateMorningBriefingDev).toBeDefined();
  });
});
