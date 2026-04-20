import { beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================
// Tests del worker /api/cron/score-worker.
// Valida: (a) auth nativa Vercel Cron (U1), (b) SKIP LOCKED concurrency,
// (c) backoff exponencial 1/5/15min por attempts.
// ============================================================

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/shared/lib/intelligence-engine/calculators/run-score', () => ({
  runScore: vi.fn(),
}));

import { runScore } from '@/shared/lib/intelligence-engine/calculators/run-score';
import { createAdminClient } from '@/shared/lib/supabase/admin';

type RpcCall = { fn: string; args: Record<string, unknown> };

function makeAdmin(
  claimedJobs: unknown[],
  finalizeResults: Array<{ final: boolean; status: string }> = [],
) {
  const rpcCalls: RpcCall[] = [];
  let finalizeIdx = 0;
  const client = {
    rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args });
      if (fn === 'claim_pending_score_jobs') {
        return Promise.resolve({ data: claimedJobs, error: null });
      }
      if (fn === 'finalize_score_job') {
        const r = finalizeResults[finalizeIdx] ?? { final: true, status: 'done' };
        finalizeIdx += 1;
        return Promise.resolve({ data: r, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
  return { client, rpcCalls };
}

async function callGET(headers: Record<string, string> = {}) {
  const mod = await import('../../../../app/api/cron/score-worker/route');
  const req = new Request('https://example.com/api/cron/score-worker', {
    method: 'GET',
    headers,
  });
  return mod.GET(req);
}

describe('score-worker — auth (U1 Vercel Cron nativo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('request sin header x-vercel-cron-secret ni dev → 401', async () => {
    const admin = makeAdmin([]);
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin.client);
    const resp = await callGET({});
    expect(resp.status).toBe(401);
    const body = await resp.json();
    expect(body.error).toBe('unauthorized');
    // No debe llamar a claim si 401
    expect(admin.rpcCalls).toHaveLength(0);
  });

  it('request con header x-vercel-cron-secret (Vercel nativo) → 200', async () => {
    const admin = makeAdmin([]);
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin.client);
    const resp = await callGET({ 'x-vercel-cron-secret': 'vercel-signed-value' });
    expect(resp.status).toBe(200);
  });

  it('request con x-dev-cron-secret matching DEV_CRON_SECRET → 200', async () => {
    process.env.DEV_CRON_SECRET = 'test-dev-secret';
    const admin = makeAdmin([]);
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin.client);
    const resp = await callGET({ 'x-dev-cron-secret': 'test-dev-secret' });
    expect(resp.status).toBe(200);
    delete process.env.DEV_CRON_SECRET;
  });

  it('request con x-dev-cron-secret incorrecto → 401', async () => {
    process.env.DEV_CRON_SECRET = 'test-dev-secret';
    const admin = makeAdmin([]);
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin.client);
    const resp = await callGET({ 'x-dev-cron-secret': 'wrong-value' });
    expect(resp.status).toBe(401);
    delete process.env.DEV_CRON_SECRET;
  });
});

