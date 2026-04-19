import type { AirroiMarketIdentifier } from './airroi-client';

// Seed de markets AirROI priorizados para FASE 07b H1.
//
// Decisiones:
//   - 8 ciudades MX top confirmadas por volumen AirROI: CDMX + 7 plazas clave.
//   - 7 sub-colonias CDMX nativas de AirROI (U2) — evidencia que district
//     es first-class identifier en el proveedor, habilitando STR-COLONIA score.
//
// Identifiers exactos (OpenStreetMap naming) verificados empíricamente contra
// /markets/search en U3 (Roma Sur) y validados en turns previos para las otras.
// Cualquier ingesta que reciba un identifier "cerca pero no exacto" debe
// resolver primero vía AirroiClient.searchMarkets.

export interface SeedMarket {
  readonly countryCode: 'MX';
  readonly airroi: AirroiMarketIdentifier;
  readonly displayName: string;
  // active_listings observado en validación (ordinal; actualizar tras primer run).
  readonly expectedActiveListings?: number;
  readonly priority: 'p1' | 'p2' | 'p3';
  // Si es una sub-colonia de CDMX (U2 STR-COLONIA score downstream).
  readonly isSubMarket: boolean;
}

export const SEED_MARKETS_MX: readonly SeedMarket[] = [
  // ── CDMX ciudad-level (ancla scoring nacional) ─────────────────────────
  {
    countryCode: 'MX',
    airroi: { country: 'Mexico', region: 'Ciudad de México', locality: 'Mexico City' },
    displayName: 'Ciudad de México',
    expectedActiveListings: 23706,
    priority: 'p1',
    isSubMarket: false,
  },
  // ── Sub-colonias CDMX (U2) ─────────────────────────────────────────────
  {
    countryCode: 'MX',
    airroi: {
      country: 'Mexico',
      region: 'Ciudad de México',
      locality: 'Mexico City',
      district: 'Roma Norte',
    },
    displayName: 'Roma Norte, CDMX',
    expectedActiveListings: 1839,
    priority: 'p1',
    isSubMarket: true,
  },
  {
    countryCode: 'MX',
    airroi: {
      country: 'Mexico',
      region: 'Ciudad de México',
      locality: 'Mexico City',
      district: 'Hipódromo',
    },
    displayName: 'Hipódromo, CDMX',
    expectedActiveListings: 1118,
    priority: 'p1',
    isSubMarket: true,
  },
  {
    countryCode: 'MX',
    airroi: {
      country: 'Mexico',
      region: 'Ciudad de México',
      locality: 'Mexico City',
      district: 'Centro',
    },
    displayName: 'Centro, CDMX',
    expectedActiveListings: 964,
    priority: 'p2',
    isSubMarket: true,
  },
  {
    countryCode: 'MX',
    airroi: {
      country: 'Mexico',
      region: 'Ciudad de México',
      locality: 'Mexico City',
      district: 'Cuauhtémoc',
    },
    displayName: 'Cuauhtémoc, CDMX',
    expectedActiveListings: 893,
    priority: 'p2',
    isSubMarket: true,
  },
  {
    countryCode: 'MX',
    airroi: {
      country: 'Mexico',
      region: 'Ciudad de México',
      locality: 'Mexico City',
      district: 'Juárez',
    },
    displayName: 'Juárez, CDMX',
    expectedActiveListings: 769,
    priority: 'p2',
    isSubMarket: true,
  },
  {
    countryCode: 'MX',
    airroi: {
      country: 'Mexico',
      region: 'Ciudad de México',
      locality: 'Mexico City',
      district: 'Condesa',
    },
    displayName: 'Condesa, CDMX',
    expectedActiveListings: 751,
    priority: 'p1',
    isSubMarket: true,
  },
  {
    countryCode: 'MX',
    airroi: {
      country: 'Mexico',
      region: 'Ciudad de México',
      locality: 'Mexico City',
      district: 'Roma Sur',
    },
    displayName: 'Roma Sur, CDMX',
    expectedActiveListings: 591,
    priority: 'p2',
    isSubMarket: true,
  },
  // ── Plazas clave MX ────────────────────────────────────────────────────
  // Identifiers exact OSM requieren resolve via searchMarkets; estos valores
  // son best-guess iniciales (la función resolveSeedIdentifier los reconcilia).
  {
    countryCode: 'MX',
    airroi: { country: 'Mexico', region: 'Quintana Roo', locality: 'Tulum' },
    displayName: 'Tulum, Quintana Roo',
    expectedActiveListings: 10000,
    priority: 'p1',
    isSubMarket: false,
  },
  {
    countryCode: 'MX',
    airroi: {
      country: 'Mexico',
      region: 'Quintana Roo',
      locality: 'Playa del Carmen',
    },
    displayName: 'Playa del Carmen, Quintana Roo',
    expectedActiveListings: 9800,
    priority: 'p1',
    isSubMarket: false,
  },
  {
    countryCode: 'MX',
    airroi: { country: 'Mexico', region: 'Jalisco', locality: 'Puerto Vallarta' },
    displayName: 'Puerto Vallarta, Jalisco',
    expectedActiveListings: 7700,
    priority: 'p2',
    isSubMarket: false,
  },
  {
    countryCode: 'MX',
    airroi: { country: 'Mexico', region: 'Quintana Roo', locality: 'Cancún' },
    displayName: 'Cancún, Quintana Roo',
    expectedActiveListings: 7300,
    priority: 'p2',
    isSubMarket: false,
  },
  {
    countryCode: 'MX',
    airroi: { country: 'Mexico', region: 'Jalisco', locality: 'Guadalajara' },
    displayName: 'Guadalajara, Jalisco',
    expectedActiveListings: 5900,
    priority: 'p2',
    isSubMarket: false,
  },
  {
    countryCode: 'MX',
    airroi: { country: 'Mexico', region: 'Yucatán', locality: 'Mérida' },
    displayName: 'Mérida, Yucatán',
    expectedActiveListings: 5600,
    priority: 'p3',
    isSubMarket: false,
  },
  {
    countryCode: 'MX',
    airroi: { country: 'Mexico', region: 'Nuevo León', locality: 'Monterrey' },
    displayName: 'Monterrey, Nuevo León',
    expectedActiveListings: 3900,
    priority: 'p3',
    isSubMarket: false,
  },
] as const;
