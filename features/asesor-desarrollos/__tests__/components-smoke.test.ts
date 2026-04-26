import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/es-MX/asesores/desarrollos',
  useSearchParams: () => new URLSearchParams(),
}));

describe('asesor-desarrollos components — module exports smoke', () => {
  it('DesarrolloCard exports as function', async () => {
    const mod = await import('../components/desarrollo-card');
    expect(typeof mod.DesarrolloCard).toBe('function');
  });

  it('DesarrolloDetailDrawer exports as function', async () => {
    const mod = await import('../components/desarrollo-detail-drawer');
    expect(typeof mod.DesarrolloDetailDrawer).toBe('function');
  });

  it('DesarrollosFilters exports as function', async () => {
    const mod = await import('../components/desarrollos-filters');
    expect(typeof mod.DesarrollosFilters).toBe('function');
  });

  it('DesarrollosGrid exports as function', async () => {
    const mod = await import('../components/desarrollos-grid');
    expect(typeof mod.DesarrollosGrid).toBe('function');
  });

  it('DesarrollosPage exports as function', async () => {
    const mod = await import('../components/desarrollos-page');
    expect(typeof mod.DesarrollosPage).toBe('function');
  });

  it('DesarrollosSkeleton exports as function', async () => {
    const mod = await import('../components/desarrollos-skeleton');
    expect(typeof mod.DesarrollosSkeleton).toBe('function');
  });

  it('DesarrollosSort exports as function', async () => {
    const mod = await import('../components/desarrollos-sort');
    expect(typeof mod.DesarrollosSort).toBe('function');
  });

  it('DesarrollosTabs exports as function', async () => {
    const mod = await import('../components/desarrollos-tabs');
    expect(typeof mod.DesarrollosTabs).toBe('function');
  });

  it('EmptyState exports as function', async () => {
    const mod = await import('../components/empty-state');
    expect(typeof mod.EmptyState).toBe('function');
  });

  it('ExclusividadBadge exports as function', async () => {
    const mod = await import('../components/exclusividad-badge');
    expect(typeof mod.ExclusividadBadge).toBe('function');
  });

  it('PhotoPlaceholder exports as function', async () => {
    const mod = await import('../components/photo-placeholder');
    expect(typeof mod.PhotoPlaceholder).toBe('function');
  });

  it('QualityScoreBadge exports as function', async () => {
    const mod = await import('../components/quality-score-badge');
    expect(typeof mod.QualityScoreBadge).toBe('function');
  });

  it('public index exports primary surface', async () => {
    const mod = await import('../index');
    expect(typeof mod.DesarrollosPage).toBe('function');
    expect(typeof mod.DesarrollosSkeleton).toBe('function');
    expect(typeof mod.qualityScoreLabel).toBe('function');
    expect(mod.TAB_KEYS).toEqual(['own', 'exclusive', 'dmx', 'mls']);
  });
});
