import { describe, expect, it } from 'vitest';
import {
  ATLAS_PERIODICITY,
  ATLAS_RISK_TYPES,
  ATLAS_SOURCE,
  AtlasFeatureCollection,
  atlasDriver,
  centroidOfPolygon,
  isAtlasRiskType,
  parseAtlasGeoJson,
  parseAtlasRiskLevel,
} from '../atlas-riesgos';

const triangleFC = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        // Triángulo dentro de CDMX. Primer y último punto iguales.
        coordinates: [
          [
            [-99.2, 19.3],
            [-99.0, 19.3],
            [-99.1, 19.5],
            [-99.2, 19.3],
          ],
        ],
      },
      properties: {
        NOM_ZONA: 'Zona Alta Sísmica CDMX',
        NIVEL: 'ALTO',
        OBJECTID: 42,
      },
    },
  ],
};

describe('ATLAS_RISK_TYPES', () => {
  it('expone los 6 tipos canónicos', () => {
    expect(ATLAS_RISK_TYPES).toEqual([
      'sismicidad',
      'hundimientos',
      'inundaciones',
      'deslaves',
      'volcanico',
      'tsunami',
    ]);
  });

  it('isAtlasRiskType filtra correctamente', () => {
    expect(isAtlasRiskType('sismicidad')).toBe(true);
    expect(isAtlasRiskType('SISMICIDAD')).toBe(false);
    expect(isAtlasRiskType('meteorito')).toBe(false);
    expect(isAtlasRiskType('')).toBe(false);
  });
});

describe('AtlasFeatureCollection (zod schema)', () => {
  it('valida FeatureCollection con Polygon', () => {
    const r = AtlasFeatureCollection.safeParse(triangleFC);
    expect(r.success).toBe(true);
  });

  it('rechaza objetos sin type=FeatureCollection', () => {
    const r = AtlasFeatureCollection.safeParse({ type: 'Other', features: [] });
    expect(r.success).toBe(false);
  });

  it('rechaza geometría no Polygon/MultiPolygon', () => {
    const bad = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-99.1, 19.4] },
          properties: {},
        },
      ],
    };
    const r = AtlasFeatureCollection.safeParse(bad);
    expect(r.success).toBe(false);
  });
});

describe('centroidOfPolygon', () => {
  it('calcula centroide de triángulo como promedio de vértices', () => {
    const c = centroidOfPolygon({
      type: 'Polygon',
      coordinates: [
        [
          [-99.2, 19.3],
          [-99.0, 19.3],
          [-99.1, 19.5],
          [-99.2, 19.3],
        ],
      ],
    });
    expect(c).not.toBeNull();
    // Promedio de 4 puntos (primer ring incluye cierre duplicado).
    expect(c?.lng).toBeCloseTo(-99.125, 3);
    expect(c?.lat).toBeCloseTo(19.35, 3);
  });

  it('calcula centroide de MultiPolygon usando primer polígono', () => {
    const c = centroidOfPolygon({
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-99.2, 19.3],
            [-99.0, 19.3],
            [-99.1, 19.5],
            [-99.2, 19.3],
          ],
        ],
        [
          [
            [-100.0, 25.0],
            [-100.0, 25.5],
            [-99.5, 25.5],
            [-100.0, 25.0],
          ],
        ],
      ],
    });
    expect(c).not.toBeNull();
    expect(c?.lat).toBeCloseTo(19.35, 3);
  });

  it('regresa null si el ring está vacío', () => {
    const c = centroidOfPolygon({ type: 'Polygon', coordinates: [[]] });
    expect(c).toBeNull();
  });
});

describe('parseAtlasRiskLevel', () => {
  it('detecta alta por "ALTO"', () => {
    expect(parseAtlasRiskLevel({ NIVEL: 'ALTO' })).toBe('alta');
    expect(parseAtlasRiskLevel({ nivel: 'muy alto' })).toBe('alta');
  });

  it('detecta media por "MEDIO"/"MODERADO"', () => {
    expect(parseAtlasRiskLevel({ NIVEL: 'MEDIO' })).toBe('media');
    expect(parseAtlasRiskLevel({ nivel: 'Moderado' })).toBe('media');
  });

  it('detecta baja por "BAJO"', () => {
    expect(parseAtlasRiskLevel({ NIVEL: 'BAJO' })).toBe('baja');
  });

  it('mapea códigos numéricos 1/2/3', () => {
    expect(parseAtlasRiskLevel({ NIVEL: '1' })).toBe('alta');
    expect(parseAtlasRiskLevel({ NIVEL: '2' })).toBe('media');
    expect(parseAtlasRiskLevel({ NIVEL: '3' })).toBe('baja');
  });

  it('regresa null si no hay nivel reconocible', () => {
    expect(parseAtlasRiskLevel({})).toBeNull();
    expect(parseAtlasRiskLevel({ NIVEL: '' })).toBeNull();
    expect(parseAtlasRiskLevel({ NIVEL: 'N/D' })).toBeNull();
  });
});

