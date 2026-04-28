// ADR-059 — Cities Expansion Pattern Canonical (FASE 14.1)
// Registry centralizado single-source-of-truth para cities activas DMX.
// Consumido por shared/ui/cities/CitySelector.tsx + features/cities/* + cross-functions M02 + M17.

export type CityStatus = 'active' | 'beta' | 'coming_soon';

export interface CitySettings {
  readonly slug: string;
  readonly nameKey: string;
  readonly countryCode: string;
  readonly currency: string;
  readonly currencySecondary: string | null;
  readonly localesPrimary: ReadonlyArray<string>;
  readonly localesSecondary: ReadonlyArray<string>;
  readonly featureFlag: string | null;
  readonly status: CityStatus;
  readonly defaultLat: number;
  readonly defaultLng: number;
  readonly defaultZoom: number;
  readonly tierH1: boolean;
}

export const ACTIVE_CITIES: ReadonlyArray<CitySettings> = [
  {
    slug: 'cdmx',
    nameKey: 'Cities.cdmx.name',
    countryCode: 'MX',
    currency: 'MXN',
    currencySecondary: null,
    localesPrimary: ['es-MX', 'en-US'],
    localesSecondary: [],
    featureFlag: null,
    status: 'active',
    defaultLat: 19.4326,
    defaultLng: -99.1332,
    defaultZoom: 11,
    tierH1: true,
  },
  {
    slug: 'playa-del-carmen',
    nameKey: 'Cities.playaDelCarmen.name',
    countryCode: 'MX',
    currency: 'MXN',
    currencySecondary: 'USD',
    localesPrimary: ['es-MX', 'en-US'],
    localesSecondary: [],
    featureFlag: null,
    status: 'active',
    defaultLat: 20.6296,
    defaultLng: -87.0739,
    defaultZoom: 13,
    tierH1: true,
  },
  {
    slug: 'guadalajara',
    nameKey: 'Cities.guadalajara.name',
    countryCode: 'MX',
    currency: 'MXN',
    currencySecondary: null,
    localesPrimary: ['es-MX', 'en-US'],
    localesSecondary: [],
    featureFlag: null,
    status: 'active',
    defaultLat: 20.6736,
    defaultLng: -103.344,
    defaultZoom: 12,
    tierH1: true,
  },
  {
    slug: 'queretaro',
    nameKey: 'Cities.queretaro.name',
    countryCode: 'MX',
    currency: 'MXN',
    currencySecondary: null,
    localesPrimary: ['es-MX', 'en-US'],
    localesSecondary: [],
    featureFlag: null,
    status: 'active',
    defaultLat: 20.5888,
    defaultLng: -100.3899,
    defaultZoom: 12,
    tierH1: true,
  },
  {
    slug: 'dubai',
    nameKey: 'Cities.dubai.name',
    countryCode: 'AE',
    currency: 'USD',
    currencySecondary: 'AED',
    localesPrimary: ['en-US'],
    localesSecondary: ['ar-AE'],
    featureFlag: 'DUBAI_REELLY_API_ENABLED',
    status: 'beta',
    defaultLat: 25.2048,
    defaultLng: 55.2708,
    defaultZoom: 11,
    tierH1: true,
  },
];

export function getActiveCities(countryCode?: string): ReadonlyArray<CitySettings> {
  if (!countryCode) return ACTIVE_CITIES;
  return ACTIVE_CITIES.filter((c) => c.countryCode === countryCode);
}

export function getCitySettings(slug: string): CitySettings | null {
  return ACTIVE_CITIES.find((c) => c.slug === slug) ?? null;
}

export function getCitiesByStatus(status: CityStatus): ReadonlyArray<CitySettings> {
  return ACTIVE_CITIES.filter((c) => c.status === status);
}

export function isCityActive(slug: string, flagsEnabled: ReadonlyArray<string> = []): boolean {
  const city = getCitySettings(slug);
  if (!city) return false;
  if (city.status === 'coming_soon') return false;
  if (city.featureFlag && !flagsEnabled.includes(city.featureFlag)) {
    return city.status === 'beta';
  }
  return true;
}
