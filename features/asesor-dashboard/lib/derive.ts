import type {
  DashboardDealRow,
  DashboardLeadRow,
  DashboardOperacionRow,
  DashboardSummary,
} from './dashboard-loader';

const DAY_MS = 24 * 60 * 60 * 1000;

export type Mood = 'high' | 'neutral' | 'low' | 'mixed';

export interface DerivedKpis {
  pipelineMxn: number | null;
  leadsCount: number;
  leadsLast7d: number;
  visitsLast7dCount: number;
  visitsLast7dSeries: number[];
  avgCloseDays: number | null;
  xpLevel: number;
  xpCurrent: number;
  xpNextThreshold: number;
}

export function isDealActive(deal: DashboardDealRow): boolean {
  return deal.closed_at === null;
}

export function derivePipelineMxn(deals: readonly DashboardDealRow[]): number | null {
  const active = deals.filter(isDealActive);
  if (active.length === 0) return null;
  let total = 0;
  for (const d of active) {
    if (typeof d.amount === 'number') total += d.amount;
  }
  return total > 0 ? total : null;
}

export function deriveLeadsLast7d(leads: readonly DashboardLeadRow[]): number {
  const cutoff = Date.now() - 7 * DAY_MS;
  return leads.filter((l) => new Date(l.created_at).getTime() >= cutoff).length;
}

export function deriveVisits7dSeries(operaciones: readonly DashboardOperacionRow[]): {
  count: number;
  series: number[];
} {
  const buckets = Array.from({ length: 7 }, () => 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  for (const op of operaciones) {
    if (!op.closed_at) continue;
    const d = new Date(op.closed_at).getTime();
    const diff = Math.floor((todayMs - d) / DAY_MS);
    if (diff >= 0 && diff < 7) {
      const idx = 6 - diff;
      const current = buckets[idx] ?? 0;
      buckets[idx] = current + 1;
    }
  }
  const count = buckets.reduce((a, b) => a + b, 0);
  return { count, series: buckets };
}

export function deriveAvgCloseDays(deals: readonly DashboardDealRow[]): number | null {
  const closed = deals.filter((d) => d.closed_at !== null);
  if (closed.length === 0) return null;
  let totalDays = 0;
  let n = 0;
  for (const d of closed) {
    if (!d.closed_at) continue;
    const created = new Date(d.created_at).getTime();
    const closedAt = new Date(d.closed_at).getTime();
    const diff = (closedAt - created) / DAY_MS;
    if (diff >= 0 && Number.isFinite(diff)) {
      totalDays += diff;
      n += 1;
    }
  }
  return n > 0 ? Math.round(totalDays / n) : null;
}

export function deriveXp(operaciones: readonly DashboardOperacionRow[]): {
  level: number;
  current: number;
  next: number;
} {
  const closedOps = operaciones.filter((o) => o.closed_at !== null).length;
  const xp = closedOps * 100;
  const level = Math.floor(xp / 500) + 1;
  const next = level * 500;
  return { level, current: xp, next };
}

export function deriveStreak(operaciones: readonly DashboardOperacionRow[]): {
  days: number;
  bars: number[];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bars = Array.from({ length: 30 }, (_, i) => {
    const dayStart = today.getTime() - (29 - i) * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    let count = 0;
    for (const op of operaciones) {
      if (!op.closed_at) continue;
      const t = new Date(op.closed_at).getTime();
      if (t >= dayStart && t < dayEnd) count += 1;
    }
    return count;
  });
  let days = 0;
  for (let i = bars.length - 1; i >= 0; i -= 1) {
    if ((bars[i] ?? 0) > 0) days += 1;
    else break;
  }
  return { days, bars };
}

export function deriveMood(summary: DashboardSummary): Mood {
  const visits = deriveVisits7dSeries(summary.operaciones);
  const leadsRecent = deriveLeadsLast7d(summary.leads);
  const score = visits.count + leadsRecent * 0.5;
  if (score >= 8) return 'high';
  if (score >= 3) return 'neutral';
  if (score === 0) return 'mixed';
  return 'low';
}

export function deriveAllKpis(summary: DashboardSummary): DerivedKpis {
  const visits = deriveVisits7dSeries(summary.operaciones);
  const xp = deriveXp(summary.operaciones);
  return {
    pipelineMxn: derivePipelineMxn(summary.deals),
    leadsCount: summary.leads.length,
    leadsLast7d: deriveLeadsLast7d(summary.leads),
    visitsLast7dCount: visits.count,
    visitsLast7dSeries: visits.series,
    avgCloseDays: deriveAvgCloseDays(summary.deals),
    xpLevel: xp.level,
    xpCurrent: xp.current,
    xpNextThreshold: xp.next,
  };
}

export function pipelineDaysProjection(deals: readonly DashboardDealRow[]): number | null {
  const closed = deals.filter((d) => d.closed_at !== null);
  if (closed.length < 2) return null;
  const avg = deriveAvgCloseDays(deals);
  return avg ?? null;
}
