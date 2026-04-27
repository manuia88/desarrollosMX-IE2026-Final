import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn();
const updateMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: fromMock,
  })),
}));

beforeEach(() => {
  insertMock.mockReset();
  updateMock.mockReset();
  fromMock.mockReset();
});

function buildIngestRunsBuilder(overrides?: Partial<{ insertError: unknown }>) {
  const single = vi.fn().mockResolvedValue({
    data: overrides?.insertError ? null : { id: '00000000-0000-0000-0000-000000000099' },
    error: overrides?.insertError ?? null,
  });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const eq = vi.fn().mockResolvedValue({ data: null, error: null });
  const update = vi.fn().mockReturnValue({ eq });
  return { insert, update };
}

function buildTareasBuilder(rowsUpdated: number) {
  const select = vi.fn().mockResolvedValue({
    data: Array.from({ length: rowsUpdated }, (_, i) => ({ id: `id-${i}` })),
    error: null,
  });
  const lt = vi.fn().mockReturnValue({ select });
  const eq = vi.fn().mockReturnValue({ lt });
  const update = vi.fn().mockReturnValue({ eq });
  return { update };
}

describe('cron tareas-mark-expired', () => {
  it('rejects request without Bearer CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const { GET } = await import('@/app/api/cron/tareas-mark-expired/route');
    const req = new Request('http://localhost/api/cron/tareas-mark-expired');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 500 when ingest_runs INSERT fails', async () => {
    process.env.CRON_SECRET = 'test-secret';
    fromMock.mockImplementation((table: string) => {
      if (table === 'ingest_runs') {
        return buildIngestRunsBuilder({ insertError: new Error('insert_failed') });
      }
      return buildTareasBuilder(0);
    });
    const { GET } = await import('@/app/api/cron/tareas-mark-expired/route');
    const req = new Request('http://localhost/api/cron/tareas-mark-expired', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('marks expired tareas + registers run in ingest_runs (success path)', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const tareasBuilder = buildTareasBuilder(3);
    const ingestRunsBuilder = buildIngestRunsBuilder();
    fromMock.mockImplementation((table: string) => {
      if (table === 'ingest_runs') return ingestRunsBuilder;
      if (table === 'tareas') return tareasBuilder;
      return {};
    });
    const { GET } = await import('@/app/api/cron/tareas-mark-expired/route');
    const req = new Request('http://localhost/api/cron/tareas-mark-expired', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.count_updated).toBe(3);
    expect(ingestRunsBuilder.insert).toHaveBeenCalledOnce();
    expect(ingestRunsBuilder.update).toHaveBeenCalledOnce();
  });
});
