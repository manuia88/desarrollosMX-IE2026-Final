import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

interface QueryShape {
  readonly data: unknown;
  readonly error: unknown;
}

interface UpdateBuilder {
  readonly eq: (
    col: string,
    value: unknown,
  ) => {
    select: (cols: string) => {
      single: () => Promise<QueryShape>;
    };
  };
}

interface InsertBuilder {
  readonly select: (cols: string) => {
    single: () => Promise<QueryShape>;
  };
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

function insertBuilder(result: QueryShape): InsertBuilder {
  return {
    select: () => ({ single: () => Promise.resolve(result) }),
  };
}

function updateBuilder(result: QueryShape): UpdateBuilder {
  return {
    eq: () => ({
      select: () => ({ single: () => Promise.resolve(result) }),
    }),
  };
}

interface TableRegistry {
  insert?: QueryShape;
  update?: QueryShape;
  select?: QueryShape;
}

let tableRegistry: Record<string, TableRegistry> = {};

const baseCtxSupabaseRpc = vi.fn(async () => ({ data: true, error: null }));

interface CtxOverrides {
  readonly userId?: string | null;
  readonly rol?: string | null;
}

const DEFAULT_USER_UUID = 'c1111111-1111-4111-8111-111111111111';

function buildCtx(overrides: CtxOverrides = {}): Context {
  const userId = overrides.userId === null ? null : (overrides.userId ?? DEFAULT_USER_UUID);
  const profile =
    overrides.rol === null
      ? null
      : { id: userId ?? DEFAULT_USER_UUID, rol: overrides.rol ?? 'asesor' };

  // biome-ignore lint/suspicious/noExplicitAny: chained supabase stub
  const ctxSupabase: any = {
    rpc: baseCtxSupabaseRpc,
    from: (table: string) => {
      const reg = tableRegistry[table] ?? {};
      return {
        select: () => chainableSelect(reg.select ?? { data: [], error: null }),
        insert: (_row: unknown) => insertBuilder(reg.insert ?? { data: null, error: null }),
        update: (_row: unknown) => updateBuilder(reg.update ?? { data: null, error: null }),
      };
    },
  };

  return {
    supabase: ctxSupabase,
    headers: new Headers(),
    user: userId === null ? null : ({ id: userId, email: 'test@example.com' } as unknown as User),
    profile,
  } as unknown as Context;
}

beforeEach(() => {
  tableRegistry = {};
  baseCtxSupabaseRpc.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('crmRouter — module export smoke', () => {
  it('exports crmRouter with expected sub-routers', async () => {
    const mod = await import('@/features/crm/routes/crm');
    expect(mod.crmRouter).toBeDefined();
    const record = mod.crmRouter as unknown as Record<string, unknown>;
    expect(record.lead).toBeDefined();
    expect(record.deal).toBeDefined();
    expect(record.operacion).toBeDefined();
    expect(record.buyerTwin).toBeDefined();
    expect(record.referral).toBeDefined();
    expect(record.familyUnit).toBeDefined();
    expect(record.catalogs).toBeDefined();
  });

  it('CrmRouter type exported', async () => {
    const mod = await import('@/features/crm/routes/crm');
    expect(typeof mod.crmRouter).toBe('object');
  });
});

describe('crmRouter.lead — input validation + handler shape', () => {
  it('lead.create rejects when neither email nor phone provided (Zod refine)', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.lead.create({
        zone_id: 'a0000001-0000-4000-8000-000000000001',
        source_id: 'a0000002-0000-4000-8000-000000000002',
        country_code: 'MX',
        contact_name: 'no_contact',
      }),
    ).rejects.toThrow(/contact_email_or_phone_required/);
  });

  it('lead.create assigns assigned_asesor_id from ctx.user.id (server-side)', async () => {
    const userId = 'a0000099-0000-4000-8000-000000000099';
    tableRegistry = {
      leads: {
        insert: {
          data: {
            id: 'lead-id-x',
            assigned_asesor_id: userId,
            contact_name: 'Test Buyer',
          },
          error: null,
        },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId }));
    const result = await caller.lead.create({
      zone_id: 'a0000001-0000-4000-8000-000000000001',
      source_id: 'a0000002-0000-4000-8000-000000000002',
      country_code: 'MX',
      contact_name: 'Test Buyer',
      contact_phone: '+525512345678',
    });
    expect((result as { assigned_asesor_id: string }).assigned_asesor_id).toBe(userId);
  });

  it('lead.list returns empty array when no rows', async () => {
    tableRegistry = { leads: { select: { data: [], error: null } } };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.lead.list({ limit: 50 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('lead.updateStatus surfaces supabase error as TRPCError INTERNAL_SERVER_ERROR', async () => {
    tableRegistry = {
      leads: { update: { data: null, error: { message: 'rls_violation' } } },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.lead.updateStatus({
        lead_id: 'a0000010-0000-4000-8000-000000000010',
        status: 'qualified',
      }),
    ).rejects.toThrow(/rls_violation/);
  });

  it('lead.list rejects status outside enum', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
      caller.lead.list({ status: 'invented' as any, limit: 50 }),
    ).rejects.toThrow();
  });
});

describe('crmRouter.deal — input validation + cascade close path', () => {
  it('deal.create rejects amount = 0 (moneyAmountSchema positive)', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.deal.create({
        lead_id: 'a0000010-0000-4000-8000-000000000010',
        zone_id: 'a0000001-0000-4000-8000-000000000001',
        stage_id: 'a0000020-0000-4000-8000-000000000020',
        amount: 0,
        amount_currency: 'MXN',
        country_code: 'MX',
      }),
    ).rejects.toThrow();
  });

  it('deal.close throws NOT_FOUND when target stage slug missing in catalog', async () => {
    tableRegistry = {
      deal_stages: { select: { data: null, error: null } },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.deal.close({ deal_id: 'a0000030-0000-4000-8000-000000000030', outcome: 'won' }),
    ).rejects.toThrow(/deal_stage_not_found/);
  });

  it('deal.close happy path resolves stage_id and updates deal', async () => {
    const closedWonId = '99999999-9999-9999-9999-999999999999';
    tableRegistry = {
      deal_stages: { select: { data: { id: closedWonId }, error: null } },
      deals: {
        update: {
          data: { id: 'a0000030-0000-4000-8000-000000000030', stage_id: closedWonId },
          error: null,
        },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.deal.close({
      deal_id: 'a0000030-0000-4000-8000-000000000030',
      outcome: 'won',
    });
    expect((result as { stage_id: string }).stage_id).toBe(closedWonId);
  });

  it('deal.advanceStage rejects invalid uuid', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.deal.advanceStage({
        deal_id: 'not-a-uuid',
        stage_id: 'a0000020-0000-4000-8000-000000000020',
      }),
    ).rejects.toThrow();
  });
});

