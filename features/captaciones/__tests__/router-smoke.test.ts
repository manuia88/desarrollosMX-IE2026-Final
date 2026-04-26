import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('captacionesRouter — module export smoke', () => {
  it('exports expected procedures', async () => {
    const mod = await import('../routes/captaciones');
    const router = mod.captacionesRouter as unknown as Record<string, unknown>;
    expect(router.list).toBeDefined();
    expect(router.get).toBeDefined();
    expect(router.create).toBeDefined();
    expect(router.update).toBeDefined();
    expect(router.advanceStage).toBeDefined();
    expect(router.pause).toBeDefined();
    expect(router.close).toBeDefined();
    expect(router.runAcm).toBeDefined();
  });
});
