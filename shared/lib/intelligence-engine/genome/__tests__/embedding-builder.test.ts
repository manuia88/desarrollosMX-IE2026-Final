import { describe, expect, it } from 'vitest';
import { EMBEDDING_DIM } from '@/features/genome/types';
import {
  buildEmbeddingVector,
  DMX_INDEX_ORDER,
  EMBEDDING_BUILDER_METADATA,
  GEO_FEATURES,
  N0_SCORE_ORDER,
  VIBE_ORDER,
  vectorToPgLiteral,
} from '../embedding-builder';

describe('EMBEDDING_BUILDER_METADATA', () => {
  it('suma 64 dim total (32+15+10+7)', () => {
    expect(EMBEDDING_BUILDER_METADATA.total_dim).toBe(EMBEDDING_DIM);
    expect(
      EMBEDDING_BUILDER_METADATA.n0_dim +
        EMBEDDING_BUILDER_METADATA.dmx_dim +
        EMBEDDING_BUILDER_METADATA.vibe_dim +
        EMBEDDING_BUILDER_METADATA.geo_dim,
    ).toBe(EMBEDDING_DIM);
  });

  it('catálogos canónicos cumplen tamaños', () => {
    expect(N0_SCORE_ORDER).toHaveLength(32);
    expect(DMX_INDEX_ORDER).toHaveLength(15);
    expect(VIBE_ORDER).toHaveLength(10);
    expect(GEO_FEATURES).toHaveLength(7);
  });
});

describe('buildEmbeddingVector', () => {
  const emptyInput = {
    coloniaId: 'test',
    countryCode: 'MX',
    scores: new Map<string, number>(),
    dmxIndices: new Map<string, number>(),
    vibeTags: new Map<
      | 'walkability'
      | 'quiet'
      | 'nightlife'
      | 'family'
      | 'foodie'
      | 'green'
      | 'bohemian'
      | 'corporate'
      | 'safety_perceived'
      | 'gentrifying',
      number
    >(),
    geo: {
      lat: null,
      lng: null,
      elevation: null,
      distance_centro_km: null,
      distance_coast_km: null,
      distance_airport_km: null,
      area_km2: null,
    },
  };

  it('retorna vector de 64 dim exactamente', () => {
    const { vector } = buildEmbeddingVector(emptyInput);
    expect(vector).toHaveLength(EMBEDDING_DIM);
  });

  it('features_version = v1_h1 + dim = 64', () => {
    const { components } = buildEmbeddingVector(emptyInput);
    expect(components.features_version).toBe('v1_h1');
    expect(components.dim).toBe(64);
  });

  it('todas las dimensiones quedan en [0, 1]', () => {
    const { vector } = buildEmbeddingVector({
      ...emptyInput,
      scores: new Map([
        ['F01', 100],
        ['F02', 0],
      ]),
      dmxIndices: new Map([['DMX-LIV', 100]]),
      vibeTags: new Map([['walkability', 100]]),
    });
    for (const v of vector) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('data completa vs data parcial produce vectores diferentes', () => {
    const partial = buildEmbeddingVector({
      ...emptyInput,
      scores: new Map([['F01', 80]]),
    });
    const full = buildEmbeddingVector({
      ...emptyInput,
      scores: new Map([
        ['F01', 80],
        ['F02', 70],
      ]),
    });
    expect(partial.vector).not.toEqual(full.vector);
  });

  it('es determinística: mismo input → mismo vector', () => {
    const input = {
      ...emptyInput,
      scores: new Map([['F01', 75]]),
      dmxIndices: new Map([['DMX-LIV', 60]]),
    };
    const a = buildEmbeddingVector(input);
    const b = buildEmbeddingVector(input);
    expect(a.vector).toEqual(b.vector);
  });

  it('breakdown tiene tamaños esperados', () => {
    const { components } = buildEmbeddingVector(emptyInput);
    expect(components.breakdown.scores_n0_n3).toHaveLength(32);
    expect(components.breakdown.dmx_indices).toHaveLength(15);
    expect(components.breakdown.vibe_tags).toHaveLength(10);
    expect(components.breakdown.geo).toHaveLength(7);
  });
});

describe('vectorToPgLiteral', () => {
  it('serializa vector a formato [a,b,c]', () => {
    expect(vectorToPgLiteral([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
  });

  it('reemplaza no-finitos por 0', () => {
    expect(vectorToPgLiteral([0.5, Number.NaN, Number.POSITIVE_INFINITY])).toBe('[0.5,0,0]');
  });
});
