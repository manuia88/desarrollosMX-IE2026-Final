import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import {
  batchResolveZoneLabels,
  resolveZoneLabel,
  resolveZoneLabelSync,
  ZONE_LABEL_FALLBACKS,
  ZoneLabelCache,
} from '../zone-label-resolver';

type TestClient = SupabaseClient<Database>;

interface SnapshotFixture {
  readonly zone_id: string;
  readonly payload: unknown;
  readonly computed_at: string;
}

interface FixtureOptions {
  readonly rowsByZone: ReadonlyMap<string, SnapshotFixture>;
  readonly error?: { readonly message: string } | null;
}

interface CallTracker {
  calls: number;
}

function createFakeSupabase(options: FixtureOptions, tracker?: CallTracker) {
  return {
    from: vi.fn((_table: string) => {
      let requestedIds: string[] | null = null;
      let requestedSingleId: string | null = null;
      const builder: Record<string, unknown> = {};
      builder.select = vi.fn(() => builder);
      builder.eq = vi.fn((column: string, value: unknown) => {
        if (column === 'zone_id' && typeof value === 'string') {
          requestedSingleId = value;
        }
        return builder;
      });
      builder.in = vi.fn((column: string, values: unknown) => {
        if (column === 'zone_id' && Array.isArray(values)) {
          requestedIds = values.filter((v): v is string => typeof v === 'string');
        }
        return builder;
      });
      builder.order = vi.fn(() => builder);
      builder.limit = vi.fn(() => builder);
      // biome-ignore lint/suspicious/noThenProperty: mimic Postgrest thenable
      builder.then = (
        resolve: (v: { data: readonly SnapshotFixture[] | null; error: unknown }) => void,
      ) => {
        if (tracker) tracker.calls += 1;
        if (options.error) {
          resolve({ data: null, error: options.error });
          return;
        }
        let rows: SnapshotFixture[] = [];
        if (requestedIds) {
          for (const id of requestedIds) {
            const row = options.rowsByZone.get(id);
            if (row) rows.push(row);
          }
        } else if (requestedSingleId) {
          const row = options.rowsByZone.get(requestedSingleId);
          if (row) rows = [row];
        }
        resolve({ data: rows, error: null });
      };
      return builder;
    }),
  };
}

beforeEach(() => {
  ZoneLabelCache.clear();
});

describe('resolveZoneLabelSync — hardcoded estado map', () => {
  it('resolves AGS → Aguascalientes', () => {
    expect(resolveZoneLabelSync({ scopeType: 'estado', scopeId: 'AGS' })).toBe('Aguascalientes');
  });
  it('resolves CMX → Ciudad de México', () => {
    expect(resolveZoneLabelSync({ scopeType: 'estado', scopeId: 'CMX' })).toBe('Ciudad de México');
  });
  it('returns fallback for unknown UUID estado', () => {
    expect(
      resolveZoneLabelSync({
        scopeType: 'estado',
        scopeId: '11111111-2222-3333-4444-555555555555',
      }),
    ).toBe(ZONE_LABEL_FALLBACKS.estado);
  });
});

describe('resolveZoneLabelSync — hardcoded city map', () => {
  it('resolves CDMX → Ciudad de México', () => {
    expect(resolveZoneLabelSync({ scopeType: 'city', scopeId: 'CDMX' })).toBe('Ciudad de México');
  });
  it('resolves MTY → Monterrey', () => {
    expect(resolveZoneLabelSync({ scopeType: 'city', scopeId: 'MTY' })).toBe('Monterrey');
  });
  it('returns fallback for unknown UUID city', () => {
    expect(
      resolveZoneLabelSync({
        scopeType: 'city',
        scopeId: '11111111-2222-3333-4444-555555555555',
      }),
    ).toBe(ZONE_LABEL_FALLBACKS.city);
  });
});

describe('resolveZoneLabelSync — alcaldía slug → label', () => {
  it('resolves benito-juarez → Benito Juárez', () => {
    expect(resolveZoneLabelSync({ scopeType: 'alcaldia', scopeId: 'benito-juarez' })).toBe(
      'Benito Juárez',
    );
  });
  it('resolves gustavo-a-madero → Gustavo A. Madero', () => {
    expect(resolveZoneLabelSync({ scopeType: 'alcaldia', scopeId: 'gustavo-a-madero' })).toBe(
      'Gustavo A. Madero',
    );
  });
  it('returns fallback for unknown UUID alcaldía (sync only)', () => {
    expect(
      resolveZoneLabelSync({
        scopeType: 'alcaldia',
        scopeId: 'abcdef01-2345-6789-abcd-ef0123456789',
      }),
    ).toBe(ZONE_LABEL_FALLBACKS.alcaldia);
  });
});

describe('resolveZoneLabelSync — slug-to-label fallback for colonia', () => {
  it('resolves roma-norte → Roma Norte', () => {
    expect(resolveZoneLabelSync({ scopeType: 'colonia', scopeId: 'roma-norte' })).toBe(
      'Roma Norte',
    );
  });
  it('resolves del-valle-centro → Del Valle Centro', () => {
    expect(resolveZoneLabelSync({ scopeType: 'colonia', scopeId: 'del-valle-centro' })).toBe(
      'Del Valle Centro',
    );
  });
});

describe('resolveZoneLabelSync — UUID never leaks', () => {
  it('returns bracketed fallback for colonia UUID (never raw UUID)', () => {
    const result = resolveZoneLabelSync({
      scopeType: 'colonia',
      scopeId: 'abcdef01-2345-6789-abcd-ef0123456789',
    });
    expect(result).toBe(ZONE_LABEL_FALLBACKS.zona);
    expect(result).not.toContain('abcdef01');
  });
  it('returns bracketed fallback for unknown scope type', () => {
    const result = resolveZoneLabelSync({
      scopeType: 'mystery',
      scopeId: 'abcdef01-2345-6789-abcd-ef0123456789',
    });
    expect(result).toBe(ZONE_LABEL_FALLBACKS.zona);
  });
});

