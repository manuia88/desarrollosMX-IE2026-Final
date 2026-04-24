import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}));

vi.mock('@/shared/lib/security/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/security/rate-limit')>(
    '@/shared/lib/security/rate-limit',
  );
  return {
    ...actual,
    checkRateLimit: vi.fn(async () => ({ allowed: true })),
  };
});

describe('constellationsRouter — module export smoke', () => {
  it('exports constellationsRouter with expected procedures', async () => {
    const mod = await import('../routes/constellations');
    expect(mod.constellationsRouter).toBeDefined();
    const record = mod.constellationsRouter as unknown as Record<string, unknown>;
    expect(record.getEdges).toBeDefined();
    expect(record.getClusters).toBeDefined();
    expect(record.findPath).toBeDefined();
    expect(record.getContagionPaths).toBeDefined();
  });
});

describe('constellations schemas — input validation', () => {
  it('getEdgesInputSchema applies defaults', async () => {
    const { getEdgesInputSchema } = await import('../schemas/constellation');
    const parsed = getEdgesInputSchema.parse({
      coloniaId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    });
    expect(parsed.minWeight).toBe(30);
    expect(parsed.limit).toBe(50);
    expect(parsed.countryCode).toBe('MX');
  });

  it('getEdgesInputSchema rejects malformed uuid', async () => {
    const { getEdgesInputSchema } = await import('../schemas/constellation');
    expect(() => getEdgesInputSchema.parse({ coloniaId: 'not-a-uuid' })).toThrow();
  });

  it('findPathInputSchema defaults maxHops=5', async () => {
    const { findPathInputSchema } = await import('../schemas/constellation');
    const parsed = findPathInputSchema.parse({
      sourceColoniaId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      targetColoniaId: '11111111-2222-4333-8444-555555555555',
    });
    expect(parsed.maxHops).toBe(5);
    expect(parsed.countryCode).toBe('MX');
  });

  it('findPathInputSchema rechaza maxHops fuera de rango', async () => {
    const { findPathInputSchema } = await import('../schemas/constellation');
    expect(() =>
      findPathInputSchema.parse({
        sourceColoniaId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        targetColoniaId: '11111111-2222-4333-8444-555555555555',
        maxHops: 20,
      }),
    ).toThrow();
  });

  it('getContagionPathsInputSchema defaults topN=5', async () => {
    const { getContagionPathsInputSchema } = await import('../schemas/constellation');
    const parsed = getContagionPathsInputSchema.parse({});
    expect(parsed.topN).toBe(5);
  });

  it('edgeTypeKeySchema acepta los 4 tipos', async () => {
    const { edgeTypeKeySchema } = await import('../schemas/constellation');
    expect(edgeTypeKeySchema.parse('migration')).toBe('migration');
    expect(edgeTypeKeySchema.parse('climate_twin')).toBe('climate_twin');
    expect(edgeTypeKeySchema.parse('genoma_similarity')).toBe('genoma_similarity');
    expect(edgeTypeKeySchema.parse('pulse_correlation')).toBe('pulse_correlation');
    expect(() => edgeTypeKeySchema.parse('invalid')).toThrow();
  });

  it('constellationEdgeSchema valida objeto completo', async () => {
    const { constellationEdgeSchema } = await import('../schemas/constellation');
    const parsed = constellationEdgeSchema.parse({
      source_colonia_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      target_colonia_id: '11111111-2222-4333-8444-555555555555',
      target_label: 'Roma Norte',
      edge_weight: 72.5,
      edge_types: {
        migration: 80,
        climate_twin: 60,
        genoma_similarity: 75,
        pulse_correlation: 65,
      },
      period_date: '2026-04-01',
    });
    expect(parsed.edge_weight).toBe(72.5);
  });
});
