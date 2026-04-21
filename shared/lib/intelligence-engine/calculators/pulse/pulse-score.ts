// Pulse Score — "salud vital" zona 0-100. BLOQUE 11.F (FASE 11 XL).
// Persiste en public.zone_pulse_scores (migration 20260421100000).
// NO usa framework Calculator (escribe tabla dedicada zone_pulse_scores, no
// zone_scores ni dmx_indices). Función standalone con shape:
//   - computePulseScore(input): pura, testable sin DB.
//   - runPulseScoreForScope({...}): fetch signals + compute + UPSERT.
//
// Fórmula (pesos fijos en PULSE_WEIGHTS):
//   pulse = normalize_business_net_flow   × 0.25
//         + normalize_foot_traffic        × 0.20
//         + (100 - normalize_911)         × 0.20
//         + normalize_events              × 0.15
//         + normalize_ecosystem           × 0.20
//
// Renormaliza pesos cuando faltan componentes (pattern IPV). Si
// data_sources_available < 3 → confidence insufficient_data, value = 0.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PulseComponent,
  PulseComponents,
  PulseComputeResult,
  PulseConfidence,
  PulseScopeType,
  PulseSignalKey,
  PulseSignals,
} from '@/features/pulse-score/types';
import { PULSE_SIGNAL_KEYS, PULSE_WEIGHTS } from '@/features/pulse-score/types';
import { fetchPulseSignals } from '@/shared/lib/intelligence-engine/sources/pulse-signals';

export const version = '1.0.0';

export const methodology = {
  formula:
    'Pulse = BusinessNetFlow·0.25 + FootTraffic·0.20 + (100-Calls911)·0.20 + Events·0.15 + Ecosystem·0.20',
  sources: [
    'denue_establishments (altas/bajas)',
    'datos.cdmx.gob.mx c5 (911 calls)',
    'foot_traffic_events (H1 stub → proxy N04/N08)',
    'cultural_events (H1 stub)',
    'zone_scores:N04+N09 (ecosystem avg)',
  ],
  references: [
    {
      name: 'Plan FASE 11 XL §BLOQUE 11.F Pulse Score',
      url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md',
    },
  ],
  normalization: {
    business_net_flow: { clamp_min: -50, clamp_max: 50 },
    foot_traffic_total: { clamp_min: 0, clamp_max: 100_000 },
    calls_911_count: { clamp_min: 0, clamp_max: 500, invert: true },
    events_count: { clamp_min: 0, clamp_max: 50 },
    ecosystem: { expected_range: [0, 100], note: 'already normalized (avg N04+N09)' },
  },
  confidence_thresholds: {
    min_sources_available: 3,
    high_sources: 5,
    medium_sources: 4,
    low_sources: 3,
  },
  validity: { unit: 'days', value: 7 } as const,
} as const;

// ---------- helpers ----------

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function linearScale(value: number, rangeMin: number, rangeMax: number): number {
  if (rangeMax === rangeMin) return 0;
  const clamped = Math.max(rangeMin, Math.min(rangeMax, value));
  return ((clamped - rangeMin) / (rangeMax - rangeMin)) * 100;
}

// ---------- normalizers ----------

export function normalizeBusinessNetFlow(births: number, deaths: number): number {
  const net = births - deaths;
  return linearScale(net, -50, 50);
}

export function normalizeFootTraffic(day: number | null, night: number | null): number | null {
  if (day === null && night === null) return null;
  const total = (day ?? 0) + (night ?? 0);
  return linearScale(total, 0, 100_000);
}

export function normalizeCalls911(count: number | null): number | null {
  if (count === null) return null;
  // Invert: alto = malo, por eso calculator hace (100 - normalized).
  return linearScale(count, 0, 500);
}

export function normalizeEvents(count: number | null): number | null {
  if (count === null) return null;
  return linearScale(count, 0, 50);
}

// ---------- compute ----------

export interface ComputePulseInput {
  readonly signals: PulseSignals;
  readonly ecosystem_score: number | null; // avg(N04, N09) o null
  readonly period_date: string;
}

function confidenceFromSources(sources: number): PulseConfidence {
  if (sources < methodology.confidence_thresholds.min_sources_available) {
    return 'insufficient_data';
  }
  if (sources >= methodology.confidence_thresholds.high_sources) return 'high';
  if (sources >= methodology.confidence_thresholds.medium_sources) return 'medium';
  return 'low';
}

