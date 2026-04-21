import { describe, expect, it } from 'vitest';
import { buildAnonWrapped, buildPersonalizedWrapped } from '../lib/wrapped-builder';

interface WrappedMockBuilder {
  _rows: unknown[];
  _isHeadCount: boolean;
  select: (cols?: string, opts?: { count: string; head: boolean }) => WrappedMockBuilder;
  eq: () => WrappedMockBuilder;
  gte: () => WrappedMockBuilder;
  lte: () => WrappedMockBuilder;
  not: () => WrappedMockBuilder;
  order: () => WrappedMockBuilder;
  limit: () => Promise<{ data: unknown[]; error: null }>;
  insert: (payload: Record<string, unknown>) => Promise<{ data: null; error: null }>;
  upsert: (payload: Record<string, unknown>) => Promise<{ data: null; error: null }>;
  then: (resolve: (v: { data: unknown; error: null; count?: number }) => void) => void;
}

function makeSupabase(tables: Record<string, unknown[]>): unknown {
  const upserted: Array<Record<string, unknown>> = [];
  const inserted: Array<Record<string, unknown>> = [];
  const sup = {
    _upserted: upserted,
    _inserted: inserted,
    from(tableName: string) {
      const qb = {
        _rows: tables[tableName] ?? [],
        _isHeadCount: false,
      } as WrappedMockBuilder;
      qb.select = (_cols?: string, opts?: { count: string; head: boolean }) => {
        if (opts?.head) {
          qb._isHeadCount = true;
        }
        return qb;
      };
      qb.eq = () => {
        // Si estamos en modo head-count y ya estamos en última eq, devolver
        // un thenable que resuelve con count. En práctica mantener chainable
        // para permitir múltiples eq + gte/lte después.
        return qb;
      };
      qb.gte = () => qb;
      qb.lte = () => qb;
      qb.not = () => qb;
      qb.order = () => qb;
      qb.limit = () => Promise.resolve({ data: qb._rows, error: null });
      qb.insert = (payload: Record<string, unknown>) => {
        inserted.push(payload);
        return Promise.resolve({ data: null, error: null });
      };
      qb.upsert = (payload: Record<string, unknown>) => {
        upserted.push(payload);
        return Promise.resolve({ data: null, error: null });
      };
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for supabase chainable API
      qb.then = (resolve: (v: { data: unknown; error: null; count?: number }) => void) => {
        if (qb._isHeadCount) {
          resolve({
            data: null,
            error: null,
            count: Array.isArray(qb._rows) ? qb._rows.length : 0,
          });
          return;
        }
        resolve({ data: qb._rows, error: null });
      };
      return qb;
    },
  };
  return sup;
}

describe('buildAnonWrapped', () => {
  it('returns snapshot with 10+ cards and no user_id', async () => {
    const sup = makeSupabase({
      zone_migration_flows: [
        {
          origin_scope_type: 'colonia',
          origin_scope_id: 'napoles',
          dest_scope_type: 'colonia',
          dest_scope_id: 'roma-norte',
          volume: 500,
        },
      ],
      zone_pulse_scores: [{ scope_type: 'colonia', scope_id: 'roma-norte', pulse_score: 88.5 }],
      scorecard_national_reports: [{ report_id: 'Q1-2026' }, { report_id: 'Q2-2026' }],
      zone_alpha_alerts: [{ zone_id: 'aa111111-1111-1111-1111-111111111111', alpha_score: 77.5 }],
    });

    const snap = await buildAnonWrapped({
      year: 2025,
      countryCode: 'MX',
      supabase: sup as never,
    });

    expect(snap.user_id).toBeNull();
    expect(snap.year).toBe(2025);
    expect(snap.country_code).toBe('MX');
    expect(snap.cards.length).toBeGreaterThanOrEqual(10);
    // Each card has required fields.
    for (const card of snap.cards) {
      expect(card.kind).toBeTruthy();
      expect(card.title).toBeTruthy();
      expect(card.value).toBeTruthy();
    }
    // Persisted.
    const inserted = (sup as { _inserted: Array<Record<string, unknown>> })._inserted;
    expect(inserted.length).toBeGreaterThan(0);
  });
});

describe('buildPersonalizedWrapped', () => {
  it('returns snapshot with user_id + 10+ cards + personal card first', async () => {
    const sup = makeSupabase({
      zone_migration_flows: [],
      zone_pulse_scores: [{ scope_type: 'colonia', scope_id: 'condesa', pulse_score: 85.0 }],
      scorecard_national_reports: [],
      zone_alpha_alerts: [],
    });

    const snap = await buildPersonalizedWrapped({
      userId: 'user-123',
      year: 2025,
      countryCode: 'MX',
      supabase: sup as never,
    });

    expect(snap.user_id).toBe('user-123');
    expect(snap.cards.length).toBeGreaterThanOrEqual(10);
    // First card is personal (top_zone_explored).
    expect(snap.cards[0]?.kind).toBe('top_zone_explored');
  });
});
