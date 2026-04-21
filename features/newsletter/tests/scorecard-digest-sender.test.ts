import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import {
  defaultMockProvider,
  type EmailProviderAdapter,
  sendScorecardDigest,
} from '../lib/scorecard-digest-sender';
import type { NewsletterPreferences, NewsletterSubscriberStatus } from '../types';

type TestSupabase = SupabaseClient<Database>;

interface ReportFixture {
  id: string;
  report_id: string;
  period_type: 'quarterly';
  period_date: string;
  country_code: string;
  pdf_url: string | null;
  narrative_md: string | null;
  data_snapshot: Record<string, unknown>;
  published_at: string | null;
  hero_insights: unknown[];
  press_kit_url: string | null;
  created_at: string;
}

interface SubscriberFixture {
  id: string;
  email: string;
  locale: 'es-MX' | 'es-CO' | 'es-AR' | 'pt-BR' | 'en-US';
  status: NewsletterSubscriberStatus;
  preferences: NewsletterPreferences;
  unsubscribe_token_hash: string | null;
}

function buildReport(published = true): ReportFixture {
  return {
    id: 'uuid-1',
    report_id: 'MX-2026-Q1',
    period_type: 'quarterly',
    period_date: '2026-01-01',
    country_code: 'MX',
    pdf_url: null,
    narrative_md: 'Roma Norte lidera inflow migratorio.',
    data_snapshot: {},
    published_at: published ? '2026-04-15T10:00:00Z' : null,
    hero_insights: [
      {
        kind: 'top_magnet',
        zone_label: 'Roma Norte',
        headline: 'Roma',
        value: 900,
        delta: null,
        unit: 'count',
        zone_id: 'roma-norte',
      },
    ],
    press_kit_url: null,
    created_at: '2026-04-01T00:00:00Z',
  };
}

function buildSubscriber(overrides: Partial<SubscriberFixture> = {}): SubscriberFixture {
  return {
    id: 'sub-1',
    email: 'manu@example.com',
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
    unsubscribe_token_hash: 'hash',
    ...overrides,
  };
}

function createFakeSupabase(
  report: ReportFixture | null,
  subscribers: SubscriberFixture[],
): { supabase: TestSupabase; insertedDeliveries: unknown[] } {
  const insertedDeliveries: unknown[] = [];

  const from = vi.fn((table: string) => {
    const builder: Record<string, unknown> = {};

    if (table === 'scorecard_national_reports') {
      builder.select = vi.fn(() => builder);
      builder.eq = vi.fn(() => builder);
      builder.limit = vi.fn(() => builder);
      builder.maybeSingle = vi.fn(async () => ({ data: report, error: null }));
      return builder;
    }

    if (table === 'newsletter_subscribers') {
      builder.select = vi.fn(() => builder);
      builder.eq = vi.fn(() => builder);
      // biome-ignore lint/suspicious/noThenProperty: mimic Postgrest thenable
      builder.then = (resolve: (v: { data: SubscriberFixture[]; error: null }) => void) => {
        resolve({ data: subscribers, error: null });
      };
      return builder;
    }

    if (table === 'newsletter_deliveries') {
      builder.insert = vi.fn(async (payload: unknown) => {
        insertedDeliveries.push(payload);
        return { error: null };
      });
      return builder;
    }

    return builder;
  });

  return {
    supabase: { from } as unknown as TestSupabase,
    insertedDeliveries,
  };
}

describe('defaultMockProvider', () => {
  it('accepts all messages and returns a mock provider id', async () => {
    const result = await defaultMockProvider.send({
      to: 'a@b.com',
      subject: 'subject',
      html: '<p>x</p>',
    });
    expect(result.accepted).toBe(true);
    expect(result.provider).toBe('mock');
    expect(result.providerMessageId).toMatch(/^mock-/);
  });
});

describe('sendScorecardDigest', () => {
  it('filters subscribers by preferences.sections.scorecard', async () => {
    const subscribers = [
      buildSubscriber({ id: 's1' }),
      buildSubscriber({
        id: 's2',
        preferences: {
          frequency: 'monthly',
          zone_scope_ids: [],
          sections: {
            pulse: true,
            migration: true,
            causal: true,
            alpha: false,
            scorecard: false,
            streaks: true,
          },
        },
      }),
    ];
    const { supabase, insertedDeliveries } = createFakeSupabase(buildReport(true), subscribers);
    const sentMock = vi.fn(async () => ({
      providerMessageId: 'ext-1',
      provider: 'mock' as const,
      accepted: true,
      error: null,
    }));
    const provider: EmailProviderAdapter = { send: sentMock };

    const result = await sendScorecardDigest({
      reportId: 'MX-2026-Q1',
      countryCode: 'MX',
      mode: 'post',
      supabase,
      provider,
    });

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
    expect(sentMock).toHaveBeenCalledTimes(1);
    expect(insertedDeliveries).toHaveLength(1);
  });

  it('increments failed counter on provider rejection', async () => {
    const { supabase } = createFakeSupabase(buildReport(true), [buildSubscriber()]);
    const provider: EmailProviderAdapter = {
      send: async () => ({
        providerMessageId: null,
        provider: 'mock',
        accepted: false,
        error: 'bounce',
      }),
    };
    const result = await sendScorecardDigest({
      reportId: 'MX-2026-Q1',
      countryCode: 'MX',
      mode: 'post',
      supabase,
      provider,
    });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('dryRun does not call provider', async () => {
    const { supabase } = createFakeSupabase(buildReport(true), [buildSubscriber()]);
    const sentMock = vi.fn();
    const provider: EmailProviderAdapter = {
      send: sentMock as unknown as EmailProviderAdapter['send'],
    };
    const result = await sendScorecardDigest({
      reportId: 'MX-2026-Q1',
      countryCode: 'MX',
      mode: 'post',
      supabase,
      provider,
      dryRun: true,
    });
    expect(result.sent).toBe(1);
    expect(sentMock).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
  });

  it('throws when report has no published_at in post mode', async () => {
    const { supabase } = createFakeSupabase(buildReport(false), [buildSubscriber()]);
    await expect(
      sendScorecardDigest({
        reportId: 'MX-2026-Q1',
        countryCode: 'MX',
        mode: 'post',
        supabase,
      }),
    ).rejects.toThrow(/published_at/);
  });

  it('preview mode works with unpublished report', async () => {
    const { supabase } = createFakeSupabase(buildReport(false), [buildSubscriber()]);
    const result = await sendScorecardDigest({
      reportId: 'MX-2026-Q1',
      countryCode: 'MX',
      mode: 'preview',
      supabase,
      dryRun: true,
    });
    expect(result.sent).toBe(1);
  });
});
