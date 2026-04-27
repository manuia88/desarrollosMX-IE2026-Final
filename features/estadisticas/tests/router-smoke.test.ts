import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('estadisticasRouter — module export smoke', () => {
  it('exports the 8 expected procedures', async () => {
    const mod = await import('../routes/estadisticas');
    const r = mod.estadisticasRouter as unknown as Record<string, unknown>;
    expect(r.getEstadisticas).toBeDefined();
    expect(r.getMetricsSemaforo).toBeDefined();
    expect(r.getPipelineFunnel).toBeDefined();
    expect(r.getRevenueByMonth).toBeDefined();
    expect(r.getVisitsConversion).toBeDefined();
    expect(r.getZonesActivity).toBeDefined();
    expect(r.getTeamComparison).toBeDefined();
    expect(r.getLeaderboard).toBeDefined();
  });
});
