import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('tareasRouter — module export smoke', () => {
  it('exports the 6 expected procedures', async () => {
    const mod = await import('../routes/tareas');
    const router = mod.tareasRouter as unknown as Record<string, unknown>;
    expect(router.listTareas).toBeDefined();
    expect(router.createTarea).toBeDefined();
    expect(router.updateTarea).toBeDefined();
    expect(router.completeTarea).toBeDefined();
    expect(router.reassignTarea).toBeDefined();
    expect(router.deleteTarea).toBeDefined();
  });
});
