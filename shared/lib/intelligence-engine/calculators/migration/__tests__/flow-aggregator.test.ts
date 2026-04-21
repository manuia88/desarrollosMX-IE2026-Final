// Tests para flow-aggregator.ts — BLOQUE 11.G sub-agent A.

import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { MigrationFlowSignal } from '@/features/migration-flow/types';
import { aggregateFlowsForCDMXColonias } from '../flow-aggregator';

const PERIOD = '2026-04-01';

interface CapturedUpsert {
  readonly rows: ReadonlyArray<Record<string, unknown>>;
  readonly options: Record<string, unknown> | undefined;
}

function mockSupabase(captured: CapturedUpsert[]): SupabaseClient {
  const decileChain = {
    select() {
      return this;
    },
    in() {
      return this;
    },
    lte() {
      return this;
    },
    limit() {
      // Return empty — decile lookup falls back to null.
      return Promise.resolve({ data: [], error: null });
    },
  };

  const flowsTable = {
    upsert(rows: ReadonlyArray<Record<string, unknown>>, options?: Record<string, unknown>) {
      captured.push({ rows, options });
      return Promise.resolve({ data: null, error: null });
    },
  };

  return {
    from(table: string) {
      if (table === 'zone_migration_flows') return flowsTable;
      return decileChain;
    },
  } as unknown as SupabaseClient;
}

function signal(
  origin: string,
  dest: string,
  volume: number,
  source: MigrationFlowSignal['source'],
  confidence: number,
): MigrationFlowSignal {
  return {
    origin_scope_type: 'colonia',
    origin_scope_id: origin,
    dest_scope_type: 'colonia',
    dest_scope_id: dest,
    volume,
    confidence,
    source,
  };
}

