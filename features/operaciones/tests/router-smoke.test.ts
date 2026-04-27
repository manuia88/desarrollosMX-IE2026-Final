import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('operacionesRouter — module export smoke', () => {
  it('exports the 7 expected procedures', async () => {
    const mod = await import('../routes/operaciones');
    const r = mod.operacionesRouter as unknown as Record<string, unknown>;
    expect(r.listOperaciones).toBeDefined();
    expect(r.getById).toBeDefined();
    expect(r.createOperacion).toBeDefined();
    expect(r.updateStatus).toBeDefined();
    expect(r.cancelOperacion).toBeDefined();
    expect(r.registerPago).toBeDefined();
    expect(r.parsePegarLiga).toBeDefined();
    expect(r.emitCFDI).toBeDefined();
  });
});
