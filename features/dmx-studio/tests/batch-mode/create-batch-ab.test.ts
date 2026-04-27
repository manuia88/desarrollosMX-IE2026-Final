// F14.F.5 Sprint 4 — createBatchAB tests (Modo A: pure function + mocked supabase).
// Cubre: agency requirement (FORBIDDEN si no agency), 3 clones created, parent_project_id
// almacenado en meta jsonb del child.

import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBatchAB } from '@/features/dmx-studio/lib/batch-mode';
import type { Database } from '@/shared/types/database';

interface RecordedInsert {
  table: string;
  payload: Record<string, unknown>;
}
interface RecordedUpdate {
  table: string;
  payload: Record<string, unknown>;
  eqs: Array<{ col: string; val: unknown }>;
}

interface MockRegistry {
  inserts: RecordedInsert[];
  updates: RecordedUpdate[];
  maybeSingleByTable: Record<string, Array<{ data: unknown; error: unknown }>>;
  insertReturnByTable: Record<string, { data: unknown; error: unknown }>;
}

let registry: MockRegistry = {
  inserts: [],
  updates: [],
  maybeSingleByTable: {},
  insertReturnByTable: {},
};

function resetRegistry() {
  registry = {
    inserts: [],
    updates: [],
    maybeSingleByTable: {},
    insertReturnByTable: {},
  };
}

function popMaybeSingle(table: string): { data: unknown; error: unknown } {
  const queue = registry.maybeSingleByTable[table];
  if (!queue || queue.length === 0) return { data: null, error: null };
  return queue.shift() ?? { data: null, error: null };
}

