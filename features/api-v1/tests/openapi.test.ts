import { describe, expect, it } from 'vitest';
import { buildOpenApiSpec } from '../lib/openapi';

describe('buildOpenApiSpec', () => {
  it('returns a 3.1.0 spec with info + version', () => {
    const spec = buildOpenApiSpec();
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.info.title).toContain('DesarrollosMX');
    expect(spec.info.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('declares at least 8 paths (all 11.L endpoints)', () => {
    const spec = buildOpenApiSpec();
    const paths = Object.keys(spec.paths);
    expect(paths.length).toBeGreaterThanOrEqual(8);
    expect(paths).toContain('/scores/history');
    expect(paths).toContain('/indices/{code}');
    expect(paths).toContain('/indices/{code}/{scope}/{id}');
    expect(paths).toContain('/colonias/{id}');
    expect(paths).toContain('/similar/{coloniaId}');
    expect(paths).toContain('/keys/create');
    expect(paths).toContain('/keys/list');
    expect(paths).toContain('/keys/revoke');
  });

  it('declares ApiKeyAuth + SessionAuth security schemes', () => {
    const spec = buildOpenApiSpec();
    const s = spec.components.securitySchemes as Record<string, unknown>;
    expect(s.ApiKeyAuth).toBeDefined();
    expect(s.SessionAuth).toBeDefined();
  });

  it('declares all required component schemas', () => {
    const spec = buildOpenApiSpec();
    const schemas = spec.components.schemas as Record<string, unknown>;
    for (const key of [
      'ApiError',
      'RateLimit',
      'Tier',
      'ScopeType',
      'IndexCode',
      'HistoryItem',
      'HistoryData',
      'IndicesRankingData',
      'IndicesDetailData',
      'ColoniaProfileData',
      'SimilarColoniaData',
      'CreateKeyData',
      'ListKeysData',
      'RevokeKeyData',
    ]) {
      expect(schemas[key], `missing schema ${key}`).toBeDefined();
    }
  });

  it('serializes to JSON without throwing', () => {
    const spec = buildOpenApiSpec();
    expect(() => JSON.stringify(spec)).not.toThrow();
  });
});
