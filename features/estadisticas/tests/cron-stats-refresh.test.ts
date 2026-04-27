import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: fromMock,
    rpc: rpcMock,
  })),
}));

beforeEach(() => {
  fromMock.mockReset();
  rpcMock.mockReset();
});

function buildIngestRunsBuilder(overrides?: { insertError?: unknown }) {
  const single = vi.fn().mockResolvedValue({
    data: overrides?.insertError ? null : { id: 'run-id-123' },
    error: overrides?.insertError ?? null,
  });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const eq = vi.fn().mockResolvedValue({ data: null, error: null });
  const update = vi.fn().mockReturnValue({ eq });
  return { insert, update };
}

describe('cron asesor-stats-refresh', () => {
  it('rejects request without Bearer CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const { GET } = await import('@/app/api/cron/asesor-stats-refresh/route');
    const req = new Request('http://localhost/api/cron/asesor-stats-refresh');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 500 when ingest_runs INSERT fails', async () => {
    process.env.CRON_SECRET = 'test-secret';
    fromMock.mockImplementation(() =>
      buildIngestRunsBuilder({ insertError: new Error('insert_failed') }),
    );
    const { GET } = await import('@/app/api/cron/asesor-stats-refresh/route');
    const req = new Request('http://localhost/api/cron/asesor-stats-refresh', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it('refreshes matview + records ingest_runs (success path)', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const ingestRunsBuilder = buildIngestRunsBuilder();
    fromMock.mockImplementation(() => ingestRunsBuilder);
    rpcMock.mockResolvedValue({ error: null });

    const { GET } = await import('@/app/api/cron/asesor-stats-refresh/route');
    const req = new Request('http://localhost/api/cron/asesor-stats-refresh', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.run_id).toBe('run-id-123');
    expect(rpcMock).toHaveBeenCalledWith('refresh_asesor_stats_daily', {});
    expect(ingestRunsBuilder.insert).toHaveBeenCalledOnce();
    expect(ingestRunsBuilder.update).toHaveBeenCalledOnce();
  });

  it('returns 500 when refresh RPC fails', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const ingestRunsBuilder = buildIngestRunsBuilder();
    fromMock.mockImplementation(() => ingestRunsBuilder);
    rpcMock.mockResolvedValue({ error: { message: 'refresh_failed' } });

    const { GET } = await import('@/app/api/cron/asesor-stats-refresh/route');
    const req = new Request('http://localhost/api/cron/asesor-stats-refresh', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
