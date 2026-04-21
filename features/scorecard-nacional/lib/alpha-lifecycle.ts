// BLOQUE 11.I.9 — Alpha Zone Lifecycle tracking.
//
// Deriva estado del ciclo de vida (emerging → alpha → peaked → matured →
// declining) para cada zona con alpha alerts históricos en `zone_alpha_alerts`,
// computa counts_by_state, transiciones del período vs anterior, y case studies
// con narrativa opcional vía storyHook.
//
// v1 heuristic — ML refinement FASE 22. Implementación H1 intencionalmente
// simple para habilitar Scorecard trimestral sin acoplamiento con ranking ML.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type {
  AlphaLifecycleCaseStudy,
  AlphaLifecycleState,
  AlphaLifecycleSummary,
  AlphaLifecycleTransition,
} from '../types';

export type AlphaStoryHook = (prompt: string) => Promise<string>;

export interface ComputeAlphaLifecycleOpts {
  readonly includeCaseStudies?: boolean;
  readonly caseStudyLimit?: number;
  readonly storyHook?: AlphaStoryHook;
}

interface AlphaAlertRow {
  readonly zone_id: string;
  readonly scope_type: string;
  readonly country_code: string;
  readonly alpha_score: number;
  readonly detected_at: string;
  readonly is_active: boolean;
  readonly signals: unknown;
  readonly time_to_mainstream_months: number | null;
}

export interface AlphaHistoryPoint {
  readonly period_date: string;
  readonly alpha_score: number;
}

const ZERO_COUNTS: Readonly<Record<AlphaLifecycleState, number>> = Object.freeze({
  emerging: 0,
  alpha: 0,
  peaked: 0,
  matured: 0,
  declining: 0,
});

const MONTH_MS = 1000 * 60 * 60 * 24 * 30;

function monthsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, (to - from) / MONTH_MS);
}

// Pure helper: derive lifecycle state from a chronological history of
// alpha_score observations (ASC by period_date).
export function deriveState(
  alphaHistory: readonly AlphaHistoryPoint[],
  referenceDateIso?: string,
): AlphaLifecycleState {
  if (alphaHistory.length === 0) return 'emerging';

  const sorted = [...alphaHistory].sort((a, b) => a.period_date.localeCompare(b.period_date));
  const last = sorted[sorted.length - 1];
  if (!last) return 'emerging';
  const lastScore = last.alpha_score;
  const firstDetected = sorted[0]?.period_date ?? last.period_date;
  const refDate = referenceDateIso ?? last.period_date;
  const monthsSinceFirst = monthsBetween(firstDetected, refDate);
  const peakScore = sorted.reduce((max, p) => Math.max(max, p.alpha_score), 0);

  // peaked: >80 sustained consecutive in the last 3 observations.
  if (sorted.length >= 2) {
    const tail = sorted.slice(-3);
    const allAbove80 = tail.length >= 2 && tail.every((p) => p.alpha_score > 80);
    if (allAbove80) return 'peaked';
  }

  // declining: last_score <40 after historical peak >60.
  if (lastScore < 40 && peakScore > 60) return 'declining';

  // matured: score 40-60 and >24 months since first detected.
  if (lastScore >= 40 && lastScore < 60 && monthsSinceFirst > 24) return 'matured';

  // alpha: last_score >=60 and within 24 months of first detection.
  if (lastScore >= 60 && monthsSinceFirst < 24) return 'alpha';

  // alpha (long-lived, still hot): last_score >=60 but >24 months — treat as
  // alpha still, distinguished from matured by score.
  if (lastScore >= 60) return 'alpha';

  // emerging: low-medium, first period detected or short history.
  if (lastScore >= 40 && lastScore < 60) return 'emerging';

  return 'emerging';
}

function normalizeSignals(signals: unknown): readonly string[] {
  if (Array.isArray(signals)) {
    return signals.filter((s): s is string => typeof s === 'string').slice(0, 8);
  }
  if (signals && typeof signals === 'object') {
    return Object.keys(signals as Record<string, unknown>).slice(0, 8);
  }
  return [];
}

