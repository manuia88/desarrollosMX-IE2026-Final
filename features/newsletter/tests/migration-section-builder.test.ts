import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => {
    function mkChain(data: ReadonlyArray<unknown>) {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(async () => ({ data, error: null })),
      };
      return chain;
    }
    return {
      from: vi.fn(() => mkChain([])),
    };
  }),
}));

vi.mock('@/shared/lib/market/zone-label-resolver', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/market/zone-label-resolver')>(
    '@/shared/lib/market/zone-label-resolver',
  );
  return {
    ...actual,
    batchResolveZoneLabels: vi.fn(async (items: ReadonlyArray<{ scopeId: string }>) =>
      items.map((i) => i.scopeId.toUpperCase()),
    ),
  };
});

describe('migration-section-builder — module exports', () => {
  it('exports buildMigrationSection as function', async () => {
    const mod = await import('@/features/newsletter/lib/migration-section-builder');
    expect(typeof mod.buildMigrationSection).toBe('function');
  });

  it('returns bundle with arrays even with no flows', async () => {
    const mod = await import('@/features/newsletter/lib/migration-section-builder');
    const bundle = await mod.buildMigrationSection({
      scopeId: 'roma-norte',
      countryCode: 'MX',
      periodDate: '2026-04-01',
      locale: 'es-MX',
    });
    expect(bundle.scope_id).toBe('roma-norte');
    expect(Array.isArray(bundle.top_origins)).toBe(true);
    expect(Array.isArray(bundle.top_destinations)).toBe(true);
    expect(bundle.detail_url).toContain('/indices/flujos?zona=roma-norte');
  });

  it('zone_label is resolved to human-readable (not UUID)', async () => {
    const mod = await import('@/features/newsletter/lib/migration-section-builder');
    const bundle = await mod.buildMigrationSection({
      scopeId: 'roma-norte',
      scopeType: 'colonia',
      countryCode: 'MX',
      periodDate: '2026-04-01',
      locale: 'es-MX',
    });
    expect(bundle.zone_label).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(bundle.zone_label.length).toBeGreaterThan(0);
  });
});

describe('i18n — table_decile_unclassified key present in all locales', () => {
  it.each([
    ['es-MX', 'Sin clasificar'],
    ['es-CO', 'Sin clasificar'],
    ['es-AR', 'Sin clasificar'],
    ['pt-BR', 'Não classificado'],
    ['en-US', 'Unclassified'],
  ])('%s uses expected translation', async (locale, expected) => {
    const path = `@/messages/${locale}.json`;
    const mod = (await import(/* @vite-ignore */ path)) as {
      default: { MigrationFlow: { table_decile_unclassified?: string } };
    };
    expect(mod.default.MigrationFlow.table_decile_unclassified).toBe(expected);
  });
});
