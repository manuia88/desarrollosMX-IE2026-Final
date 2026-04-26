import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { loadDesarrollos } = await import('../lib/desarrollos-loader');
const { filtersSchema } = await import('../lib/filter-schemas');

describe('loadDesarrollos (STUB ADR-018 — activar FASE 15 M11)', () => {
  it('returns empty projects array honestly until FASE 15', async () => {
    const filters = filtersSchema.parse({ tab: 'own' });
    const result = await loadDesarrollos(filters, 'asesor-id-1');
    expect(result.projects).toEqual([]);
    expect(result.tabCounts).toEqual({ own: 0, exclusive: 0, dmx: 0, mls: 0 });
    expect(result.nextCursor).toBeNull();
    expect(result.isStub).toBe(true);
    expect(result.reason).toMatch(/FASE 15 M11/);
  });

  it('preserves asesorId in result for downstream consumers', async () => {
    const filters = filtersSchema.parse({ tab: 'dmx' });
    const result = await loadDesarrollos(filters, 'user-abc');
    expect(result.asesorId).toBe('user-abc');
  });

  it('handles null asesorId gracefully', async () => {
    const filters = filtersSchema.parse({ tab: 'mls' });
    const result = await loadDesarrollos(filters, null);
    expect(result.asesorId).toBeNull();
    expect(result.projects).toEqual([]);
  });
});
