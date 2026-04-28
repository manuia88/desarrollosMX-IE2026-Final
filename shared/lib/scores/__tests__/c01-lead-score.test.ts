import { describe, expect, it } from 'vitest';
import { __c01_constants, computeLeadScore, type LeadScoreResult } from '../c01-lead-score';

interface SupabaseStubConfig {
  readonly lead?: Record<string, unknown> | null;
  readonly journeysActiveCount?: number;
  readonly journeysAllCount?: number;
}

function createSupabaseStub(cfg: SupabaseStubConfig) {
  // Each call to .from('journey_executions') returns a fresh chainable.
  function makeJourneyChain(): unknown {
    let isActiveQuery = false;
    const chain = {
      select(_cols: unknown, _opts?: unknown) {
        return chain;
      },
      eq(_col: unknown, _val: unknown) {
        return chain;
      },
      gte(_col: unknown, _val: unknown) {
        return chain;
      },
      in(_col: unknown, vals: readonly string[]) {
        if (vals.includes('pending') || vals.includes('running')) {
          isActiveQuery = true;
        }
        return chain;
      },
      // biome-ignore lint/suspicious/noThenProperty: thenable stubs supabase chain awaits in test
      then(resolve: (v: { count: number; error: null }) => void) {
        const count = isActiveQuery ? (cfg.journeysActiveCount ?? 0) : (cfg.journeysAllCount ?? 0);
        resolve({ count, error: null });
      },
    };
    return chain;
  }

  function makeLeadChain(): unknown {
    return {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      single() {
        return Promise.resolve({ data: cfg.lead ?? null, error: null });
      },
    };
  }

  return {
    from(name: string) {
      if (name === 'leads') return makeLeadChain();
      if (name === 'journey_executions') return makeJourneyChain();
      throw new Error(`unhandled table ${name}`);
    },
  };
}

describe('c01-lead-score engine', () => {
  it('returns zero result when lead not found', async () => {
    const supabase = createSupabaseStub({ lead: null }) as never;
    const result: LeadScoreResult = await computeLeadScore('00000000-0000-0000-0000-000000000000', {
      supabase,
    });

    expect(result.score).toBe(0);
    expect(result.tier).toBe('cold');
    expect(result.factors.is_partial_signal).toBe(true);
    expect(result.factors.missing_signals).toContain('lead_not_found');
    expect(result.model_version).toBe(__c01_constants.MODEL_VERSION);
  });

  it('produces a hot score when intent signals are strong + recent', async () => {
    const now = new Date().toISOString();
    const supabase = createSupabaseStub({
      lead: {
        id: 'lead-hot',
        status: 'oferta',
        qualification_score: 90,
        source_id: 'src',
        zone_id: 'zone-1',
        metadata: { budget_min: 1500000, budget_max: 3000000 },
        contact_email: 'x@example.com',
        contact_phone: '+52555000',
        created_at: now,
        updated_at: now,
      },
      journeysActiveCount: 2,
      journeysAllCount: 6,
    }) as never;

    const result = await computeLeadScore('lead-hot', { supabase });
    expect(result.score).toBeGreaterThanOrEqual(__c01_constants.HOT_THRESHOLD);
    expect(result.tier).toBe('hot');
    expect(result.factors.intent_signals.offer_requested).toBe(true);
    expect(result.factors.demographics_signals.has_budget_in_metadata).toBe(true);
  });

  it('produces a cold score for an old, low-qualification lead with no engagement', async () => {
    const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const supabase = createSupabaseStub({
      lead: {
        id: 'lead-cold',
        status: 'lead',
        qualification_score: 5,
        source_id: 'src',
        zone_id: '',
        metadata: {},
        contact_email: null,
        contact_phone: null,
        created_at: oldDate,
        updated_at: oldDate,
      },
      journeysActiveCount: 0,
      journeysAllCount: 0,
    }) as never;

    const result = await computeLeadScore('lead-cold', { supabase });
    expect(result.score).toBeLessThan(__c01_constants.WARM_THRESHOLD);
    expect(result.tier).toBe('cold');
    expect(result.factors.recency_signals.days_since_update).toBeGreaterThanOrEqual(89);
  });

  it('clamps score to 0-100 inclusive and emits ttl_until in the future', async () => {
    const supabase = createSupabaseStub({
      lead: {
        id: 'lead-clamp',
        status: 'oferta',
        qualification_score: 100,
        source_id: 'src',
        zone_id: 'zone-1',
        metadata: { budget_min: 100000, budget_max: 999999 },
        contact_email: 'a@b.com',
        contact_phone: '+1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      journeysActiveCount: 99,
      journeysAllCount: 99,
    }) as never;

    const result = await computeLeadScore('lead-clamp', { supabase });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(new Date(result.ttl_until).getTime()).toBeGreaterThan(Date.now());
  });

  it('marks signals partial with documented missing list', async () => {
    const supabase = createSupabaseStub({
      lead: {
        id: 'lead-x',
        status: 'lead',
        qualification_score: 50,
        source_id: 'src',
        zone_id: 'z',
        metadata: {},
        contact_email: null,
        contact_phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      journeysActiveCount: 0,
      journeysAllCount: 0,
    }) as never;

    const result = await computeLeadScore('lead-x', { supabase });
    expect(result.factors.is_partial_signal).toBe(true);
    expect(result.factors.missing_signals).toEqual(
      expect.arrayContaining(['lead_touchpoints', 'meeting_scheduled_v2']),
    );
  });
});
