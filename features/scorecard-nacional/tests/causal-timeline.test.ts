import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import { buildCausalTimeline } from '../lib/causal-timeline';

type TestSupabase = SupabaseClient<Database>;

interface ExplanationRowFixture {
  scope_id: string;
  scope_type: string;
  period_date: string;
  explanation_md: string;
  citations: unknown;
}

function createFakeSupabase(rows: ExplanationRowFixture[]): TestSupabase {
  const from = vi.fn((_table: string) => {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.gte = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    builder.limit = vi.fn(
      () =>
        ({
          // Final call — resolves with the provided fixture.
          // biome-ignore lint/suspicious/noThenProperty: mimic Postgrest thenable.
          then: (resolve: (v: { data: ExplanationRowFixture[]; error: null }) => void) =>
            resolve({ data: rows, error: null }),
        }) as unknown as PromiseLike<{ data: ExplanationRowFixture[]; error: null }>,
    );
    return builder;
  });
  return { from } as unknown as TestSupabase;
}

const MOCK_ROWS: ExplanationRowFixture[] = [
  {
    scope_id: 'roma-norte',
    scope_type: 'colonia',
    period_date: '2026-01-01',
    explanation_md: 'IPV subió por movilidad.',
    citations: [{ ref_id: 'score:IPV:roma-norte:2026-01' }],
  },
  {
    scope_id: 'roma-norte',
    scope_type: 'colonia',
    period_date: '2026-02-01',
    explanation_md: 'IPV bajó por seguridad.',
    citations: [{ ref_id: 'score:IPV:roma-norte:2026-02' }],
  },
  {
    scope_id: 'roma-norte',
    scope_type: 'colonia',
    period_date: '2026-03-01',
    explanation_md: 'IPV recuperó por cafés.',
    citations: [{ ref_id: 'score:IPV:roma-norte:2026-03' }],
  },
];

describe('buildCausalTimeline', () => {
  it('returns entries matching the fetched explanations', async () => {
    const supabase = createFakeSupabase(MOCK_ROWS);
    const bundle = await buildCausalTimeline('roma-norte', 'MX', 12, { supabase });
    expect(bundle.entries).toHaveLength(3);
    expect(bundle.zone_id).toBe('roma-norte');
    expect(bundle.country_code).toBe('MX');
    expect(bundle.months_covered).toBe(3);
  });

  it('uses causalHook output as narrative_md when provided', async () => {
    const supabase = createFakeSupabase(MOCK_ROWS);
    const causalHook = vi.fn(async () => ({ text: 'Mock narrative', citations: [] }));
    const bundle = await buildCausalTimeline('roma-norte', 'MX', 12, {
      supabase,
      causalHook,
    });
    expect(bundle.narrative_md).toBe('Mock narrative');
    expect(causalHook).toHaveBeenCalledTimes(1);
  });

  it('falls back to a deterministic non-empty narrative when no causalHook is provided', async () => {
    const supabase = createFakeSupabase(MOCK_ROWS);
    const bundle = await buildCausalTimeline('roma-norte', 'MX', 12, { supabase });
    expect(bundle.narrative_md.length).toBeGreaterThan(0);
    expect(bundle.narrative_md).toContain('IPV');
  });

  it('populates alpha_journey_md when alphaJourneyHook returns a string', async () => {
    const supabase = createFakeSupabase(MOCK_ROWS);
    const alphaJourneyHook = vi.fn(async () => 'Mock alpha journey');
    const bundle = await buildCausalTimeline('roma-norte', 'MX', 12, {
      supabase,
      alphaJourneyHook,
    });
    expect(bundle.alpha_journey_md).toBe('Mock alpha journey');
    expect(alphaJourneyHook).toHaveBeenCalledWith('roma-norte');
  });

  it('leaves alpha_journey_md null when the hook is absent', async () => {
    const supabase = createFakeSupabase(MOCK_ROWS);
    const bundle = await buildCausalTimeline('roma-norte', 'MX', 12, { supabase });
    expect(bundle.alpha_journey_md).toBeNull();
  });

  it('normalizes citations (extracts ref_id strings)', async () => {
    const supabase = createFakeSupabase(MOCK_ROWS);
    const bundle = await buildCausalTimeline('roma-norte', 'MX', 12, { supabase });
    expect(bundle.entries[0]?.citations).toContain('score:IPV:roma-norte:2026-01');
  });
});