function buildClient(): SupabaseClient<Database> {
  const client = {
    from(table: string) {
      const selectChain = (_cols?: string) => {
        const builder: Record<string, unknown> = {};
        const pass = (() => builder) as () => typeof builder;
        builder.eq = pass;
        builder.in = pass;
        builder.order = pass;
        builder.limit = pass;
        builder.maybeSingle = async () => popMaybeSingle(table);
        builder.single = async () => popMaybeSingle(table);
        return builder;
      };

      const insertChain = (payload: Record<string, unknown>) => {
        registry.inserts.push({ table, payload });
        const builder: Record<string, unknown> = {};
        builder.select = (_cols?: string) => {
          const inner: Record<string, unknown> = {};
          inner.single = async () => {
            const r = registry.insertReturnByTable[table];
            if (r) return r;
            return { data: null, error: null };
          };
          return inner;
        };
        return builder;
      };

      const updateChain = (payload: Record<string, unknown>) => {
        const updEqs: Array<{ col: string; val: unknown }> = [];
        const builder: Record<string, unknown> = {};
        builder.eq = (col: string, val: unknown) => {
          updEqs.push({ col, val });
          return builder;
        };
        // biome-ignore lint/suspicious/noThenProperty: thenable matches supabase shape
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
  return client as unknown as SupabaseClient<Database>;
}

const USER_ID = 'aa111111-1111-4111-8111-111111111111';
const PROJECT_ID = 'bb222222-2222-4222-8222-222222222222';

function enqueueAgencySubscription() {
  registry.maybeSingleByTable.studio_subscriptions =
    registry.maybeSingleByTable.studio_subscriptions ?? [];
  registry.maybeSingleByTable.studio_subscriptions.push({
    data: { plan_key: 'agency', status: 'active' },
    error: null,
  });
}

function enqueueProSubscription() {
  registry.maybeSingleByTable.studio_subscriptions =
    registry.maybeSingleByTable.studio_subscriptions ?? [];
  registry.maybeSingleByTable.studio_subscriptions.push({
    data: { plan_key: 'pro', status: 'active' },
    error: null,
  });
}

function enqueueBaseProject() {
  registry.maybeSingleByTable.studio_video_projects =
    registry.maybeSingleByTable.studio_video_projects ?? [];
  registry.maybeSingleByTable.studio_video_projects.push({
    data: {
      id: PROJECT_ID,
      user_id: USER_ID,
      title: 'Polanco PH',
      project_type: 'standard',
      source_metadata: { property: { zone: 'Polanco' } },
      style_template_id: null,
      voice_clone_id: null,
      proyecto_id: null,
      unidad_id: null,
      captacion_id: null,
      organization_id: null,
      meta: {},
    },
    error: null,
  });
}

function enqueueStyleTemplateLookups() {
  registry.maybeSingleByTable.studio_style_templates =
    registry.maybeSingleByTable.studio_style_templates ?? [];
  registry.maybeSingleByTable.studio_style_templates.push(
    { data: { id: 'tpl-luxe' }, error: null },
    { data: { id: 'tpl-fam' }, error: null },
    { data: { id: 'tpl-inv' }, error: null },
  );
}

function enqueueChildInsertReturn() {
  // Each insert returns a row with id; createBatchAB calls insert 3 times.
  // The mock uses one insertReturnByTable entry; we'll mutate the id per call
  // by using a queue style via maybeSingle pattern. Instead, we mutate the
  // returned id deterministically via a counter wrapper.
  let counter = 0;
  registry.insertReturnByTable.studio_video_projects = {
    get data() {
      counter += 1;
      return { id: `child-${counter}` };
    },
    error: null,
  } as unknown as { data: unknown; error: unknown };
}

beforeEach(() => {
  resetRegistry();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('createBatchAB — agency requirement', () => {
  it('throws FORBIDDEN when user is not on agency plan', async () => {
    enqueueProSubscription();

    const client = buildClient();
    let caught: unknown = null;
    try {
      await createBatchAB(client, PROJECT_ID, USER_ID);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TRPCError);
    expect((caught as TRPCError).code).toBe('FORBIDDEN');
  });

  it('throws FORBIDDEN when user has no active subscription', async () => {
    // Push null row
    registry.maybeSingleByTable.studio_subscriptions = [{ data: null, error: null }];

    const client = buildClient();
    let caught: unknown = null;
    try {
      await createBatchAB(client, PROJECT_ID, USER_ID);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TRPCError);
    expect((caught as TRPCError).code).toBe('FORBIDDEN');
  });
});

describe('createBatchAB — happy path (agency)', () => {
  it('creates 3 child projects with parent_project_id stored in meta jsonb', async () => {
    enqueueAgencySubscription();
    enqueueBaseProject();
    enqueueStyleTemplateLookups();
    enqueueChildInsertReturn();

    const client = buildClient();
    const result = await createBatchAB(client, PROJECT_ID, USER_ID);

    expect(result.parentProjectId).toBe(PROJECT_ID);
    expect(result.batchProjectIds.length).toBe(3);

    const childInserts = registry.inserts.filter((i) => i.table === 'studio_video_projects');
    expect(childInserts.length).toBe(3);

    // Each insert payload must reference parent_project_id in meta + correct variant
    const variants = childInserts.map(
      (i) => (i.payload.meta as { batch_variant: string }).batch_variant,
    );
    expect(variants.sort()).toEqual(['familiar', 'inversionista', 'lujo']);

    for (const insert of childInserts) {
      const meta = insert.payload.meta as Record<string, unknown>;
      expect(meta.parent_project_id).toBe(PROJECT_ID);
      expect(meta.batch_pending).toBe(true);
      expect(meta.style_overrides).toBeDefined();
      expect(insert.payload.status).toBe('draft');
      expect(insert.payload.user_id).toBe(USER_ID);
    }

    // Parent update marks batch_root + batch_children
    const parentUpdates = registry.updates.filter((u) => u.table === 'studio_video_projects');
    expect(parentUpdates.length).toBe(1);
    const parentUpdate = parentUpdates[0];
    expect(parentUpdate).toBeDefined();
    const parentMeta = parentUpdate?.payload.meta as Record<string, unknown>;
    expect(parentMeta.batch_root).toBe(true);
    expect(Array.isArray(parentMeta.batch_children)).toBe(true);
    expect((parentMeta.batch_children as unknown[]).length).toBe(3);
    expect(parentMeta.batch_styles).toEqual(['lujo', 'familiar', 'inversionista']);
  });

  it('respects custom styles array when provided', async () => {
    enqueueAgencySubscription();
    enqueueBaseProject();
    // Only 1 style requested → only 1 template lookup needed
    registry.maybeSingleByTable.studio_style_templates = [
      { data: { id: 'tpl-luxe' }, error: null },
    ];
    enqueueChildInsertReturn();

    const client = buildClient();
    const result = await createBatchAB(client, PROJECT_ID, USER_ID, ['lujo']);

    expect(result.batchProjectIds.length).toBe(1);
    const childInserts = registry.inserts.filter((i) => i.table === 'studio_video_projects');
    expect(childInserts.length).toBe(1);
    const meta = childInserts[0]?.payload.meta as Record<string, unknown>;
    expect(meta.batch_variant).toBe('lujo');
  });
});
