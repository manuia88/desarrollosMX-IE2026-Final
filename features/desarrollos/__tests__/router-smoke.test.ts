import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('desarrollosRouter — module export smoke', () => {
  it('exports expected procedures', async () => {
    const mod = await import('../routes/desarrollos');
    const router = mod.desarrollosRouter as unknown as Record<string, unknown>;
    expect(router.list).toBeDefined();
    expect(router.get).toBeDefined();
    expect(router.searchByName).toBeDefined();
    expect(router.listUnidades).toBeDefined();
    expect(router.listBrokers).toBeDefined();
    expect(router.listAssets).toBeDefined();
    expect(router.listExclusividad).toBeDefined();
  });
});

describe('desarrollos schemas — input validation smoke', () => {
  it('rejects empty object on proyectoSearchByNameInput', async () => {
    const { proyectoSearchByNameInput } = await import('../schemas');
    expect(() => proyectoSearchByNameInput.parse({})).toThrow();
  });

  it('parses valid proyectoListInput with scope=own', async () => {
    const { proyectoListInput } = await import('../schemas');
    const parsed = proyectoListInput.parse({ scope: 'own', limit: 12 });
    expect(parsed.scope).toBe('own');
    expect(parsed.limit).toBe(12);
  });
});
