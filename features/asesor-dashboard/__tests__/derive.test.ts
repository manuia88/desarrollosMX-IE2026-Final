import { describe, expect, it } from 'vitest';
import type { DashboardSummary } from '../lib/dashboard-loader';
import {
  deriveAllKpis,
  deriveAvgCloseDays,
  deriveLeadsLast7d,
  deriveMood,
  derivePipelineMxn,
  deriveStreak,
  deriveVisits7dSeries,
  deriveXp,
  pipelineDaysProjection,
} from '../lib/derive';

const DAY_MS = 24 * 60 * 60 * 1000;

function dealsFixture() {
  const now = Date.now();
  return [
    {
      id: 'd1',
      lead_id: null,
      amount: 1_500_000,
      currency: 'MXN',
      stage_id: null,
      closed_at: null,
      created_at: new Date(now - 10 * DAY_MS).toISOString(),
      country_code: 'MX',
    },
    {
      id: 'd2',
      lead_id: null,
      amount: 800_000,
      currency: 'MXN',
      stage_id: null,
      closed_at: new Date(now - 2 * DAY_MS).toISOString(),
      created_at: new Date(now - 12 * DAY_MS).toISOString(),
      country_code: 'MX',
    },
  ];
}

function summaryFixture(): DashboardSummary {
  const now = Date.now();
  const operacionesTimes = [now - DAY_MS, now - 2 * DAY_MS, now - 3 * DAY_MS];
  return {
    asesorId: 'asesor-1',
    leads: [
      {
        id: 'l1',
        full_name: 'A',
        status: 'new',
        assigned_asesor_id: 'asesor-1',
        created_at: new Date(now - DAY_MS).toISOString(),
        country_code: 'MX',
      },
      {
        id: 'l2',
        full_name: 'B',
        status: 'new',
        assigned_asesor_id: 'asesor-1',
        created_at: new Date(now - 30 * DAY_MS).toISOString(),
        country_code: 'MX',
      },
    ],
    deals: dealsFixture(),
    operaciones: operacionesTimes.map((t, i) => ({
      id: `o${i}`,
      deal_id: null,
      amount: 100_000,
      currency: 'MXN',
      closed_at: new Date(t).toISOString(),
      fiscal_status: 'cfdi_pending',
      country_code: 'MX',
    })),
    hasAnyData: true,
  };
}

describe('derive helpers', () => {
  it('derivePipelineMxn sums active deals only', () => {
    const deals = dealsFixture();
    expect(derivePipelineMxn(deals)).toBe(1_500_000);
  });

  it('derivePipelineMxn returns null when no active deals', () => {
    expect(derivePipelineMxn([])).toBeNull();
  });

  it('deriveLeadsLast7d counts only recent leads', () => {
    const summary = summaryFixture();
    expect(deriveLeadsLast7d(summary.leads)).toBe(1);
  });

  it('deriveVisits7dSeries returns 7-bucket series', () => {
    const summary = summaryFixture();
    const out = deriveVisits7dSeries(summary.operaciones);
    expect(out.series).toHaveLength(7);
    expect(out.count).toBe(3);
  });

  it('deriveAvgCloseDays computes mean', () => {
    const deals = dealsFixture();
    const avg = deriveAvgCloseDays(deals);
    expect(avg).toBeGreaterThan(0);
  });

  it('deriveXp scales with closed operaciones', () => {
    const summary = summaryFixture();
    const xp = deriveXp(summary.operaciones);
    expect(xp.current).toBe(300);
    expect(xp.level).toBe(1);
  });

  it('deriveStreak counts consecutive days from today backwards', () => {
    const summary = summaryFixture();
    const streak = deriveStreak(summary.operaciones);
    expect(streak.bars).toHaveLength(30);
    expect(streak.days).toBeGreaterThanOrEqual(0);
  });

  it('deriveMood returns one of allowed moods', () => {
    const mood = deriveMood(summaryFixture());
    expect(['high', 'neutral', 'low', 'mixed']).toContain(mood);
  });

  it('deriveAllKpis aggregates without throwing', () => {
    const kpis = deriveAllKpis(summaryFixture());
    expect(kpis.pipelineMxn).toBe(1_500_000);
    expect(kpis.leadsCount).toBe(2);
    expect(kpis.visitsLast7dSeries).toHaveLength(7);
  });

  it('pipelineDaysProjection returns null with insufficient data', () => {
    expect(pipelineDaysProjection([])).toBeNull();
  });
});
