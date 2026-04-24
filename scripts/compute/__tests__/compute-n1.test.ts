import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../shared/types/database.ts';

vi.mock('../../../shared/lib/intelligence-engine/calculators/run-score.ts', () => ({
  runScore: vi.fn(),
}));
vi.mock('../../../shared/lib/intelligence-engine/calculators/n1/index.ts', () => ({
  registerN1Calculators: vi.fn(),
}));

import { runScore } from '../../../shared/lib/intelligence-engine/calculators/run-score.ts';
import {
  type ComputeZoneRow,
  computePeriodDate,
  filterRegistry,
  processBatch,
} from '../02_compute-n1.ts';

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

describe('computePeriodDate (N1)', () => {
  it('retorna YYYY-MM-01 en UTC', () => {
    const d = new Date(Date.UTC(2026, 11, 3));
    expect(computePeriodDate(d)).toBe('2026-12-01');
  });

  it('formato para `new Date()` default', () => {
    expect(computePeriodDate()).toMatch(/^\d{4}-\d{2}-01$/);
  });
});

describe('filterRegistry — N1 zona MX', () => {
  it('selecciona >0 scores para level=1 category=zona country=MX', () => {
    const scores = filterRegistry(1, 'MX');
    expect(scores.length).toBeGreaterThan(0);
    for (const s of scores) {
      expect(s.level).toBe(1);
      expect(s.category).toBe('zona');
      expect(s.country_codes).toContain('MX');
    }
  });

  it('level sin scores zona produce lista vacía', () => {
    expect(filterRegistry(1, 'ZZ').length).toBe(0);
  });
});

describe('processBatch (N1) — counts semantics', () => {
  it('kind=ok incrementa updated por cada (zone × score)', async () => {
    runScoreMock.mockResolvedValue({ kind: 'ok', output: {}, registry: {}, persisted: true });
    const zones = [makeZone(1), makeZone(2)];
    const scores = filterRegistry(1, 'MX').slice(0, 2);
    const counts = await processBatch(zones, scores, fakeSupabase(), '2026-04-01', 'MX');
    expect(counts.updated).toBe(zones.length * scores.length);
    expect(counts.skipped).toBe(0);
    expect(counts.dlq).toBe(0);
  });

  it('mezcla ok + gated + error calcula counts correctos', async () => {
    runScoreMock
      .mockResolvedValueOnce({ kind: 'ok', output: {}, registry: {}, persisted: true })
      .mockResolvedValueOnce({ kind: 'gated', gate: {}, registry: {} })
      .mockResolvedValueOnce({ kind: 'error', error: 'x' });
    const zones = [makeZone(1)];
    const scores = filterRegistry(1, 'MX').slice(0, 3);
    if (scores.length < 3) return;
    const counts = await processBatch(zones, scores, fakeSupabase(), '2026-04-01', 'MX');
    expect(counts.updated).toBe(1);
    expect(counts.skipped).toBe(1);
    expect(counts.dlq).toBe(1);
  });

  it('throws en runScore → dlq', async () => {
    runScoreMock.mockRejectedValue(new Error('timeout'));
    const zones = [makeZone(1)];
    const scores = filterRegistry(1, 'MX').slice(0, 1);
    const counts = await processBatch(zones, scores, fakeSupabase(), '2026-04-01', 'MX');
    expect(counts.dlq).toBe(1);
  });

  it('invoca runScore con zoneId + periodDate correctos', async () => {
    runScoreMock.mockResolvedValue({ kind: 'ok', output: {}, registry: {}, persisted: true });
    const zones = [makeZone(42)];
    const scores = filterRegistry(1, 'MX').slice(0, 1);
    await processBatch(zones, scores, fakeSupabase(), '2026-04-01', 'MX');
    const call = runScoreMock.mock.calls[0];
    expect(call?.[1]).toEqual({ zoneId: 'zone-42', countryCode: 'MX', periodDate: '2026-04-01' });
  });
});
