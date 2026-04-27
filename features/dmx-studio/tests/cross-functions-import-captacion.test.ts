// FASE 14.F.4 Sprint 3 — Cross-function 3 (UPGRADE 8 LATERAL) tests:
// importFromCaptacion lib pre-fill + ownership check + URL extraction.
// Modo A: pure-function tests con mocked Supabase chain. Cero red, cero créditos.

import { describe, expect, it, vi } from 'vitest';
import { importFromCaptacion } from '@/features/dmx-studio/lib/cross-functions/import-from-captacion';

interface MockCaptacion {
  id: string;
  asesor_id: string;
  direccion: string;
  ciudad: string | null;
  colonia: string | null;
  precio_solicitado: number;
  currency: string;
  country_code: string;
  features: unknown;
  notes: string | null;
}

function buildSupabaseMock(captacion: MockCaptacion | null, errorMessage: string | null = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: captacion,
            error: errorMessage ? { message: errorMessage } : null,
          })),
        })),
      })),
    })),
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock surface for tests
  } as any;
}

const ASESOR_ID = '11111111-1111-1111-1111-111111111111';
const CAPTACION_ID = '22222222-2222-2222-2222-222222222222';

describe('importFromCaptacion', () => {
  it('returns prefilled data + URL when notes contains http link', async () => {
    const captacion: MockCaptacion = {
      id: CAPTACION_ID,
      asesor_id: ASESOR_ID,
      direccion: 'Av. Insurgentes Sur 1234',
      ciudad: 'CDMX',
      colonia: 'Roma Norte',
      precio_solicitado: 8500000,
      currency: 'MXN',
      country_code: 'MX',
      features: { recamaras: 3, banos: 2, area_m2: 120, amenidades: ['alberca', 'gym'] },
      notes: 'Listing en https://www.inmuebles24.com/propiedad-12345.html con buenas fotos.',
    };
    const supabase = buildSupabaseMock(captacion);

    const result = await importFromCaptacion(supabase, CAPTACION_ID, ASESOR_ID);

    expect(result.captacionId).toBe(CAPTACION_ID);
    expect(result.url).toBe('https://www.inmuebles24.com/propiedad-12345.html');
    expect(result.prefilledData.title).toBe('Av. Insurgentes Sur 1234 · Roma Norte');
    expect(result.prefilledData.price).toBe(8500000);
    expect(result.prefilledData.currency).toBe('MXN');
    expect(result.prefilledData.bedrooms).toBe(3);
    expect(result.prefilledData.bathrooms).toBe(2);
    expect(result.prefilledData.areaM2).toBe(120);
    expect(result.prefilledData.zone).toBe('Roma Norte');
    expect(result.prefilledData.amenities).toEqual(['alberca', 'gym']);
    expect(result.prefilledData.countryCode).toBe('MX');
  });

  it('returns null URL when notes has no link', async () => {
    const captacion: MockCaptacion = {
      id: CAPTACION_ID,
      asesor_id: ASESOR_ID,
      direccion: 'Av. Reforma 100',
      ciudad: 'CDMX',
      colonia: null,
      precio_solicitado: 5000000,
      currency: 'MXN',
      country_code: 'MX',
      features: {},
      notes: 'Captación reciente, sin link al portal todavía.',
    };
    const supabase = buildSupabaseMock(captacion);

    const result = await importFromCaptacion(supabase, CAPTACION_ID, ASESOR_ID);

    expect(result.url).toBeNull();
    expect(result.prefilledData.title).toBe('Av. Reforma 100 · CDMX');
    expect(result.prefilledData.bedrooms).toBeNull();
    expect(result.prefilledData.amenities).toEqual([]);
  });

  it('throws when captacion not owned by user (forbidden)', async () => {
    const otherUserId = '99999999-9999-9999-9999-999999999999';
    const captacion: MockCaptacion = {
      id: CAPTACION_ID,
      asesor_id: otherUserId,
      direccion: 'X',
      ciudad: null,
      colonia: null,
      precio_solicitado: 1000000,
      currency: 'MXN',
      country_code: 'MX',
      features: {},
      notes: null,
    };
    const supabase = buildSupabaseMock(captacion);

    await expect(importFromCaptacion(supabase, CAPTACION_ID, ASESOR_ID)).rejects.toThrow(
      /not owned/,
    );
  });

  it('throws when captacion not found', async () => {
    const supabase = buildSupabaseMock(null);

    await expect(importFromCaptacion(supabase, CAPTACION_ID, ASESOR_ID)).rejects.toThrow(
      /not found/,
    );
  });

  it('throws when supabase query errors', async () => {
    const supabase = buildSupabaseMock(null, 'connection timeout');

    await expect(importFromCaptacion(supabase, CAPTACION_ID, ASESOR_ID)).rejects.toThrow(
      /query failed/,
    );
  });

  it('handles empty direccion + null ciudad/colonia gracefully', async () => {
    const captacion: MockCaptacion = {
      id: CAPTACION_ID,
      asesor_id: ASESOR_ID,
      direccion: '',
      ciudad: null,
      colonia: null,
      precio_solicitado: 3500000,
      currency: 'USD',
      country_code: 'US',
      features: { area_m2: 80 },
      notes: null,
    };
    const supabase = buildSupabaseMock(captacion);

    const result = await importFromCaptacion(supabase, CAPTACION_ID, ASESOR_ID);

    expect(result.prefilledData.title).toBe('Captación sin dirección');
    expect(result.prefilledData.zone).toBeNull();
    expect(result.prefilledData.areaM2).toBe(80);
    expect(result.prefilledData.countryCode).toBe('US');
  });
});
