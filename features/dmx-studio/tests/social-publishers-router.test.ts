// F14.F.12 mini-cleanup — socialPublishersRouter tests (Modo A createCaller mocks).
// Cubre: listSupportedPlatforms (public real), publishVideo (STUB), getOAuthUrl (STUB),
//        getPostStatus (STUB).

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

interface AdminMockRegistry {
  inserts: Array<{ table: string; payload: unknown }>;
  maybeSingleByTable: Record<string, Array<{ data: unknown; error: unknown }>>;
}

let registry: AdminMockRegistry = {
  inserts: [],
  maybeSingleByTable: {},
};

function resetRegistry() {
  registry = {
    inserts: [],
    maybeSingleByTable: {},
  };
}

function popMaybeSingle(table: string): { data: unknown; error: unknown } {
  const queue = registry.maybeSingleByTable[table];
  if (!queue || queue.length === 0) return { data: null, error: null };
  return queue.shift() ?? { data: null, error: null };
}

function buildAdminClient() {
  return {
    from(table: string) {
      const selectChain = (_cols?: string) => {
        const builder: Record<string, unknown> = {};
        const pass = (() => builder) as () => typeof builder;
        builder.eq = pass;
        builder.maybeSingle = async () => popMaybeSingle(table);
        builder.single = async () => popMaybeSingle(table);
        return builder;
      };

      const insertChain = (payload: unknown) => {
        registry.inserts.push({ table, payload });
        const builder: Record<string, unknown> = {};
        // biome-ignore lint/suspicious/noThenProperty: thenable mock
        builder.then = (resolve: (v: { error: unknown }) => void) => {
          resolve({ error: null });
        };
        return builder;
      };

      return {
        select: selectChain,
        insert: insertChain,
      };
    },
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => buildAdminClient()),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  },
}));

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';

function buildCtx(): Context {
  const ctxSupabase = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: vi.fn(),
  };
  return {
    supabase: ctxSupabase,
    headers: new Headers(),
    user: { id: DEFAULT_USER_ID, email: 'asesor@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

function enqueueStudioExtensionRow(role: 'studio_user' | 'studio_admin' = 'studio_user') {
  registry.maybeSingleByTable.studio_users_extension =
    registry.maybeSingleByTable.studio_users_extension ?? [];
  registry.maybeSingleByTable.studio_users_extension.push({
    data: {
      studio_role: role,
      organization_id: null,
      onboarding_completed: true,
    },
    error: null,
  });
}

beforeEach(() => {
  resetRegistry();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('socialPublishersRouter — module exports', () => {
  it('exports listSupportedPlatforms + getOAuthUrl + publishVideo + getPostStatus', async () => {
    const mod = await import('@/features/dmx-studio/routes/social-publishers');
    const r = mod.socialPublishersRouter as unknown as {
      _def: { record: Record<string, unknown> };
    };
    const names = Object.keys(r._def.record).sort();
    expect(names).toEqual([
      'getOAuthUrl',
      'getPostStatus',
      'listSupportedPlatforms',
      'publishVideo',
    ]);
  });
});

describe('socialPublishersRouter.listSupportedPlatforms — public', () => {
  it('returns 3 platforms + stubH2 flag', async () => {
    const { socialPublishersRouter } = await import(
      '@/features/dmx-studio/routes/social-publishers'
    );
    const caller = socialPublishersRouter.createCaller(buildCtx());
    const result = await caller.listSupportedPlatforms();
    expect(result.platforms).toEqual(['instagram', 'tiktok', 'facebook']);
    expect(result.stubH2).toBe(true);
    expect(result.stubMessage).toContain('STUB ADR-018');
  });
});

describe('socialPublishersRouter.publishVideo — STUB ADR-018 H2', () => {
  it('throws NOT_IMPLEMENTED for instagram', async () => {
    enqueueStudioExtensionRow();
    const { socialPublishersRouter } = await import(
      '@/features/dmx-studio/routes/social-publishers'
    );
    const caller = socialPublishersRouter.createCaller(buildCtx());
    await expect(
      caller.publishVideo({
        projectId: '11111111-1111-4111-8111-111111111111',
        platform: 'instagram',
        caption: 'Test caption',
        hashtags: ['casa', 'venta'],
      }),
    ).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
      message: expect.stringContaining('STUB ADR-018'),
    });
  });

  it('throws NOT_IMPLEMENTED for tiktok', async () => {
    enqueueStudioExtensionRow();
    const { socialPublishersRouter } = await import(
      '@/features/dmx-studio/routes/social-publishers'
    );
    const caller = socialPublishersRouter.createCaller(buildCtx());
    await expect(
      caller.publishVideo({
        projectId: '11111111-1111-4111-8111-111111111111',
        platform: 'tiktok',
        caption: 'Test caption',
        hashtags: [],
      }),
    ).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
    });
  });

  it('throws NOT_IMPLEMENTED for facebook', async () => {
    enqueueStudioExtensionRow();
    const { socialPublishersRouter } = await import(
      '@/features/dmx-studio/routes/social-publishers'
    );
    const caller = socialPublishersRouter.createCaller(buildCtx());
    await expect(
      caller.publishVideo({
        projectId: '11111111-1111-4111-8111-111111111111',
        platform: 'facebook',
        caption: 'Test caption',
        hashtags: [],
      }),
    ).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
    });
  });
});

describe('socialPublishersRouter.getOAuthUrl — STUB ADR-018 H2', () => {
  it('throws NOT_IMPLEMENTED for instagram', async () => {
    enqueueStudioExtensionRow();
    const { socialPublishersRouter } = await import(
      '@/features/dmx-studio/routes/social-publishers'
    );
    const caller = socialPublishersRouter.createCaller(buildCtx());
    await expect(
      caller.getOAuthUrl({
        platform: 'instagram',
        redirectUri: 'https://desarrollosmx.com/callback',
        state: 'state-123',
      }),
    ).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
    });
  });
});

describe('socialPublishersRouter.getPostStatus — STUB ADR-018 H2', () => {
  it('throws NOT_IMPLEMENTED for tiktok', async () => {
    enqueueStudioExtensionRow();
    const { socialPublishersRouter } = await import(
      '@/features/dmx-studio/routes/social-publishers'
    );
    const caller = socialPublishersRouter.createCaller(buildCtx());
    await expect(
      caller.getPostStatus({
        platform: 'tiktok',
        postId: 'post-123',
      }),
    ).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
    });
  });
});
