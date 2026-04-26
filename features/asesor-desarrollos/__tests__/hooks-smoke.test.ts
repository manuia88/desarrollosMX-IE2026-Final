import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/es-MX/asesores/desarrollos',
  useSearchParams: () => new URLSearchParams(),
}));

describe('asesor-desarrollos hooks — module exports smoke', () => {
  it('useDesarrollosFilters exports as function', async () => {
    const mod = await import('../hooks/use-desarrollos-filters');
    expect(typeof mod.useDesarrollosFilters).toBe('function');
  });

  it('useDesarrollosTab exports as function', async () => {
    const mod = await import('../hooks/use-desarrollos-tab');
    expect(typeof mod.useDesarrollosTab).toBe('function');
  });

  it('useDesarrolloDrawer exports as function', async () => {
    const mod = await import('../hooks/use-desarrollo-drawer');
    expect(typeof mod.useDesarrolloDrawer).toBe('function');
  });
});
