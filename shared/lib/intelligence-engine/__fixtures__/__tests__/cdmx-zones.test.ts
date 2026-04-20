import { describe, expect, it } from 'vitest';
import { CDMX_ZONE_IDS, CDMX_ZONES, getFixtureByName, getFixtureByZoneId } from '../cdmx-zones';

const EXPECTED_ALCALDIAS = [
  'Álvaro Obregón',
  'Azcapotzalco',
  'Benito Juárez',
  'Coyoacán',
  'Cuajimalpa',
  'Cuauhtémoc',
  'Gustavo A. Madero',
  'Iztacalco',
  'Iztapalapa',
  'La Magdalena Contreras',
  'Miguel Hidalgo',
  'Milpa Alta',
  'Tláhuac',
  'Tlalpan',
  'Venustiano Carranza',
  'Xochimilco',
];

describe('cdmx-zones fixtures', () => {
  it('contiene 16 zonas (1 por alcaldía CDMX)', () => {
    expect(CDMX_ZONES).toHaveLength(16);
    const alcaldias = CDMX_ZONES.map((z) => z.alcaldia).sort();
    expect(alcaldias).toEqual([...EXPECTED_ALCALDIAS].sort());
  });

  it('zona_ids son únicos', () => {
    const ids = new Set(CDMX_ZONES.map((z) => z.zona_id));
    expect(ids.size).toBe(16);
  });

  it('zona_ids siguen formato UUID v4 (36 chars, `4` en pos 14, `[8-b]` en pos 19)', () => {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    for (const z of CDMX_ZONES) {
      expect(z.zona_id, `${z.zona_name} zona_id`).toMatch(uuidRe);
    }
  });

  it('CDMX_ZONE_IDS key count === 16 y coincide con zonas', () => {
    expect(Object.keys(CDMX_ZONE_IDS)).toHaveLength(16);
    const idSet = new Set(Object.values(CDMX_ZONE_IDS));
    for (const z of CDMX_ZONES) {
      expect(idSet.has(z.zona_id), `${z.zona_name}`).toBe(true);
    }
  });

  it('cada zona declara sources obligatorios (denue, fgj, gtfs, siged, dgis, atlas, sacmex, inegi_inpp)', () => {
    for (const z of CDMX_ZONES) {
      expect(z.sources.denue, z.zona_name).toBeDefined();
      expect(z.sources.fgj, z.zona_name).toBeDefined();
      expect(z.sources.gtfs, z.zona_name).toBeDefined();
      expect(z.sources.siged, z.zona_name).toBeDefined();
      expect(z.sources.dgis, z.zona_name).toBeDefined();
      expect(z.sources.atlas, z.zona_name).toBeDefined();
      expect(z.sources.sacmex, z.zona_name).toBeDefined();
      expect(z.sources.inegi_inpp, z.zona_name).toBeDefined();
    }
  });

  it('stubs H2 explícitos en null (rama/seduvi/catastro/locatel_0311)', () => {
    for (const z of CDMX_ZONES) {
      expect(z.sources.rama).toBeNull();
      expect(z.sources.seduvi).toBeNull();
      expect(z.sources.catastro).toBeNull();
      expect(z.sources.locatel_0311).toBeNull();
    }
  });

  it('DENUE tier_counts suman <= total', () => {
    for (const z of CDMX_ZONES) {
      const { high, standard, basic } = z.sources.denue.tier_counts;
      expect(high + standard + basic, z.zona_name).toBeLessThanOrEqual(z.sources.denue.total);
    }
  });

  it('FGJ by_categoria sum ~= count_12m (±15% tolerancia)', () => {
    for (const z of CDMX_ZONES) {
      const { violentos, patrimoniales, no_violentos } = z.sources.fgj.by_categoria;
      const sum = violentos + patrimoniales + no_violentos;
      const total = z.sources.fgj.count_12m;
      const tolerance = Math.max(5, total * 0.15);
      expect(
        Math.abs(sum - total),
        `${z.zona_name} FGJ sum=${sum} total=${total}`,
      ).toBeLessThanOrEqual(tolerance);
    }
  });

  it('Atlas zona_geotecnica en set válido', () => {
    const validZonas = new Set(['I', 'II', 'IIIa', 'IIIb', 'IIIc', 'IIId']);
    for (const z of CDMX_ZONES) {
      expect(validZonas.has(z.sources.atlas.zona_geotecnica), z.zona_name).toBe(true);
    }
  });

  it('SACMEX dias_sin_agua_anual >= 0 y <= 365', () => {
    for (const z of CDMX_ZONES) {
      expect(z.sources.sacmex.dias_sin_agua_anual).toBeGreaterThanOrEqual(0);
      expect(z.sources.sacmex.dias_sin_agua_anual).toBeLessThanOrEqual(365);
    }
  });

  it('lat/lng en bbox CDMX aproximado', () => {
    for (const z of CDMX_ZONES) {
      expect(z.lat, `${z.zona_name} lat`).toBeGreaterThan(19.1);
      expect(z.lat, `${z.zona_name} lat`).toBeLessThan(19.6);
      expect(z.lng, `${z.zona_name} lng`).toBeGreaterThan(-99.4);
      expect(z.lng, `${z.zona_name} lng`).toBeLessThan(-98.9);
    }
  });

  it('helpers getFixtureByName y getFixtureByZoneId funcionan', () => {
    expect(getFixtureByName('Del Valle')?.alcaldia).toBe('Benito Juárez');
    expect(getFixtureByZoneId(CDMX_ZONE_IDS.polanco)?.zona_name).toBe('Polanco');
    expect(getFixtureByName('no existe')).toBeUndefined();
  });
});
