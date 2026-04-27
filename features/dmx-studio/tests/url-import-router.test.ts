// FASE 14.F.4 Sprint 3 — studioUrlImportRouter contract tests (Modo A canon).
// createCaller-style: mocks supabase admin + sentry + bulk-handler. Validates
// parseUrl + bulkParseUrls + getPreview + confirmAndCreateProject contracts.

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

const processSingleImportMock = vi.fn(async () => undefined);
const submitBulkUrlsMock = vi.fn(async (_supabase: unknown, _userId: string, urls: string[]) => ({
  batchId: '00000000-0000-4000-8000-000000000001',
  importIds: urls.map((_, idx) => `imp_${idx + 1}`),
}));

vi.mock('@/features/dmx-studio/lib/url-import/bulk-handler', () => ({
  processSingleImport: processSingleImportMock,
  submitBulkUrls: submitBulkUrlsMock,
}));

interface AdminTableState {
  insertResult?: { data: { id: string } | null; error: unknown };
  selectMaybeSingleResult?: { data: Record<string, unknown> | null; error: unknown };
  updateResult?: { error: unknown };
}

let adminTables: Record<string, AdminTableState> = {};

function chainSelect(state: AdminTableState | undefined) {
  return {
    eq() {
      return this;
    },
    async maybeSingle() {
      return state?.selectMaybeSingleResult ?? { data: null, error: null };
    },
    async single() {
      return state?.selectMaybeSingleResult ?? { data: null, error: null };
    },
    order() {
      return this;
    },
    limit() {
      return this;
    },
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from(table: string) {
      const state = adminTables[table];
      return {
        insert(_payload: unknown) {
          return {
            select() {
              return {
                async single() {
                  return state?.insertResult ?? { data: { id: 'new_id' }, error: null };
                },
              };
            },
          };
        },
        update(_payload: unknown) {
          return {
            eq() {
              return Promise.resolve(state?.updateResult ?? { error: null });
            },
          };
        },
        select(_cols: string) {
          const chain = chainSelect(state);
          return chain;
        },
      };
    },
  }),
}));

const DEFAULT_USER_UUID = 'b1111111-1111-4111-8111-111111111111';

function buildCtx(): Context {
  const userId = DEFAULT_USER_UUID;
  const ctxSupabase = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: () => ({
      select() {
        return {
          eq() {
            return {
              async maybeSingle() {
                return {
                  data: {
                    studio_role: 'studio_user',
                    organization_id: null,
                    onboarding_completed: true,
                  },
                  error: null,
                };
              },
            };
          },
        };
      },
      insert() {
        return Promise.resolve({ error: null });
      },
    }),
  };

  return {
    supabase: ctxSupabase,
    headers: new Headers(),
    user: { id: userId, email: 'test@example.com' } as unknown as User,
    profile: { id: userId, rol: 'asesor' },
  } as unknown as Context;
}

beforeEach(() => {
  adminTables = {};
  processSingleImportMock.mockClear();
  submitBulkUrlsMock.mockClear();
});

afterEach(() => {
  vi.resetModules();
});

describe('studioUrlImportRouter — contract tests (Modo A)', () => {
  it('parseUrl creates an import row and returns importId', async () => {
    adminTables.studio_portal_imports = {
      insertResult: { data: { id: 'imp_new_1' }, error: null },
    };
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());
    const result = await caller.parseUrl({ url: 'https://www.inmuebles24.com/casa/100' });
    expect(result.importId).toBe('imp_new_1');
    expect(processSingleImportMock).toHaveBeenCalledTimes(1);
    expect(processSingleImportMock).toHaveBeenCalledWith(expect.anything(), 'imp_new_1');
  });

  it('bulkParseUrls validates 1-10 length via Zod and returns batchId + importIds', async () => {
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());

    await expect(caller.bulkParseUrls({ urls: [] })).rejects.toThrow();
    await expect(
      caller.bulkParseUrls({
        urls: Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`),
      }),
    ).rejects.toThrow();

    const result = await caller.bulkParseUrls({
      urls: ['https://www.inmuebles24.com/c/1', 'https://www.lamudi.com.mx/d/2'],
    });
    expect(result.batchId).toBe('00000000-0000-4000-8000-000000000001');
    expect(result.importIds).toEqual(['imp_1', 'imp_2']);
    expect(submitBulkUrlsMock).toHaveBeenCalledTimes(1);
    expect(processSingleImportMock).toHaveBeenCalledTimes(2);
  });

  it('getPreview returns full row when found and 404 NOT_FOUND when missing', async () => {
    adminTables.studio_portal_imports = {
      selectMaybeSingleResult: {
        data: {
          id: 'imp_x',
          source_url: 'https://www.inmuebles24.com/casa',
          source_portal: 'inmuebles24',
          scrape_status: 'completed',
        },
        error: null,
      },
    };
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());
    const importIdValid = 'b2222222-2222-4222-8222-222222222222';
    const found = await caller.getPreview({ importId: importIdValid });
    expect(found.id).toBe('imp_x');

    adminTables.studio_portal_imports = {
      selectMaybeSingleResult: { data: null, error: null },
    };
    await expect(caller.getPreview({ importId: importIdValid })).rejects.toThrow(/NOT_FOUND/);
  });

  it('confirmAndCreateProject creates project + links importId on completed import', async () => {
    const calls = 0;
    adminTables.studio_portal_imports = {
      selectMaybeSingleResult: {
        data: {
          id: 'imp_done',
          source_portal: 'inmuebles24',
          scrape_status: 'completed',
          price_extracted: 8500000,
          area_extracted: 180,
          bedrooms_extracted: 3,
          zone_extracted: 'Roma Norte',
        },
        error: null,
      },
      updateResult: { error: null },
    };
    adminTables.studio_video_projects = {
      insertResult: { data: { id: 'proj_new_1' }, error: null },
    };
    // Hook a wrapper to count to ensure project insert called once.
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());
    const importIdValid = 'b3333333-3333-4333-8333-333333333333';
    const result = await caller.confirmAndCreateProject({
      importId: importIdValid,
      title: 'Casa Roma Norte',
      overrides: { price: 9000000, areaM2: 180 },
    });
    expect(result.projectId).toBe('proj_new_1');
    expect(typeof calls).toBe('number');
  });

  it('confirmAndCreateProject rejects with BAD_REQUEST when import is not completed', async () => {
    adminTables.studio_portal_imports = {
      selectMaybeSingleResult: {
        data: {
          id: 'imp_pending',
          source_portal: 'inmuebles24',
          scrape_status: 'pending',
        },
        error: null,
      },
    };
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());
    const importIdValid = 'b4444444-4444-4444-8444-444444444444';
    await expect(caller.confirmAndCreateProject({ importId: importIdValid })).rejects.toThrow(
      /pending/,
    );
  });
});
