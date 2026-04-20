import { describe, expect, it } from 'vitest';
import { SupabaseScoreQueue } from '../queue';

type RpcCall = { fn: string; args: Record<string, unknown> };

function fakeSupabase(rpcBehavior: {
  firstResponse: { enqueued: boolean; id?: string | null };
  subsequentResponses: Array<{ enqueued: boolean; id?: string | null }>;
}) {
  const calls: RpcCall[] = [];
  let invocations = 0;
  return {
    calls,
    client: {
      rpc(fn: string, args: Record<string, unknown>) {
        calls.push({ fn, args });
        const idx = invocations;
        invocations += 1;
        const resp =
          idx === 0 ? rpcBehavior.firstResponse : rpcBehavior.subsequentResponses[idx - 1];
        return Promise.resolve({ data: resp ?? { enqueued: false, id: null }, error: null });
      },
      from(_table: string) {
        return {
          select: (_q: string, _opts?: unknown) => ({
            eq: (_c: string, _v: unknown) => ({
              gte: (_x: string, _y: unknown) => Promise.resolve({ count: 0, error: null }),
            }),
          }),
        };
      },
    },
  };
}

describe('SupabaseScoreQueue.enqueue', () => {
  it('primera llamada: enqueued=true con id', async () => {
    const sb = fakeSupabase({
      firstResponse: { enqueued: true, id: '11111111-1111-1111-1111-111111111111' },
      subsequentResponses: [],
    });
    const queue = new SupabaseScoreQueue(
      sb.client as unknown as ConstructorParameters<typeof SupabaseScoreQueue>[0],
    );
    const res = await queue.enqueue({
      scoreId: 'F01',
      entityType: 'zone',
      entityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      countryCode: 'MX',
      triggeredBy: 'test',
    });
    expect(res.enqueued).toBe(true);
    expect(res.id).toBe('11111111-1111-1111-1111-111111111111');
    expect(sb.calls[0]?.fn).toBe('enqueue_score_recalc');
    expect(sb.calls[0]?.args.p_score_id).toBe('F01');
    expect(sb.calls[0]?.args.p_priority).toBe(5);
  });

  it('dedup — 3 llamadas con misma zona+score+periodo: 1 enqueued, 2 enqueued=false', async () => {
    const sb = fakeSupabase({
      firstResponse: { enqueued: true, id: 'abcdef01-0000-0000-0000-000000000001' },
      subsequentResponses: [
        { enqueued: false, id: null },
        { enqueued: false, id: null },
      ],
    });
    const queue = new SupabaseScoreQueue(
      sb.client as unknown as ConstructorParameters<typeof SupabaseScoreQueue>[0],
    );
    const args = {
      scoreId: 'F01',
      entityType: 'zone' as const,
      entityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      countryCode: 'MX',
      triggeredBy: 'dedup-test',
    };

    const r1 = await queue.enqueue(args);
    const r2 = await queue.enqueue(args);
    const r3 = await queue.enqueue(args);

    expect(r1.enqueued).toBe(true);
    expect(r2.enqueued).toBe(false);
    expect(r3.enqueued).toBe(false);
    expect(sb.calls).toHaveLength(3);
  });

  it('scheduledFor y priority opcionales se pasan al RPC', async () => {
    const sb = fakeSupabase({
      firstResponse: { enqueued: true, id: null },
      subsequentResponses: [],
    });
    const queue = new SupabaseScoreQueue(
      sb.client as unknown as ConstructorParameters<typeof SupabaseScoreQueue>[0],
    );
    await queue.enqueue({
      scoreId: 'B08',
      entityType: 'project',
      entityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      countryCode: 'MX',
      triggeredBy: 'unit_sold:op-42',
      priority: 3,
      batchMode: false,
      scheduledFor: '2026-05-01T00:00:00.000Z',
    });
    expect(sb.calls[0]?.args.p_priority).toBe(3);
    expect(sb.calls[0]?.args.p_scheduled_for).toBe('2026-05-01T00:00:00.000Z');
    expect(sb.calls[0]?.args.p_batch).toBe(false);
  });
});

describe('SupabaseScoreQueue.getStatus', () => {
  it('ensambla resumen por status', async () => {
    const sb = fakeSupabase({
      firstResponse: { enqueued: true },
      subsequentResponses: [],
    });
    const queue = new SupabaseScoreQueue(
      sb.client as unknown as ConstructorParameters<typeof SupabaseScoreQueue>[0],
    );
    const summary = await queue.getStatus();
    expect(summary).toEqual({
      pending: 0,
      processing: 0,
      done_last_24h: 0,
      errors_last_24h: 0,
    });
  });
});
