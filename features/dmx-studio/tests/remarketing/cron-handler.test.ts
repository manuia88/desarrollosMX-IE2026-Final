// F14.F.5 Sprint 4 Tarea 4.3 — Cron handler tests.
// Cubre: 401 on bad/missing auth + ingest_runs INSERT correct (memoria
// cron_observability_obligatorio R15). Pipeline scan mocked stub (R16).

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
}

let registry: AdminMockRegistry = {
  inserts: [],
  updates: [],
  insertReturnByTable: {},
};

function resetRegistry() {
  registry = {
    inserts: [],
    updates: [],
    insertReturnByTable: {},
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
          return builder;
        };
        // biome-ignore lint/suspicious/noThenProperty: thenable mock matches supabase shape
        builder.then = (resolve: (v: { error: unknown }) => void) => {
          registry.updates.push({ table, payload, eqs });
          resolve({ error: null });
        };
        return builder;
      };

      return { insert: insertChain, update: updateChain };
    },
  };
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => buildAdminClient()),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

const scanMock = vi.fn(async () => ({ scannedCount: 4, jobsCreated: 3, errors: [] }));
vi.mock('@/features/dmx-studio/lib/remarketing', () => ({
  scanForRemarketingOpportunities: scanMock,
}));

const RUN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

beforeEach(() => {
  resetRegistry();
  scanMock.mockClear();
  process.env.CRON_SECRET = 'test-secret';
  registry.insertReturnByTable.ingest_runs = { data: { id: RUN_ID }, error: null };
});

afterEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = '';
});

describe('GET /api/cron/studio-remarketing-scan — auth', () => {
  it('returns 401 when Authorization header is missing or invalid', async () => {
    const { GET } = await import('@/app/api/cron/studio-remarketing-scan/route');

    const noHeaderRes = await GET(new Request('http://localhost/api/cron/studio-remarketing-scan'));
    expect(noHeaderRes.status).toBe(401);

    const badHeaderRes = await GET(
      new Request('http://localhost/api/cron/studio-remarketing-scan', {
        headers: { authorization: 'Bearer wrong-secret' },
      }),
    );
    expect(badHeaderRes.status).toBe(401);

    // scan should never run on bad auth.
    expect(scanMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/cron/studio-remarketing-scan — ingest_runs observability', () => {
  it('inserts ingest_runs row with source + status started + triggered_by cron', async () => {
    const { GET } = await import('@/app/api/cron/studio-remarketing-scan/route');
    const res = await GET(
      new Request('http://localhost/api/cron/studio-remarketing-scan', {
        headers: { authorization: 'Bearer test-secret' },
      }),
    );

    const body = (await res.json()) as {
      ok: boolean;
      scannedCount: number;
      jobsCreated: number;
      runId: string;
    };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.scannedCount).toBe(4);
    expect(body.jobsCreated).toBe(3);
    expect(body.runId).toBe(RUN_ID);

    const ingestInserts = registry.inserts.filter((i) => i.table === 'ingest_runs');
    expect(ingestInserts).toHaveLength(1);
    const payload = ingestInserts[0]?.payload as {
      source: string;
      country_code: string;
      status: string;
      triggered_by: string;
      meta: { cron: string };
    };
    expect(payload.source).toBe('biz_studio_remarketing_scan');
    expect(payload.country_code).toBe('MX');
    expect(payload.status).toBe('started');
    expect(payload.triggered_by).toBe('cron');
    expect(payload.meta.cron).toBe('studio-remarketing-scan');

    // Final UPDATE marks status='ok' + rows_inserted=jobsCreated.
    const ingestUpdates = registry.updates.filter((u) => u.table === 'ingest_runs');
    expect(ingestUpdates).toHaveLength(1);
    const updPayload = ingestUpdates[0]?.payload as {
      status: string;
      rows_inserted: number;
      error: string | null;
    };
    expect(updPayload.status).toBe('ok');
    expect(updPayload.rows_inserted).toBe(3);
    expect(updPayload.error).toBeNull();
  });
});
