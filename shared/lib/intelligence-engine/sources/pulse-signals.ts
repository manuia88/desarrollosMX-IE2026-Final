// Pulse Signals — ingestion adapters para BLOQUE 11.F Pulse Score.
// Cada fetch* retorna señal + confidence 0-1. Todos aceptan fetchImpl opcional
// para inyección en tests.
//
// H1 implementación:
//   - fetchBusinessNetFlow: DENUE via Supabase (altas/bajas 30d) con graceful
//     fallback si tabla no existe.
//   - fetchCalls911: endpoint público datos.cdmx.gob.mx/api/3/action/
//     datastore_search (best-effort, timeout 5s; retorna null si 404/timeout).
//   - fetchFootTraffic: H1 stub → proxy zone_scores N04+N08 (heurístico).
//   - fetchEvents: H1 stub (null).
//   - fetchConstructionPermits: H1 stub (null).
//   - fetchPulseSignals: orquesta los 5 en paralelo.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PulseScopeType, PulseSignals } from '@/features/pulse-score/types';

const CALLS_911_TIMEOUT_MS = 5000;
const CALLS_911_RESOURCE_ID = '2c7b7abb-f847-486d-b589-0eaa89c39bea';
const CALLS_911_ENDPOINT = 'https://datos.cdmx.gob.mx/api/3/action/datastore_search';
const ESTIMATED_COLONIAS_COUNT = 1812;

type LooseClient = SupabaseClient<Record<string, unknown>>;

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isoDaysAgo(periodDate: string, days: number): string {
  const anchor = new Date(`${periodDate}T00:00:00Z`);
  anchor.setUTCDate(anchor.getUTCDate() - days);
  return anchor.toISOString().slice(0, 10);
}

export interface FetchSignalParams {
  readonly zoneId: string;
  readonly scopeType: PulseScopeType;
  readonly countryCode: string;
  readonly periodDate: string;
  readonly supabase: SupabaseClient;
  readonly fetchImpl?: typeof fetch;
}

// ---------- Business altas/bajas ----------

async function queryCountWithFilter(
  supabase: SupabaseClient,
  table: string,
  filterField: string,
  filterValue: string,
  dateField: string,
  fromDate: string,
): Promise<{ count: number | null; error: boolean }> {
  try {
    const res = await castFrom(supabase, table)
      .select('id', { count: 'exact', head: true })
      .eq(filterField, filterValue)
      .gte(dateField, fromDate);
    if (res.error) return { count: null, error: true };
    return { count: res.count ?? 0, error: false };
  } catch {
    return { count: null, error: true };
  }
}

export async function fetchBusinessNetFlow(
  p: FetchSignalParams,
): Promise<{ births: number; deaths: number; confidence: number }> {
  const fromDate = isoDaysAgo(p.periodDate, 30);
  const candidateTables = ['denue_establishments', 'denue_establishments_raw'];
  const candidateFilters = ['zone_id', 'colonia_id'];

  for (const table of candidateTables) {
    for (const filterField of candidateFilters) {
      const births = await queryCountWithFilter(
        p.supabase,
        table,
        filterField,
        p.zoneId,
        'fecha_alta',
        fromDate,
      );
      if (births.error) continue;
      const deaths = await queryCountWithFilter(
        p.supabase,
        table,
        filterField,
        p.zoneId,
        'fecha_baja',
        fromDate,
      );
      if (deaths.error) continue;
      return {
        births: births.count ?? 0,
        deaths: deaths.count ?? 0,
        confidence: 1.0,
      };
    }
  }

  return { births: 0, deaths: 0, confidence: 0 };
}

// ---------- Calls 911 (CDMX C5) ----------

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface CdmxDatastoreResponse {
  readonly success?: boolean;
  readonly result?: {
    readonly total?: number;
  };
}

export async function fetchCalls911(
  p: FetchSignalParams,
): Promise<{ count: number | null; confidence: number }> {
  const impl = p.fetchImpl ?? globalThis.fetch;
  if (!impl) return { count: null, confidence: 0 };

  const url = `${CALLS_911_ENDPOINT}?resource_id=${CALLS_911_RESOURCE_ID}&limit=1`;
  try {
    const res = await fetchWithTimeout(url, CALLS_911_TIMEOUT_MS, impl);
    if (!res.ok) return { count: null, confidence: 0 };
    const json = (await res.json()) as CdmxDatastoreResponse;
    const total = json?.result?.total;
    if (!isFiniteNumber(total)) return { count: null, confidence: 0 };
    // Best-effort: divide total global por estimated_colonias (sin GeoJSON query).
    const perScope = Math.round(total / ESTIMATED_COLONIAS_COUNT);
    return { count: perScope, confidence: 0.8 };
  } catch {
    return { count: null, confidence: 0 };
  }
}

// ---------- Foot traffic (H1 stub proxy N04/N08) ----------

async function fetchScoreValue(
  supabase: SupabaseClient,
  zoneId: string,
  countryCode: string,
  scoreType: string,
  periodDate: string,
): Promise<number | null> {
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
}

export async function fetchFootTraffic(
  p: FetchSignalParams,
): Promise<{ day: number | null; night: number | null; confidence: number }> {
  const [n04, n08] = await Promise.all([
    fetchScoreValue(p.supabase, p.zoneId, p.countryCode, 'N04', p.periodDate),
    fetchScoreValue(p.supabase, p.zoneId, p.countryCode, 'N08', p.periodDate),
  ]);
  if (n04 === null && n08 === null) return { day: null, night: null, confidence: 0 };
  const day = n04 !== null ? Math.round(n04 * 500) : null;
  const night = n08 !== null ? Math.round(n08 * 300) : null;
  return { day, night, confidence: 0.4 };
}

// ---------- Events (H1 stub) ----------

export async function fetchEvents(
  _p: FetchSignalParams,
): Promise<{ count: number | null; confidence: number }> {
  return { count: null, confidence: 0 };
}

// ---------- Construction permits (H1 stub) ----------

export async function fetchConstructionPermits(
  _p: FetchSignalParams,
): Promise<{ count: number | null; confidence: number }> {
  return { count: null, confidence: 0 };
}

// ---------- Orchestrator ----------

export async function fetchPulseSignals(p: FetchSignalParams): Promise<PulseSignals> {
  const [business, calls911, footTraffic, events, construction] = await Promise.all([
    fetchBusinessNetFlow(p),
    fetchCalls911(p),
    fetchFootTraffic(p),
    fetchEvents(p),
    fetchConstructionPermits(p),
  ]);

  const per_signal_confidence = {
    business_net_flow: business.confidence,
    foot_traffic: footTraffic.confidence,
    calls_911: calls911.confidence,
    events: events.confidence,
    // ecosystem no se fetchea aquí — queda en 0, pulse-score lo setea en runPulseScoreForScope.
    ecosystem: 0,
  } as const;

  let sources_available = 0;
  for (const conf of Object.values(per_signal_confidence)) {
    if (conf > 0) sources_available += 1;
  }

  return {
    business_births: business.births,
    business_deaths: business.deaths,
    foot_traffic_day: footTraffic.day,
    foot_traffic_night: footTraffic.night,
    calls_911_count: calls911.count,
    events_count: events.count,
    construction_permits_count: construction.count,
    sources_available,
    per_signal_confidence,
  };
}
