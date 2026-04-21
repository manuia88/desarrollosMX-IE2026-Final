// BLOQUE 11.I.9 — Alpha Zone Lifecycle tracking.
//
// Deriva estado del ciclo de vida (emerging → alpha → peaked → matured →
// declining) para cada zona con alpha alerts históricos en `zone_alpha_alerts`,
// computa counts_by_state, transiciones del período vs anterior, y case studies
// con narrativa opcional vía storyHook.
//
// Heurística determinista (BLOQUE 11.I.bis.4) con ventanas explícitas:
//   - emerging: detected_at <6 meses + alpha_score >=50
//   - alpha:    alpha_score >=75 Y >=65 últimos 3 meses
//   - peaked:   alpha_score cayó >=15pts desde peak en últimos 3 meses
//   - matured:  alpha_score 50-70 sostenido + >18 meses desde emerging +
//               volatilidad ventana <20pts
//   - declining: alpha_score cayó >=25% desde peak
//
// Cada transición incluye `reason` justificativo. Degrade graceful: historial
// insuficiente → emerging con reason='insufficient_history'.

import type { SupabaseClient } from '@supabase/supabase-js';
import { batchResolveZoneLabels } from '@/shared/lib/market/zone-label-resolver';
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

export interface DerivedState {
  readonly state: AlphaLifecycleState;
  readonly reason: string;
}

// Ventanas deterministas (en meses).
const WINDOW_RECENT_MONTHS = 3;
const WINDOW_MATURED_MIN_MONTHS = 18;
const WINDOW_EMERGING_MAX_MONTHS = 6;
const VOLATILITY_WINDOW_THRESHOLD = 20; // pts max-min en historia reciente

// Umbrales de score.
const SCORE_EMERGING_MIN = 50;
const SCORE_ALPHA_MIN = 75;
const SCORE_ALPHA_SUSTAIN_MIN = 65;
const PEAK_DROP_PEAKED = 15; // pts
const PEAK_DROP_DECLINING_PCT = 0.25; // 25%
const SCORE_MATURED_LOW = 50;
const SCORE_MATURED_HIGH = 70;

// Pure helper: derive lifecycle state + reason from a chronological history of
// alpha_score observations (ASC by period_date). Deterministic — sin ML.
export function deriveStateWithReason(
  alphaHistory: readonly AlphaHistoryPoint[],
  referenceDateIso?: string,
): DerivedState {
  if (alphaHistory.length === 0) {
    return { state: 'emerging', reason: 'insufficient_history' };
  }

  const sorted = [...alphaHistory].sort((a, b) => a.period_date.localeCompare(b.period_date));
  const last = sorted[sorted.length - 1];
  if (!last) return { state: 'emerging', reason: 'insufficient_history' };

  const lastScore = last.alpha_score;
  const firstDetected = sorted[0]?.period_date ?? last.period_date;
  const refDate = referenceDateIso ?? last.period_date;
  const monthsSinceFirst = monthsBetween(firstDetected, refDate);
  const peakScore = sorted.reduce((max, p) => Math.max(max, p.alpha_score), 0);
  const tail = sorted.slice(-WINDOW_RECENT_MONTHS);
  const tailScores = tail.map((p) => p.alpha_score);
  const tailMin = tailScores.length > 0 ? Math.min(...tailScores) : lastScore;
  const tailMax = tailScores.length > 0 ? Math.max(...tailScores) : lastScore;
  const tailRange = tailMax - tailMin;

  // declining: peak drop >=25% y último <40 (caída cuantitativa + absoluta)
  //   También si peakScore > 60 y caída relativa >=25%.
  if (peakScore > 0) {
    const dropPct = (peakScore - lastScore) / peakScore;
    if (dropPct >= PEAK_DROP_DECLINING_PCT && peakScore >= 60 && lastScore < peakScore) {
      if (lastScore < 60 || dropPct >= 0.4) {
        return {
          state: 'declining',
          reason: `alpha_score dropped from ${peakScore.toFixed(0)} to ${lastScore.toFixed(0)} (-${(dropPct * 100).toFixed(0)}% from peak)`,
        };
      }
    }
  }

  // peaked: caída >=15pts desde peak en ventana reciente AND peak estuvo en
  // rango alpha (>=70). Indica que la zona pasó su punto máximo.
  if (peakScore >= 70 && tail.length >= 2) {
    const peakInTail = Math.max(...tailScores);
    const dropFromPeak = peakScore - lastScore;
    if (dropFromPeak >= PEAK_DROP_PEAKED && lastScore < peakInTail - 3) {
      return {
        state: 'peaked',
        reason: `alpha_score dropped from ${peakScore.toFixed(0)} to ${lastScore.toFixed(0)} over last ${tail.length} months (-${dropFromPeak.toFixed(0)}pts)`,
      };
    }
  }

  // alpha: alpha_score >=75 con sustain >=65 en últimos 3 meses.
  if (lastScore >= SCORE_ALPHA_MIN && tail.every((p) => p.alpha_score >= SCORE_ALPHA_SUSTAIN_MIN)) {
    return {
      state: 'alpha',
      reason: `alpha_score ${lastScore.toFixed(0)} sustained >=${SCORE_ALPHA_SUSTAIN_MIN} for last ${tail.length} months`,
    };
  }

  // alpha secondary path: último >=65 y peak reciente >=75 (mantiene calor).
  if (lastScore >= SCORE_ALPHA_SUSTAIN_MIN && tailMax >= SCORE_ALPHA_MIN && monthsSinceFirst < 24) {
    return {
      state: 'alpha',
      reason: `alpha_score ${lastScore.toFixed(0)} within 24m of detection, peak ${tailMax.toFixed(0)} recent`,
    };
  }

  // matured: 50-70 sostenido + >18m + baja volatilidad.
  if (
    lastScore >= SCORE_MATURED_LOW &&
    lastScore <= SCORE_MATURED_HIGH &&
    monthsSinceFirst > WINDOW_MATURED_MIN_MONTHS &&
    tailRange < VOLATILITY_WINDOW_THRESHOLD
  ) {
    return {
      state: 'matured',
      reason: `alpha_score ${lastScore.toFixed(0)} stable (range ${tailRange.toFixed(0)}pts) after ${monthsSinceFirst.toFixed(0)} months`,
    };
  }

  // emerging: detectado hace poco (<6m) con score >=50, O historial corto.
  if (monthsSinceFirst < WINDOW_EMERGING_MAX_MONTHS && lastScore >= SCORE_EMERGING_MIN) {
    return {
      state: 'emerging',
      reason: `detected ${monthsSinceFirst.toFixed(1)} months ago with alpha_score ${lastScore.toFixed(0)}`,
    };
  }

  // emerging fallback: score 40-64 sin señales claras de otro estado.
  if (lastScore >= 40 && lastScore < SCORE_ALPHA_SUSTAIN_MIN) {
    return {
      state: 'emerging',
      reason: `alpha_score ${lastScore.toFixed(0)} — emerging band without consolidation`,
    };
  }

  // Catch-all: score demasiado bajo pero sin evidencia de peak previo → emerging.
  return {
    state: 'emerging',
    reason:
      peakScore < 60
        ? `alpha_score ${lastScore.toFixed(0)} — insufficient signal for promotion`
        : `alpha_score ${lastScore.toFixed(0)} — no matching state criteria`,
  };
}

