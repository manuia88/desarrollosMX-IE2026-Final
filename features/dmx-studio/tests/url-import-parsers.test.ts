// FASE 14.F.4 Sprint 3 — Portal parsers unit tests.
// Tests detectPortal + parseGeneric + parseInmuebles24 + parseLamudi + parseEasybroker
// against synthetic HTML fixtures (NO real network).

import { describe, expect, it } from 'vitest';
import { parseEasybroker } from '@/features/dmx-studio/lib/url-import/portal-parsers/easybroker';
import {
  detectPortal,
  parseGeneric,
} from '@/features/dmx-studio/lib/url-import/portal-parsers/generic';
import { parseInmuebles24 } from '@/features/dmx-studio/lib/url-import/portal-parsers/inmuebles24';
import { parseLamudi } from '@/features/dmx-studio/lib/url-import/portal-parsers/lamudi';
import { parseSegundamano } from '@/features/dmx-studio/lib/url-import/portal-parsers/segundamano';
import { parseVivanuncios } from '@/features/dmx-studio/lib/url-import/portal-parsers/vivanuncios';

const GENERIC_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="Penthouse Polanco con vista" />
    <meta property="og:description" content="Hermoso departamento amueblado." />
    <meta property="og:image" content="https://cdn.example.com/photo-1.jpg" />
    <meta property="og:image" content="https://cdn.example.com/photo-2.jpg" />
    <meta property="product:price:amount" content="12500000" />
    <meta property="product:price:currency" content="MXN" />
    <meta name="description" content="Descripción fallback HTML" />
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Apartment",
      "name": "Penthouse Polanco JSON-LD",
      "description": "JSON-LD description",
      "image": ["https://cdn.example.com/photo-3.jpg"],
      "offers": { "price": 12500000, "priceCurrency": "MXN" },
      "floorSize": { "value": 220, "unitText": "MTK" },
      "numberOfBedrooms": 3,
      "numberOfBathroomsTotal": 2.5,
      "address": { "addressLocality": "Polanco", "addressRegion": "CDMX" },
      "amenityFeature": [{ "name": "Alberca" }, { "name": "Gym" }]
    }
    </script>
  </head>
  <body><h1>Fallback H1 Title</h1></body>
</html>
`;

const INMUEBLES24_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="Casa Roma Norte 180m2" />
    <meta property="og:image" content="https://i.inm24.com/main.jpg" />
    <meta name="description" content="Casa con jardín" />
  </head>
  <body>
    <div class="price-class">MN$ 8,500,000</div>
    <span class="location-class">Roma Norte, CDMX</span>
    <div>3 recamaras, 180 m2 de construcción y 2 baños completos.</div>
  </body>
</html>
`;

const LAMUDI_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="Departamento Condesa Lamudi" />
    <meta property="og:image" content="https://im.lamudi.com.mx/photo.jpg" />
    <script type="application/ld+json">
    {
      "@type": "Apartment",
      "name": "Departamento Condesa Lamudi",
      "offers": { "price": 5500000, "priceCurrency": "MXN" },
      "numberOfBedrooms": 2
    }
    </script>
  </head>
  <body>
    <div data-testid="location">Condesa, CDMX</div>
  </body>
</html>
`;

const EASYBROKER_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="Casa EB Coyoacán" />
    <meta property="og:image" content="https://eb-cdn.com/img.jpg" />
    <meta property="product:price:amount" content="9800000" />
    <meta property="product:price:currency" content="MXN" />
  </head>
  <body>
    <div class="property-location-block">Coyoacán</div>
  </body>
</html>
`;

describe('detectPortal', () => {
  it('detects inmuebles24 from URL host', () => {
    expect(detectPortal('https://www.inmuebles24.com/propiedad/123')).toBe('inmuebles24');
  });

  it('detects lamudi from URL host', () => {
    expect(detectPortal('https://www.lamudi.com.mx/dept/abc')).toBe('lamudi');
  });

  it('detects easybroker from URL host', () => {
    expect(detectPortal('https://www.easybroker.com/listings/casa-x')).toBe('easybroker');
  });

  it('detects vivanuncios from URL host', () => {
    expect(detectPortal('https://www.vivanuncios.com.mx/a-cdmx/casa/1')).toBe('vivanuncios');
  });

  it('detects segundamano from URL host', () => {
    expect(detectPortal('https://www.segundamano.mx/inmuebles/casa')).toBe('segundamano');
  });

  it('detects propiedades.com from URL host', () => {
    expect(detectPortal('https://www.propiedades.com/casa/100')).toBe('propiedades_com');
  });

  it('returns manual_url for non-portal valid URL', () => {
    expect(detectPortal('https://example.com/listing/100')).toBe('manual_url');
  });

  it('returns unknown for invalid URL string', () => {
    expect(detectPortal('not-a-url')).toBe('unknown');
  });
});

