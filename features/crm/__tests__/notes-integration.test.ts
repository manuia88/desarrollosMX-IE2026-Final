import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

interface QueryShape {
  readonly data: unknown;
  readonly error: unknown;
}

function chainableSelect(result: QueryShape) {
  // biome-ignore lint/suspicious/noExplicitAny: chainable stub mimics supabase builder
  const chain: any = {
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    // biome-ignore lint/suspicious/noThenProperty: supabase select builder is thenable
    then: (resolve: (v: QueryShape) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

interface CapturedInsert {
  values: Record<string, unknown> | undefined;
}
const captured: CapturedInsert = { values: undefined };

function insertBuilder(result: QueryShape) {
  return (values: Record<string, unknown>) => {
    captured.values = values;
    return {
      select: () => ({ single: () => Promise.resolve(result) }),
    };
  };
}

interface CapturedUpdate {
  values: Record<string, unknown> | undefined;
  filterCol: string | undefined;
  filterValue: unknown;
}
const capturedUpdate: CapturedUpdate = {
  values: undefined,
  filterCol: undefined,
  filterValue: undefined,
};

function updateBuilder(result: QueryShape) {
  return (values: Record<string, unknown>) => {
    capturedUpdate.values = values;
    return {
      eq: (col: string, value: unknown) => {
        capturedUpdate.filterCol = col;
        capturedUpdate.filterValue = value;
        return {
          select: () => ({ single: () => Promise.resolve(result) }),
        };
      },
    };
  };
}

interface CapturedDelete {
  filterCol: string | undefined;
  filterValue: unknown;
}
const capturedDelete: CapturedDelete = {
  filterCol: undefined,
  filterValue: undefined,
};

function deleteBuilder(result: QueryShape) {
  return () => ({
    eq: (col: string, value: unknown) => {
      capturedDelete.filterCol = col;
      capturedDelete.filterValue = value;
      return Promise.resolve(result);
    },
  });
}

interface TableRegistry {
  insert?: QueryShape;
  update?: QueryShape;
  select?: QueryShape;
  delete?: QueryShape;
}

let tableRegistry: Record<string, TableRegistry> = {};

const DEFAULT_USER_UUID = 'a1111111-1111-4111-8111-111111111111';
const OTHER_USER_UUID = 'b2222222-2222-4222-8222-222222222222';

function buildCtx(overrides: { userId?: string | null } = {}): Context {
  const userId = overrides.userId === null ? null : (overrides.userId ?? DEFAULT_USER_UUID);

  // biome-ignore lint/suspicious/noExplicitAny: chained supabase stub
  const ctxSupabase: any = {
    rpc: vi.fn(async () => ({ data: true, error: null })),
    from: (table: string) => {
      const reg = tableRegistry[table] ?? {};
      return {
        select: () => chainableSelect(reg.select ?? { data: [], error: null }),
        insert: insertBuilder(reg.insert ?? { data: null, error: null }),
        update: updateBuilder(reg.update ?? { data: null, error: null }),
        delete: deleteBuilder(reg.delete ?? { data: null, error: null }),
      };
    },
  };

  return {
    supabase: ctxSupabase,
    headers: new Headers(),
    user: userId === null ? null : ({ id: userId, email: 'test@example.com' } as unknown as User),
    profile: userId === null ? null : { id: userId, rol: 'asesor' },
  } as unknown as Context;
}

beforeEach(() => {
  tableRegistry = {};
  captured.values = undefined;
  capturedUpdate.values = undefined;
  capturedUpdate.filterCol = undefined;
  capturedUpdate.filterValue = undefined;
  capturedDelete.filterCol = undefined;
  capturedDelete.filterValue = undefined;
});

afterEach(() => {
  vi.clearAllMocks();
});

const VALID_LEAD = 'c0000010-0000-4000-8000-000000000010';
const VALID_NOTE = 'd0000020-0000-4000-8000-000000000020';

describe('crmRouter.notes — auth gate', () => {
  it('list rejects when ctx.user is null (UNAUTHORIZED)', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: null }));
    await expect(caller.notes.list({ lead_id: VALID_LEAD, limit: 50 })).rejects.toThrow(
      /UNAUTHORIZED/,
    );
  });

  it('create rejects when ctx.user is null (UNAUTHORIZED)', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: null }));
    await expect(
      caller.notes.create({ lead_id: VALID_LEAD, level: 'personal', content_md: 'note' }),
    ).rejects.toThrow(/UNAUTHORIZED/);
  });
});

