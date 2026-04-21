// Tests para migration-signals.ts — BLOQUE 11.G sub-agent A.

import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { FetchMigrationSignalParams } from '../migration-signals';
import {
  fetchFromINECredencial,
  fetchFromINEGIENADID,
  fetchFromLinkedInProfiles,
  fetchFromRPPEscrituras,
  fetchMigrationSignals,
} from '../migration-signals';

const PERIOD = '2026-04-01';

function baseParams(
  overrides: Partial<FetchMigrationSignalParams> = {},
): FetchMigrationSignalParams {
  return {
    zoneId: 'zone-focus',
    scopeType: 'colonia',
    countryCode: 'MX',
    periodDate: PERIOD,
    supabase: {} as SupabaseClient,
    ...overrides,
  };
}

function rppClientReturning(rows: ReadonlyArray<Record<string, unknown>>): SupabaseClient {
  const chain = {
    select() {
      return this;
    },
    or() {
      return this;
    },
    gte() {
      return this;
    },
    lte() {
      return this;
    },
    limit() {
      return Promise.resolve({ data: rows, error: null });
    },
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

function rppClientError(): SupabaseClient {
  const chain = {
    select() {
      return this;
    },
    or() {
      return this;
    },
    gte() {
      return this;
    },
    lte() {
      return this;
    },
    limit() {
      return Promise.resolve({
        data: null,
        error: { message: 'relation "escrituras_raw" does not exist' },
      });
    },
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

describe('fetchFromRPPEscrituras', () => {
  it('returns signals when rows present (3 unique pairs → 3 signals conf=0.35 source=rpp)', async () => {
    // zone-focus es destino en 2 rows (origen-A y origen-B), origen en 1 row (dest-C).
    const rows = [
      {
        zone_id_origen_anterior: 'origen-A',
        zone_id: 'zone-focus',
        fecha_escritura: '2026-03-10',
      },
      {
        zone_id_origen_anterior: 'origen-B',
        zone_id: 'zone-focus',
        fecha_escritura: '2026-03-15',
      },
      {
        zone_id_origen_anterior: 'zone-focus',
        zone_id: 'dest-C',
        fecha_escritura: '2026-03-20',
      },
    ];
    const supabase = rppClientReturning(rows);
    const res = await fetchFromRPPEscrituras(baseParams({ supabase }));
    expect(res.limitation).toBeNull();
    expect(res.signals).toHaveLength(3);
    for (const s of res.signals) {
      expect(s.confidence).toBeCloseTo(0.35, 6);
      expect(s.source).toBe('rpp');
      expect(s.volume).toBe(1);
      expect(s.origin_scope_type).toBe('colonia');
      expect(s.dest_scope_type).toBe('colonia');
    }
    const keys = res.signals.map((s) => `${s.origin_scope_id}->${s.dest_scope_id}`).sort();
    expect(keys).toEqual(['origen-A->zone-focus', 'origen-B->zone-focus', 'zone-focus->dest-C']);
  });

  it('aggregates volume when same pair appears multiple times', async () => {
    const rows = [
      {
        zone_id_origen_anterior: 'origen-X',
        zone_id: 'zone-focus',
        fecha_escritura: '2026-03-01',
      },
      {
        zone_id_origen_anterior: 'origen-X',
        zone_id: 'zone-focus',
        fecha_escritura: '2026-03-02',
      },
      {
        zone_id_origen_anterior: 'origen-X',
        zone_id: 'zone-focus',
        fecha_escritura: '2026-03-03',
      },
    ];
    const supabase = rppClientReturning(rows);
    const res = await fetchFromRPPEscrituras(baseParams({ supabase }));
    expect(res.limitation).toBeNull();
    expect(res.signals).toHaveLength(1);
    expect(res.signals[0]?.volume).toBe(3);
  });

  it('returns RPP_TABLE_NOT_FOUND when every candidate table errors', async () => {
    const supabase = rppClientError();
    const res = await fetchFromRPPEscrituras(baseParams({ supabase }));
    expect(res.signals).toEqual([]);
    expect(res.limitation).toBe('RPP_TABLE_NOT_FOUND');
  });

  it('skips rows where origin === dest', async () => {
    const rows = [
      {
        zone_id_origen_anterior: 'zone-focus',
        zone_id: 'zone-focus',
        fecha_escritura: '2026-03-10',
      },
      {
        zone_id_origen_anterior: 'origen-A',
        zone_id: 'zone-focus',
        fecha_escritura: '2026-03-11',
      },
    ];
    const supabase = rppClientReturning(rows);
    const res = await fetchFromRPPEscrituras(baseParams({ supabase }));
    expect(res.signals).toHaveLength(1);
    expect(res.signals[0]?.origin_scope_id).toBe('origen-A');
  });
});

describe('stub adapters', () => {
  it('fetchFromINEGIENADID returns empty + INEGI_ENADID_PENDING_H2', async () => {
    const res = await fetchFromINEGIENADID(baseParams());
    expect(res.signals).toEqual([]);
    expect(res.limitation).toBe('INEGI_ENADID_PENDING_H2');
  });

  it('fetchFromINECredencial returns empty + INE_CREDENCIAL_PENDING_H2', async () => {
    const res = await fetchFromINECredencial(baseParams());
    expect(res.signals).toEqual([]);
    expect(res.limitation).toBe('INE_CREDENCIAL_PENDING_H2');
  });

  it('fetchFromLinkedInProfiles returns empty + LINKEDIN_PENDING_H2', async () => {
    const res = await fetchFromLinkedInProfiles(baseParams());
    expect(res.signals).toEqual([]);
    expect(res.limitation).toBe('LINKEDIN_PENDING_H2');
  });
});

describe('fetchMigrationSignals (orchestrator)', () => {
  it('concatenates RPP signals and accumulates stub limitations', async () => {
    const rows = [
      {
        zone_id_origen_anterior: 'origen-A',
        zone_id: 'zone-focus',
        fecha_escritura: '2026-03-10',
      },
      {
        zone_id_origen_anterior: 'origen-B',
        zone_id: 'zone-focus',
        fecha_escritura: '2026-03-12',
      },
    ];
    const supabase = rppClientReturning(rows);
    const res = await fetchMigrationSignals(baseParams({ supabase }));
    expect(res.signals).toHaveLength(2);
    expect(res.sources_real).toEqual(['rpp']);
    expect(res.sources_stub).toEqual(['inegi', 'ine', 'linkedin']);
    expect(res.limitations).toEqual([
      'INEGI_ENADID_PENDING_H2',
      'INE_CREDENCIAL_PENDING_H2',
      'LINKEDIN_PENDING_H2',
    ]);
  });

  it('if RPP unavailable all sources_stub includes rpp', async () => {
    const supabase = rppClientError();
    const res = await fetchMigrationSignals(baseParams({ supabase }));
    expect(res.signals).toEqual([]);
    expect(res.sources_real).toEqual([]);
    expect(res.sources_stub).toEqual(['rpp', 'inegi', 'ine', 'linkedin']);
    expect(res.limitations).toContain('RPP_TABLE_NOT_FOUND');
  });
});