describe('parseGeneric', () => {
  it('extracts og:title + og:description + photos + price + currency', () => {
    const result = parseGeneric(GENERIC_HTML);
    expect(result.title).toBe('Penthouse Polanco JSON-LD');
    expect(result.description).toBe('JSON-LD description');
    expect(result.priceLocal).toBe(12500000);
    expect(result.currency).toBe('MXN');
  });

  it('extracts JSON-LD structured data: bedrooms + bathrooms + zone + amenities', () => {
    const result = parseGeneric(GENERIC_HTML);
    expect(result.bedrooms).toBe(3);
    expect(result.bathrooms).toBe(2.5);
    expect(result.zone).toBe('Polanco');
    expect(result.city).toBe('CDMX');
    expect(result.amenities.length).toBe(2);
    expect(result.amenities).toContain('Alberca');
  });

  it('deduplicates photos and caps at 30', () => {
    const result = parseGeneric(GENERIC_HTML);
    expect(result.photos.length).toBeGreaterThan(0);
    expect(result.photos.length).toBeLessThanOrEqual(30);
    const seen = new Set(result.photos);
    expect(seen.size).toBe(result.photos.length);
  });

  it('falls back to h1 when og:title and JSON-LD missing', () => {
    const html = '<html><body><h1>Solo H1 Title</h1></body></html>';
    const result = parseGeneric(html);
    expect(result.title).toBe('Solo H1 Title');
  });

  it('returns null for missing fields without throwing', () => {
    const html = '<html><body></body></html>';
    const result = parseGeneric(html);
    expect(result.title).toBeNull();
    expect(result.priceLocal).toBeNull();
    expect(result.bedrooms).toBeNull();
    expect(result.photos.length).toBe(0);
    expect(result.amenities.length).toBe(0);
  });
});

describe('parseInmuebles24', () => {
  it('extracts price + bedrooms + bathrooms + area from body when JSON-LD missing', () => {
    const result = parseInmuebles24(INMUEBLES24_HTML);
    expect(result.priceLocal).toBe(8500000);
    expect(result.bedrooms).toBe(3);
    expect(result.areaM2).toBe(180);
    expect(result.bathrooms).toBe(2);
  });

  it('extracts zone from .location-class element', () => {
    const result = parseInmuebles24(INMUEBLES24_HTML);
    expect(result.zone).toContain('Roma Norte');
  });

  it('defaults currency to MXN when missing', () => {
    const result = parseInmuebles24(INMUEBLES24_HTML);
    expect(result.currency).toBe('MXN');
  });
});

describe('parseLamudi', () => {
  it('extracts JSON-LD price + bedrooms', () => {
    const result = parseLamudi(LAMUDI_HTML);
    expect(result.priceLocal).toBe(5500000);
    expect(result.bedrooms).toBe(2);
  });

  it('extracts zone from data-testid="location" attribute', () => {
    const result = parseLamudi(LAMUDI_HTML);
    expect(result.zone).toContain('Condesa');
  });
});

describe('parseEasybroker', () => {
  it('extracts og:price + og:currency', () => {
    const result = parseEasybroker(EASYBROKER_HTML);
    expect(result.priceLocal).toBe(9800000);
    expect(result.currency).toBe('MXN');
  });

  it('extracts zone from .location-class element', () => {
    const result = parseEasybroker(EASYBROKER_HTML);
    expect(result.zone).toContain('Coyoacán');
  });
});

describe('parseVivanuncios + parseSegundamano (generic fallback)', () => {
  it('parseVivanuncios falls back to generic parser with currency MXN default', () => {
    const result = parseVivanuncios(GENERIC_HTML);
    expect(result.title).toBe('Penthouse Polanco JSON-LD');
    expect(result.currency).toBe('MXN');
  });

  it('parseSegundamano falls back to generic parser with currency MXN default', () => {
    const result = parseSegundamano(GENERIC_HTML);
    expect(result.title).toBe('Penthouse Polanco JSON-LD');
    expect(result.currency).toBe('MXN');
  });
});
