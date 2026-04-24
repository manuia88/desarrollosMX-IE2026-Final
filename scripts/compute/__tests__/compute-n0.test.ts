import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../shared/types/database.ts';

// Mocks deben declararse ANTES de importar el módulo bajo test.
vi.mock('../../../shared/lib/intelligence-engine/calculators/run-score.ts', () => ({
  runScore: vi.fn(),
}));
vi.mock('../../../shared/lib/intelligence-engine/calculators/n0/index.ts', () => ({
  registerN0Calculators: vi.fn(),
}));
vi.mock('../../../shared/lib/intelligence-engine/calculators/n01-n11/index.ts', () => ({
  registerN01ToN11Calculators: vi.fn(),
}));

import { runScore } from '../../../shared/lib/intelligence-engine/calculators/run-score.ts';
import {
  type ComputeZoneRow,
  computePeriodDate,
  filterRegistry,
  processBatch,
} from '../01_compute-n0.ts';

const runScoreMock = runScore as unknown as ReturnType<typeof vi.fn>;

function fakeSupabase(): SupabaseClient<Database> {
  return {} as unknown as SupabaseClient<Database>;
}

function makeZone(n: number): ComputeZoneRow {
  return {
    id: `zone-${n}`,
    scope_id: `scope-${n}`,
    scope_type: 'colonia',
    country_code: 'MX',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('computePeriodDate', () => {
  it('retorna YYYY-MM-01 en UTC', () => {
    const d = new Date(Date.UTC(2026, 3, 24));
    expect(computePeriodDate(d)).toBe('2026-04-01');
  });

  it('padding de mes con zero-pad para enero', () => {
    const d = new Date(Date.UTC(2026, 0, 15));
    expect(computePeriodDate(d)).toBe('2026-01-01');
  });

  it('formato YYYY-MM-01 para `new Date()` default', () => {
    expect(computePeriodDate()).toMatch(/^\d{4}-\d{2}-01$/);
  });
});

describe('filterRegistry — N0 zona MX', () => {
  it('selecciona >0 scores para level=0 category=zona country=MX', () => {
    const scores = filterRegistry(0, 'MX');
    expect(scores.length).toBeGreaterThan(0);
    for (const s of scores) {
      expect(s.level).toBe(0);
      expect(s.category).toBe('zona');
      expect(s.country_codes).toContain('MX');
    }
  });

  it('country desconocido produce lista vacía', () => {
    expect(filterRegistry(0, 'ZZ').length).toBe(0);
  });
});

describe('processBatch — counts semantics', () => {
  it('kind=ok incrementa updated', async () => {
    runScoreMock.mockResolvedValue({ kind: 'ok', output: {}, registry: {}, persisted: true });
    const zones = [makeZone(1)];
    const scores = filterRegistry(0, 'MX').slice(0, 2);
    const counts = await processBatch(zones, scores, fakeSupabase(), '2026-04-01', 'MX');
    expect(counts.updated).toBe(scores.length);
    expect(counts.skipped).toBe(0);
    expect(counts.dlq).toBe(0);
  });

  it('kind=gated y kind=tenant_violation incrementan skipped', async () => {
    runScoreMock
      .mockResolvedValueOnce({ kind: 'gated', gate: {}, registry: {} })
      .mockResolvedValueOnce({ kind: 'tenant_violation', violation: {}, registry: {} });
    const zones = [makeZone(1)];
    const scores = filterRegistry(0, 'MX').slice(0, 2);
    const counts = await processBatch(zones, scores, fakeSupabase(), '2026-04-01', 'MX');
    expect(counts.skipped).toBe(2);
    expect(counts.updated).toBe(0);
    expect(counts.dlq).toBe(0);
  });

  it('kind=error incrementa dlq', async () => {
    runScoreMock.mockResolvedValue({ kind: 'error', error: 'boom' });
    const zones = [makeZone(1)];
    const scores = filterRegistry(0, 'MX').slice(0, 1);
    const counts = await processBatch(zones, scores, fakeSupabase(), '2026-04-01', 'MX');
    expect(counts.dlq).toBe(1);
    expect(counts.updated).toBe(0);
  });

  it('throws en runScore → dlq', async () => {
    runScoreMock.mockRejectedValue(new Error('network'));
    const zones = [makeZone(1)];
    const scores = filterRegistry(0, 'MX').slice(0, 1);
    const counts = await processBatch(zones, scores, fakeSupabase(), '2026-04-01', 'MX');
    expect(counts.dlq).toBe(1);
  });

  it('pasa skipEnqueueCascade + skipAnomalyCheck a runScore', async () => {
    runScoreMock.mockResolvedValue({ kind: 'ok', output: {}, registry: {}, persisted: true });
    const zones = [makeZone(1)];
    const scores = filterRegistry(0, 'MX').slice(0, 1);
    await processBatch(zones, scores, fakeSupabase(), '2026-04-01', 'MX');
    const lastCall = runScoreMock.mock.calls.at(-1);
    expect(lastCall?.[3]).toEqual({ skipEnqueueCascade: true, skipAnomalyCheck: true });
  });
});
