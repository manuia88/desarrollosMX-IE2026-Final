import { describe, expect, it } from 'vitest';
import {
  marketCaptureSchema,
  normalizeCapture,
  PORTAL_IDS,
  SOURCE_FOR_PORTAL,
} from '../schemas/capture';

const VALID_HASH = 'a'.repeat(64);

const baseCapture = {
  portal: 'inmuebles24' as const,
  listing_id: 'id-12345',
  url: 'https://www.inmuebles24.com/propiedades/casa-en-venta-en-roma-norte-id-12345',
  price_listed: 8500000,
  currency: 'MXN' as const,
  operation_type: 'venta' as const,
  property_type: 'casa' as const,
  sqm_construction: 180,
  bedrooms: 3,
  bathrooms: 2.5,
  parking: 2,
  address_raw: 'Roma Norte, CDMX',
  amenities: ['alberca', 'gimnasio'],
  seller_type: 'inmobiliaria' as const,
  raw_html_hash: VALID_HASH,
  captured_at: '2026-04-19T12:00:00.000Z',
};

describe('marketCaptureSchema', () => {
  it('acepta payload válido', () => {
    const result = marketCaptureSchema.safeParse(baseCapture);
    expect(result.success).toBe(true);
  });

  it('rechaza portal no permitido', () => {
    const result = marketCaptureSchema.safeParse({ ...baseCapture, portal: 'habi' });
    expect(result.success).toBe(false);
  });

  it('rechaza hash de longitud inválida', () => {
    const result = marketCaptureSchema.safeParse({ ...baseCapture, raw_html_hash: 'short' });
    expect(result.success).toBe(false);
  });

  it('rechaza precio cero o negativo', () => {
    expect(marketCaptureSchema.safeParse({ ...baseCapture, price_listed: 0 }).success).toBe(false);
    expect(marketCaptureSchema.safeParse({ ...baseCapture, price_listed: -1 }).success).toBe(false);
  });

  it('rechaza url malformada', () => {
    const result = marketCaptureSchema.safeParse({ ...baseCapture, url: 'not-a-url' });
    expect(result.success).toBe(false);
  });
});

describe('normalizeCapture', () => {
  it('mapea price MXN → price_minor en centavos', () => {
    const normalized = normalizeCapture(baseCapture);
    expect(normalized.price_minor).toBe(BigInt(850000000));
    expect(normalized.currency).toBe('MXN');
  });

  it('mapea portal → source con prefijo chrome_ext_', () => {
    const normalized = normalizeCapture(baseCapture);
    expect(normalized.source).toBe('chrome_ext_inmuebles24');
  });

  it('extrae posted_at de captured_at (date)', () => {
    const normalized = normalizeCapture(baseCapture);
    expect(normalized.posted_at).toBe('2026-04-19');
  });

  it('preserva metadata en meta jsonb', () => {
    const normalized = normalizeCapture(baseCapture);
    expect(normalized.meta).toMatchObject({
      portal: 'inmuebles24',
      url: baseCapture.url,
      captured_at: baseCapture.captured_at,
    });
  });

  it('opcionales ausentes → null en columnas DB', () => {
    const minimal = {
      portal: 'fb_marketplace' as const,
      listing_id: '999',
      url: 'https://www.facebook.com/marketplace/item/999',
      price_listed: 1500000,
      currency: 'MXN' as const,
      operation_type: 'venta' as const,
      property_type: 'departamento' as const,
      address_raw: 'Polanco, CDMX',
      amenities: [],
      seller_type: 'desconocido' as const,
      raw_html_hash: VALID_HASH,
      captured_at: '2026-04-19T12:00:00.000Z',
    };
    const parsed = marketCaptureSchema.parse(minimal);
    const normalized = normalizeCapture(parsed);
    expect(normalized.area_built_m2).toBeNull();
    expect(normalized.bedrooms).toBeNull();
    expect(normalized.bathrooms).toBeNull();
    expect(normalized.parking).toBeNull();
  });
});

describe('SOURCE_FOR_PORTAL coverage', () => {
  it('cubre todos los PORTAL_IDS', () => {
    for (const portal of PORTAL_IDS) {
      expect(SOURCE_FOR_PORTAL[portal]).toMatch(/^chrome_ext_/);
    }
  });
});
