// FASE 14.F.4 Sprint 3 — Copy Pack tRPC router tests (Modo A createCaller mocks).
// Mocks: createAdminClient (supabase) + lib director copy-pack + variations + competition.
// Cubre: generate inserts 5 outputs + 5 versions, regenerateOutput inserts 3 tones,
// selectVariation updates is_current + content, competitionAnalysis returns insight.

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

// -----------------------------------------------------------------------------
// Mock harness for supabase admin client (createAdminClient).
// -----------------------------------------------------------------------------

interface RecordedInsert {
  table: string;
  payload: unknown;
}

interface RecordedUpdate {
  table: string;
  payload: unknown;
  eqs: Array<{ col: string; val: unknown }>;
}

interface AdminMockRegistry {
  inserts: RecordedInsert[];
  updates: RecordedUpdate[];
  // Per-table maybeSingle responses keyed by call order
  maybeSingleByTable: Record<string, Array<{ data: unknown; error: unknown }>>;
  selectByTable: Record<string, { data: unknown[]; error: unknown }>;
  insertReturnByTable: Record<string, { data: unknown; error: unknown }>;
  insertManyReturnByTable: Record<string, { data: unknown[]; error: unknown }>;
}

let registry: AdminMockRegistry = {
  inserts: [],
  updates: [],
  maybeSingleByTable: {},
  selectByTable: {},
  insertReturnByTable: {},
  insertManyReturnByTable: {},
};

function resetRegistry() {
  registry = {
    inserts: [],
    updates: [],
    maybeSingleByTable: {},
    selectByTable: {},
    insertReturnByTable: {},
    insertManyReturnByTable: {},
  };
}

function popMaybeSingle(table: string): { data: unknown; error: unknown } {
  const queue = registry.maybeSingleByTable[table];
  if (!queue || queue.length === 0) {
    return { data: null, error: null };
  }
  const next = queue.shift();
  return next ?? { data: null, error: null };
}

