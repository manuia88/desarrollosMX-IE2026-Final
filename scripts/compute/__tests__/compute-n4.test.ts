import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../shared/types/database.ts';

const { runScoreMock } = vi.hoisted(() => ({ runScoreMock: vi.fn() }));

vi.mock('../../../shared/lib/intelligence-engine/calculators/run-score.ts', () => ({
  runScore: runScoreMock,
  registerCalculator: vi.fn(),
}));

vi.mock('../../../shared/lib/intelligence-engine/calculators/n4/index.ts', () => ({
  registerN4Calculators: vi.fn(),
}));

import {
  computePeriodDate,
  filterTargetScores,
  processBatch,
  type ZoneRow,
} from '../05_compute-n4.ts';

function fakeSupabase(): SupabaseClient<Database> {
  return {} as SupabaseClient<Database>;
}

beforeEach(() => {
  runScoreMock.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('compute-n4 — filterTargetScores', () => {
  it('selecciona sólo level=4 + category=zona + country includes MX', () => {
    const entries = filterTargetScores('MX');
    const ids = entries.map((e) => e.score_id).sort();
    expect(ids).toEqual(['D02', 'D09']);
    for (const e of entries) {
      expect(e.level).toBe(4);
      expect(e.category).toBe('zona');
      expect(e.country_codes.includes('MX')).toBe(true);
    }
  });
});

describe('compute-n4 — computePeriodDate', () => {
  it('formato YYYY-MM-01', () => {
    expect(computePeriodDate(new Date(Date.UTC(2026, 3, 24)))).toBe('2026-04-01');
    expect(computePeriodDate(new Date(Date.UTC(2027, 6, 15)))).toBe('2027-07-01');
  });
});

describe('compute-n4 — processBatch counts', () => {
  const zones: ZoneRow[] = [
    { id: 'z1', scope_id: 'roma-norte' },
    { id: 'z2', scope_id: 'condesa' },
  ];
  const targets = filterTargetScores('MX');

  it("'ok' → updated++; 'gated' → skipped++; 'error' → dlq++; throw → dlq++", async () => {
    runScoreMock
      .mockResolvedValueOnce({ kind: 'ok' })
      .mockResolvedValueOnce({ kind: 'gated' })
      .mockResolvedValueOnce({ kind: 'error', error: 'x' })
      .mockRejectedValueOnce(new Error('y'));
    const counts = await processBatch(zones, targets, fakeSupabase(), '2026-04-01', 'MX');
    expect(counts).toEqual({ inserted: 0, updated: 1, skipped: 1, dlq: 2 });
    expect(runScoreMock).toHaveBeenCalledTimes(4);
  });

  it('todos ok → updated = zones.length * targets.length', async () => {
    runScoreMock.mockResolvedValue({ kind: 'ok' });
    const counts = await processBatch(zones, targets, fakeSupabase(), '2026-04-01', 'MX');
    expect(counts.updated).toBe(zones.length * targets.length);
    expect(counts.dlq).toBe(0);
    expect(counts.skipped).toBe(0);
  });

  it('runScore recibe shape correcto {zoneId, countryCode, periodDate} + options skip*', async () => {
    runScoreMock.mockResolvedValue({ kind: 'ok' });
    await processBatch(zones.slice(0, 1), targets.slice(0, 1), fakeSupabase(), '2026-04-01', 'MX');
    const call = runScoreMock.mock.calls[0];
    expect(call?.[1]).toEqual({ zoneId: 'z1', countryCode: 'MX', periodDate: '2026-04-01' });
    expect(call?.[3]).toEqual({ skipEnqueueCascade: true, skipAnomalyCheck: true });
  });
});