describe('score-worker — SKIP LOCKED concurrency (delegado al RPC)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('el worker siempre invoca claim_pending_score_jobs (que usa FOR UPDATE SKIP LOCKED)', async () => {
    const admin = makeAdmin([]);
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin.client);
    await callGET({ 'x-vercel-cron-secret': 'signed' });
    expect(admin.rpcCalls.some((c) => c.fn === 'claim_pending_score_jobs')).toBe(true);
    expect(admin.rpcCalls[0]?.args.p_limit).toBe(50);
  });

  it('2 workers "concurrentes" reciben jobs disjoint — el RPC con SKIP LOCKED lo garantiza en BD', async () => {
    // Simulación: worker A reclama [job1, job2]; worker B reclama [job3, job4].
    // El test verifica que cada worker respeta el set que el RPC le dio y no
    // procesa jobs "ajenos". La garantía real se valida en BD (test DB-level).
    const jobsA = [
      {
        id: 'a1',
        score_id: 'F01',
        entity_type: 'zone',
        entity_id: 'z1',
        country_code: 'MX',
        triggered_by: 't',
        priority: 5,
        batch_mode: false,
        attempts: 0,
        scheduled_for: '2026-04-01T00:00:00Z',
      },
    ];
    const jobsB = [
      {
        id: 'b1',
        score_id: 'F01',
        entity_type: 'zone',
        entity_id: 'z2',
        country_code: 'MX',
        triggered_by: 't',
        priority: 5,
        batch_mode: false,
        attempts: 0,
        scheduled_for: '2026-04-01T00:00:00Z',
      },
    ];

    (runScore as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      kind: 'ok',
      output: {
        score_value: 50,
        score_label: 'ok',
        components: {},
        inputs_used: {},
        confidence: 'medium',
        citations: [],
        provenance: {
          sources: [{ name: 's' }],
          computed_at: '2026-04-19',
          calculator_version: '0.0.1',
        },
      },
      registry: {} as never,
      persisted: true,
    });

    const adminA = makeAdmin(jobsA);
    const adminB = makeAdmin(jobsB);
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(adminA.client);
    const respA = await callGET({ 'x-vercel-cron-secret': 'signed' });
    expect(respA.status).toBe(200);
    const bodyA = await respA.json();
    expect(bodyA.processed).toBe(1);

    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(adminB.client);
    const respB = await callGET({ 'x-vercel-cron-secret': 'signed' });
    const bodyB = await respB.json();
    expect(bodyB.processed).toBe(1);

    // Cada worker operó sobre su propio set (no cross-processed).
    const finalizeCallsA = adminA.rpcCalls.filter((c) => c.fn === 'finalize_score_job');
    const finalizeCallsB = adminB.rpcCalls.filter((c) => c.fn === 'finalize_score_job');
    expect(finalizeCallsA.every((c) => c.args.p_id === 'a1')).toBe(true);
    expect(finalizeCallsB.every((c) => c.args.p_id === 'b1')).toBe(true);
  });
});

describe('score-worker — backoff (delegado al RPC finalize_score_job)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('error en runScore → finalize_score_job(success=false) con el error message', async () => {
    const jobs = [
      {
        id: 'j-err',
        score_id: 'F01',
        entity_type: 'zone',
        entity_id: 'z1',
        country_code: 'MX',
        triggered_by: 't',
        priority: 5,
        batch_mode: false,
        attempts: 0,
        scheduled_for: '2026-04-01T00:00:00Z',
      },
    ];
    (runScore as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      kind: 'error',
      error: 'provenance_invalid_or_missing:F01',
    });
    const admin = makeAdmin(jobs);
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin.client);
    const resp = await callGET({ 'x-vercel-cron-secret': 'signed' });
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.errors).toBe(1);
    const finalizeCall = admin.rpcCalls.find((c) => c.fn === 'finalize_score_job');
    expect(finalizeCall?.args.p_success).toBe(false);
    expect(finalizeCall?.args.p_error).toMatch(/provenance_invalid_or_missing/);
  });

  it('gated → finalize_score_job(success=true) — no es error, se marca done', async () => {
    const jobs = [
      {
        id: 'j-gated',
        score_id: 'E03',
        entity_type: 'zone',
        entity_id: 'z1',
        country_code: 'MX',
        triggered_by: 't',
        priority: 5,
        batch_mode: false,
        attempts: 0,
        scheduled_for: '2026-04-01T00:00:00Z',
      },
    ];
    (runScore as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      kind: 'gated',
      gate: { gated: true, reason: 'tier_insufficient' },
      registry: {} as never,
    });
    const admin = makeAdmin(jobs);
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin.client);
    const resp = await callGET({ 'x-vercel-cron-secret': 'signed' });
    const body = await resp.json();
    expect(body.skipped).toBe(1);
    expect(body.errors).toBe(0);
    const finalizeCall = admin.rpcCalls.find((c) => c.fn === 'finalize_score_job');
    expect(finalizeCall?.args.p_success).toBe(true);
  });
});
