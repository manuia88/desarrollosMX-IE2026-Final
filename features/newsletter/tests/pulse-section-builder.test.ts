import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import { buildPulseSection, computeDelta4w } from '../lib/pulse-section-builder';

type TestSupabase = SupabaseClient<Database>;

interface PulseRow {
  period_date: string;
  pulse_score: number | null;
}

function createFakeSupabase(rows: PulseRow[]): TestSupabase {
  const from = vi.fn(() => {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    builder.limit = vi.fn(() => builder);
    // biome-ignore lint/suspicious/noThenProperty: mimic Postgrest thenable.
    builder.then = (resolve: (v: { data: PulseRow[]; error: null }) => void) => {
      resolve({ data: rows, error: null });
    };
    return builder;
  });
  return { from } as unknown as TestSupabase;
}

describe('computeDelta4w', () => {
  it('returns null with fewer than 2 rows', () => {
    expect(computeDelta4w([])).toBeNull();
    expect(computeDelta4w([{ period_date: '2026-04-01', pulse_score: 70 }])).toBeNull();
  });

  it('returns delta against row 4 periods back (newest first)', () => {
    const rows: PulseRow[] = [
      { period_date: '2026-04-01', pulse_score: 80 },
      { period_date: '2026-03-01', pulse_score: 78 },
      { period_date: '2026-02-01', pulse_score: 76 },
      { period_date: '2026-01-01', pulse_score: 72 },
      { period_date: '2025-12-01', pulse_score: 60 },
    ];
    expect(computeDelta4w(rows)).toBe(20);
  });

  it('falls back to last available when history shorter than 4', () => {
    const rows: PulseRow[] = [
      { period_date: '2026-04-01', pulse_score: 80 },
      { period_date: '2026-03-01', pulse_score: 70 },
    ];
    expect(computeDelta4w(rows)).toBe(10);
  });

  it('returns null when current pulse is null', () => {
    const rows: PulseRow[] = [
      { period_date: '2026-04-01', pulse_score: null },
      { period_date: '2026-03-01', pulse_score: 70 },
    ];
    expect(computeDelta4w(rows)).toBeNull();
  });
});

describe('buildPulseSection', () => {
  it('returns null when no pulse data exists', async () => {
    const supabase = createFakeSupabase([]);
    const result = await buildPulseSection({
      scopeId: 'roma-norte',
      countryCode: 'MX',
      supabase,
    });
    expect(result).toBeNull();
  });

  it('builds bundle with sparkline SVG and detail URL', async () => {
    const rows: PulseRow[] = [
      { period_date: '2026-04-01', pulse_score: 80 },
      { period_date: '2026-03-01', pulse_score: 75 },
      { period_date: '2026-02-01', pulse_score: 72 },
      { period_date: '2026-01-01', pulse_score: 70 },
      { period_date: '2025-12-01', pulse_score: 68 },
    ];
    const supabase = createFakeSupabase(rows);
    const bundle = await buildPulseSection({
      scopeId: 'roma-norte',
      countryCode: 'MX',
      supabase,
    });
    expect(bundle).not.toBeNull();
    if (!bundle) throw new Error('bundle null');
    expect(bundle.scope_id).toBe('roma-norte');
    expect(bundle.current_pulse).toBe(80);
    expect(bundle.delta_4w).toBe(12); // 80 - 68 (idx 4)
    expect(bundle.sparkline_svg.startsWith('<svg')).toBe(true);
    expect(bundle.detail_url).toContain('colonia=roma-norte');
    expect(bundle.detail_url).toContain('#vital-signs');
  });

  it('respects custom siteUrl and indexCode in detail_url', async () => {
    const rows: PulseRow[] = [{ period_date: '2026-04-01', pulse_score: 70 }];
    const supabase = createFakeSupabase(rows);
    const bundle = await buildPulseSection({
      scopeId: 'condesa',
      countryCode: 'MX',
      supabase,
      siteUrl: 'https://staging.example.com/',
      indexCode: 'DMX-IPV',
      locale: 'en-US',
    });
    if (!bundle) throw new Error('bundle null');
    expect(bundle.detail_url).toBe(
      'https://staging.example.com/en-US/indices/DMX-IPV?colonia=condesa#vital-signs',
    );
  });

  it('returns null when current pulse is null', async () => {
    const rows: PulseRow[] = [
      { period_date: '2026-04-01', pulse_score: null },
      { period_date: '2026-03-01', pulse_score: 70 },
    ];
    const supabase = createFakeSupabase(rows);
    const bundle = await buildPulseSection({
      scopeId: 'roma-norte',
      countryCode: 'MX',
      supabase,
    });
    expect(bundle).toBeNull();
  });
});
