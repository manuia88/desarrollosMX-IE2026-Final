// ADR-059 — Playa del Carmen city expansion tests (Modo A — createCaller mocks).
// FASE 14.1 sub-agent 1
//
// Memoria canon integration_tests_modo_a_b_pattern: Modo A = mocks Supabase admin
// vía vi.mock + Modo B (real DB+JWT) defer a sub-bloque RLS hardening.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as PlayaIndex from '..';
import { loadPlayaZones, PLAYA_ZONES_CANON } from '../data-loader';
import { PLAYA_I18N_EN_US, PLAYA_I18N_ES_MX } from '../i18n-keys';
import { calculatePlayaIEScores, type PlayaScoreInput } from '../ie-scores-calculator';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: vi.fn(async () => ({ data: null, error: null, count: 0 })),
      select: vi.fn(() => ({
        eq: () => ({
          neq: () => Promise.resolve({ data: [], error: null }),
        }),
      })),
    }),
  }),
}));

describe('Playa del Carmen — F14.1 city expansion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test 1 — PLAYA_ZONES_CANON has exactly 7 zones', () => {
    expect(PLAYA_ZONES_CANON).toHaveLength(7);
  });

  it('test 2 — all zones country_code=MX and parent_scope_id=playa-del-carmen', () => {
    for (const zone of PLAYA_ZONES_CANON) {
      expect(zone.country_code).toBe('MX');
      expect(zone.parent_scope_id).toBe('playa-del-carmen');
    }
  });

  it('test 3 — all zones lat in [20.5, 20.7] and lng in [-87.2, -87.0]', () => {
    for (const zone of PLAYA_ZONES_CANON) {
      expect(zone.lat).toBeGreaterThanOrEqual(20.5);
      expect(zone.lat).toBeLessThanOrEqual(20.7);
      expect(zone.lng).toBeGreaterThanOrEqual(-87.2);
      expect(zone.lng).toBeLessThanOrEqual(-87.0);
    }
  });

  it('test 4 — calculatePlayaIEScores returns 4 score types per zone (mock supabase)', async () => {
    const inputs: PlayaScoreInput[] = PLAYA_ZONES_CANON.slice(0, 3).map((z, i) => ({
      zoneId: `zone-mock-${i}`,
      scopeId: z.scope_id,
      lat: z.lat,
      lng: z.lng,
    }));

    const result = await calculatePlayaIEScores(inputs);
    expect(result.scores).toHaveLength(inputs.length * 4);

    const byZone = new Map<string, Set<string>>();
    for (const s of result.scores) {
      if (!byZone.has(s.zoneId)) byZone.set(s.zoneId, new Set());
      byZone.get(s.zoneId)?.add(s.scoreType);
    }
    for (const [, types] of byZone) {
      expect(types.size).toBe(4);
      expect(types.has('pulse_score')).toBe(true);
      expect(types.has('futures_alpha')).toBe(true);
      expect(types.has('ghost')).toBe(true);
      expect(types.has('zone_alpha')).toBe(true);
    }
  });

  it('test 5 — score values within expected ranges', async () => {
    const inputs: PlayaScoreInput[] = PLAYA_ZONES_CANON.map((z, i) => ({
      zoneId: `zone-mock-${i}`,
      scopeId: z.scope_id,
      lat: z.lat,
      lng: z.lng,
    }));

    const result = await calculatePlayaIEScores(inputs);
    for (const s of result.scores) {
      switch (s.scoreType) {
        case 'pulse_score':
          expect(s.scoreValue).toBeGreaterThanOrEqual(70);
          expect(s.scoreValue).toBeLessThanOrEqual(90);
          break;
        case 'futures_alpha':
          expect(s.scoreValue).toBeGreaterThanOrEqual(60);
          expect(s.scoreValue).toBeLessThanOrEqual(85);
          break;
        case 'ghost':
          expect(s.scoreValue).toBeGreaterThanOrEqual(10);
          expect(s.scoreValue).toBeLessThanOrEqual(30);
          break;
        case 'zone_alpha':
          expect(s.scoreValue).toBeGreaterThanOrEqual(50);
          expect(s.scoreValue).toBeLessThanOrEqual(75);
          break;
      }
    }
  });

  it('test 6 — provenance.is_synthetic=true and adr=ADR-059 in inserted rows', async () => {
    type UpsertCall = readonly [readonly Record<string, unknown>[], unknown];
    const upsertCalls: UpsertCall[] = [];

    const mockClient = {
      from: () => ({
        upsert: (rows: readonly Record<string, unknown>[], opts: unknown) => {
          upsertCalls.push([rows, opts]);
          return Promise.resolve({ data: null, error: null, count: rows.length });
        },
      }),
    } as unknown as Parameters<typeof calculatePlayaIEScores>[1];

    const inputs: PlayaScoreInput[] = [
      {
        zoneId: 'zone-mock-1',
        scopeId: PLAYA_ZONES_CANON[0]?.scope_id ?? 'x',
        lat: 20.6,
        lng: -87.07,
      },
    ];
    await calculatePlayaIEScores(inputs, mockClient);

    expect(upsertCalls.length).toBeGreaterThan(0);
    const firstBatch = upsertCalls[0]?.[0] ?? [];
    expect(firstBatch.length).toBeGreaterThan(0);
    for (const row of firstBatch) {
      const provenance = row.provenance as Record<string, unknown> | undefined;
      expect(provenance?.is_synthetic).toBe(true);
      expect(provenance?.adr).toBe('ADR-059');
    }
  });

  it('test 7 — i18n keys ES_MX and EN_US share same key set (parity)', () => {
    const esKeys = Object.keys(PLAYA_I18N_ES_MX).sort();
    const enKeys = Object.keys(PLAYA_I18N_EN_US).sort();
    expect(esKeys).toEqual(enKeys);
    expect(esKeys.length).toBeGreaterThan(0);
  });

  it('test 8 — re-exports from index.ts include loadPlayaZones + calculatePlayaIEScores', () => {
    expect(typeof PlayaIndex.loadPlayaZones).toBe('function');
    expect(typeof PlayaIndex.calculatePlayaIEScores).toBe('function');
    expect(PlayaIndex.PLAYA_ZONES_CANON).toBe(PLAYA_ZONES_CANON);
    expect(PlayaIndex.PLAYA_I18N_ES_MX).toBe(PLAYA_I18N_ES_MX);
    expect(PlayaIndex.PLAYA_I18N_EN_US).toBe(PLAYA_I18N_EN_US);
    // Reference loadPlayaZones to silence import warning even though we test via Index.
    expect(loadPlayaZones).toBe(PlayaIndex.loadPlayaZones);
  });
});
