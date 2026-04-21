import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import {
  buildDeterministicHeadline,
  buildScorecardDigest,
  extractExecutiveSnippet,
  formatPeriodLabel,
  resolveHeroLookup,
} from '../lib/scorecard-digest-builder';

type TestSupabase = SupabaseClient<Database>;

interface ReportFixture {
  id: string;
  report_id: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
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

function createFakeSupabase(fixture: ReportFixture | null): TestSupabase {
  const from = vi.fn(() => {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.limit = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(async () => ({
      data: fixture,
      error: null,
    }));
    return builder;
  });
  return { from } as unknown as TestSupabase;
}

describe('extractExecutiveSnippet', () => {
  it('returns empty string when narrative is null', () => {
    expect(extractExecutiveSnippet(null)).toBe('');
    expect(extractExecutiveSnippet(undefined)).toBe('');
  });

  it('truncates to the word limit with ellipsis', () => {
    const md = Array.from({ length: 250 }, (_, i) => `w${i}`).join(' ');
    const snippet = extractExecutiveSnippet(md, 10);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet.split(/\s+/).length).toBeLessThanOrEqual(11);
  });

  it('strips markdown headings and blockquotes', () => {
    const md = '# Título\n\n> Cita inicial\n\nCuerpo del resumen.';
    const snippet = extractExecutiveSnippet(md, 200);
    expect(snippet).not.toContain('# ');
    expect(snippet).not.toContain('> ');
    expect(snippet).toContain('Cuerpo del resumen');
  });
});

describe('formatPeriodLabel', () => {
  it('formats quarterly labels', () => {
    expect(formatPeriodLabel('2026-03-01', 'quarterly')).toBe('2026 Q1');
    expect(formatPeriodLabel('2026-07-01', 'quarterly')).toBe('2026 Q3');
  });

  it('formats annual labels', () => {
    expect(formatPeriodLabel('2026-01-01', 'annual')).toBe('Anual 2026');
  });

  it('formats monthly labels', () => {
    expect(formatPeriodLabel('2026-04-01', 'monthly')).toBe('4/2026');
  });
});

describe('resolveHeroLookup', () => {
  it('extracts top_magnet and alpha_emerging labels', () => {
    const lookup = resolveHeroLookup([
      {
        kind: 'top_magnet',
        zone_label: 'Roma Norte',
        headline: 'Roma Norte lidera inflow neto',
        value: 800,
        delta: 200,
        unit: 'count',
        zone_id: 'roma-norte',
      },
      {
        kind: 'alpha_emerging',
        zone_label: 'Juárez',
        headline: 'Juárez alpha emergiendo',
        value: 8.4,
        delta: 1.2,
        unit: 'score_0_100',
        zone_id: 'juarez',
      },
    ]);
    expect(lookup.topMagnetLabel).toBe('Roma Norte');
    expect(lookup.alphaLeaderLabel).toBe('Juárez');
    expect(lookup.topInsights).toHaveLength(2);
  });

  it('returns nulls when no matching insights', () => {
    const lookup = resolveHeroLookup([]);
    expect(lookup.topMagnetLabel).toBeNull();
    expect(lookup.alphaLeaderLabel).toBeNull();
  });

  it('ignores malformed entries', () => {
    const lookup = resolveHeroLookup([null, { kind: 'not_a_kind' }, 'bad']);
    expect(lookup.topInsights).toHaveLength(0);
  });
});

describe('buildDeterministicHeadline', () => {
  it('builds full headline with both magnet and alpha', () => {
    const h = buildDeterministicHeadline('2026 Q1', {
      topMagnetLabel: 'Roma Norte',
      alphaLeaderLabel: 'Juárez',
      topInsights: [],
    });
    expect(h).toContain('Roma Norte');
    expect(h).toContain('Juárez');
    expect(h).toContain('2026 Q1');
  });

  it('falls back to magnet-only when alpha missing', () => {
    const h = buildDeterministicHeadline('2026 Q1', {
      topMagnetLabel: 'Roma Norte',
      alphaLeaderLabel: null,
      topInsights: [],
    });
    expect(h).toContain('Roma Norte');
    expect(h).not.toContain('sorpresa alpha');
  });

  it('uses generic fallback when both missing', () => {
    const h = buildDeterministicHeadline('2026 Q1', {
      topMagnetLabel: null,
      alphaLeaderLabel: null,
      topInsights: [],
    });
    expect(h).toContain('resumen');
  });
});

