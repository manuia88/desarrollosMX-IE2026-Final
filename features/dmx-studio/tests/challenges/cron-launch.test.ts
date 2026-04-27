// F14.F.5 Sprint 4 — Cron handler tests for /api/cron/studio-challenge-launch.
// Cubre: 401 on bad/missing auth + ingest_runs INSERT correct (memoria
// cron_observability_obligatorio R14). seedWeeklyChallenge + email broadcast mocked.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  insertReturnByTable: Record<string, { data: unknown; error: unknown }>;
  selectReturnByTable: Record<string, { data: unknown; error: unknown }>;
}

let registry: AdminMockRegistry;

function resetRegistry() {
  registry = {
    inserts: [],
    updates: [],
    insertReturnByTable: {},
    selectReturnByTable: {},
  };
}

function buildAdminClient() {
  return {
    from(table: string) {
      const insertChain = (payload: unknown) => {
        registry.inserts.push({ table, payload });
        const builder: Record<string, unknown> = {};
        builder.select = (_cols?: string) => {
          const inner: Record<string, unknown> = {};
          inner.single = async () => {
            const r = registry.insertReturnByTable[table];
            return r ?? { data: null, error: null };
          };
          return inner;
        };
        // biome-ignore lint/suspicious/noThenProperty: thenable mock matches supabase shape
        builder.then = (resolve: (v: { error: unknown }) => void) => {
          resolve({ error: null });
        };
        return builder;
      };

      const updateChain = (payload: unknown) => {
        const eqs: Array<{ col: string; val: unknown }> = [];
        const builder: Record<string, unknown> = {};
        builder.eq = (col: string, val: unknown) => {
          eqs.push({ col, val });
          // biome-ignore lint/suspicious/noThenProperty: thenable mock
          builder.then = (resolve: (v: { error: unknown }) => void) => {
            registry.updates.push({ table, payload, eqs });
            resolve({ error: null });
          };
          return builder;
        };
        return builder;
      };

      const selectChain = (_cols?: string) => {
        const builder: Record<string, unknown> = {};
        const inResolver = async () => {
          const r = registry.selectReturnByTable[table];
          return r ?? { data: [], error: null };
        };
        builder.in = (_col: string, _vals: unknown[]) => {
          // biome-ignore lint/suspicious/noThenProperty: thenable mock
          builder.then = async (resolve: (v: { data: unknown; error: unknown }) => void) => {
            const r = await inResolver();
            resolve(r);
          };
          return builder;
        };
        return builder;
      };

      return { insert: insertChain, update: updateChain, select: selectChain };
    },
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => buildAdminClient()),
}));
vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

const seedMock = vi.fn(async () => ({
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  challengeType: 'reels_count' as const,
  title: 'Genera 5 reels',
  description: 'Mantén la racha 5 reels.',
  targetValue: '5',
  rewardXp: 250,
  weekStart: '2026-04-27',
  isActive: true,
  participantsCount: 0,
  completersCount: 0,
  createdAt: '2026-04-27T00:00:00.000Z',
}));
vi.mock('@/features/dmx-studio/lib/community-challenges', () => ({
  seedWeeklyChallenge: seedMock,
}));

const sendMock = vi.fn(async () => ({
  providerMessageId: 'm-1',
  provider: 'mock' as const,
  accepted: true,
  error: null,
}));
vi.mock('@/features/dmx-studio/lib/resend/provider', () => ({
  getStudioEmailProvider: vi.fn(() => ({ name: 'mock', send: sendMock })),
}));

vi.mock('@/features/dmx-studio/lib/resend/templates/challenge-week-launched', () => ({
  CHALLENGE_WEEK_LAUNCHED_SUBJECT: 'Nuevo challenge esta semana',
  renderChallengeWeekLaunchedHtml: vi.fn(() => '<p>email</p>'),
}));

const RUN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

beforeEach(() => {
  resetRegistry();
  seedMock.mockClear();
  sendMock.mockClear();
  process.env.CRON_SECRET = 'test-secret';
  registry.insertReturnByTable.ingest_runs = { data: { id: RUN_ID }, error: null };
  registry.selectReturnByTable.studio_subscriptions = { data: [], error: null };
  registry.selectReturnByTable.profiles = { data: [], error: null };
});

afterEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = '';
});

describe('GET /api/cron/studio-challenge-launch — auth', () => {
  it('returns 401 when Authorization header is missing or invalid', async () => {
    const { GET } = await import('@/app/api/cron/studio-challenge-launch/route');

    const noHeaderRes = await GET(new Request('http://localhost/api/cron/studio-challenge-launch'));
    expect(noHeaderRes.status).toBe(401);

    const badHeaderRes = await GET(
      new Request('http://localhost/api/cron/studio-challenge-launch', {
        headers: { authorization: 'Bearer wrong-secret' },
      }),
    );
    expect(badHeaderRes.status).toBe(401);

    expect(seedMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/cron/studio-challenge-launch — ingest_runs observability', () => {
  it('inserts ingest_runs row with source + status started + triggered_by cron + final ok update', async () => {
    const { GET } = await import('@/app/api/cron/studio-challenge-launch/route');
    const res = await GET(
      new Request('http://localhost/api/cron/studio-challenge-launch', {
        headers: { authorization: 'Bearer test-secret' },
      }),
    );

    const body = (await res.json()) as {
      ok: boolean;
      run_id: string;
      challenge_id: string;
    };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.run_id).toBe(RUN_ID);
    expect(seedMock).toHaveBeenCalledTimes(1);

    const ingestInserts = registry.inserts.filter((i) => i.table === 'ingest_runs');
    expect(ingestInserts).toHaveLength(1);
    const payload = ingestInserts[0]?.payload as {
      source: string;
      country_code: string;
      status: string;
      triggered_by: string;
      meta: { cron: string };
    };
    expect(payload.source).toBe('biz_studio_challenge_launch');
    expect(payload.country_code).toBe('MX');
    expect(payload.status).toBe('started');
    expect(payload.triggered_by).toBe('cron');
    expect(payload.meta.cron).toBe('studio-challenge-launch');

    const ingestUpdates = registry.updates.filter((u) => u.table === 'ingest_runs');
    expect(ingestUpdates).toHaveLength(1);
    const updPayload = ingestUpdates[0]?.payload as {
      status: string;
      rows_inserted: number;
      error: string | null;
    };
    expect(updPayload.status).toBe('ok');
    expect(updPayload.rows_inserted).toBe(1);
    expect(updPayload.error).toBeNull();
  });
});
