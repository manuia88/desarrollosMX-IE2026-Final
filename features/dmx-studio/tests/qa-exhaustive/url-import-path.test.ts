// ADR-018 / Sprint 10 BIBLIA Tarea 10.1 QA Exhaustivo — URL import path coverage.
// Modo A: createCaller mocks (zero DB real, zero credits API).
// Cubre flujo: parseUrl single + bulkParseUrls (5 portales MX) + getPreview + confirmAndCreateProject.
// Portales canon: inmuebles24, lamudi, easybroker, vivanuncios, propiedades_com.

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

const processSingleImportMock = vi.fn(async () => undefined);
const submitBulkUrlsMock = vi.fn(async (_supabase: unknown, _userId: string, urls: string[]) => ({
  batchId: '11111111-1111-4111-8111-111111111111',
  importIds: urls.map((_, idx) => `imp_${idx + 1}`),
}));

vi.mock('@/features/dmx-studio/lib/url-import/bulk-handler', () => ({
  processSingleImport: processSingleImportMock,
  submitBulkUrls: submitBulkUrlsMock,
}));

interface AdminTableState {
  insertResult?: { data: Record<string, unknown> | null; error: unknown };
  selectMaybeSingleResult?: { data: Record<string, unknown> | null; error: unknown };
  updateResult?: { error: unknown };
}

let adminTables: Record<string, AdminTableState> = {};

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from(table: string) {
      const state = adminTables[table];
      return {
        insert() {
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
        update() {
          return {
            eq() {
              return Promise.resolve(state?.updateResult ?? { error: null });
            },
          };
        },
        select() {
          const chain: Record<string, unknown> = {};
          chain.eq = () => chain;
          chain.maybeSingle = async () =>
            state?.selectMaybeSingleResult ?? { data: null, error: null };
          chain.single = async () => state?.selectMaybeSingleResult ?? { data: null, error: null };
          chain.order = () => chain;
          chain.limit = () => chain;
          return chain;
        },
      };
    },
  }),
}));

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';

function buildCtx(): Context {
  const ctxSupabase = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: () => ({
      select: () => ({
        eq: () => ({
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
        }),
      }),
      insert() {
        return Promise.resolve({ error: null });
      },
    }),
  };
  return {
    supabase: ctxSupabase,
    headers: new Headers(),
    user: { id: DEFAULT_USER_ID, email: 'url-import@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

beforeEach(() => {
  adminTables = {};
  processSingleImportMock.mockClear();
  submitBulkUrlsMock.mockClear();
  adminTables.studio_users_extension = {
    selectMaybeSingleResult: {
      data: {
        studio_role: 'studio_user',
        organization_id: null,
        onboarding_completed: true,
      },
      error: null,
    },
  };
});

afterEach(() => {
  vi.resetModules();
});

describe('URL import path — parseUrl single (5 portales MX)', () => {
  const portalUrls = [
    { portal: 'inmuebles24', url: 'https://www.inmuebles24.com/casa-en-venta-en-roma-norte-100' },
    { portal: 'lamudi', url: 'https://www.lamudi.com.mx/casa-en-condesa-200' },
    { portal: 'easybroker', url: 'https://easybroker.com/listings/casa-roma-300' },
    { portal: 'vivanuncios', url: 'https://www.vivanuncios.com.mx/inmuebles-400' },
    { portal: 'propiedades_com', url: 'https://propiedades.com/casa-cdmx-500' },
  ];

  for (const { portal, url } of portalUrls) {
    it(`creates studio_portal_imports row + triggers async process (${portal})`, async () => {
      adminTables.studio_portal_imports = {
        insertResult: { data: { id: `imp_${portal}` }, error: null },
      };
      const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
      const caller = studioUrlImportRouter.createCaller(buildCtx());
      const result = await caller.parseUrl({ url });
      expect(result.importId).toBe(`imp_${portal}`);
      expect(processSingleImportMock).toHaveBeenCalledTimes(1);
    });
  }
});

describe('URL import path — bulkParseUrls', () => {
  it('accepts 5 portales URLs and returns batchId + 5 importIds', async () => {
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());
    const urls = [
      'https://www.inmuebles24.com/c/1',
      'https://www.lamudi.com.mx/c/2',
      'https://easybroker.com/c/3',
      'https://www.vivanuncios.com.mx/c/4',
      'https://propiedades.com/c/5',
    ];
    const result = await caller.bulkParseUrls({ urls });
    expect(result.batchId).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.importIds.length).toBe(5);
    expect(submitBulkUrlsMock).toHaveBeenCalledTimes(1);
    expect(processSingleImportMock).toHaveBeenCalledTimes(5);
  });

  it('rejects empty URL list via Zod', async () => {
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());
    await expect(caller.bulkParseUrls({ urls: [] })).rejects.toThrow();
  });

  it('rejects > 10 URLs via Zod', async () => {
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());
    const tooMany = Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`);
    await expect(caller.bulkParseUrls({ urls: tooMany })).rejects.toThrow();
  });
});

describe('URL import path — getPreview + extract overrides', () => {
  it('returns full row when import found', async () => {
    adminTables.studio_portal_imports = {
      selectMaybeSingleResult: {
        data: {
          id: 'imp_x',
          source_url: 'https://www.inmuebles24.com/casa',
          source_portal: 'inmuebles24',
          scrape_status: 'completed',
          price_extracted: 8500000,
          area_extracted: 180,
          bedrooms_extracted: 3,
          zone_extracted: 'Roma Norte',
        },
        error: null,
      },
    };
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());
    const importIdValid = 'b1111111-1111-4111-8111-111111111111';
    const found = await caller.getPreview({ importId: importIdValid });
    expect(found.id).toBe('imp_x');
    expect(found.scrape_status).toBe('completed');
  });

  it('rejects NOT_FOUND when import missing', async () => {
    adminTables.studio_portal_imports = {
      selectMaybeSingleResult: { data: null, error: null },
    };
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());
    const importIdValid = 'b2222222-2222-4222-8222-222222222222';
    await expect(caller.getPreview({ importId: importIdValid })).rejects.toThrow(/NOT_FOUND/);
  });
});

describe('URL import path — confirmAndCreateProject', () => {
  it('creates studio_video_projects row when scrape_status=completed', async () => {
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
    const { studioUrlImportRouter } = await import('@/features/dmx-studio/routes/url-import');
    const caller = studioUrlImportRouter.createCaller(buildCtx());
    const importIdValid = 'b3333333-3333-4333-8333-333333333333';
    const result = await caller.confirmAndCreateProject({
      importId: importIdValid,
      title: 'Casa Roma Norte',
      overrides: { price: 9000000 },
    });
    expect(result.projectId).toBe('proj_new_1');
  });

  it('rejects BAD_REQUEST when scrape_status pending', async () => {
    adminTables.studio_portal_imports = {
      selectMaybeSingleResult: {
        data: {
          id: 'imp_pending',
          source_portal: 'lamudi',
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

describe('URL import path — module export smoke', () => {
  it('exports studioUrlImportRouter with expected procedures', async () => {
    const mod = await import('@/features/dmx-studio/routes/url-import');
    const r = mod.studioUrlImportRouter as unknown as {
      _def: { record: Record<string, unknown> };
    };
    const names = Object.keys(r._def.record).sort();
    expect(names).toEqual(
      [
        'bulkParseUrls',
        'confirmAndCreateProject',
        'getPreview',
        'getStatus',
        'listForUser',
        'parseUrl',
      ].sort(),
    );
  });
});