describe('crmRouter.operacion — input + commission rules', () => {
  it('operacion.create rejects commission_amount > 0 without commission_currency', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.operacion.create({
        deal_id: 'a0000030-0000-4000-8000-000000000030',
        operacion_type: 'venta',
        amount: 1500000,
        amount_currency: 'MXN',
        commission_amount: 45000,
        country_code: 'MX',
      }),
    ).rejects.toThrow(/commission_currency_required_when_amount/);
  });

  it('operacion.attachCfdi rejects malformed cfdi_uuid', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.operacion.attachCfdi({
        operacion_id: 'a0000040-0000-4000-8000-000000000040',
        cfdi_uuid: 'not-a-cfdi-uuid',
      }),
    ).rejects.toThrow(/cfdi_uuid_format_invalid/);
  });

  it('operacion.list returns array shape', async () => {
    tableRegistry = { operaciones: { select: { data: [], error: null } } };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.operacion.list({ limit: 50 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('crmRouter.buyerTwin — STUB ADR-018 marker + trait input rules', () => {
  it('buyerTwin.searchSimilar throws NOT_IMPLEMENTED with grep-able fase marker (ADR-018 STUB)', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.buyerTwin.searchSimilar({
        buyer_twin_id: 'a0000050-0000-4000-8000-000000000050',
        limit: 10,
      }),
    ).rejects.toThrow(/buyer_twin_similar_stub_fase_13_b_7/);
  });

  it('buyerTwin.computeTraits throws BAD_REQUEST when no profile provided', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.buyerTwin.computeTraits({
        buyer_twin_id: 'a0000050-0000-4000-8000-000000000050',
      }),
    ).rejects.toThrow(/no_profile_provided/);
  });

  it('buyerTwin.computeTraits accepts disc_profile with valid scores', async () => {
    tableRegistry = {
      buyer_twins: {
        update: {
          data: {
            id: 'a0000050-0000-4000-8000-000000000050',
            disc_profile: { D: 80, I: 60, S: 40, C: 30 },
          },
          error: null,
        },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.buyerTwin.computeTraits({
      buyer_twin_id: 'a0000050-0000-4000-8000-000000000050',
      disc_profile: { D: 80, I: 60, S: 40, C: 30 },
    });
    expect(result).toBeDefined();
  });

  it('buyerTwin.computeTraits rejects score above 100 (Zod)', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.buyerTwin.computeTraits({
        buyer_twin_id: 'a0000050-0000-4000-8000-000000000050',
        disc_profile: { D: 101 },
      }),
    ).rejects.toThrow();
  });
});