describe('crmRouter.notes.create — author ownership force from ctx.user.id', () => {
  it('forces author_user_id = ctx.user.id (server-side, ignores any client-supplied value)', async () => {
    tableRegistry = {
      contact_notes: {
        insert: {
          data: {
            id: VALID_NOTE,
            lead_id: VALID_LEAD,
            level: 'personal',
            author_user_id: DEFAULT_USER_UUID,
            content_md: 'mine',
            created_at: '2026-04-27T10:00:00Z',
            updated_at: '2026-04-27T10:00:00Z',
          },
          error: null,
        },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: DEFAULT_USER_UUID }));
    await caller.notes.create({
      lead_id: VALID_LEAD,
      level: 'personal',
      content_md: 'mine',
    });
    expect(captured.values?.author_user_id).toBe(DEFAULT_USER_UUID);
    expect(captured.values?.lead_id).toBe(VALID_LEAD);
    expect(captured.values?.level).toBe('personal');
    expect(captured.values?.content_md).toBe('mine');
  });

  it('different ctx.user.id ⇒ different author_user_id captured', async () => {
    tableRegistry = {
      contact_notes: {
        insert: {
          data: { id: VALID_NOTE, author_user_id: OTHER_USER_UUID },
          error: null,
        },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: OTHER_USER_UUID }));
    await caller.notes.create({
      lead_id: VALID_LEAD,
      level: 'colaborativo',
      content_md: 'team note',
    });
    expect(captured.values?.author_user_id).toBe(OTHER_USER_UUID);
    expect(captured.values?.level).toBe('colaborativo');
  });
});

describe('crmRouter.notes.create — level enforcement (Zod)', () => {
  it('rejects invented level outside enum', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.notes.create({
        lead_id: VALID_LEAD,
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid enum at runtime
        level: 'private' as any,
        content_md: 'note',
      }),
    ).rejects.toThrow();
  });

  it('rejects empty content_md after trim', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.notes.create({ lead_id: VALID_LEAD, level: 'personal', content_md: '   ' }),
    ).rejects.toThrow();
  });

  it('rejects oversize content_md (>8000)', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.notes.create({
        lead_id: VALID_LEAD,
        level: 'personal',
        content_md: 'x'.repeat(8001),
      }),
    ).rejects.toThrow();
  });
});

describe('crmRouter.notes.update — author update semantics + RLS surface', () => {
  it('happy path returns updated row', async () => {
    tableRegistry = {
      contact_notes: {
        update: {
          data: {
            id: VALID_NOTE,
            content_md: 'edited',
            author_user_id: DEFAULT_USER_UUID,
          },
          error: null,
        },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: DEFAULT_USER_UUID }));
    const result = await caller.notes.update({ id: VALID_NOTE, content_md: 'edited' });
    expect((result as { content_md: string }).content_md).toBe('edited');
    expect(capturedUpdate.values?.content_md).toBe('edited');
    expect(capturedUpdate.filterCol).toBe('id');
    expect(capturedUpdate.filterValue).toBe(VALID_NOTE);
  });

  it('surfaces supabase RLS violation as TRPCError when caller is not author (mock simulates RLS reject)', async () => {
    tableRegistry = {
      contact_notes: {
        update: { data: null, error: { message: 'rls_violation' } },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: OTHER_USER_UUID }));
    await expect(
      caller.notes.update({ id: VALID_NOTE, content_md: 'attempted edit by non-author' }),
    ).rejects.toThrow(/rls_violation/);
  });

  it('returns NOT_FOUND when update returns null without error (RLS silently filtered)', async () => {
    tableRegistry = {
      contact_notes: {
        update: { data: null, error: null },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: OTHER_USER_UUID }));
    await expect(
      caller.notes.update({ id: VALID_NOTE, content_md: 'edit by non-author' }),
    ).rejects.toThrow(/contact_note_not_found_or_forbidden/);
  });

  it('rejects invalid uuid for id', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid uuid
      caller.notes.update({ id: 'not-a-uuid' as any, content_md: 'edit' }),
    ).rejects.toThrow();
  });
});

describe('crmRouter.notes.delete — author ownership via RLS', () => {
  it('happy path returns ok=true', async () => {
    tableRegistry = {
      contact_notes: { delete: { data: null, error: null } },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: DEFAULT_USER_UUID }));
    const result = await caller.notes.delete({ id: VALID_NOTE });
    expect(result.ok).toBe(true);
    expect(result.id).toBe(VALID_NOTE);
    expect(capturedDelete.filterCol).toBe('id');
    expect(capturedDelete.filterValue).toBe(VALID_NOTE);
  });

  it('surfaces RLS error when non-author attempts delete', async () => {
    tableRegistry = {
      contact_notes: { delete: { data: null, error: { message: 'rls_violation' } } },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: OTHER_USER_UUID }));
    await expect(caller.notes.delete({ id: VALID_NOTE })).rejects.toThrow(/rls_violation/);
  });
});

describe('crmRouter.notes.list — query shape', () => {
  it('returns empty array when no rows', async () => {
    tableRegistry = { contact_notes: { select: { data: [], error: null } } };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.notes.list({ lead_id: VALID_LEAD, limit: 50 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('rejects invalid lead_id uuid', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid uuid
      caller.notes.list({ lead_id: 'not-a-uuid' as any, limit: 50 }),
    ).rejects.toThrow();
  });
});