function buildEmptyComponents(
  input: ComputePulseInput,
  sources_available: number,
): PulseComponents {
  const weights = PULSE_WEIGHTS;
  const buildComp = (
    key: PulseSignalKey,
    value: number | null,
    source: string,
    available: boolean,
  ): PulseComponent => ({
    value,
    weight: weights[key],
    source,
    available,
  });

  const s = input.signals;
  return {
    business_net_flow: buildComp(
      'business_net_flow',
      null,
      'denue_establishments',
      s.per_signal_confidence.business_net_flow > 0,
    ),
    foot_traffic: buildComp(
      'foot_traffic',
      null,
      'foot_traffic_events (stub proxy N04/N08)',
      s.per_signal_confidence.foot_traffic > 0,
    ),
    calls_911: buildComp(
      'calls_911',
      null,
      'datos.cdmx.gob.mx c5',
      s.per_signal_confidence.calls_911 > 0,
    ),
    events: buildComp('events', null, 'cultural_events (stub)', s.per_signal_confidence.events > 0),
    ecosystem: buildComp(
      'ecosystem',
      input.ecosystem_score,
      'zone_scores:N04+N09 avg',
      s.per_signal_confidence.ecosystem > 0,
    ),
    weights_used: {},
    data_sources_available: sources_available,
    coverage_pct: Math.round((sources_available / PULSE_SIGNAL_KEYS.length) * 100),
    raw_signals: {
      business_births: s.business_births,
      business_deaths: s.business_deaths,
      foot_traffic_day: s.foot_traffic_day,
      foot_traffic_night: s.foot_traffic_night,
      calls_911_count: s.calls_911_count,
      events_count: s.events_count,
    },
  };
}

export function computePulseScore(input: ComputePulseInput): PulseComputeResult {
  const s = input.signals;

  const businessAvailable = s.per_signal_confidence.business_net_flow > 0;
  const footAvailable =
    s.per_signal_confidence.foot_traffic > 0 &&
    (s.foot_traffic_day !== null || s.foot_traffic_night !== null);
  const callsAvailable = s.per_signal_confidence.calls_911 > 0 && s.calls_911_count !== null;
  const eventsAvailable = s.per_signal_confidence.events > 0 && s.events_count !== null;
  const ecosystemAvailable =
    s.per_signal_confidence.ecosystem > 0 && input.ecosystem_score !== null;

  const availableMap: Record<PulseSignalKey, boolean> = {
    business_net_flow: businessAvailable,
    foot_traffic: footAvailable,
    calls_911: callsAvailable,
    events: eventsAvailable,
    ecosystem: ecosystemAvailable,
  };

  const sources_available = Object.values(availableMap).filter(Boolean).length;

  if (sources_available < methodology.confidence_thresholds.min_sources_available) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: buildEmptyComponents(input, sources_available),
    };
  }

  // Normalized values per signal (post-inversion for calls_911).
  const nBusiness = businessAvailable
    ? normalizeBusinessNetFlow(s.business_births, s.business_deaths)
    : null;
  const nFoot = footAvailable
    ? normalizeFootTraffic(s.foot_traffic_day, s.foot_traffic_night)
    : null;
  const n911raw = callsAvailable ? normalizeCalls911(s.calls_911_count) : null;
  const nCalls = n911raw === null ? null : 100 - n911raw;
  const nEvents = eventsAvailable ? normalizeEvents(s.events_count) : null;
  const nEcosystem = ecosystemAvailable ? input.ecosystem_score : null;

  const normalizedMap: Record<PulseSignalKey, number | null> = {
    business_net_flow: nBusiness,
    foot_traffic: nFoot,
    calls_911: nCalls,
    events: nEvents,
    ecosystem: nEcosystem,
  };

  // Re-normalize weights across available signals.
  let sumAvailableWeights = 0;
  for (const key of PULSE_SIGNAL_KEYS) {
    if (availableMap[key]) sumAvailableWeights += PULSE_WEIGHTS[key];
  }

  const weights_used: Record<string, number> = {};
  let weighted_sum = 0;
  for (const key of PULSE_SIGNAL_KEYS) {
    if (!availableMap[key]) continue;
    const nValue = normalizedMap[key];
    if (!isFiniteNumber(nValue)) continue;
    const renorm = sumAvailableWeights > 0 ? PULSE_WEIGHTS[key] / sumAvailableWeights : 0;
    weights_used[key] = Number(renorm.toFixed(6));
    weighted_sum += nValue * renorm;
  }

  const value = Math.round(clamp100(weighted_sum));
  const confidence = confidenceFromSources(sources_available);

  const buildComp = (key: PulseSignalKey, source: string): PulseComponent => ({
    value: normalizedMap[key],
    weight: availableMap[key] ? (weights_used[key] ?? 0) : PULSE_WEIGHTS[key],
    source,
    available: availableMap[key],
  });

  const components: PulseComponents = {
    business_net_flow: buildComp('business_net_flow', 'denue_establishments'),
    foot_traffic: buildComp('foot_traffic', 'foot_traffic_events (stub proxy N04/N08)'),
    calls_911: buildComp('calls_911', 'datos.cdmx.gob.mx c5'),
    events: buildComp('events', 'cultural_events (stub)'),
    ecosystem: buildComp('ecosystem', 'zone_scores:N04+N09 avg'),
    weights_used,
    data_sources_available: sources_available,
    coverage_pct: Math.round((sources_available / PULSE_SIGNAL_KEYS.length) * 100),
    raw_signals: {
      business_births: s.business_births,
      business_deaths: s.business_deaths,
      foot_traffic_day: s.foot_traffic_day,
      foot_traffic_night: s.foot_traffic_night,
      calls_911_count: s.calls_911_count,
      events_count: s.events_count,
    },
  };

  return { value, confidence, components };
}

