import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../migration', () => ({
  aggregateFlowsForCDMXColonias: vi.fn(),
}));

import { aggregateFlowsForCDMXColonias } from '../../migration';
import { calculateAllMigrationFlowsForCDMXColonias } from '../orchestrator';

const PERIOD = '2026-04-01';

const aggregateMock = aggregateFlowsForCDMXColonias as unknown as ReturnType<typeof vi.fn>;

const supabase = {} as SupabaseClient;

describe('calculateAllMigrationFlowsForCDMXColonias', () => {
  beforeEach(() => {
    aggregateMock.mockReset();
  });

  it('delega y mapea summary correctamente', async () => {
    aggregateMock.mockResolvedValue({
      scopes_processed: 3,
      flows_upserted: 5,
      failures: 0,
      sources_real: ['rpp'],
      sources_stub: ['inegi', 'ine', 'linkedin'],
      duration_ms: 42,
    });

    const out = await calculateAllMigrationFlowsForCDMXColonias({
      periodDate: PERIOD,
      supabase,
    });

    expect(out.scopes_processed).toBe(3);
    expect(out.flows_upserted).toBe(5);
    expect(out.failures).toBe(0);
    expect(out.duration_ms).toBe(42);
    expect(out.sources_real).toEqual(['rpp']);
    expect(out.sources_stub).toEqual(['inegi', 'ine', 'linkedin']);
    expect(aggregateMock).toHaveBeenCalledTimes(1);
    const call = aggregateMock.mock.calls[0]?.[0] as {
      readonly periodDate: string;
      readonly supabase: SupabaseClient;
      readonly zoneIds?: readonly string[];
      readonly scopeType?: string;
      readonly chunkSize?: number;
    };
    expect(call.periodDate).toBe(PERIOD);
    expect(call.supabase).toBe(supabase);
    expect(call.zoneIds).toBeUndefined();
    expect(call.scopeType).toBeUndefined();
    expect(call.chunkSize).toBeUndefined();
  });

  it('pass-through de zoneIds, scopeType y chunkSize', async () => {
    aggregateMock.mockResolvedValue({
      scopes_processed: 2,
      flows_upserted: 4,
      failures: 1,
      sources_real: ['rpp'],
      sources_stub: [],
      duration_ms: 10,
    });

    const zoneIds = ['z1', 'z2'] as const;
    const out = await calculateAllMigrationFlowsForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      zoneIds,
      scopeType: 'alcaldia',
      chunkSize: 25,
    });

    expect(out.scopes_processed).toBe(2);
    expect(out.flows_upserted).toBe(4);
    expect(out.failures).toBe(1);
    expect(aggregateMock).toHaveBeenCalledTimes(1);
    const call = aggregateMock.mock.calls[0]?.[0] as {
      readonly periodDate: string;
      readonly zoneIds?: readonly string[];
      readonly scopeType?: string;
      readonly chunkSize?: number;
    };
    expect(call.zoneIds).toEqual(['z1', 'z2']);
    expect(call.scopeType).toBe('alcaldia');
    expect(call.chunkSize).toBe(25);
  });
});