describe('buildScorecardDigest', () => {
  const baseFixture: ReportFixture = {
    id: 'uuid-1',
    report_id: 'MX-2026-Q1',
    period_type: 'quarterly',
    period_date: '2026-01-01',
    country_code: 'MX',
    pdf_url: null,
    narrative_md:
      '# Resumen\n\nEste trimestre Roma Norte consolida su liderazgo en inflow migratorio mientras Juárez emerge como alpha sorpresa con chefs + galerías.',
    data_snapshot: {},
    published_at: '2026-04-15T10:00:00Z',
    hero_insights: [
      {
        kind: 'top_magnet',
        zone_label: 'Roma Norte',
        headline: 'Roma lidera',
        value: 900,
        delta: null,
        unit: 'count',
        zone_id: 'roma-norte',
      },
      {
        kind: 'alpha_emerging',
        zone_label: 'Juárez',
        headline: 'Juárez alpha',
        value: null,
        delta: null,
        unit: 'score_0_100',
        zone_id: 'juarez',
      },
    ],
    press_kit_url: null,
    created_at: '2026-04-14T00:00:00Z',
  };

  it('builds preview bundle with release_date from published_at', async () => {
    const supabase = createFakeSupabase(baseFixture);
    const bundle = await buildScorecardDigest({
      reportId: 'MX-2026-Q1',
      mode: 'preview',
      supabase,
    });
    expect(bundle.report_id).toBe('MX-2026-Q1');
    expect(bundle.period_type).toBe('quarterly');
    expect(bundle.release_date).toBe('2026-04-15');
    expect(bundle.headline).toContain('Roma Norte');
    expect(bundle.headline).toContain('Juárez');
    expect(bundle.cta_url).toContain('/scorecard-nacional/MX-2026-Q1');
    expect(bundle.preview_paragraph.length).toBeGreaterThan(0);
  });

  it('derives release_date = now + 60d when published_at is null in preview', async () => {
    const fixture: ReportFixture = { ...baseFixture, published_at: null };
    const supabase = createFakeSupabase(fixture);
    const now = new Date('2026-05-01T00:00:00Z');
    const bundle = await buildScorecardDigest({
      reportId: 'MX-2026-Q1',
      mode: 'preview',
      supabase,
      now,
    });
    expect(bundle.release_date).toBe('2026-06-30');
  });

  it('throws when mode=post and published_at is null', async () => {
    const fixture: ReportFixture = { ...baseFixture, published_at: null };
    const supabase = createFakeSupabase(fixture);
    await expect(
      buildScorecardDigest({ reportId: 'MX-2026-Q1', mode: 'post', supabase }),
    ).rejects.toThrow(/published_at/);
  });

  it('throws when report not found', async () => {
    const supabase = createFakeSupabase(null);
    await expect(
      buildScorecardDigest({ reportId: 'MX-9999-Q1', mode: 'preview', supabase }),
    ).rejects.toThrow(/not found/);
  });

  it('uses custom siteUrl and locale in cta_url', async () => {
    const supabase = createFakeSupabase(baseFixture);
    const bundle = await buildScorecardDigest({
      reportId: 'MX-2026-Q1',
      mode: 'preview',
      supabase,
      siteUrl: 'https://staging.example.com',
      locale: 'en-US',
    });
    expect(bundle.cta_url).toBe('https://staging.example.com/en-US/scorecard-nacional/MX-2026-Q1');
  });
});