function groupByZone(rows: readonly AlphaAlertRow[]): Map<string, AlphaAlertRow[]> {
  const map = new Map<string, AlphaAlertRow[]>();
  for (const row of rows) {
    const key = `${row.scope_type}:${row.zone_id}`;
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      map.set(key, [row]);
    }
  }
  return map;
}

function toHistory(rows: readonly AlphaAlertRow[]): readonly AlphaHistoryPoint[] {
  return rows
    .map((r) => ({
      period_date: r.detected_at.slice(0, 10),
      alpha_score: r.alpha_score,
    }))
    .sort((a, b) => a.period_date.localeCompare(b.period_date));
}

async function fetchAlphaAlerts(
  supabase: SupabaseClient<Record<string, unknown>>,
  countryCode: string,
  untilIso: string,
): Promise<readonly AlphaAlertRow[]> {
  const { data, error } = await supabase
    .from('zone_alpha_alerts' as never)
    .select(
      'zone_id, scope_type, country_code, alpha_score, detected_at, is_active, signals, time_to_mainstream_months',
    )
    .eq('country_code', countryCode)
    .lte('detected_at', untilIso)
    .order('detected_at', { ascending: true });

  if (error) {
    console.warn('[alpha-lifecycle] fetchAlphaAlerts error', { error });
    return [];
  }
  return (data ?? []) as readonly AlphaAlertRow[];
}

function formatStoryPrompt(
  zoneLabel: string,
  state: AlphaLifecycleState,
  yearsInState: number,
  signatureSignals: readonly string[],
): string {
  return [
    `Cuenta la historia del ciclo de vida alpha de ${zoneLabel} (~180 palabras es-MX).`,
    '',
    `Estado actual: ${state}`,
    `Años en este estado: ${yearsInState.toFixed(1)}`,
    `Señales distintivas: ${signatureSignals.join(', ') || 'n/d'}`,
    '',
    'Reglas: narrativa breve, tono editorial, cero hype, cita datos reales.',
  ].join('\n');
}

function buildStubStory(
  zoneLabel: string,
  state: AlphaLifecycleState,
  yearsInState: number,
): string {
  return `${zoneLabel} lleva ${yearsInState.toFixed(1)} años en estado **${state}**.`;
}

function rankCaseStudies(
  zoneStates: ReadonlyArray<{
    zone_id: string;
    zone_label: string;
    state: AlphaLifecycleState;
    lastScore: number;
    firstDetectedAt: string;
    signals: readonly string[];
    timeline: readonly AlphaLifecycleTransition[];
  }>,
  limit: number,
): typeof zoneStates {
  const priority: Record<AlphaLifecycleState, number> = {
    peaked: 0,
    emerging: 1,
    alpha: 2,
    matured: 3,
    declining: 4,
  };
  return [...zoneStates]
    .sort((a, b) => {
      const pa = priority[a.state];
      const pb = priority[b.state];
      if (pa !== pb) return pa - pb;
      return b.lastScore - a.lastScore;
    })
    .slice(0, limit);
}

// Public: build visualization-ready data structures for a Sankey chart from
// transitions. Does NOT render; PDF/PNG renderer (FASE 22) consumes this.
export function buildSankeyTransitionData(transitions: readonly AlphaLifecycleTransition[]): {
  readonly nodes: readonly { readonly id: string; readonly label: string }[];
  readonly links: readonly {
    readonly source: string;
    readonly target: string;
    readonly value: number;
  }[];
} {
  const nodeSet = new Set<string>();
  const linkCounts = new Map<string, number>();

  for (const t of transitions) {
    const from = t.from_state ?? 'null';
    const to = t.to_state;
    nodeSet.add(from);
    nodeSet.add(to);
    const key = `${from}->${to}`;
    linkCounts.set(key, (linkCounts.get(key) ?? 0) + 1);
  }

  const nodes = Array.from(nodeSet).map((id) => ({ id, label: id }));
  const links = Array.from(linkCounts.entries()).map(([key, value]) => {
    const parts = key.split('->');
    const source = parts[0] ?? 'null';
    const target = parts[1] ?? 'null';
    return { source, target, value };
  });

  return { nodes, links };
}

