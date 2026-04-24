import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../shared/types/database.ts';

const { runScoreMock } = vi.hoisted(() => ({ runScoreMock: vi.fn() }));

vi.mock('../../../shared/lib/intelligence-engine/calculators/run-score.ts', () => ({
  runScore: runScoreMock,
  registerCalculator: vi.fn(),
}));

vi.mock('../../../shared/lib/intelligence-engine/calculators/n2/index.ts', () => ({
  registerN2Calculators: vi.fn(),
}));

import {
  computePeriodDate,
  filterTargetScores,
  processBatch,
  type ZoneRow,
} from '../03_compute-n2.ts';

function fakeSupabase(): SupabaseClient<Database> {
  return {} as SupabaseClient<Database>;
}

beforeEach(() => {
  runScoreMock.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('compute-n2 — filterTargetScores', () => {
  it('selecciona sólo level=2 + category=zona + country includes MX', () => {
    const entries = filterTargetScores('MX');
    const ids = entries.map((e) => e.score_id).sort();
    expect(ids).toEqual(['F09', 'F10']);
    for (const e of entries) {
      expect(e.level).toBe(2);
      expect(e.category).toBe('zona');
      expect(e.country_codes.includes('MX')).toBe(true);
    }
  });
});

describe('compute-n2 — computePeriodDate', () => {
  it('formato YYYY-MM-01', () => {
    expect(computePeriodDate(new Date(Date.UTC(2026, 3, 24)))).toBe('2026-04-01');
    expect(computePeriodDate(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01');
    expect(computePeriodDate(new Date(Date.UTC(2025, 11, 31)))).toBe('2025-12-01');
  });
});

describe('compute-n2 — processBatch counts', () => {
  const zones: ZoneRow[] = [
    { id: 'z1', scope_id: 'roma-norte' },
    { id: 'z2', scope_id: 'condesa' },
  ];
  const targets = filterTargetScores('MX');

  it("'ok' → updated++; 'gated'/'tenant_violation' → skipped++; 'error'/throw → dlq++", async () => {
    runScoreMock
      .mockResolvedValueOnce({ kind: 'ok' })
      .mockResolvedValueOnce({ kind: 'gated' })
      .mockResolvedValueOnce({ kind: 'error', error: 'boom' })
      .mockRejectedValueOnce(new Error('thrown'));
    const counts = await processBatch(zones, targets, fakeSupabase(), '2026-04-01', 'MX');
    expect(counts).toEqual({ inserted: 0, updated: 1, skipped: 1, dlq: 2 });
    expect(runScoreMock).toHaveBeenCalledTimes(4);
  });

  it("'tenant_violation' suma skipped", async () => {
    runScoreMock.mockResolvedValue({ kind: 'tenant_violation' });
    const counts = await processBatch(
      zones.slice(0, 1),
      targets,
      fakeSupabase(),
      '2026-04-01',
      'MX',
    );
    expect(counts.skipped).toBe(2);
    expect(counts.updated).toBe(0);
    expect(counts.dlq).toBe(0);
  });

  it('no zones o no targets → sin invocaciones runScore', async () => {
    runScoreMock.mockResolvedValue({ kind: 'ok' });
    const c1 = await processBatch([], targets, fakeSupabase(), '2026-04-01', 'MX');
    const c2 = await processBatch(zones, [], fakeSupabase(), '2026-04-01', 'MX');
    expect(c1).toEqual({ inserted: 0, updated: 0, skipped: 0, dlq: 0 });
    expect(c2).toEqual({ inserted: 0, updated: 0, skipped: 0, dlq: 0 });
    expect(runScoreMock).not.toHaveBeenCalled();
  });
});
