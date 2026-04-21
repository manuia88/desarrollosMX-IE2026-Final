// features/newsletter/lib/streaks-calculator.ts
//
// BLOQUE 11.J.4 — Strava Segments streaks por zona.
// Calcula cuántos meses consecutivos con pulse_score > 80 llevan las zonas de
// un país hasta el periodDate dado, upserta top 10 en public.zone_streaks.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZoneStreakRow } from '@/features/newsletter/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';

// --- Constants ---

export const STREAK_PULSE_THRESHOLD = 80;
export const STREAK_MONTHS_WINDOW = 12;
export const STREAK_TOP_LIMIT = 10;

// --- Inputs / outputs ---

export interface ComputeZoneStreaksInput {
  readonly countryCode: string;
  readonly periodDate: string;
  readonly supabase?: SupabaseClient<Database>;
  readonly topLimit?: number;
}

// --- Pulse row shape (subset of zone_pulse_scores) ---

interface PulseRow {
  readonly scope_type: string;
  readonly scope_id: string;
  readonly country_code: string;
  readonly period_date: string;
  readonly pulse_score: number | null;
}

// --- Helpers ---

export function computeStreakForZone(
  rows: ReadonlyArray<PulseRow>,
  periodDate: string,
  threshold: number = STREAK_PULSE_THRESHOLD,
): { streak: number; currentPulse: number } {
  // rows must be DESCENDING by period_date.
  let streak = 0;
  let currentPulse = 0;
  let hasCurrent = false;
  for (const row of rows) {
    if (row.period_date > periodDate) continue;
    if (!hasCurrent) {
      currentPulse = typeof row.pulse_score === 'number' ? row.pulse_score : 0;
      hasCurrent = true;
    }
    const score = typeof row.pulse_score === 'number' ? row.pulse_score : 0;
    if (score > threshold) {
      streak += 1;
      continue;
    }
    break;
  }
  return { streak, currentPulse };
}

// Groups rows by scope_id, preserving DESCENDING order inside each group.
function groupByScope(rows: ReadonlyArray<PulseRow>): ReadonlyMap<string, ReadonlyArray<PulseRow>> {
  const grouped = new Map<string, PulseRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.scope_id);
    if (bucket === undefined) {
      grouped.set(row.scope_id, [row]);
    } else {
      bucket.push(row);
    }
  }
  for (const [key, list] of grouped.entries()) {
    const sorted = [...list].sort((a, b) =>
      a.period_date < b.period_date ? 1 : a.period_date > b.period_date ? -1 : 0,
    );
    grouped.set(key, sorted);
  }
  return grouped;
}

// Subtract N calendar months from an ISO date ('YYYY-MM-DD') — always day 1.
export function subtractMonthsIso(iso: string, months: number): string {
  const [yStr, mStr] = iso.split('-');
  if (yStr === undefined || mStr === undefined) return iso;
  const y = Number.parseInt(yStr, 10);
  const m = Number.parseInt(mStr, 10); // 1..12
  const totalIdx = y * 12 + (m - 1) - months;
  const ny = Math.floor(totalIdx / 12);
  const nm = (totalIdx % 12) + 1;
  return `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}-01`;
}

// --- Main entry point ---

export async function computeZoneStreaks(
  input: ComputeZoneStreaksInput,
): Promise<ReadonlyArray<ZoneStreakRow>> {
  const { countryCode, periodDate, topLimit = STREAK_TOP_LIMIT } = input;
  const client = (input.supabase ?? createAdminClient()) as unknown as SupabaseClient<
    Record<string, unknown>
  >;

  const fromDate = subtractMonthsIso(periodDate, STREAK_MONTHS_WINDOW - 1);

  const { data, error } = await client
    .from('zone_pulse_scores' as never)
    .select('scope_type, scope_id, country_code, period_date, pulse_score')
    .eq('country_code', countryCode)
    .gte('period_date', fromDate)
    .lte('period_date', periodDate)
    .order('period_date', { ascending: false })
    .limit(50_000);

  if (error) {
    throw new Error(`streaks-calculator: fetch pulse failed: ${error.message}`);
  }

  const rows = (data as ReadonlyArray<PulseRow> | null) ?? [];
  if (rows.length === 0) return [];

  const grouped = groupByScope(rows);

  interface Candidate {
    readonly scopeType: string;
    readonly scopeId: string;
    readonly streak: number;
    readonly currentPulse: number;
  }

  const candidates: Candidate[] = [];
  for (const [scopeId, scopeRows] of grouped.entries()) {
    const first = scopeRows[0];
    if (!first) continue;
    const { streak, currentPulse } = computeStreakForZone(scopeRows, periodDate);
    if (streak < 1) continue;
    candidates.push({
      scopeType: first.scope_type,
      scopeId,
      streak,
      currentPulse,
    });
  }

  candidates.sort((a, b) => {
    if (b.streak !== a.streak) return b.streak - a.streak;
    if (b.currentPulse !== a.currentPulse) return b.currentPulse - a.currentPulse;
    return a.scopeId < b.scopeId ? -1 : a.scopeId > b.scopeId ? 1 : 0;
  });

  const top = candidates.slice(0, topLimit);
  if (top.length === 0) return [];

  const computedAt = new Date().toISOString();
  const upsertPayload = top.map((c, idx) => ({
    country_code: countryCode,
    scope_type: c.scopeType,
    scope_id: c.scopeId,
    period_date: periodDate,
    streak_length_months: c.streak,
    current_pulse: c.currentPulse,
    rank_in_country: idx + 1,
    computed_at: computedAt,
  }));

  const upsertClient = client as unknown as {
    from: (t: string) => {
      upsert: (
        rows: ReadonlyArray<Record<string, unknown>>,
        opts: { readonly onConflict: string },
      ) => {
        select: (cols: string) => Promise<{
          data: ReadonlyArray<ZoneStreakRow> | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  const { data: upserted, error: upsertErr } = await upsertClient
    .from('zone_streaks')
    .upsert(upsertPayload, { onConflict: 'country_code,scope_id,period_date' })
    .select(
      'id, country_code, scope_type, scope_id, period_date, streak_length_months, current_pulse, rank_in_country, computed_at',
    );

  if (upsertErr) {
    throw new Error(`streaks-calculator: upsert failed: ${upsertErr.message}`);
  }

  const resultRows = (upserted as ReadonlyArray<ZoneStreakRow> | null) ?? [];
  return [...resultRows].sort((a, b) => a.rank_in_country - b.rank_in_country);
}

// --- Streaks section builder (newsletter integration) ---

export interface BuildStreaksSectionInput {
  readonly countryCode: string;
  readonly periodDate: string;
  readonly locale?: string;
  readonly supabase?: SupabaseClient<Database>;
}