function buildAdminClient() {
  return {
    from(table: string) {
      const eqs: Array<{ col: string; val: unknown }> = [];

      const selectChain = (_cols?: string) => {
        // builder offers .eq().eq().maybeSingle() / .single() / .order() / await
        const builder: Record<string, unknown> = {};
        const pass = (() => builder) as () => typeof builder;
        builder.eq = (col: string, val: unknown) => {
          eqs.push({ col, val });
          return builder;
        };
        builder.gte = pass;
        builder.lte = pass;
        builder.in = pass;
        builder.order = pass;
        builder.limit = pass;
        builder.maybeSingle = async () => popMaybeSingle(table);
        builder.single = async () => popMaybeSingle(table);
        // thenable for `await supabase.from(t).select(...)` (list query)
        // biome-ignore lint/suspicious/noThenProperty: thenable mock
        builder.then = (resolve: (v: { data: unknown[]; error: unknown }) => void) => {
          const r = registry.selectByTable[table] ?? { data: [], error: null };
          resolve(r);
        };
        return builder;
      };

      const insertChain = (payload: unknown) => {
        registry.inserts.push({ table, payload });
        const builder: Record<string, unknown> = {};
        // .select(cols).single() pattern — used by generate
        builder.select = (_cols?: string) => {
          const inner: Record<string, unknown> = {};
          inner.single = async () => {
            const r = registry.insertReturnByTable[table];
            if (r) return r;
            return { data: null, error: null };
          };
          // .select(cols) without .single() returns thenable that yields list
          // biome-ignore lint/suspicious/noThenProperty: thenable mock matches supabase shape
          inner.then = (resolve: (v: { data: unknown[]; error: unknown }) => void) => {
            const r = registry.insertManyReturnByTable[table] ?? { data: [], error: null };
            resolve(r);
          };
          return inner;
        };
        // Bare insert (no .select) → Promise<{error}>
        // biome-ignore lint/suspicious/noThenProperty: thenable mock
        builder.then = (resolve: (v: { error: unknown }) => void) => {
          resolve({ error: null });
        };
        return builder;
      };

      const updateChain = (payload: unknown) => {
        const updEqs: Array<{ col: string; val: unknown }> = [];
        const builder: Record<string, unknown> = {};
        builder.eq = (col: string, val: unknown) => {
          updEqs.push({ col, val });
          return builder;
        };
        // biome-ignore lint/suspicious/noThenProperty: thenable mock
        builder.then = (resolve: (v: { error: unknown }) => void) => {
          registry.updates.push({ table, payload, eqs: updEqs });
          resolve({ error: null });
        };
        return builder;
      };

      return {
        select: selectChain,
        insert: insertChain,
        update: updateChain,
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

// Mock copy-pack lib + variations + competition-analysis
const generateCompleteCopyPackMock = vi.fn(async () => ({
  captionInstagram: 'caption ig',
  hashtags: ['#cdmx'],
  messageWhatsapp: 'mensaje wa',
  whatsappDeepLink: 'https://wa.me/525512345678?text=mensaje',
  descriptionPortal: 'descripción portal',
  narrationScript: 'guion',
  videoTitle: 'titulo',
  costUsd: 0.025,
  aiModel: 'claude-sonnet-4-5',
}));

const generateThreeVariationsMock = vi.fn(async () => ({
  formal: 'version formal',
  cercano: 'version cercana',
  aspiracional: 'version aspiracional',
  costUsd: 0.012,
  aiModel: 'claude-sonnet-4-5',
}));

const analyzeCompetitionMock = vi.fn(async () => ({
  distinctiveHooks: ['Vista panorámica', 'Terraza privada', 'Acabados premium'],
  similarListingsAssumed: 12,
  costUsd: 0.005,
  aiModel: 'claude-sonnet-4-5',
}));

vi.mock('@/features/dmx-studio/lib/director/copy-pack', () => ({
  generateCompleteCopyPack: generateCompleteCopyPackMock,
}));

vi.mock('@/features/dmx-studio/lib/director/copy-pack/variations', () => ({
  generateThreeVariations: generateThreeVariationsMock,
}));

vi.mock('@/features/dmx-studio/lib/competition-analysis', () => ({
  analyzeCompetition: analyzeCompetitionMock,
}));

// -----------------------------------------------------------------------------
// Context builder for createCaller. studioProcedure also queries
// studio_users_extension via createAdminClient — we satisfy that by enqueueing
// a maybeSingle response per call.
// -----------------------------------------------------------------------------

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';
const DEFAULT_PROJECT_ID = 'bb222222-2222-4222-8222-222222222222';
const DEFAULT_BRAND_KIT_ID = 'cc333333-3333-4333-8333-333333333333';
const DEFAULT_OUTPUT_ID = 'dd444444-4444-4444-8444-444444444444';
const DEFAULT_VERSION_ID = 'ee555555-5555-4555-8555-555555555555';

function buildCtx(): Context {
  // ctx.supabase only used by authenticatedProcedure middleware (rate-limit RPC).
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

function enqueueStudioExtensionRow() {
  registry.maybeSingleByTable.studio_users_extension =
    registry.maybeSingleByTable.studio_users_extension ?? [];
  registry.maybeSingleByTable.studio_users_extension.push({
    data: {
      studio_role: 'studio_user',
      organization_id: null,
      onboarding_completed: true,
    },
    error: null,
  });
}

beforeEach(() => {
  resetRegistry();
  generateCompleteCopyPackMock.mockClear();
  generateThreeVariationsMock.mockClear();
  analyzeCompetitionMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------------
// Tests.
// -----------------------------------------------------------------------------

describe('studioCopyPackRouter — module export smoke', () => {
  it('exports studioCopyPackRouter with expected procedures', async () => {
    const mod = await import('@/features/dmx-studio/routes/copy-pack');
    const r = mod.studioCopyPackRouter as unknown as { _def: { record: Record<string, unknown> } };
    const names = Object.keys(r._def.record).sort();
    expect(names).toEqual(
      [
        'competitionAnalysis',
        'generate',
        'getByProject',
        'getVariations',
        'regenerateOutput',
        'selectVariation',
      ].sort(),
    );
  });
});

describe('studioCopyPackRouter.generate', () => {
  it('inserts 5 studio_copy_outputs + 5 original-tone studio_copy_versions', async () => {
    enqueueStudioExtensionRow();
    // Project lookup
    registry.maybeSingleByTable.studio_video_projects = [
      {
        data: {
          id: DEFAULT_PROJECT_ID,
          title: 'Polanco PH',
          source_metadata: {
            price: 250000,
            areaM2: 120,
            bedrooms: 3,
            bathrooms: 2,
            zone: 'Polanco',
          },
          brand_kit_id: DEFAULT_BRAND_KIT_ID,
        },
        error: null,
      },
    ];
    // Brand kit lookup
    registry.maybeSingleByTable.studio_brand_kits = [
      {
        data: { display_name: 'Manu', contact_phone: '+52 55 1234 5678', tone: 'professional' },
        error: null,
      },
    ];
    // Each insert into studio_copy_outputs returns a row with id+channel for .select().single()
    registry.insertReturnByTable.studio_copy_outputs = {
      data: { id: DEFAULT_OUTPUT_ID, channel: 'instagram_caption' },
      error: null,
    };

    const { studioCopyPackRouter } = await import('@/features/dmx-studio/routes/copy-pack');
    const caller = studioCopyPackRouter.createCaller(buildCtx());
    const result = await caller.generate({ projectId: DEFAULT_PROJECT_ID });

    expect(result.copyOutputs.length).toBe(5);
    expect(result.costUsd).toBeCloseTo(0.025, 5);
    expect(generateCompleteCopyPackMock).toHaveBeenCalledTimes(1);

    const outputInserts = registry.inserts.filter((i) => i.table === 'studio_copy_outputs');
    expect(outputInserts.length).toBe(5);
    const channels = outputInserts.map((i) => (i.payload as { channel: string }).channel).sort();
    expect(channels).toEqual(
      [
        'instagram_caption',
        'narration_script',
        'portal_listing',
        'video_title',
        'wa_message',
      ].sort(),
    );

    const versionInserts = registry.inserts.filter((i) => i.table === 'studio_copy_versions');
    expect(versionInserts.length).toBe(5);
    for (const v of versionInserts) {
      const payload = v.payload as { tone: string; is_current: boolean; version_number: number };
      expect(payload.tone).toBe('original');
      expect(payload.is_current).toBe(true);
      expect(payload.version_number).toBe(1);
    }
  });
});

describe('studioCopyPackRouter.regenerateOutput', () => {
  it('inserts 3 versions with tones formal/cercano/aspiracional', async () => {
    enqueueStudioExtensionRow();
    // Output lookup
    registry.maybeSingleByTable.studio_copy_outputs = [
      {
        data: { id: DEFAULT_OUTPUT_ID, channel: 'instagram_caption', content: 'original content' },
        error: null,
      },
    ];
    // existing max version_number lookup → no prior versions returned (next=1)
    registry.maybeSingleByTable.studio_copy_versions = [{ data: null, error: null }];
    // 3 inserted versions return shape
    registry.insertManyReturnByTable.studio_copy_versions = {
      data: [
        { id: 'v1', tone: 'formal', content: 'version formal', version_number: 1 },
        { id: 'v2', tone: 'cercano', content: 'version cercana', version_number: 2 },
        { id: 'v3', tone: 'aspiracional', content: 'version aspiracional', version_number: 3 },
      ],
      error: null,
    };

    const { studioCopyPackRouter } = await import('@/features/dmx-studio/routes/copy-pack');
    const caller = studioCopyPackRouter.createCaller(buildCtx());
    const result = await caller.regenerateOutput({ copyOutputId: DEFAULT_OUTPUT_ID });

    expect(result.variations.length).toBe(3);
    expect(result.costUsd).toBeCloseTo(0.012, 5);
    expect(generateThreeVariationsMock).toHaveBeenCalledTimes(1);

    const versionInserts = registry.inserts.filter((i) => i.table === 'studio_copy_versions');
    expect(versionInserts.length).toBe(1); // Single bulk insert (array payload)
    const payload = versionInserts[0]?.payload as Array<{ tone: string; is_current: boolean }>;
    expect(Array.isArray(payload)).toBe(true);
    expect(payload.length).toBe(3);
    const tones = payload.map((p) => p.tone).sort();
    expect(tones).toEqual(['aspiracional', 'cercano', 'formal']);
    for (const row of payload) {
      expect(row.is_current).toBe(false);
    }
  });
});

describe('studioCopyPackRouter.selectVariation', () => {
  it('updates is_current flag + propagates content to studio_copy_outputs', async () => {
    enqueueStudioExtensionRow();
    // Output exists
    registry.maybeSingleByTable.studio_copy_outputs = [
      { data: { id: DEFAULT_OUTPUT_ID }, error: null },
    ];
    // Version exists
    registry.maybeSingleByTable.studio_copy_versions = [
      { data: { id: DEFAULT_VERSION_ID, content: 'chosen content' }, error: null },
    ];

    const { studioCopyPackRouter } = await import('@/features/dmx-studio/routes/copy-pack');
    const caller = studioCopyPackRouter.createCaller(buildCtx());
    const result = await caller.selectVariation({
      copyOutputId: DEFAULT_OUTPUT_ID,
      versionId: DEFAULT_VERSION_ID,
    });

    expect(result.ok).toBe(true);

    // 1st update: clear all is_current=false on copy_versions
    const versionUpdates = registry.updates.filter((u) => u.table === 'studio_copy_versions');
    expect(versionUpdates.length).toBeGreaterThanOrEqual(2);
    const clearedUpdate = versionUpdates.find(
      (u) => (u.payload as { is_current: boolean }).is_current === false,
    );
    expect(clearedUpdate).toBeDefined();
    const setCurrentUpdate = versionUpdates.find(
      (u) => (u.payload as { is_current: boolean }).is_current === true,
    );
    expect(setCurrentUpdate).toBeDefined();

    // copy_outputs update propagates content + selected_by_user
    const outputUpdate = registry.updates.find((u) => u.table === 'studio_copy_outputs');
    expect(outputUpdate).toBeDefined();
    const outPayload = outputUpdate?.payload as { content: string; selected_by_user: boolean };
    expect(outPayload.content).toBe('chosen content');
    expect(outPayload.selected_by_user).toBe(true);
  });
});

describe('studioCopyPackRouter.competitionAnalysis', () => {
  it('returns insight from analyzeCompetition with similarListingsCount + hooks', async () => {
    enqueueStudioExtensionRow();
    registry.maybeSingleByTable.studio_video_projects = [
      {
        data: {
          id: DEFAULT_PROJECT_ID,
          title: 'Polanco PH',
          source_metadata: {
            price: 250000,
            areaM2: 120,
            bedrooms: 3,
            bathrooms: 2,
            zone: 'Polanco',
          },
        },
        error: null,
      },
    ];

    const { studioCopyPackRouter } = await import('@/features/dmx-studio/routes/copy-pack');
    const caller = studioCopyPackRouter.createCaller(buildCtx());
    const result = (await caller.competitionAnalysis({ projectId: DEFAULT_PROJECT_ID })) as {
      distinctiveHooks: ReadonlyArray<string>;
      similarListingsAssumed: number;
      aiModel: string;
    };

    expect(analyzeCompetitionMock).toHaveBeenCalledTimes(1);
    expect(result.similarListingsAssumed).toBe(12);
    expect(result.distinctiveHooks).toHaveLength(3);
    expect(result.distinctiveHooks[0]).toBe('Vista panorámica');
    expect(result.aiModel).toBe('claude-sonnet-4-5');
  });
});