export async function computeAlphaLifecycle(
  countryCode: string,
  periodDate: string,
  opts: ComputeAlphaLifecycleOpts = {},
): Promise<AlphaLifecycleSummary> {
  const includeCaseStudies = opts.includeCaseStudies ?? true;
  const caseStudyLimit = opts.caseStudyLimit ?? 5;
  const supabase = createAdminClient();
  const client = supabase as unknown as SupabaseClient<Record<string, unknown>>;

  const alerts = await fetchAlphaAlerts(client, countryCode, `${periodDate}T23:59:59Z`);
  const byZone = groupByZone(alerts);

  const counts: Record<AlphaLifecycleState, number> = { ...ZERO_COUNTS };
  const transitions: AlphaLifecycleTransition[] = [];
  const zoneStates: Array<{
    zone_id: string;
    zone_label: string;
    state: AlphaLifecycleState;
    lastScore: number;
    firstDetectedAt: string;
    signals: readonly string[];
    timeline: readonly AlphaLifecycleTransition[];
  }> = [];

  // Prior period reference: periodDate minus 3 months.
  const priorRefDate = (() => {
    const d = new Date(periodDate);
    d.setUTCMonth(d.getUTCMonth() - 3);
    return d.toISOString().slice(0, 10);
  })();

  for (const [, rows] of byZone) {
    const sorted = rows.slice().sort((a, b) => a.detected_at.localeCompare(b.detected_at));
    const last = sorted[sorted.length - 1];
    if (!last) continue;

    const history = toHistory(sorted);
    const currentState = deriveState(history, `${periodDate}T23:59:59Z`);
    const priorHistory = history.filter((h) => h.period_date <= priorRefDate);
    const priorState =
      priorHistory.length > 0 ? deriveState(priorHistory, `${priorRefDate}T23:59:59Z`) : null;

    counts[currentState] += 1;

    if (priorState !== currentState) {
      transitions.push({
        zone_id: last.zone_id,
        zone_label: last.zone_id,
        from_state: priorState,
        to_state: currentState,
        detected_at: last.detected_at,
        alpha_score_at_transition: last.alpha_score,
      });
    }

    zoneStates.push({
      zone_id: last.zone_id,
      zone_label: last.zone_id,
      state: currentState,
      lastScore: last.alpha_score,
      firstDetectedAt: sorted[0]?.detected_at ?? last.detected_at,
      signals: normalizeSignals(last.signals),
      timeline: [],
    });
  }

  const caseStudies: AlphaLifecycleCaseStudy[] = [];
  if (includeCaseStudies && zoneStates.length > 0) {
    const ranked = rankCaseStudies(zoneStates, caseStudyLimit);
    for (const zs of ranked) {
      const yearsInState = monthsBetween(zs.firstDetectedAt, `${periodDate}T23:59:59Z`) / 12;
      let storyMd = buildStubStory(zs.zone_label, zs.state, yearsInState);
      if (opts.storyHook) {
        const prompt = formatStoryPrompt(zs.zone_label, zs.state, yearsInState, zs.signals);
        try {
          storyMd = await opts.storyHook(prompt);
        } catch (err) {
          console.warn('[alpha-lifecycle] storyHook error', { err });
        }
      }
      caseStudies.push({
        zone_id: zs.zone_id,
        zone_label: zs.zone_label,
        current_state: zs.state,
        years_in_state: Number(yearsInState.toFixed(2)),
        signature_signals: zs.signals,
        story_md: storyMd,
        timeline: zs.timeline,
      });
    }
  }

  return {
    country_code: countryCode,
    period_date: periodDate,
    counts_by_state: counts,
    transitions_this_period: transitions,
    case_studies: caseStudies,
  };
}

export { buildStubStory, formatStoryPrompt };
