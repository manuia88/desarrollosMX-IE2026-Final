// FASE 14.F.4 Sprint 3 — studioListingHealthRouter Modo A tests.
// Mocks: createAdminClient (chainable supabase), studioProcedure auth side-effect.
// Coverage: analyze inserts new row, analyze updates existing row, analyze BAD_REQUEST
// when status != completed, getByUrlImport NOT_FOUND on ownership mismatch.

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

interface PortalImportRow {
  id: string;
  scraped_data: unknown;
  scrape_status: string;
  user_id: string;
}

interface HealthScoreRow {
  id: string;
}

interface MockState {
  portalImport: PortalImportRow | null;
  existingHealthScore: HealthScoreRow | null;
  insertCalls: Array<Record<string, unknown>>;
  updateCalls: Array<{ id: string; row: Record<string, unknown> }>;
}

const state: MockState = {
  portalImport: null,
  existingHealthScore: null,
  insertCalls: [],
  updateCalls: [],
};

vi.mock('@/shared/lib/supabase/admin', () => {
  function fromTable(table: string) {
    if (table === 'studio_portal_imports') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: vi.fn(async () => ({
                data: state.portalImport,
                error: null,
              })),
            }),
          }),
        }),
      };
    }
    if (table === 'studio_listing_health_scores') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn(async () => ({
              data: state.existingHealthScore,
              error: null,
            })),
          }),
        }),
        insert: (row: Record<string, unknown>) => {
          state.insertCalls.push(row);
          return Promise.resolve({ data: null, error: null });
        },
        update: (row: Record<string, unknown>) => ({
          eq: (_col: string, value: string) => {
            state.updateCalls.push({ id: value, row });
            return Promise.resolve({ data: null, error: null });
          },
        }),
      };
    }
    if (table === 'studio_users_extension') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn(async () => ({
              data: {
                studio_role: 'studio_user',
                organization_id: null,
                onboarding_completed: true,
              },
              error: null,
            })),
          }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
      };
    }
    return {
      select: () => ({
        eq: () => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) }),
      }),
    };
  }
  return {
    createAdminClient: vi.fn(() => ({ from: fromTable })),
  };
});

const DEFAULT_USER_UUID = 'e1111111-1111-4111-8111-111111111111';

function buildCtx(userId: string = DEFAULT_USER_UUID): Context {
  const supabase = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  };
  return {
    supabase,
    headers: new Headers(),
    user: { id: userId, email: 'test@example.com' } as unknown as User,
    profile: { id: userId, rol: 'asesor' } as unknown as Context['profile'],
  } as unknown as Context;
}

beforeEach(() => {
  state.portalImport = null;
  state.existingHealthScore = null;
  state.insertCalls = [];
  state.updateCalls = [];
});

afterEach(() => {
  vi.clearAllMocks();
});

const completedScrapedData = {
  title: 'Test',
  description: 'descripcion lo suficientemente larga para superar minimos basicos del analyzer',
  priceLocal: 5_500_000,
  currency: 'MXN',
  areaM2: 120,
  bedrooms: 3,
  bathrooms: 2,
  zone: 'Roma Norte',
  city: 'CDMX',
  photos: [
    'https://cdn.test/p1.jpg',
    'https://cdn.test/p2.jpg',
    'https://cdn.test/p3.jpg',
    'https://cdn.test/p4.jpg',
    'https://cdn.test/p5.jpg',
  ],
  amenities: ['piscina'],
  rawMetadata: { jsonLdFound: true, ogLocale: 'es_MX' },
};

const IMPORT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('studioListingHealthRouter.analyze — INSERT path', () => {
  it('inserts a new health score row when no existing row', async () => {
    state.portalImport = {
      id: IMPORT_ID,
      scraped_data: completedScrapedData,
      scrape_status: 'completed',
      user_id: DEFAULT_USER_UUID,
    };
    state.existingHealthScore = null;

    const { studioListingHealthRouter } = await import('../routes/listing-health');
    const caller = studioListingHealthRouter.createCaller(buildCtx() as never);
    const result = await caller.analyze({ importId: IMPORT_ID });

    expect(result.scoreOverall).toBeGreaterThan(0);
    expect(state.insertCalls.length).toBe(1);
    expect(state.updateCalls.length).toBe(0);
    expect((state.insertCalls[0] as { url_import_id: string }).url_import_id).toBe(IMPORT_ID);
  });
});

describe('studioListingHealthRouter.analyze — UPDATE path', () => {
  it('updates the existing row instead of inserting', async () => {
    state.portalImport = {
      id: IMPORT_ID,
      scraped_data: completedScrapedData,
      scrape_status: 'completed',
      user_id: DEFAULT_USER_UUID,
    };
    state.existingHealthScore = { id: 'existing-row-id' };

    const { studioListingHealthRouter } = await import('../routes/listing-health');
    const caller = studioListingHealthRouter.createCaller(buildCtx() as never);
    await caller.analyze({ importId: IMPORT_ID });

    expect(state.insertCalls.length).toBe(0);
    expect(state.updateCalls.length).toBe(1);
    expect(state.updateCalls[0]?.id).toBe('existing-row-id');
  });
});

describe('studioListingHealthRouter.analyze — BAD_REQUEST when status != completed', () => {
  it('throws BAD_REQUEST when import status is pending', async () => {
    state.portalImport = {
      id: IMPORT_ID,
      scraped_data: completedScrapedData,
      scrape_status: 'pending',
      user_id: DEFAULT_USER_UUID,
    };

    const { studioListingHealthRouter } = await import('../routes/listing-health');
    const caller = studioListingHealthRouter.createCaller(buildCtx() as never);
    await expect(caller.analyze({ importId: IMPORT_ID })).rejects.toThrow(/pending/);
    expect(state.insertCalls.length).toBe(0);
    expect(state.updateCalls.length).toBe(0);
  });
});

describe('studioListingHealthRouter.getByUrlImport — ownership check', () => {
  it('throws NOT_FOUND when import not owned by current user (mock returns null)', async () => {
    state.portalImport = null;

    const { studioListingHealthRouter } = await import('../routes/listing-health');
    const caller = studioListingHealthRouter.createCaller(buildCtx() as never);
    await expect(caller.getByUrlImport({ importId: IMPORT_ID })).rejects.toThrow();
  });
});
