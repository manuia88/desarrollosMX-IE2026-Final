// Pulse DMX hero metric — elevated as primary KPI in Scorecard Nacional PDF
// hierarchy (BLOQUE 11.I.7, upgrade L95). Brand guidelines for press uses —
// see press-kit.ts for release templates.
//
// Aggregates zone_pulse_scores to a national pulse (0-100 AVG), computes
// delta vs the previous month, and surfaces top/bottom 5 zones. Zero LLM,
// pure SQL aggregation — safe to run on every Scorecard PDF generation.

import type { SupabaseClient } from '@supabase/supabase-js';
import { batchResolveZoneLabels } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import type { PulseHeroMetric } from '../types';

// Brand constants — do not change without ADR. `hero_hierarchy_order` is the
// canonical slot order for the Scorecard PDF and press kit artwork (Pulse
// first, then the three DMX legacy indices).
export const PULSE_DMX_BRAND = {
  official_name: 'Pulse DMX',
  attribution_template: 'Pulse DMX — DMX Intelligence, Q{q} {yyyy}',
  hero_hierarchy_order: ['PULSE', 'DMX-IPV', 'DMX-IAB', 'DMX-IDS'] as const,
} as const;

type PulseClient = SupabaseClient<Database>;

interface PulseRow {
  readonly scope_id: string;
  readonly pulse_score: number | null;
}

interface BuildPulseHeroOptions {
  readonly supabase?: PulseClient;
}

// Compute the period_date one calendar month earlier (YYYY-MM-DD, first of
// month anchor). Accepts any YYYY-MM-DD and returns the first of the prior
// month to stay aligned with pulse_score period_date convention.
export function previousMonthPeriod(periodDate: string): string {
  const [y, m] = periodDate.split('-');
  const year = Number(y);
  const month = Number(m);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${String(prevYear).padStart(4, '0')}-${String(prevMonth).padStart(2, '0')}-01`;
}

async function fetchPulseRows(
  supabase: PulseClient,
  countryCode: string,
  periodDate: string,
): Promise<readonly PulseRow[]> {
  const { data, error } = await supabase
    .from('zone_pulse_scores')
    .select('scope_id, pulse_score')
    .eq('country_code', countryCode)
    .eq('period_date', periodDate);
  if (error) throw new Error(`pulse_hero: zone_pulse_scores query failed: ${error.message}`);
  return (data ?? []) as readonly PulseRow[];
}

function averagePulse(rows: readonly PulseRow[]): number {
  if (rows.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const r of rows) {
    if (r.pulse_score !== null && Number.isFinite(r.pulse_score)) {
      sum += r.pulse_score;
      count += 1;
    }
  }
  if (count === 0) return 0;
  return Math.round(sum / count);
}

function roundTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

type RankedZone = PulseHeroMetric['top_zones'][number];

async function rankZones(
  rows: readonly PulseRow[],
  previousByScope: ReadonlyMap<string, number>,
  direction: 'top' | 'bottom',
  countryCode: string,
  supabase: PulseClient,
): Promise<readonly RankedZone[]> {
  const filtered = rows.filter(
    (r): r is PulseRow & { pulse_score: number } =>
      r.pulse_score !== null && Number.isFinite(r.pulse_score),
  );
  const sorted = filtered.slice().sort((a, b) => {
    if (direction === 'top') return b.pulse_score - a.pulse_score;
    return a.pulse_score - b.pulse_score;
  });
  const top = sorted.slice(0, 5);
  const labels = await batchResolveZoneLabels(
    top.map((r) => ({ scopeType: 'colonia', scopeId: r.scope_id, countryCode })),
    { supabase },
  );
  return top.map((r, i) => {
    const prev = previousByScope.get(r.scope_id);
    const delta = prev === undefined ? null : roundTwo(r.pulse_score - prev);
    return {
      zone_id: r.scope_id,
      zone_label: labels[i] ?? r.scope_id,
      pulse: Math.round(r.pulse_score),
      delta,
    } satisfies RankedZone;
  });
}

export async function buildPulseHero(
  countryCode: string,
  periodDate: string,
  opts: BuildPulseHeroOptions = {},
): Promise<PulseHeroMetric> {
  const supabase = opts.supabase ?? createAdminClient();
  const previousPeriod = previousMonthPeriod(periodDate);

  const currentRows = await fetchPulseRows(supabase, countryCode, periodDate);
  const previousRows = await fetchPulseRows(supabase, countryCode, previousPeriod);

  const pulseNational = averagePulse(currentRows);
  const prevAvg = previousRows.length > 0 ? averagePulse(previousRows) : null;
  const deltaVsPrevious = prevAvg === null ? null : pulseNational - prevAvg;

  const previousByScope = new Map<string, number>();
  for (const r of previousRows) {
    if (r.pulse_score !== null && Number.isFinite(r.pulse_score)) {
      previousByScope.set(r.scope_id, r.pulse_score);
    }
  }

  const [topZones, bottomZones] = await Promise.all([
    rankZones(currentRows, previousByScope, 'top', countryCode, supabase),
    rankZones(currentRows, previousByScope, 'bottom', countryCode, supabase),
  ]);

  return {
    country_code: countryCode,
    period_date: periodDate,
    pulse_national: pulseNational,
    delta_vs_previous: deltaVsPrevious,
    top_zones: topZones,
    bottom_zones: bottomZones,
  };
}

// Press/headline helper. Caller passes the localized country label + period
// label (e.g. "MX" or "México"; "Q1 2026" or "Primer trimestre 2026") to keep
// the helper i18n-agnostic. Output stays in English-neutral form so press kit
// templates can wrap it with locale-specific adjectives.
export function formatPulseHeroHeadline(
  metric: PulseHeroMetric,
  countryLabel: string,
  periodLabel: string,
): string {
  return `Pulse Nacional ${metric.pulse_national}/100 — salud urbana ${countryLabel} ${periodLabel}`;
}
