// Enforcement de fuentes prohibidas (Habi + scraping server-side de portales H1).
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.I
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D10
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-012_SCRAPING_POLICY.md §161

import { describe, expect, it } from 'vitest';
import {
  ALLOWED_SOURCES,
  assertAllowedSource,
  assertAllowedUrl,
  isAllowedSource,
} from '@/shared/lib/ingest/allowlist';
import { SourceNotAllowedError } from '@/shared/lib/ingest/types';

describe('Habi PROHIBIDO — fuente bloqueada en allowlist', () => {
  it('habi no está en ALLOWED_SOURCES', () => {
    expect((ALLOWED_SOURCES as readonly string[]).includes('habi')).toBe(false);
  });

  it('isAllowedSource("habi") devuelve false', () => {
    expect(isAllowedSource('habi')).toBe(false);
  });

  it('assertAllowedSource("habi") lanza SourceNotAllowedError', () => {
    expect(() => assertAllowedSource('habi')).toThrow(SourceNotAllowedError);
  });

  it('URLs habi.co/apiv2 bloqueadas', () => {
    expect(() => assertAllowedUrl('https://apiv2.habi.co/get_lot')).toThrow(SourceNotAllowedError);
    expect(() => assertAllowedUrl('https://habi.co/api/listings')).toThrow(SourceNotAllowedError);
  });
});

describe('Scraping server-side de portales H1 PROHIBIDO (ADR-012)', () => {
  it('inmuebles24 server-side scraping bloqueado', () => {
    expect(() => assertAllowedUrl('https://inmuebles24.com/listing/123')).toThrow(
      SourceNotAllowedError,
    );
  });

  it('vivanuncios server-side scraping bloqueado', () => {
    expect(() => assertAllowedUrl('https://www.vivanuncios.com.mx/casa-id-123')).toThrow(
      SourceNotAllowedError,
    );
  });

  it('propiedades.com server-side scraping bloqueado', () => {
    expect(() => assertAllowedUrl('https://propiedades.com/inmueble-123')).toThrow(
      SourceNotAllowedError,
    );
  });

  it('Mercado Libre /inmuebles bloqueado', () => {
    expect(() => assertAllowedUrl('https://www.mercadolibre.com/inmuebles/casa')).toThrow(
      SourceNotAllowedError,
    );
  });

  it('FB Marketplace bloqueado', () => {
    expect(() => assertAllowedUrl('https://www.facebook.com/marketplace/item/123')).toThrow(
      SourceNotAllowedError,
    );
  });
});

describe('Sources autorizadas via Chrome Extension (no scraping server-side)', () => {
  it('chrome_ext_inmuebles24 está permitido', () => {
    expect(isAllowedSource('chrome_ext_inmuebles24')).toBe(true);
  });

  it('chrome_ext_fb_marketplace está permitido', () => {
    expect(isAllowedSource('chrome_ext_fb_marketplace')).toBe(true);
  });

  it('cushman, cbre, tinsa, jll, softec admin uploads permitidos', () => {
    expect(isAllowedSource('cushman')).toBe(true);
    expect(isAllowedSource('cbre')).toBe(true);
    expect(isAllowedSource('tinsa')).toBe(true);
    expect(isAllowedSource('jll')).toBe(true);
    expect(isAllowedSource('softec')).toBe(true);
  });
});
