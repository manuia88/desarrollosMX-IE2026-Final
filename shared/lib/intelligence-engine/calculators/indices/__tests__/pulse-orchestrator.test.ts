import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../pulse', () => ({
  runPulseScoreForScope: vi.fn(),
}));

import { runPulseScoreForScope } from '../../pulse';
import { calculateAllPulseForCDMXColonias } from '../orchestrator';

const PERIOD = '2026-04-01';

function buildThenable<T>(data: T[]): Record<string, unknown> {
  const result = { data, error: null, count: data.length };
  const qb: Record<string, unknown> = {};
  const self = () => qb;
  qb.select = self;
  qb.eq = self;
  qb.in = self;
  qb.lt = self;
  qb.gte = self;
  qb.lte = self;
  qb.neq = self;
  qb.gt = self;
  qb.order = self;
  qb.limit = self;
  // biome-ignore lint/suspicious/noThenProperty: supabase-js query builder es thenable por diseño.
  qb.then = (onFulfilled: (v: { data: T[]; error: null; count: number }) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  qb.catch = (onRejected: (r: unknown) => unknown) => Promise.resolve(result).catch(onRejected);
  return qb;
}

function mockSupabase(handlers?: {
  readonly zonaSnapshotRows?: Array<{ zone_id: string }>;
}): SupabaseClient {
  const from = vi.fn((table: string) => {
    if (table === 'zona_snapshots') {
      return buildThenable(handlers?.zonaSnapshotRows ?? []);
    }
    return buildThenable([]);
  });
  return { from } as unknown as SupabaseClient;
}

const runPulseMock = runPulseScoreForScope as unknown as ReturnType<typeof vi.fn>;

describe('calculateAllPulseForCDMXColonias', () => {
  beforeEach(() => {
    runPulseMock.mockReset();
  });

  it('3 zones todos ok → pulse_computed=3, failures=0', async () => {
    runPulseMock.mockImplementation(async ({ scopeId }: { readonly scopeId: string }) => ({
      ok: true,
      scopeId,
      value: 72,
      confidence: 'high' as const,
    }));
    const supabase = mockSupabase();
    const out = await calculateAllPulseForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      zoneIds: ['z1', 'z2', 'z3'],
    });
    expect(out.zones_processed).toBe(3);
    expect(out.pulse_computed).toBe(3);
    expect(out.failures).toBe(0);
    expect(runPulseMock).toHaveBeenCalledTimes(3);
    const firstCall = runPulseMock.mock.calls[0]?.[0] as {
      readonly scopeType: string;
      readonly countryCode: string;
      readonly periodDate: string;
    };
    expect(firstCall.scopeType).toBe('colonia');
    expect(firstCall.countryCode).toBe('MX');
    expect(firstCall.periodDate).toBe(PERIOD);
  });

  it('1 ok + 1 fail → pulse_computed=1, failures=1', async () => {
    runPulseMock.mockImplementation(async ({ scopeId }: { readonly scopeId: string }) => {
      if (scopeId === 'z-fail') {
        return { ok: false, scopeId, error: 'insufficient_data' };
      }
      return { ok: true, scopeId, value: 80, confidence: 'high' as const };
    });
    const supabase = mockSupabase();
    const out = await calculateAllPulseForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      zoneIds: ['z-ok', 'z-fail'],
    });
    expect(out.zones_processed).toBe(2);
    expect(out.pulse_computed).toBe(1);
    expect(out.failures).toBe(1);
    expect(runPulseMock).toHaveBeenCalledTimes(2);
  });

  it('zoneIds ausente + discover vacío → summary con 0s', async () => {
    const supabase = mockSupabase({ zonaSnapshotRows: [] });
    const out = await calculateAllPulseForCDMXColonias({
      periodDate: PERIOD,
      supabase,
    });
    expect(out.zones_processed).toBe(0);
    expect(out.pulse_computed).toBe(0);
    expect(out.failures).toBe(0);
    expect(runPulseMock).not.toHaveBeenCalled();
  });
});