describe('crmRouter.referral — polymorphic + reward', () => {
  it('referral.attribute accepts source=user → target=deal polymorphic combo', async () => {
    tableRegistry = {
      referrals: {
        insert: {
          data: { id: 'ref-1', source_type: 'user', target_type: 'deal' },
          error: null,
        },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.referral.attribute({
      source_type: 'user',
      source_id: 'a0000060-0000-4000-8000-000000000060',
      target_type: 'deal',
      target_id: 'a0000061-0000-4000-8000-000000000061',
      country_code: 'MX',
    });
    expect((result as { source_type: string }).source_type).toBe('user');
  });

  it('referral.attribute accepts source=user → target=operacion polymorphic combo', async () => {
    tableRegistry = {
      referrals: {
        insert: {
          data: { id: 'ref-2', source_type: 'user', target_type: 'operacion' },
          error: null,
        },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.referral.attribute({
      source_type: 'user',
      source_id: 'a0000060-0000-4000-8000-000000000060',
      target_type: 'operacion',
      target_id: 'a0000062-0000-4000-8000-000000000062',
      country_code: 'MX',
    });
    expect((result as { target_type: string }).target_type).toBe('operacion');
  });

  it('referral.attribute rejects invalid source_type enum', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.referral.attribute({
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid enum
        source_type: 'invented' as any,
        source_id: 'a0000060-0000-4000-8000-000000000060',
        target_type: 'deal',
        target_id: 'a0000061-0000-4000-8000-000000000061',
        country_code: 'MX',
      }),
    ).rejects.toThrow();
  });

  it('referral.rewardPay surfaces supabase error', async () => {
    tableRegistry = {
      referral_rewards: {
        update: { data: null, error: { message: 'reward_not_found' } },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.referral.rewardPay({
        reward_id: 'a0000070-0000-4000-8000-000000000070',
        payment_method: 'spei',
        payment_reference: 'ref-2026-04',
      }),
    ).rejects.toThrow(/reward_not_found/);
  });
});

describe('crmRouter.familyUnit — relationship enum + happy path', () => {
  it('familyUnit.addMember rejects relationship outside enum', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.familyUnit.addMember({
        family_unit_id: 'a0000080-0000-4000-8000-000000000080',
        buyer_twin_id: 'a0000050-0000-4000-8000-000000000050',
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid enum
        relationship: 'cousin' as any,
        is_primary: false,
      }),
    ).rejects.toThrow();
  });

  it('familyUnit.addMember happy path inserts spouse member', async () => {
    tableRegistry = {
      family_unit_members: {
        insert: {
          data: { id: 'fum-1', relationship: 'spouse' },
          error: null,
        },
      },
    };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.familyUnit.addMember({
      family_unit_id: 'a0000080-0000-4000-8000-000000000080',
      buyer_twin_id: 'a0000050-0000-4000-8000-000000000050',
      relationship: 'spouse',
      is_primary: true,
    });
    expect((result as { relationship: string }).relationship).toBe('spouse');
  });

  it('familyUnit.create rejects unit_type outside enum', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      caller.familyUnit.create({
        primary_buyer_twin_id: 'a0000050-0000-4000-8000-000000000050',
        // biome-ignore lint/suspicious/noExplicitAny: testing invalid enum
        unit_type: 'tribe' as any,
        members_count: 2,
        country_code: 'MX',
      }),
    ).rejects.toThrow();
  });
});

describe('crmRouter.catalogs — query shape + filters', () => {
  it('catalogs.personaTypes returns array shape', async () => {
    tableRegistry = { persona_types: { select: { data: [], error: null } } };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.catalogs.personaTypes();
    expect(Array.isArray(result)).toBe(true);
  });

  it('catalogs.leadSources returns array shape', async () => {
    tableRegistry = { lead_sources: { select: { data: [], error: null } } };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.catalogs.leadSources();
    expect(Array.isArray(result)).toBe(true);
  });

  it('catalogs.dealStages returns array shape', async () => {
    tableRegistry = { deal_stages: { select: { data: [], error: null } } };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.catalogs.dealStages();
    expect(Array.isArray(result)).toBe(true);
  });

  it('catalogs.retentionPolicies accepts country_code filter', async () => {
    tableRegistry = { retention_policies: { select: { data: [], error: null } } };
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    const result = await caller.catalogs.retentionPolicies({ country_code: 'MX' });
    expect(Array.isArray(result)).toBe(true);
  });

  it('catalogs.retentionPolicies rejects invalid entity_type', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx());
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid enum
      caller.catalogs.retentionPolicies({ entity_type: 'invented' as any }),
    ).rejects.toThrow();
  });
});

describe('crmRouter — auth gate', () => {
  it('lead.list rejects when ctx.user is null (UNAUTHORIZED)', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: null }));
    await expect(caller.lead.list({ limit: 50 })).rejects.toThrow(/UNAUTHORIZED/);
  });

  it('catalogs.personaTypes rejects when ctx.user is null', async () => {
    const { crmRouter } = await import('@/features/crm/routes/crm');
    const caller = crmRouter.createCaller(buildCtx({ userId: null }));
    await expect(caller.catalogs.personaTypes()).rejects.toThrow(/UNAUTHORIZED/);
  });
});