describe('resolveZoneLabel (async) — DB fallback', () => {
  it('uses zona_snapshots payload.name when sync returns fallback', async () => {
    const rowsByZone = new Map<string, SnapshotFixture>([
      [
        '11111111-2222-3333-4444-555555555555',
        {
          zone_id: '11111111-2222-3333-4444-555555555555',
          payload: { name: 'Polanco' },
          computed_at: '2026-03-01T00:00:00Z',
        },
      ],
    ]);
    const fakeSupabase = createFakeSupabase({ rowsByZone });
    const label = await resolveZoneLabel({
      scopeType: 'colonia',
      scopeId: '11111111-2222-3333-4444-555555555555',
      supabase: fakeSupabase as unknown as TestClient,
    });
    expect(label).toBe('Polanco');
  });

  it('falls back to sync fallback when DB returns no row', async () => {
    const fakeSupabase = createFakeSupabase({ rowsByZone: new Map() });
    const label = await resolveZoneLabel({
      scopeType: 'colonia',
      scopeId: '11111111-2222-3333-4444-555555555555',
      supabase: fakeSupabase as unknown as TestClient,
    });
    expect(label).toBe(ZONE_LABEL_FALLBACKS.zona);
  });

  it('short-circuits DB lookup when sync already resolved', async () => {
    const tracker: CallTracker = { calls: 0 };
    const fakeSupabase = createFakeSupabase({ rowsByZone: new Map() }, tracker);
    const label = await resolveZoneLabel({
      scopeType: 'estado',
      scopeId: 'AGS',
      supabase: fakeSupabase as unknown as TestClient,
    });
    expect(label).toBe('Aguascalientes');
    expect(tracker.calls).toBe(0);
  });
});

describe('batchResolveZoneLabels — batch optimization', () => {
  it('resolves N items with a single DB query for the subset that needs one', async () => {
    const rowsByZone = new Map<string, SnapshotFixture>([
      [
        '11111111-2222-3333-4444-555555555555',
        {
          zone_id: '11111111-2222-3333-4444-555555555555',
          payload: { name: 'Polanco' },
          computed_at: '2026-03-01T00:00:00Z',
        },
      ],
      [
        '22222222-3333-4444-5555-666666666666',
        {
          zone_id: '22222222-3333-4444-5555-666666666666',
          payload: { label: 'Condesa' },
          computed_at: '2026-03-01T00:00:00Z',
        },
      ],
    ]);
    const tracker: CallTracker = { calls: 0 };
    const fakeSupabase = createFakeSupabase({ rowsByZone }, tracker);
    const labels = await batchResolveZoneLabels(
      [
        { scopeType: 'estado', scopeId: 'AGS' },
        { scopeType: 'colonia', scopeId: 'roma-norte' },
        { scopeType: 'colonia', scopeId: '11111111-2222-3333-4444-555555555555' },
        { scopeType: 'colonia', scopeId: '22222222-3333-4444-5555-666666666666' },
      ],
      { supabase: fakeSupabase as unknown as TestClient },
    );
    expect(labels).toEqual(['Aguascalientes', 'Roma Norte', 'Polanco', 'Condesa']);
    // Only one DB roundtrip for the two UUID-shaped scopeIds.
    expect(tracker.calls).toBe(1);
  });

  it('returns empty array when items list is empty without hitting DB', async () => {
    const tracker: CallTracker = { calls: 0 };
    const fakeSupabase = createFakeSupabase({ rowsByZone: new Map() }, tracker);
    const labels = await batchResolveZoneLabels([], {
      supabase: fakeSupabase as unknown as TestClient,
    });
    expect(labels).toEqual([]);
    expect(tracker.calls).toBe(0);
  });
});

describe('ZoneLabelCache — cache behavior', () => {
  it('hits cache on second resolveZoneLabel call (no additional DB query)', async () => {
    const rowsByZone = new Map<string, SnapshotFixture>([
      [
        '11111111-2222-3333-4444-555555555555',
        {
          zone_id: '11111111-2222-3333-4444-555555555555',
          payload: { name: 'Polanco' },
          computed_at: '2026-03-01T00:00:00Z',
        },
      ],
    ]);
    const tracker: CallTracker = { calls: 0 };
    const fakeSupabase = createFakeSupabase({ rowsByZone }, tracker);
    const first = await resolveZoneLabel({
      scopeType: 'colonia',
      scopeId: '11111111-2222-3333-4444-555555555555',
      supabase: fakeSupabase as unknown as TestClient,
    });
    const second = await resolveZoneLabel({
      scopeType: 'colonia',
      scopeId: '11111111-2222-3333-4444-555555555555',
      supabase: fakeSupabase as unknown as TestClient,
    });
    expect(first).toBe('Polanco');
    expect(second).toBe('Polanco');
    expect(tracker.calls).toBe(1);
  });

  it('exposes ZoneLabelCache.set/get/clear for tests', () => {
    ZoneLabelCache.set('colonia:custom-key', 'Custom Label');
    expect(ZoneLabelCache.get('colonia:custom-key')).toBe('Custom Label');
    expect(ZoneLabelCache.size()).toBeGreaterThan(0);
    ZoneLabelCache.clear();
    expect(ZoneLabelCache.get('colonia:custom-key')).toBeUndefined();
    expect(ZoneLabelCache.size()).toBe(0);
  });
});