describe('aggregateFlowsForCDMXColonias', () => {
  it('merges signals from multiple sources for same pair → 1 flow with weighted confidence', async () => {
    // Para zone-A: 3 signals de distintas fuentes misma tupla A→B.
    // Para zone-B: mismo conjunto (adapters se corren origen O destino = focus).
    const fetchSignals = vi.fn(async () => ({
      signals: [
        signal('zone-A', 'zone-B', 10, 'rpp', 0.35),
        signal('zone-A', 'zone-B', 5, 'inegi', 0.2),
        signal('zone-A', 'zone-B', 5, 'ine', 0.1),
      ] as readonly MigrationFlowSignal[],
      limitations: [] as readonly string[],
      sources_real: ['rpp'] as const,
      sources_stub: ['inegi', 'ine', 'linkedin'] as const,
    }));

    const captured: CapturedUpsert[] = [];
    const supabase = mockSupabase(captured);
    const summary = await aggregateFlowsForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      zoneIds: ['zone-A'],
      fetchSignals,
    });

    expect(summary.scopes_processed).toBe(1);
    expect(summary.flows_upserted).toBe(1);
    expect(summary.failures).toBe(0);
    expect(summary.sources_real).toEqual(['rpp']);
    expect(summary.sources_stub).toEqual(['inegi', 'ine', 'linkedin']);

    expect(captured).toHaveLength(1);
    const captureFirst = captured[0];
    expect(captureFirst).toBeDefined();
    expect(captureFirst?.rows).toHaveLength(1);
    const row = captureFirst?.rows[0] as Record<string, unknown>;
    expect(row).toBeDefined();
    expect(row.origin_scope_id).toBe('zone-A');
    expect(row.dest_scope_id).toBe('zone-B');
    expect(row.volume).toBe(20);
    // confidence = 100 * (10*0.35 + 5*0.2 + 5*0.1) / 20 = 100 * (3.5+1.0+0.5)/20 = 25
    expect(row.confidence).toBe(25);
    expect(row.source_mix).toEqual({ rpp: 10, inegi: 5, ine: 5, linkedin: 0 });
    expect(row.country_code).toBe('MX');
    expect(row.period_date).toBe(PERIOD);
    expect(row.income_decile_origin).toBeNull();
    expect(row.income_decile_dest).toBeNull();

    expect(captureFirst?.options).toMatchObject({
      onConflict:
        'origin_scope_type,origin_scope_id,dest_scope_type,dest_scope_id,country_code,period_date',
    });
  });

  it('skips tuples where origin === dest', async () => {
    const fetchSignals = vi.fn(async () => ({
      signals: [
        signal('zone-A', 'zone-A', 5, 'rpp', 0.35),
        signal('zone-A', 'zone-B', 3, 'rpp', 0.35),
      ] as readonly MigrationFlowSignal[],
      limitations: [] as readonly string[],
      sources_real: ['rpp'] as const,
      sources_stub: ['inegi', 'ine', 'linkedin'] as const,
    }));

    const captured: CapturedUpsert[] = [];
    const supabase = mockSupabase(captured);
    await aggregateFlowsForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      zoneIds: ['zone-A'],
      fetchSignals,
    });

    expect(captured).toHaveLength(1);
    const rows = captured[0]?.rows ?? [];
    expect(rows).toHaveLength(1);
    const r = rows[0] as Record<string, unknown>;
    expect(r.origin_scope_id).toBe('zone-A');
    expect(r.dest_scope_id).toBe('zone-B');
  });

  it('skips tuples with volume=0', async () => {
    const fetchSignals = vi.fn(async () => ({
      signals: [
        signal('zone-A', 'zone-B', 0, 'rpp', 0.35),
        signal('zone-A', 'zone-C', 2, 'rpp', 0.35),
      ] as readonly MigrationFlowSignal[],
      limitations: [] as readonly string[],
      sources_real: ['rpp'] as const,
      sources_stub: ['inegi', 'ine', 'linkedin'] as const,
    }));

    const captured: CapturedUpsert[] = [];
    const supabase = mockSupabase(captured);
    await aggregateFlowsForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      zoneIds: ['zone-A'],
      fetchSignals,
    });

    const rows = captured[0]?.rows ?? [];
    expect(rows).toHaveLength(1);
    const r = rows[0] as Record<string, unknown>;
    expect(r.dest_scope_id).toBe('zone-C');
  });

  it('processes multiple zoneIds, scopes_processed reflects input length', async () => {
    // Cada zoneId retorna una tupla distinta para evitar merging cross-zone.
    const fetchSignals = vi.fn(async ({ zoneId }: { zoneId: string }) => ({
      signals: [
        signal(zoneId, `dest-of-${zoneId}`, 4, 'rpp', 0.35),
      ] as readonly MigrationFlowSignal[],
      limitations: [] as readonly string[],
      sources_real: ['rpp'] as const,
      sources_stub: ['inegi', 'ine', 'linkedin'] as const,
    }));

    const captured: CapturedUpsert[] = [];
    const supabase = mockSupabase(captured);
    const summary = await aggregateFlowsForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      zoneIds: ['zone-A', 'zone-B'],
      fetchSignals,
    });

    expect(summary.scopes_processed).toBe(2);
    expect(fetchSignals).toHaveBeenCalledTimes(2);
    const rows = captured[0]?.rows ?? [];
    expect(rows).toHaveLength(2);
    expect(summary.flows_upserted).toBe(2);
  });

  it('returns empty summary when zoneIds is empty list', async () => {
    const fetchSignals = vi.fn();
    const captured: CapturedUpsert[] = [];
    const supabase = mockSupabase(captured);
    const summary = await aggregateFlowsForCDMXColonias({
      periodDate: PERIOD,
      supabase,
      zoneIds: [],
      fetchSignals:
        fetchSignals as unknown as typeof import('../../../sources/migration-signals').fetchMigrationSignals,
    });

    expect(summary.scopes_processed).toBe(0);
    expect(summary.flows_upserted).toBe(0);
    expect(fetchSignals).not.toHaveBeenCalled();
  });
});
