import { describe, expect, it, vi } from 'vitest';
import {
  computeStreakForZone,
  STREAK_MONTHS_WINDOW,
  STREAK_PULSE_THRESHOLD,
  STREAK_TOP_LIMIT,
  subtractMonthsIso,
} from '@/features/newsletter/lib/streaks-calculator';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(),
    rpc: vi.fn(),
  })),
}));

describe('streaks-calculator — constants', () => {
  it('exposes threshold + window + limit constants', () => {
    expect(STREAK_PULSE_THRESHOLD).toBe(80);
    expect(STREAK_MONTHS_WINDOW).toBe(12);
    expect(STREAK_TOP_LIMIT).toBe(10);
  });
});

describe('streaks-calculator — subtractMonthsIso', () => {
  it('handles simple subtraction within a year', () => {
    expect(subtractMonthsIso('2026-06-01', 3)).toBe('2026-03-01');
  });

  it('wraps across year boundaries', () => {
    expect(subtractMonthsIso('2026-02-01', 3)).toBe('2025-11-01');
  });

  it('subtracting 11 months leaves same month last year for Dec', () => {
    expect(subtractMonthsIso('2026-12-01', 11)).toBe('2026-01-01');
  });
});

describe('streaks-calculator — computeStreakForZone', () => {
  it('returns streak=0 when no rows', () => {
    const r = computeStreakForZone([], '2026-04-01');
    expect(r.streak).toBe(0);
    expect(r.currentPulse).toBe(0);
  });

  it('counts consecutive months above threshold from periodDate backwards', () => {
    const rows = [
      {
        scope_type: 'colonia',
        scope_id: 'x',
        country_code: 'MX',
        period_date: '2026-04-01',
        pulse_score: 90,
      },
      {
        scope_type: 'colonia',
        scope_id: 'x',
        country_code: 'MX',
        period_date: '2026-03-01',
        pulse_score: 85,
      },
      {
        scope_type: 'colonia',
        scope_id: 'x',
        country_code: 'MX',
        period_date: '2026-02-01',
        pulse_score: 81,
      },
      {
        scope_type: 'colonia',
        scope_id: 'x',
        country_code: 'MX',
        period_date: '2026-01-01',
        pulse_score: 70,
      },
    ];
    const r = computeStreakForZone(rows, '2026-04-01');
    expect(r.streak).toBe(3);
    expect(r.currentPulse).toBe(90);
  });

  it('stops counting at first month below threshold', () => {
    const rows = [
      {
        scope_type: 'colonia',
        scope_id: 'x',
        country_code: 'MX',
        period_date: '2026-04-01',
        pulse_score: 90,
      },
      {
        scope_type: 'colonia',
        scope_id: 'x',
        country_code: 'MX',
        period_date: '2026-03-01',
        pulse_score: 50,
      },
      {
        scope_type: 'colonia',
        scope_id: 'x',
        country_code: 'MX',
        period_date: '2026-02-01',
        pulse_score: 90,
      },
    ];
    const r = computeStreakForZone(rows, '2026-04-01');
    expect(r.streak).toBe(1);
    expect(r.currentPulse).toBe(90);
  });

  it('ignores rows strictly after periodDate', () => {
    const rows = [
      {
        scope_type: 'colonia',
        scope_id: 'x',
        country_code: 'MX',
        period_date: '2026-05-01',
        pulse_score: 95,
      },
      {
        scope_type: 'colonia',
        scope_id: 'x',
        country_code: 'MX',
        period_date: '2026-04-01',
        pulse_score: 82,
      },
    ];
    const r = computeStreakForZone(rows, '2026-04-01');
    expect(r.streak).toBe(1);
    expect(r.currentPulse).toBe(82);
  });

  it('handles null pulse_score as zero (breaks streak)', () => {
    const rows = [
      {
        scope_type: 'colonia',
        scope_id: 'x',
        country_code: 'MX',
        period_date: '2026-04-01',
        pulse_score: null,
      },
    ];
    const r = computeStreakForZone(rows, '2026-04-01');
    expect(r.streak).toBe(0);
    expect(r.currentPulse).toBe(0);
  });
});

describe('computeZoneStreaks — module exports', () => {
  it('exports computeZoneStreaks as function', async () => {
    const mod = await import('@/features/newsletter/lib/streaks-calculator');
    expect(typeof mod.computeZoneStreaks).toBe('function');
  });
});
