import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import { generateCausalExplanation } from '../lib/causal-engine';

type TestSupabase = SupabaseClient<Database>;

interface FakeQueryResult {
  data: unknown;
  error: unknown;
}

interface QueueEntry {
  readonly table: string;
  readonly method: 'maybeSingle' | 'upsert' | 'update';
  readonly result: FakeQueryResult;
}

function createFakeSupabase(queue: QueueEntry[]): {
  supabase: TestSupabase;
  spy: {
    from: ReturnType<typeof vi.fn>;
    updates: unknown[];
    upserts: unknown[];
  };
} {
  const updates: unknown[] = [];
  const upserts: unknown[] = [];

  const fromSpy = vi.fn((table: string) => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = vi.fn(chain);
    builder.eq = vi.fn(chain);
    builder.lt = vi.fn(chain);
    builder.order = vi.fn(chain);
    builder.limit = vi.fn(chain);

    builder.maybeSingle = vi.fn(async () => {
      const entry = queue.shift();
      if (!entry || entry.table !== table || entry.method !== 'maybeSingle') {
        throw new Error(`Unexpected maybeSingle on ${table}; queue=${JSON.stringify(entry)}`);
      }
      return entry.result;
    });

    builder.upsert = vi.fn(async (payload: unknown) => {
      upserts.push(payload);
      const entry = queue.shift();
      if (!entry || entry.table !== table || entry.method !== 'upsert') {
        throw new Error(`Unexpected upsert on ${table}`);
      }
      return entry.result;
    });

    builder.update = vi.fn((payload: unknown) => {
      updates.push(payload);
      // Supabase update().eq()... returns a thenable; we emulate it with a
      // Proxy so any .eq chain length resolves the same promise. biome-ignore
      // lint/suspicious/noThenProperty: required to mimic Postgrest builder.
      const resolveUpdate = (): Promise<FakeQueryResult> => {
        const entry = queue.shift();
        const result: FakeQueryResult =
          entry && entry.table === table && entry.method === 'update'
            ? entry.result
            : { data: null, error: null };
        return Promise.resolve(result);
      };
      const thenable = {
        // biome-ignore lint/suspicious/noThenProperty: mimics Postgrest thenable.
        then: (resolve: (v: FakeQueryResult) => void) => resolveUpdate().then(resolve),
        eq: (): unknown => thenable,
      };
      return thenable;
    });

    return builder;
  });

  const supabase = { from: fromSpy } as unknown as TestSupabase;

  return {
    supabase,
    spy: {
      from: fromSpy,
      updates,
      upserts,
    },
  };
}

interface FakeAnthropicResponse {
  readonly content: ReadonlyArray<{ type: 'text'; text: string }>;
  readonly usage: { input_tokens: number; output_tokens: number };
}

function createFakeAnthropic(responses: FakeAnthropicResponse[]) {
  const create = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('No more fake LLM responses queued');
    return next;
  });
  const client = {
    messages: { create },
  } as unknown as import('@anthropic-ai/sdk').default;
  return { client, create };
}

