// ADR-059 — Cities selector + comparator + cross-feature smoke tests (Modo A — mocked supabase).

import { describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_CITIES,
  getActiveCities,
  getCitySettings,
  isCityActive,
} from '@/shared/lib/cities/registry';
import { CITIES_SELECTOR_I18N_EN_US, CITIES_SELECTOR_I18N_ES_MX } from '../cities-i18n-keys';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/es-MX/atlas',
  useSearchParams: () => new URLSearchParams(),
}));

interface MockBuilderResult {
  readonly data: ReadonlyArray<unknown> | null;
  readonly error: { message: string } | null;
}

function makeQueryBuilder(result: MockBuilderResult) {
  const proxy: Record<string, unknown> = {};
  const chain = () => proxy;
  proxy.select = chain;
  proxy.eq = chain;
  proxy.ilike = chain;
  proxy.in = chain;
  proxy.order = chain;
  proxy.limit = async () => result;
  // biome-ignore lint/suspicious/noThenProperty: simula thenable supabase chain
  proxy.then = (resolve: (v: MockBuilderResult) => void) => resolve(result);
  return proxy;
}

function mockClient(tables: Record<string, MockBuilderResult>) {
  return {
    from: (table: string) => makeQueryBuilder(tables[table] ?? { data: [], error: null }),
  } as unknown as Parameters<
    typeof import('../../../../shared/lib/cities/cross-feature-cities').getProjectsByCity
  >[1];
}

describe('cities registry', () => {
  it('Test 1 — getActiveCities() returns 5 cities default', () => {
    const list = getActiveCities();
    expect(list.length).toBe(5);
    const slugs = list.map((c) => c.slug).sort();
    expect(slugs).toEqual(['cdmx', 'dubai', 'guadalajara', 'playa-del-carmen', 'queretaro'].sort());
  });

  it('Test 2 — getActiveCities("MX") returns 4 cities (excluding Dubai AE)', () => {
    const list = getActiveCities('MX');
    expect(list.length).toBe(4);
    expect(list.every((c) => c.countryCode === 'MX')).toBe(true);
    expect(list.find((c) => c.slug === 'dubai')).toBeUndefined();
  });

  it('Test 3 — getActiveCities("AE") returns 1 city (Dubai)', () => {
    const list = getActiveCities('AE');
    expect(list.length).toBe(1);
    expect(list[0]?.slug).toBe('dubai');
  });

  it('Test 4 — getCitySettings("cdmx") returns canon entry with countryCode="MX"', () => {
    const cdmx = getCitySettings('cdmx');
    expect(cdmx).not.toBeNull();
    expect(cdmx?.countryCode).toBe('MX');
    expect(cdmx?.currency).toBe('MXN');
    expect(cdmx?.status).toBe('active');
  });

  it('Test 5 — getCitySettings("unknown-city") returns null', () => {
    const result = getCitySettings('unknown-city');
    expect(result).toBeNull();
  });

  it('Test 6 — isCityActive("cdmx") returns true', () => {
    expect(isCityActive('cdmx')).toBe(true);
  });

  it('Test 7 — isCityActive("dubai", []) returns true (status="beta" allows render)', () => {
    expect(isCityActive('dubai', [])).toBe(true);
  });

  it('Test 8 — isCityActive("dubai", ["DUBAI_REELLY_API_ENABLED"]) returns true (flag enabled)', () => {
    expect(isCityActive('dubai', ['DUBAI_REELLY_API_ENABLED'])).toBe(true);
  });
});

describe('cross-feature-cities (read-only API)', () => {
  it('Test 9 — getProjectsByCity returns empty array when supabase mock returns no rows', async () => {
    const { getProjectsByCity } = await import('@/shared/lib/cities/cross-feature-cities');
    const supabase = mockClient({ proyectos: { data: [], error: null } });
    const result = await getProjectsByCity('cdmx', supabase);
    expect(result).toEqual([]);
  });

  it('Test 10 — getZonesByCity filters by parent_scope_id correctly', async () => {
    const { getZonesByCity } = await import('@/shared/lib/cities/cross-feature-cities');
    const supabase = mockClient({
      zones: {
        data: [
          {
            id: 'z1',
            name_es: 'Roma Norte',
            name_en: 'Roma Norte',
            lat: 19.41,
            lng: -99.16,
            scope_id: 'MX-CDMX-roma-norte',
            parent_scope_id: 'cdmx',
            country_code: 'MX',
          },
        ],
        error: null,
      },
    });
    const result = await getZonesByCity('cdmx', supabase);
    expect(result.length).toBe(1);
    expect(result[0]?.scopeId).toBe('MX-CDMX-roma-norte');
    expect(result[0]?.nameEs).toBe('Roma Norte');
  });
});

describe('cities-i18n-keys', () => {
  it('Test 11 — CITIES_SELECTOR_I18N_ES_MX and EN_US have parity (same key set)', () => {
    const esKeys = Object.keys(CITIES_SELECTOR_I18N_ES_MX).sort();
    const enKeys = Object.keys(CITIES_SELECTOR_I18N_EN_US).sort();
    expect(esKeys).toEqual(enKeys);
    // Sanity: known key exists
    expect(CITIES_SELECTOR_I18N_ES_MX['Cities.cdmx.name']).toBe('Ciudad de México');
    expect(CITIES_SELECTOR_I18N_EN_US['Cities.cdmx.name']).toBe('Mexico City');
  });
});

describe('CitySelector + CityComparator + CitiesAtlasFilter (module export smoke)', () => {
  it('Test 12 — modules export CitySelector + CityComparator as functions and ACTIVE_CITIES is a frozen-like array', async () => {
    const selectorMod = await import('../CitySelector');
    const comparatorMod = await import('../CityComparator');
    const atlasFilterMod = await import('../CitiesAtlasFilter');
    expect(typeof selectorMod.CitySelector).toBe('function');
    expect(typeof comparatorMod.CityComparator).toBe('function');
    expect(typeof atlasFilterMod.CitiesAtlasFilter).toBe('function');
    // Sanity: registry array length matches Test 1
    expect(ACTIVE_CITIES.length).toBe(5);
    // Beta status is detectable for badge rendering branch
    const dubai = ACTIVE_CITIES.find((c) => c.slug === 'dubai');
    expect(dubai?.status).toBe('beta');
  });
});
