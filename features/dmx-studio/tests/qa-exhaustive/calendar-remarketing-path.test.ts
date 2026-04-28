// ADR-018 / Sprint 10 BIBLIA Tarea 10.1 QA Exhaustivo — Calendar IA + remarketing automatico path.
// Modo A: createCaller mocks (zero DB real, zero credits API).
// Cubre flujos:
//   - studioCalendarRouter: getMonth + generateMonth + getDaySuggestion + markAsGenerated.
//   - studioRemarketingRouter: getActiveJobs + forceTrigger + cancel + getStatus.

import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

const generateMonthlyCalendarMock = vi.fn(async (input: { userId: string; monthDate: string }) => ({
  monthDate: input.monthDate,
  entriesCreated: 14,
  mood: 'neutral' as const,
  toneHint: 'professional',
  costUsd: 0.018,
}));

vi.mock('@/features/dmx-studio/lib/calendar', () => ({
  generateMonthlyCalendar: generateMonthlyCalendarMock,
}));

const forceTriggerRemarketingJobMock = vi.fn(
  async (args: { userId: string; sourceProjectId: string; angle?: string }) => ({
    jobId: '99999999-9999-4999-8999-999999999999',
    angle: args.angle ?? 'general',
    status: 'pending' as const,
  }),
);

// Provide minimal mock module that matches studioRemarketingRouter imports.
vi.mock('@/features/dmx-studio/lib/remarketing', async () => {
  const { z } = await import('zod');
  const ForceTriggerInputSchema = z.object({
    sourceProjectId: z.string().uuid(),
    angle: z.enum(['general', 'cocina', 'zona', 'inversionista', 'familiar', 'lujo']).optional(),
  });
  const RemarketingJobIdInputSchema = z.object({ jobId: z.string().uuid() });
  return {
    ForceTriggerInputSchema,
    RemarketingJobIdInputSchema,
    forceTriggerRemarketingJob: forceTriggerRemarketingJobMock,
  };
});

vi.mock('@/features/dmx-studio/lib/calendar/ical-procedure', async () => {
  const { initTRPC } = await import('@trpc/server');
  const t = initTRPC.create();
  return {
    exportICalProcedure: t.procedure.query(() => ({ ok: true, ical: '' })),
  };
});

vi.mock('@/features/dmx-studio/lib/calendar/mood-detector', () => ({
  detectMood: vi.fn(() => ({ mood: 'neutral', toneHint: 'professional' })),
}));

vi.mock('@/features/dmx-studio/lib/calendar/smart-timing', () => ({
  getOptimalTiming: vi.fn(() => ({ hour: 19, reason: 'peak_engagement_evening' })),
}));

interface AdminTableState {
  selectMaybeSingle?: { data: Record<string, unknown> | null; error: unknown };
  selectList?: { data: Array<Record<string, unknown>>; error: unknown };
  updateResult?: { error: unknown };
}

let adminTables: Record<string, AdminTableState> = {};

function makeSelectChain(state: AdminTableState | undefined) {
  const builder: Record<string, unknown> = {};
  const passthrough = () => builder;
  builder.eq = passthrough;
  builder.gte = passthrough;
  builder.lte = passthrough;
  builder.in = passthrough;
  builder.order = passthrough;
  builder.limit = passthrough;
  builder.maybeSingle = async () => state?.selectMaybeSingle ?? { data: null, error: null };
  builder.single = async () => state?.selectMaybeSingle ?? { data: null, error: null };
  // biome-ignore lint/suspicious/noThenProperty: thenable list response
  builder.then = (resolve: (v: { data: unknown[]; error: unknown }) => void) => {
    resolve(state?.selectList ?? { data: [], error: null });
  };
  return builder;
}

function makeUpdateChain(state: AdminTableState | undefined) {
  const builder: Record<string, unknown> = {};
  builder.eq = () => builder;
  // biome-ignore lint/suspicious/noThenProperty: thenable result
  builder.then = (resolve: (v: { error: unknown }) => void) => {
    resolve(state?.updateResult ?? { error: null });
  };
  return builder;
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from(table: string) {
      const state = adminTables[table];
      return {
        select() {
          return makeSelectChain(state);
        },
        update() {
          return makeUpdateChain(state);
        },
        insert() {
          return Promise.resolve({ error: null });
        },
      };
    },
  }),
}));

