import { beforeAll, describe, expect, it, vi } from 'vitest';
import { __resetEmailProviderForTests } from '../lib/email-provider';

beforeAll(() => {
  process.env.NEWSLETTER_TOKEN_SECRET = 'test-secret-dmx-hmac-key-stable-0123';
  process.env.CI = 'true'; // force mock provider
  __resetEmailProviderForTests();
});

// Mock the monthly-builder so we don't hit Supabase.
vi.mock('../lib/monthly-builder', () => ({
  buildMonthlyBundle: vi.fn(async (opts: { periodDate: string; countryCode: string }) => ({
    period_date: opts.periodDate,
    country_code: opts.countryCode,
    locale: 'es-MX',
    hero_top_five: [
      {
        rank: 1,
        scope_type: 'colonia',
        scope_id: 'roma-norte',
        zone_label: 'Roma Norte',
        value: 92.5,
        delta_pct: 2.1,
      },
    ],
    causal_paragraphs: ['Razón principal.'],
    pulse_section: null,
    migration_section: null,
    streaks_section: null,
    cta: { label: 'Ver los 15 índices', url: 'https://app.desarrollosmx.com/es-MX/indices' },
  })),
}));

vi.mock('../lib/ab-testing', () => ({
  selectSubjectVariant: vi.fn(async () => ({ subject: '', variant: 'A', abTestId: null })),
}));

import { sendMonthlyNewsletters } from '../lib/send-orchestrator';

interface SubRow {
  readonly id: string;
  readonly email: string;
  readonly locale: string;
  readonly status: string;
  readonly preferences: unknown;
  readonly user_id: string | null;
}

interface SubsBuilder {
  readonly select: () => SubsBuilder;
  readonly eq: () => SubsBuilder;
  readonly range: (from: number, to: number) => Promise<{ data: SubRow[]; error: null }>;
}

interface DeliveriesBuilder {
  readonly insert: (payload: Record<string, unknown>) => Promise<{ data: null; error: null }>;
}

function makeMockSupabase(subs: SubRow[]) {
  const inserted: Array<Record<string, unknown>> = [];
  const client = {
    _inserted: inserted,
    from(
      tableName: string,
    ): SubsBuilder | DeliveriesBuilder | { select: () => Promise<{ data: never[]; error: null }> } {
      if (tableName === 'newsletter_subscribers') {
        const qb: SubsBuilder = {
          select: () => qb,
          eq: () => qb,
          range: (from: number, to: number) => {
            const slice = subs.slice(from, to + 1);
            return Promise.resolve({ data: slice, error: null });
          },
        };
        return qb;
      }
      if (tableName === 'newsletter_deliveries') {
        const qb: DeliveriesBuilder = {
          insert: (payload: Record<string, unknown>) => {
            inserted.push(payload);
            return Promise.resolve({ data: null, error: null });
          },
        };
        return qb;
      }
      return { select: () => Promise.resolve({ data: [], error: null }) };
    },
  };
  return client;
}

describe('sendMonthlyNewsletters', () => {
  it('sends to all active monthly subscribers + records deliveries', async () => {
    const subs: SubRow[] = [
      {
        id: 'sub-1',
        email: 'alice@example.com',
        locale: 'es-MX',
        status: 'active',
        preferences: {
          frequency: 'monthly',
          zone_scope_ids: [],
          sections: {
            pulse: true,
            migration: true,
            causal: true,
            alpha: false,
            scorecard: true,
            streaks: true,
          },
        },
        user_id: null,
      },
      {
        id: 'sub-2',
        email: 'bob@example.com',
        locale: 'es-MX',
        status: 'active',
        preferences: {
          frequency: 'monthly',
          zone_scope_ids: [],
          sections: {
            pulse: true,
            migration: true,
            causal: true,
            alpha: false,
            scorecard: true,
            streaks: true,
          },
        },
        user_id: null,
      },
    ];
    const sup = makeMockSupabase(subs);
    const result = await sendMonthlyNewsletters({
      periodDate: '2026-03-01',
      countryCode: 'MX',
      supabase: sup as never,
      limit: 500,
    });
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    const inserted = (sup as { _inserted: Array<Record<string, unknown>> })._inserted;
    expect(inserted.length).toBe(2);
    for (const row of inserted) {
      expect(row.template).toBe('monthly-mom');
      expect(row.status).toBe('sent');
    }
  });

  it('handles empty subscriber list gracefully', async () => {
    const sup = makeMockSupabase([]);
    const result = await sendMonthlyNewsletters({
      periodDate: '2026-03-01',
      countryCode: 'MX',
      supabase: sup as never,
    });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
  });
});