// Backward-compat: deriveState devuelve sólo el estado.
export function deriveState(
  alphaHistory: readonly AlphaHistoryPoint[],
  referenceDateIso?: string,
): AlphaLifecycleState {
  return deriveStateWithReason(alphaHistory, referenceDateIso).state;
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

  interface ZoneResolutionItem {
    readonly zone_id: string;
    readonly scope_type: string;
  }
  const resolutionItems: ZoneResolutionItem[] = [];
  const zoneKeyToLabel = new Map<string, string>();

  for (const [, rows] of byZone) {
    const sorted = rows.slice().sort((a, b) => a.detected_at.localeCompare(b.detected_at));
    const last = sorted[sorted.length - 1];
    if (!last) continue;
    const key = `${last.scope_type}:${last.zone_id}`;
    if (!zoneKeyToLabel.has(key)) {
      zoneKeyToLabel.set(key, last.zone_id);
      resolutionItems.push({ zone_id: last.zone_id, scope_type: last.scope_type });
    }
  }

  if (resolutionItems.length > 0) {
    const labels = await batchResolveZoneLabels(
      resolutionItems.map((r) => ({
        scopeType: r.scope_type,
        scopeId: r.zone_id,
        countryCode,
      })),
      { supabase },
    );
    resolutionItems.forEach((r, i) => {
      const key = `${r.scope_type}:${r.zone_id}`;
      zoneKeyToLabel.set(key, labels[i] ?? r.zone_id);
    });
  }

  for (const [, rows] of byZone) {
    const sorted = rows.slice().sort((a, b) => a.detected_at.localeCompare(b.detected_at));
    const last = sorted[sorted.length - 1];
    if (!last) continue;

    const history = toHistory(sorted);
    const currentDerived = deriveStateWithReason(history, `${periodDate}T23:59:59Z`);
    const currentState = currentDerived.state;
    const priorHistory = history.filter((h) => h.period_date <= priorRefDate);
    const priorState =
      priorHistory.length > 0
        ? deriveStateWithReason(priorHistory, `${priorRefDate}T23:59:59Z`).state
        : null;

    counts[currentState] += 1;

    const resolvedLabel = zoneKeyToLabel.get(`${last.scope_type}:${last.zone_id}`) ?? last.zone_id;

    if (priorState !== currentState) {
      transitions.push({
        zone_id: last.zone_id,
        zone_label: resolvedLabel,
        from_state: priorState,
        to_state: currentState,
        detected_at: last.detected_at,
        alpha_score_at_transition: last.alpha_score,
        reason: currentDerived.reason,
      });
    }

    zoneStates.push({
      zone_id: last.zone_id,
      zone_label: resolvedLabel,
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
