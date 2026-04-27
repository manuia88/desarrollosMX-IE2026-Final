// FASE 14.F.4 Sprint 3 — analyzeListingHealth pure JS tests.
// Modo A: zero mocks (analyzer es pure function sin side effects).

import { describe, expect, it } from 'vitest';
import { analyzeListingHealth } from '@/features/dmx-studio/lib/listing-health/analyzer';
import type { ExtractedListingData } from '@/features/dmx-studio/lib/url-import';

function buildData(overrides: Partial<ExtractedListingData> = {}): ExtractedListingData {
  return {
    title: 'Departamento Roma Norte',
    description: 'Hermoso depto con vista a parque',
    priceLocal: 5_500_000,
    currency: 'MXN',
    areaM2: 120,
    bedrooms: 3,
    bathrooms: 2,
    zone: 'Roma Norte',
    city: 'CDMX',
    photos: [],
    amenities: [],
    rawMetadata: {},
    ...overrides,
  };
}

const fullDescription =
  'Excepcional departamento en Roma Norte, una de las zonas más cotizadas de la Ciudad de México. ' +
  'Cuenta con 120 metros cuadrados de construcción distribuidos en 3 recámaras, 2 baños completos, ' +
  'cocina integral y sala-comedor con balcón privado. Edificio con seguridad 24 horas, gimnasio, ' +
  'roof garden y dos cajones de estacionamiento. A pasos de Avenida Álvaro Obregón.';

describe('analyzeListingHealth — happy path full data → score >= 90', () => {
  it('returns scoreOverall >= 90 with 10+ photos, 200+ desc, all fields, jsonld+amenities', () => {
    const data = buildData({
      description: fullDescription,
      photos: Array.from({ length: 12 }, (_, i) => `https://cdn.test/p${i}.jpg`),
      amenities: ['piscina', 'gimnasio', 'roof garden'],
      rawMetadata: { jsonLdFound: true, ogLocale: 'es_MX' },
    });
    const result = analyzeListingHealth(data);
    expect(result.scoreOverall).toBeGreaterThanOrEqual(90);
    expect(result.scorePhotosCount).toBe(100);
    expect(result.scoreDescriptionLength).toBe(100);
    expect(result.scoreMissingFields).toBe(100);
    expect(result.scoreMetadataQuality).toBe(100);
    expect(result.missingFields).toHaveLength(0);
    expect(result.improvementSuggestions).toHaveLength(0);
  });
});

describe('analyzeListingHealth — minimal data → score < 30', () => {
  it('returns very low score with 0 photos, no desc, missing fields', () => {
    const data = buildData({
      description: null,
      photos: [],
      priceLocal: null,
      areaM2: null,
      bedrooms: null,
      bathrooms: null,
      zone: null,
      amenities: [],
      rawMetadata: {},
    });
    const result = analyzeListingHealth(data);
    expect(result.scoreOverall).toBeLessThan(30);
    expect(result.scorePhotosCount).toBe(0);
    expect(result.scoreDescriptionLength).toBe(0);
    expect(result.scoreMissingFields).toBe(0);
    expect(result.scoreMetadataQuality).toBe(0);
  });
});

describe('analyzeListingHealth — missing_fields list', () => {
  it('contains expected fields when nullified', () => {
    const data = buildData({
      priceLocal: null,
      areaM2: null,
      bedrooms: null,
      bathrooms: 2,
      zone: 'Roma Norte',
    });
    const result = analyzeListingHealth(data);
    expect(result.missingFields).toContain('priceLocal');
    expect(result.missingFields).toContain('areaM2');
    expect(result.missingFields).toContain('bedrooms');
    expect(result.missingFields).not.toContain('bathrooms');
    expect(result.missingFields).not.toContain('zone');
  });
});

describe('analyzeListingHealth — improvement suggestions content', () => {
  it('improvement_suggestions contains photos message when photos < target', () => {
    const data = buildData({ photos: ['https://cdn.test/p1.jpg', 'https://cdn.test/p2.jpg'] });
    const result = analyzeListingHealth(data);
    const matches = result.improvementSuggestions.filter((s) => s.toLowerCase().includes('foto'));
    expect(matches.length).toBeGreaterThan(0);
  });

  it('improvement_suggestions contains description message when desc < 100 chars', () => {
    const data = buildData({ description: 'Corto' });
    const result = analyzeListingHealth(data);
    const matches = result.improvementSuggestions.filter((s) =>
      s.toLowerCase().includes('descripción'),
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it('improvement_suggestions contains amenities message when amenities empty', () => {
    const data = buildData({ amenities: [] });
    const result = analyzeListingHealth(data);
    const matches = result.improvementSuggestions.filter((s) =>
      s.toLowerCase().includes('amenidades'),
    );
    expect(matches.length).toBeGreaterThan(0);
  });
});

describe('analyzeListingHealth — weighted average formula', () => {
  it('scoreOverall ~= 0.30*photos + 0.25*desc + 0.30*missing + 0.15*metadata', () => {
    const data = buildData({
      description: fullDescription,
      photos: Array.from({ length: 6 }, (_, i) => `https://cdn.test/p${i}.jpg`),
      amenities: ['piscina'],
      rawMetadata: { jsonLdFound: true, ogLocale: 'es_MX' },
    });
    const result = analyzeListingHealth(data);
    // photos=60 (>=5), desc=100, missing=100 (all present), metadata=100
    // expected: 0.30*60 + 0.25*100 + 0.30*100 + 0.15*100 = 18 + 25 + 30 + 15 = 88
    const expected = Math.round(
      result.scorePhotosCount * 0.3 +
        result.scoreDescriptionLength * 0.25 +
        result.scoreMissingFields * 0.3 +
        result.scoreMetadataQuality * 0.15,
    );
    expect(result.scoreOverall).toBe(expected);
  });
});

describe('analyzeListingHealth — edge cases', () => {
  it('photos=0 yields scorePhotosCount=0', () => {
    const data = buildData({ photos: [] });
    const result = analyzeListingHealth(data);
    expect(result.scorePhotosCount).toBe(0);
  });

  it('description=null is treated as 0 length and yields scoreDescriptionLength=0', () => {
    const data = buildData({ description: null });
    const result = analyzeListingHealth(data);
    expect(result.scoreDescriptionLength).toBe(0);
  });

  it('all numeric fields null → missing fields includes priceLocal/areaM2/bedrooms/bathrooms/zone', () => {
    const data = buildData({
      priceLocal: null,
      areaM2: null,
      bedrooms: null,
      bathrooms: null,
      zone: null,
    });
    const result = analyzeListingHealth(data);
    expect(result.missingFields).toEqual(
      expect.arrayContaining(['priceLocal', 'areaM2', 'bedrooms', 'bathrooms', 'zone']),
    );
    expect(result.scoreMissingFields).toBe(0);
  });

  it('returns scoreOverall in [0, 100] range for any input', () => {
    const data = buildData({
      photos: Array.from({ length: 50 }, (_, i) => `https://cdn.test/p${i}.jpg`),
      description: fullDescription.repeat(5),
      amenities: ['a', 'b', 'c', 'd'],
      rawMetadata: { jsonLdFound: true, ogLocale: 'es_MX' },
    });
    const result = analyzeListingHealth(data);
    expect(result.scoreOverall).toBeGreaterThanOrEqual(0);
    expect(result.scoreOverall).toBeLessThanOrEqual(100);
    expect(result.scorePhotosCount).toBeLessThanOrEqual(100);
  });
});
