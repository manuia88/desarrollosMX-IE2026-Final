import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../../shared/types/database.ts';

const { runScoreMock } = vi.hoisted(() => ({ runScoreMock: vi.fn() }));

vi.mock('../../../shared/lib/intelligence-engine/calculators/run-score.ts', () => ({
  runScore: runScoreMock,
  registerCalculator: vi.fn(),
}));

vi.mock('../../../shared/lib/intelligence-engine/calculators/n3/index.ts', () => ({
  registerN3Calculators: vi.fn(),
}));

import {
  computePeriodDate,
  filterTargetScores,
  processBatch,
  type ZoneRow,
} from '../04_compute-n3.ts';

function fakeSupabase(): SupabaseClient<Database> {
  return {} as SupabaseClient<Database>;
}

beforeEach(() => {
  runScoreMock.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('compute-n3 — filterTargetScores (H1: 0 zona-level entries en registry)', () => {
  it('retorna array vacío (registry H1 no declara N3 zona)', () => {
    const entries = filterTargetScores('MX');
    expect(entries.length).toBe(0);
  });
});

describe('compute-n3 — computePeriodDate', () => {
  it('formato YYYY-MM-01', () => {
    expect(computePeriodDate(new Date(Date.UTC(2026, 3, 24)))).toBe('2026-04-01');
    expect(computePeriodDate(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01');
  });
});

describe('compute-n3 — processBatch counts (zero-scores path)', () => {
  const zones: ZoneRow[] = [{ id: 'z1', scope_id: 'roma-norte' }];

  it('targets vacíos → no invoca runScore, devuelve counts a cero', async () => {
    runScoreMock.mockResolvedValue({ kind: 'ok' });
    const counts = await processBatch(zones, [], fakeSupabase(), '2026-04-01', 'MX');
    expect(counts).toEqual({ inserted: 0, updated: 0, skipped: 0, dlq: 0 });
    expect(runScoreMock).not.toHaveBeenCalled();
  });

  it('zones vacías → no invoca runScore', async () => {
    runScoreMock.mockResolvedValue({ kind: 'ok' });
    const counts = await processBatch([], [], fakeSupabase(), '2026-04-01', 'MX');
    expect(counts).toEqual({ inserted: 0, updated: 0, skipped: 0, dlq: 0 });
    expect(runScoreMock).not.toHaveBeenCalled();
  });

  it('count rules defensivas siguen funcionando si registry agrega N3 zona en el futuro', async () => {
    const fakeTarget = {
      score_id: 'X99',
      name: 'fake',
      level: 3,
      category: 'zona',
      tier: 1,
      dependencies: [],
      triggers_cascade: [],
      formula_doc: '',
      confidence_sources: [],
      calculator_path: '',
      country_codes: ['MX'],
    } as const;
    runScoreMock.mockResolvedValueOnce({ kind: 'ok' }).mockRejectedValueOnce(new Error('x'));
    const counts = await processBatch(
      [...zones, { id: 'z2', scope_id: 's2' }],
      [fakeTarget],
      fakeSupabase(),
      '2026-04-01',
      'MX',
    );
    expect(counts).toEqual({ inserted: 0, updated: 1, skipped: 0, dlq: 1 });
  });
});
