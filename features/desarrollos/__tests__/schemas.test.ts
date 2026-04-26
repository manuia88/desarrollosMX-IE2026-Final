import { describe, expect, it } from 'vitest';
import {
  exclusividadListByProyectoInput,
  marketingAssetListInput,
  projectBrokerListByProyectoInput,
  proyectoGetInput,
  proyectoListInput,
  proyectoSchema,
  proyectoSearchByNameInput,
  unidadListInput,
  unidadSchema,
} from '../schemas';

const VALID_UUID = '00000000-0000-4000-8000-000000000001';

describe('proyectoListInput defaults + filter validation', () => {
  it('applies default scope=dmx + limit=24', () => {
    const parsed = proyectoListInput.parse({});
    expect(parsed.scope).toBe('dmx');
    expect(parsed.limit).toBe(24);
  });

  it('rejects invalid status', () => {
    expect(() => proyectoListInput.parse({ scope: 'dmx', status: 'cancelado' as never })).toThrow();
  });

  it('clamps limit max=60', () => {
    expect(() => proyectoListInput.parse({ scope: 'dmx', limit: 100 })).toThrow();
  });

  it('accepts price range filters', () => {
    const parsed = proyectoListInput.parse({
      scope: 'dmx',
      price_min: 1000000,
      price_max: 5000000,
      bedrooms_min: 2,
    });
    expect(parsed.price_min).toBe(1000000);
    expect(parsed.bedrooms_min).toBe(2);
  });
});

describe('proyectoGetInput requires id or slug', () => {
  it('accepts id', () => {
    const parsed = proyectoGetInput.parse({ id: VALID_UUID });
    expect(parsed.id).toBe(VALID_UUID);
  });

  it('accepts slug', () => {
    const parsed = proyectoGetInput.parse({ slug: 'torre-reforma' });
    expect(parsed.slug).toBe('torre-reforma');
  });

  it('rejects when neither provided', () => {
    expect(() => proyectoGetInput.parse({})).toThrow();
  });
});

describe('proyectoSearchByNameInput validation', () => {
  it('requires q', () => {
    expect(() => proyectoSearchByNameInput.parse({})).toThrow();
  });

  it('caps q max 80', () => {
    expect(() => proyectoSearchByNameInput.parse({ q: 'x'.repeat(100) })).toThrow();
  });

  it('defaults limit=10', () => {
    const parsed = proyectoSearchByNameInput.parse({ q: 'reforma' });
    expect(parsed.limit).toBe(10);
  });
});

describe('unidadListInput validation', () => {
  it('requires proyecto_id', () => {
    expect(() => unidadListInput.parse({})).toThrow();
  });

  it('accepts status filter', () => {
    const parsed = unidadListInput.parse({
      proyecto_id: VALID_UUID,
      status: 'disponible',
    });
    expect(parsed.status).toBe('disponible');
  });
});

describe('downstream schemas validation', () => {
  it('projectBrokerListByProyectoInput validates uuid', () => {
    expect(() => projectBrokerListByProyectoInput.parse({ proyecto_id: 'not-uuid' })).toThrow();
  });

  it('marketingAssetListInput accepts asset_type filter', () => {
    const parsed = marketingAssetListInput.parse({
      proyecto_id: VALID_UUID,
      asset_type: 'photo_gallery',
    });
    expect(parsed.asset_type).toBe('photo_gallery');
  });

  it('exclusividadListByProyectoInput requires proyecto_id', () => {
    expect(() => exclusividadListByProyectoInput.parse({})).toThrow();
  });
});

describe('proyectoSchema and unidadSchema row parsing', () => {
  it('parses valid proyecto row', () => {
    const row = {
      id: VALID_UUID,
      nombre: 'Torre Reforma',
      slug: 'torre-reforma',
      desarrolladora_id: VALID_UUID,
      zone_id: null,
      country_code: 'MX',
      ciudad: 'CDMX',
      colonia: 'Cuauhtémoc',
      direccion: null,
      lat: null,
      lng: null,
      status: 'preventa',
      tipo: 'departamento',
      operacion: 'venta',
      units_total: 100,
      units_available: 80,
      price_min_mxn: 1000000,
      price_max_mxn: 5000000,
      currency: 'MXN',
      bedrooms_range: [1, 3],
      amenities: ['alberca'],
      description: null,
      cover_photo_url: null,
      brochure_url: null,
      privacy_level: 'public',
      is_active: true,
      meta: {},
      created_at: '2026-04-26T18:00:00Z',
      updated_at: '2026-04-26T18:00:00Z',
    };
    const parsed = proyectoSchema.parse(row);
    expect(parsed.nombre).toBe('Torre Reforma');
  });

  it('parses valid unidad row', () => {
    const row = {
      id: VALID_UUID,
      proyecto_id: VALID_UUID,
      numero: 'A-101',
      tipo: 'departamento',
      recamaras: 2,
      banos: 1.5,
      parking: 1,
      area_m2: 80,
      area_terreno_m2: null,
      price_mxn: 3500000,
      maintenance_fee_mxn: 4500,
      status: 'disponible',
      floor: 1,
      floor_plan_url: null,
      photos: [],
      features: {},
      meta: {},
      created_at: '2026-04-26T18:00:00Z',
      updated_at: '2026-04-26T18:00:00Z',
    };
    const parsed = unidadSchema.parse(row);
    expect(parsed.numero).toBe('A-101');
  });
});