describe('parseAtlasGeoJson', () => {
  it('parsea FeatureCollection con un triángulo y meta completa', () => {
    const rows = parseAtlasGeoJson({ fc: triangleFC, riskType: 'sismicidad' });
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r?.entity_type).toBe('risk_zone');
    expect(r?.source_id).toBe('sismicidad:42');
    expect(r?.name).toBe('Zona Alta Sísmica CDMX');
    expect(r?.meta.risk_type).toBe('sismicidad');
    expect(r?.meta.risk_level).toBe('alta');
    expect(r?.lat).toBeCloseTo(19.35, 3);
    expect(r?.lng).toBeCloseTo(-99.125, 3);
    expect(r?.h3_r8).toMatch(/^[0-9a-f]{15}$/);
    expect(r?.scian_code).toBeNull();
  });

  it('usa hash de geom cuando no hay id en properties', () => {
    const fc = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [
                [-99.2, 19.3],
                [-99.0, 19.3],
                [-99.1, 19.5],
                [-99.2, 19.3],
              ],
            ],
          },
          properties: { nombre: 'Zona X' },
        },
      ],
    };
    const rows = parseAtlasGeoJson({ fc, riskType: 'inundaciones' });
    expect(rows[0]?.source_id).toMatch(/^inundaciones:[0-9a-f]{8}$/);
    expect(rows[0]?.name).toBe('Zona X');
  });

  it('usa centroid cacheado en properties si existe', () => {
    const fc = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [
                [-99.2, 19.3],
                [-99.0, 19.3],
                [-99.1, 19.5],
                [-99.2, 19.3],
              ],
            ],
          },
          properties: {
            id: 'Z1',
            centroid: { lat: 19.4, lng: -99.15 },
          },
        },
      ],
    };
    const rows = parseAtlasGeoJson({ fc, riskType: 'deslaves' });
    expect(rows[0]?.lat).toBe(19.4);
    expect(rows[0]?.lng).toBe(-99.15);
  });

  it('throwea para riskType fuera de ATLAS_RISK_TYPES', () => {
    expect(() => parseAtlasGeoJson({ fc: triangleFC, riskType: 'meteorito' as never })).toThrow(
      'atlas_invalid_risk_type',
    );
  });

  it('fallback name a riskType si no hay nombres en properties', () => {
    const fc = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [
                [-99.2, 19.3],
                [-99.0, 19.3],
                [-99.1, 19.5],
                [-99.2, 19.3],
              ],
            ],
          },
          properties: { FID: 99 },
        },
      ],
    };
    const rows = parseAtlasGeoJson({ fc, riskType: 'volcanico' });
    expect(rows[0]?.name).toBe('volcanico');
  });

  it('FC vacía regresa []', () => {
    const rows = parseAtlasGeoJson({
      fc: { type: 'FeatureCollection', features: [] },
      riskType: 'tsunami',
    });
    expect(rows).toEqual([]);
  });
});

describe('atlasDriver', () => {
  it('registrado con source=atlas_riesgos, category=geo, periodicity=yearly', () => {
    expect(atlasDriver.source).toBe(ATLAS_SOURCE);
    expect(atlasDriver.category).toBe('geo');
    expect(atlasDriver.defaultPeriodicity).toBe(ATLAS_PERIODICITY);
    expect(ATLAS_PERIODICITY).toBe('yearly');
  });

  it('fetch valida input y regresa ParseAtlasInput', async () => {
    const ctx = {
      runId: 'r',
      source: ATLAS_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    const out = await atlasDriver.fetch(ctx, {
      kind: 'geojson_featurecollection',
      fc: triangleFC,
      riskType: 'sismicidad',
    });
    expect(out.riskType).toBe('sismicidad');
  });

  it('fetch rechaza riskType inválido', async () => {
    const ctx = {
      runId: 'r',
      source: ATLAS_SOURCE,
      countryCode: 'MX',
      samplePercentage: 100,
      triggeredBy: null,
      startedAt: new Date(),
    };
    await expect(
      atlasDriver.fetch(ctx, {
        kind: 'geojson_featurecollection',
        fc: triangleFC,
        riskType: 'meteorito',
      }),
    ).rejects.toThrow('atlas_invalid_risk_type');
  });
});