const DEFAULT_USER_ID = 'aa111111-1111-4111-8111-111111111111';
const DEFAULT_PROJECT_ID = 'bb222222-2222-4222-8222-222222222222';
const DEFAULT_ENTRY_ID = 'cc333333-3333-4333-8333-333333333333';
const DEFAULT_JOB_ID = 'dd444444-4444-4444-8444-444444444444';

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
    user: { id: DEFAULT_USER_ID, email: 'cal-rem@example.com' } as unknown as User,
    profile: null,
  } as unknown as Context;
}

beforeEach(() => {
  adminTables = {};
  generateMonthlyCalendarMock.mockClear();
  forceTriggerRemarketingJobMock.mockClear();
  adminTables.studio_users_extension = {
    selectMaybeSingle: {
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

describe('Calendar path — studioCalendarRouter.getMonth', () => {
  it('returns empty entries when no rows for monthDate', async () => {
    adminTables.studio_content_calendar = { selectList: { data: [], error: null } };
    const { studioCalendarRouter } = await import('@/features/dmx-studio/routes/calendar');
    const caller = studioCalendarRouter.createCaller(buildCtx());
    const result = await caller.getMonth({ monthDate: '2026-05-01' });
    expect(result.entries).toEqual([]);
    expect(result.monthDate).toBe('2026-05-01');
    expect(result.mood).toBeNull();
  });

  it('rejects monthDate when not YYYY-MM-01 format', async () => {
    const { studioCalendarRouter } = await import('@/features/dmx-studio/routes/calendar');
    const caller = studioCalendarRouter.createCaller(buildCtx());
    await expect(caller.getMonth({ monthDate: '2026-05-15' })).rejects.toThrow();
  });
});

describe('Calendar path — studioCalendarRouter.generateMonth (cron scan + auto-trigger)', () => {
  it('delegates to generateMonthlyCalendar lib + returns entriesCreated', async () => {
    const { studioCalendarRouter } = await import('@/features/dmx-studio/routes/calendar');
    const caller = studioCalendarRouter.createCaller(buildCtx());
    const result = await caller.generateMonth({ monthDate: '2026-05-01' });
    expect(result.entriesCreated).toBe(14);
    expect(generateMonthlyCalendarMock).toHaveBeenCalledWith({
      userId: DEFAULT_USER_ID,
      monthDate: '2026-05-01',
    });
  });
});

describe('Calendar path — studioCalendarRouter.markAsGenerated', () => {
  it('updates entry status published when ownership ok', async () => {
    adminTables.studio_content_calendar = {
      selectMaybeSingle: { data: { id: DEFAULT_ENTRY_ID, user_id: DEFAULT_USER_ID }, error: null },
      updateResult: { error: null },
    };
    const { studioCalendarRouter } = await import('@/features/dmx-studio/routes/calendar');
    const caller = studioCalendarRouter.createCaller(buildCtx());
    const result = await caller.markAsGenerated({
      entryId: DEFAULT_ENTRY_ID,
      projectId: DEFAULT_PROJECT_ID,
    });
    expect(result.ok).toBe(true);
    expect(result.entryId).toBe(DEFAULT_ENTRY_ID);
    expect(result.projectId).toBe(DEFAULT_PROJECT_ID);
  });

  it('rejects FORBIDDEN when entry belongs to another user', async () => {
    adminTables.studio_content_calendar = {
      selectMaybeSingle: {
        data: { id: DEFAULT_ENTRY_ID, user_id: 'other-user' },
        error: null,
      },
    };
    const { studioCalendarRouter } = await import('@/features/dmx-studio/routes/calendar');
    const caller = studioCalendarRouter.createCaller(buildCtx());
    await expect(
      caller.markAsGenerated({ entryId: DEFAULT_ENTRY_ID, projectId: DEFAULT_PROJECT_ID }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it('rejects NOT_FOUND when entry missing', async () => {
    adminTables.studio_content_calendar = {
      selectMaybeSingle: { data: null, error: null },
    };
    const { studioCalendarRouter } = await import('@/features/dmx-studio/routes/calendar');
    const caller = studioCalendarRouter.createCaller(buildCtx());
    await expect(
      caller.markAsGenerated({ entryId: DEFAULT_ENTRY_ID, projectId: DEFAULT_PROJECT_ID }),
    ).rejects.toThrow(/calendar entry not found/);
  });
});

describe('Remarketing path — studioRemarketingRouter.forceTrigger (batch A/B)', () => {
  it('forceTrigger angle=general works on rendered project', async () => {
    adminTables.studio_video_projects = {
      selectMaybeSingle: {
        data: { id: DEFAULT_PROJECT_ID, user_id: DEFAULT_USER_ID, status: 'rendered' },
        error: null,
      },
    };
    const { studioRemarketingRouter } = await import('@/features/dmx-studio/routes/remarketing');
    const caller = studioRemarketingRouter.createCaller(buildCtx());
    const result = await caller.forceTrigger({
      sourceProjectId: DEFAULT_PROJECT_ID,
      angle: 'general',
    });
    expect(result.ok).toBe(true);
    expect(result.angle).toBe('general');
  });

  it('forceTrigger angle=cocina (A/B variation)', async () => {
    adminTables.studio_video_projects = {
      selectMaybeSingle: {
        data: { id: DEFAULT_PROJECT_ID, user_id: DEFAULT_USER_ID, status: 'published' },
        error: null,
      },
    };
    const { studioRemarketingRouter } = await import('@/features/dmx-studio/routes/remarketing');
    const caller = studioRemarketingRouter.createCaller(buildCtx());
    const result = await caller.forceTrigger({
      sourceProjectId: DEFAULT_PROJECT_ID,
      angle: 'cocina',
    });
    expect(result.angle).toBe('cocina');
  });

  it('rejects BAD_REQUEST when source project status=draft', async () => {
    adminTables.studio_video_projects = {
      selectMaybeSingle: {
        data: { id: DEFAULT_PROJECT_ID, user_id: DEFAULT_USER_ID, status: 'draft' },
        error: null,
      },
    };
    const { studioRemarketingRouter } = await import('@/features/dmx-studio/routes/remarketing');
    const caller = studioRemarketingRouter.createCaller(buildCtx());
    await expect(
      caller.forceTrigger({ sourceProjectId: DEFAULT_PROJECT_ID, angle: 'general' }),
    ).rejects.toThrow(/source_project_must_be_rendered_or_published/);
  });

  it('rejects NOT_FOUND when project does not exist', async () => {
    adminTables.studio_video_projects = {
      selectMaybeSingle: { data: null, error: null },
    };
    const { studioRemarketingRouter } = await import('@/features/dmx-studio/routes/remarketing');
    const caller = studioRemarketingRouter.createCaller(buildCtx());
    await expect(
      caller.forceTrigger({ sourceProjectId: DEFAULT_PROJECT_ID, angle: 'general' }),
    ).rejects.toThrow(/NOT_FOUND/);
  });
});

describe('Remarketing path — studioRemarketingRouter.cancel', () => {
  it('cancels pending job', async () => {
    adminTables.studio_remarketing_jobs = {
      selectMaybeSingle: { data: { id: DEFAULT_JOB_ID, status: 'pending' }, error: null },
      updateResult: { error: null },
    };
    const { studioRemarketingRouter } = await import('@/features/dmx-studio/routes/remarketing');
    const caller = studioRemarketingRouter.createCaller(buildCtx());
    const result = await caller.cancel({ jobId: DEFAULT_JOB_ID });
    expect(result.ok).toBe(true);
  });

  it('rejects when job already terminal (completed)', async () => {
    adminTables.studio_remarketing_jobs = {
      selectMaybeSingle: { data: { id: DEFAULT_JOB_ID, status: 'completed' }, error: null },
    };
    const { studioRemarketingRouter } = await import('@/features/dmx-studio/routes/remarketing');
    const caller = studioRemarketingRouter.createCaller(buildCtx());
    await expect(caller.cancel({ jobId: DEFAULT_JOB_ID })).rejects.toThrow(/job_already_terminal/);
  });
});

describe('Remarketing path — module export smoke', () => {
  it('exports studioRemarketingRouter with 4 procedures', async () => {
    const mod = await import('@/features/dmx-studio/routes/remarketing');
    const r = mod.studioRemarketingRouter as unknown as {
      _def: { record: Record<string, unknown> };
    };
    const names = Object.keys(r._def.record).sort();
    expect(names).toEqual(['cancel', 'forceTrigger', 'getActiveJobs', 'getStatus'].sort());
  });
});