describe('generateCausalExplanation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns cached=true when a fresh row exists', async () => {
    const queue: QueueEntry[] = [
      {
        table: 'causal_explanations',
        method: 'maybeSingle',
        result: {
          data: {
            explanation_md: 'El IPV se mantuvo estable [[score:IPV:roma-norte:2026-03]] este mes.',
            citations: [
              {
                ref_id: 'score:IPV:roma-norte:2026-03',
                type: 'score',
                label: 'IPV actual',
                value: 72.1,
                source: 'dmx_indices',
                href: null,
                as_of: '2026-03-01',
              },
            ],
            model: 'claude-sonnet-4-5',
            prompt_version: 'v1',
            generated_at: '2026-03-15T10:00:00Z',
            ttl_days: 30,
            cache_hit_count: 2,
          },
          error: null,
        },
      },
    ];

    const { supabase, spy } = createFakeSupabase(queue);
    const { client: anthropic, create } = createFakeAnthropic([]);

    const result = await generateCausalExplanation({
      scoreId: 'score-123',
      indexCode: 'IPV',
      scopeType: 'colonia',
      scopeId: 'roma-norte',
      periodDate: '2026-03-01',
      supabase,
      anthropic,
    });

    expect(result.cached).toBe(true);
    expect(result.explanation_md).toContain('IPV');
    expect(result.model).toBe('claude-sonnet-4-5');
    expect(create).not.toHaveBeenCalled();
    expect(spy.updates.length).toBe(1);
  });

  it('cache miss: calls LLM, validates citations, persists, returns cached=false', async () => {
    const explanation =
      'El IPV subió **+2.3 puntos** [[score:IPV:roma-norte:2026-03-01]] respecto al periodo anterior [[score:IPV:roma-norte:2026-02-01]], impulsado por movilidad [[subscore:mobility:roma-norte:2026-03-01]].';
    const llmJson = JSON.stringify({
      explanation_md: explanation,
      citations: [
        {
          ref_id: 'score:IPV:roma-norte:2026-03-01',
          type: 'score',
          label: 'IPV actual',
          value: 72.1,
          source: 'dmx_indices',
          href: null,
          as_of: '2026-03-01',
        },
        {
          ref_id: 'score:IPV:roma-norte:2026-02-01',
          type: 'score',
          label: 'IPV anterior',
          value: 69.8,
          source: 'dmx_indices',
          href: null,
          as_of: '2026-02-01',
        },
        {
          ref_id: 'subscore:mobility:roma-norte:2026-03-01',
          type: 'score',
          label: 'mobility',
          value: 0.82,
          source: 'dmx_indices.components',
          href: null,
          as_of: '2026-03-01',
        },
      ],
    });

    const queue: QueueEntry[] = [
      // cache lookup miss
      {
        table: 'causal_explanations',
        method: 'maybeSingle',
        result: { data: null, error: null },
      },
      // current index row
      {
        table: 'dmx_indices',
        method: 'maybeSingle',
        result: {
          data: {
            value: 72.1,
            period_date: '2026-03-01',
            score_band: 'alto',
            confidence: 'alta',
            trend_direction: 'mejorando',
            trend_vs_previous: 2.3,
            components: { mobility: 0.82, services: 0.75 },
          },
          error: null,
        },
      },
      // previous index row
      {
        table: 'dmx_indices',
        method: 'maybeSingle',
        result: {
          data: {
            value: 69.8,
            period_date: '2026-02-01',
            score_band: 'medio',
            confidence: 'alta',
            trend_direction: 'estable',
            trend_vs_previous: 0.1,
            components: { mobility: 0.75 },
          },
          error: null,
        },
      },
      // upsert
      {
        table: 'causal_explanations',
        method: 'upsert',
        result: { data: null, error: null },
      },
    ];

    const { supabase, spy } = createFakeSupabase(queue);
    const { client: anthropic, create } = createFakeAnthropic([
      {
        content: [{ type: 'text', text: llmJson }],
        usage: { input_tokens: 850, output_tokens: 220 },
      },
    ]);

    const result = await generateCausalExplanation({
      scoreId: 'score-abc',
      indexCode: 'IPV',
      scopeType: 'colonia',
      scopeId: 'roma-norte',
      periodDate: '2026-03-01',
      supabase,
      anthropic,
    });

    expect(result.cached).toBe(false);
    expect(result.explanation_md).toBe(explanation);
    expect(result.model).toBe('claude-sonnet-4-5');
    expect(result.prompt_version).toBe('v1');
    expect(result.tokens_used).toBe(1070);
    expect(result.cost_usd).toBeGreaterThan(0);
    expect(create).toHaveBeenCalledTimes(1);
    expect(spy.upserts.length).toBe(1);
    const upserted = spy.upserts[0] as { score_id: string; prompt_version: string };
    expect(upserted.score_id).toBe('score-abc');
    expect(upserted.prompt_version).toBe('v1');
  });

  it('throws COST_BUDGET_EXCEEDED when costGuardAllowed=false', async () => {
    const queue: QueueEntry[] = [
      {
        table: 'causal_explanations',
        method: 'maybeSingle',
        result: { data: null, error: null },
      },
      {
        table: 'dmx_indices',
        method: 'maybeSingle',
        result: {
          data: {
            value: 50,
            period_date: '2026-03-01',
            score_band: 'medio',
            confidence: 'alta',
            trend_direction: null,
            trend_vs_previous: null,
            components: {},
          },
          error: null,
        },
      },
      {
        table: 'dmx_indices',
        method: 'maybeSingle',
        result: { data: null, error: null },
      },
    ];
    const { supabase } = createFakeSupabase(queue);
    const { client: anthropic } = createFakeAnthropic([]);

    await expect(
      generateCausalExplanation({
        scoreId: 's1',
        indexCode: 'IPV',
        scopeType: 'colonia',
        scopeId: 'roma-norte',
        periodDate: '2026-03-01',
        supabase,
        anthropic,
        costGuardAllowed: false,
      }),
    ).rejects.toThrow('COST_BUDGET_EXCEEDED');
  });
});