// ---------- Supabase helpers (prod run path) ----------

type LooseClient = SupabaseClient<Record<string, unknown>>;

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

async function fetchEcosystemScore(
  supabase: SupabaseClient,
  zoneId: string,
  countryCode: string,
  periodDate: string,
): Promise<{ value: number | null; confidence: number }> {
  const fetchOne = async (scoreType: string): Promise<number | null> => {
    try {
      const res = await castFrom(supabase, 'zone_scores')
        .select('score_value')
        .eq('zone_id', zoneId)
        .eq('country_code', countryCode)
        .eq('score_type', scoreType)
        .eq('period_date', periodDate)
        .limit(1);
      if (res.error || !res.data) return null;
      const rows = res.data as unknown as Array<{ score_value: number }>;
      const first = rows[0];
      if (!first || !isFiniteNumber(first.score_value)) return null;
      return first.score_value;
    } catch {
      return null;
    }
  };

  const [n04, n09] = await Promise.all([fetchOne('N04'), fetchOne('N09')]);

  if (n04 !== null && n09 !== null) {
    return { value: (n04 + n09) / 2, confidence: 1.0 };
  }
  if (n04 !== null) return { value: n04, confidence: 0.5 };
  if (n09 !== null) return { value: n09, confidence: 0.5 };
  return { value: null, confidence: 0 };
}

export interface RunPulseInput {
  readonly scopeType: PulseScopeType;
  readonly scopeId: string;
  readonly countryCode: string;
  readonly periodDate: string; // YYYY-MM-DD
  readonly supabase: SupabaseClient;
  readonly fetchImpl?: typeof fetch;
}

export type RunPulseResult =
  | {
      readonly ok: true;
      readonly scopeId: string;
      readonly value: number;
      readonly confidence: PulseConfidence;
    }
  | { readonly ok: false; readonly scopeId: string; readonly error: string };

export async function runPulseScoreForScope(input: RunPulseInput): Promise<RunPulseResult> {
  try {
    const signalsParams = {
      zoneId: input.scopeId,
      scopeType: input.scopeType,
      countryCode: input.countryCode,
      periodDate: input.periodDate,
      supabase: input.supabase,
      ...(input.fetchImpl ? { fetchImpl: input.fetchImpl } : {}),
    } as const;

    const [signals, ecosystem] = await Promise.all([
      fetchPulseSignals(signalsParams),
      fetchEcosystemScore(input.supabase, input.scopeId, input.countryCode, input.periodDate),
    ]);

    const signalsWithEcosystem: PulseSignals = {
      ...signals,
      per_signal_confidence: {
        ...signals.per_signal_confidence,
        ecosystem: ecosystem.confidence,
      },
      sources_available: (() => {
        // Recompute sources_available including ecosystem.
        const conf = {
          ...signals.per_signal_confidence,
          ecosystem: ecosystem.confidence,
        };
        let count = 0;
        for (const key of PULSE_SIGNAL_KEYS) {
          if ((conf[key] ?? 0) > 0) count += 1;
        }
        return count;
      })(),
    };

    const result = computePulseScore({
      signals: signalsWithEcosystem,
      ecosystem_score: ecosystem.value,
      period_date: input.periodDate,
    });

    const now = new Date().toISOString();
    const row = {
      scope_type: input.scopeType,
      scope_id: input.scopeId,
      country_code: input.countryCode,
      period_date: input.periodDate,
      business_births: signals.business_births,
      business_deaths: signals.business_deaths,
      foot_traffic_day: signals.foot_traffic_day,
      foot_traffic_night: signals.foot_traffic_night,
      calls_911_count: signals.calls_911_count,
      events_count: signals.events_count,
      pulse_score: result.value,
      confidence: result.confidence,
      components: result.components as unknown as Record<string, unknown>,
      calculated_at: now,
    };

    const upsert = await castFrom(input.supabase, 'zone_pulse_scores').upsert(row as never, {
      onConflict: 'scope_type,scope_id,country_code,period_date',
    });

    if (upsert.error) {
      return { ok: false, scopeId: input.scopeId, error: upsert.error.message ?? 'upsert_failed' };
    }

    return {
      ok: true,
      scopeId: input.scopeId,
      value: result.value,
      confidence: result.confidence,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error';
    return { ok: false, scopeId: input.scopeId, error: msg };
  }
}
