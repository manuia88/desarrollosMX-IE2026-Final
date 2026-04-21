import { describe, expect, it } from 'vitest';
import { computeWinner, selectSubjectVariant } from '../lib/ab-testing';

// Mocked supabase client — simula tablas con chainable API mínimo.
function makeSupabaseMock(state: {
  abTest?: Record<string, unknown> | null;
  deliveries?: Array<{ subject_variant: string | null; status: string }>;
  deliveryCount?: number;
}): unknown {
  const updated: Record<string, unknown>[] = [];
  interface MockBuilder {
    readonly _table: string;
    readonly select: (cols?: string, opts?: { count: string; head: boolean }) => MockBuilder;
    readonly eq: (...args: unknown[]) => MockBuilder | Promise<unknown>;
    readonly maybeSingle: () => Promise<unknown>;
    readonly update: (patch: Record<string, unknown>) => { readonly eq: () => Promise<unknown> };
    readonly then: (resolve: (v: { data: unknown; error: null }) => void) => void;
  }
  const client = {
    _updated: updated,
    from(tableName: string): MockBuilder {
      let isHeadCount = false;
      const qb: MockBuilder = {
        _table: tableName,
        select: (_cols?: string, opts?: { count: string; head: boolean }) => {
          if (opts?.head) {
            isHeadCount = true;
          }
          return qb;
        },
        eq: () => {
          if (tableName === 'newsletter_deliveries' && isHeadCount) {
            return Promise.resolve({ count: state.deliveryCount ?? 0, data: null, error: null });
          }
          return qb;
        },
        maybeSingle: () => {
          if (tableName === 'newsletter_ab_tests') {
            return Promise.resolve({ data: state.abTest ?? null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        update: (patch: Record<string, unknown>) => {
          updated.push({ table: tableName, patch });
          return { eq: () => Promise.resolve({ data: null, error: null }) };
        },
        // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for supabase chainable API
        then(resolve: (v: { data: unknown; error: null }) => void) {
          if (tableName === 'newsletter_deliveries') {
            resolve({ data: state.deliveries ?? [], error: null });
          } else {
            resolve({ data: [], error: null });
          }
        },
      };
      return qb;
    },
  };
  return client;
}

describe('selectSubjectVariant', () => {
  it('returns empty when no AB test exists for template/period', async () => {
    const sup = makeSupabaseMock({ abTest: null });
    const res = await selectSubjectVariant({
      template: 'monthly-mom',
      periodDate: '2026-03-01',
      subscriberId: 'sub-1',
      supabase: sup as never,
    });
    expect(res.subject).toBe('');
    expect(res.abTestId).toBeNull();
  });

  it('deterministic split 50/50 during sample window', async () => {
    const sup = makeSupabaseMock({
      abTest: {
        id: 'ab-1',
        template: 'monthly-mom',
        period_date: '2026-03-01',
        variant_a_subject: 'Subject A',
        variant_b_subject: 'Subject B',
        sample_size: 1000,
        winner_variant: null,
        variant_a_open_rate: null,
        variant_b_open_rate: null,
        computed_at: null,
      },
      deliveryCount: 100,
    });

    const r1 = await selectSubjectVariant({
      template: 'monthly-mom',
      periodDate: '2026-03-01',
      subscriberId: 'alice',
      supabase: sup as never,
    });
    const r1b = await selectSubjectVariant({
      template: 'monthly-mom',
      periodDate: '2026-03-01',
      subscriberId: 'alice',
      supabase: sup as never,
    });
    // Mismo subscriberId → mismo bucket (determinístico).
    expect(r1.variant).toBe(r1b.variant);
    expect(r1.abTestId).toBe('ab-1');
    expect(['A', 'B']).toContain(r1.variant);
  });

  it('distributes across both variants with many subscribers', async () => {
    const sup = makeSupabaseMock({
      abTest: {
        id: 'ab-1',
        template: 'monthly-mom',
        period_date: '2026-03-01',
        variant_a_subject: 'A',
        variant_b_subject: 'B',
        sample_size: 1000,
        winner_variant: null,
        variant_a_open_rate: null,
        variant_b_open_rate: null,
        computed_at: null,
      },
      deliveryCount: 0,
    });
    const counts: Record<'A' | 'B', number> = { A: 0, B: 0 };
    for (let i = 0; i < 100; i++) {
      const r = await selectSubjectVariant({
        template: 'monthly-mom',
        periodDate: '2026-03-01',
        subscriberId: `sub-${i}`,
        supabase: sup as never,
      });
      counts[r.variant] += 1;
    }
    // No todos deben caer en la misma bucket.
    expect(counts.A).toBeGreaterThan(0);
    expect(counts.B).toBeGreaterThan(0);
  });

  it('returns winner subject when winner already computed', async () => {
    const sup = makeSupabaseMock({
      abTest: {
        id: 'ab-2',
        template: 'monthly-mom',
        period_date: '2026-03-01',
        variant_a_subject: 'A',
        variant_b_subject: 'B',
        sample_size: 1000,
        winner_variant: 'B',
        variant_a_open_rate: 0.22,
        variant_b_open_rate: 0.29,
        computed_at: '2026-03-02T00:00:00Z',
      },
    });
    const r = await selectSubjectVariant({
      template: 'monthly-mom',
      periodDate: '2026-03-01',
      subscriberId: 'sub-1',
      supabase: sup as never,
    });
    expect(r.subject).toBe('B');
    expect(r.variant).toBe('B');
  });
});

describe('computeWinner', () => {
  it('picks A when rateA > rateB and both sides have 50+ samples', async () => {
    const deliveries: Array<{ subject_variant: string | null; status: string }> = [];
    // A: 60 sends, 20 opens → 0.333
    for (let i = 0; i < 60; i++) {
      deliveries.push({ subject_variant: 'A', status: i < 20 ? 'opened' : 'sent' });
    }
    // B: 60 sends, 10 opens → 0.167
    for (let i = 0; i < 60; i++) {
      deliveries.push({ subject_variant: 'B', status: i < 10 ? 'opened' : 'sent' });
    }
    const sup = makeSupabaseMock({ deliveries });
    const res = await computeWinner({ abTestId: 'ab-1', supabase: sup as never });
    expect(res.winner).toBe('A');
    expect(res.openRateA).toBeGreaterThan(res.openRateB);
    expect(res.sampleA).toBe(60);
    expect(res.sampleB).toBe(60);
  });

  it('winner is null when sample size insufficient', async () => {
    const deliveries = [
      { subject_variant: 'A', status: 'opened' },
      { subject_variant: 'B', status: 'sent' },
    ];
    const sup = makeSupabaseMock({ deliveries });
    const res = await computeWinner({ abTestId: 'ab-x', supabase: sup as never });
    expect(res.winner).toBeNull();
  });
});
