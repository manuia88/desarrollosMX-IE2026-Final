#!/usr/bin/env node
/**
 * Batch compute zone_pulse_scores histórico 365d para TODAS las zones MX
 * registradas en public.zones (scope_type ∈ colonia/alcaldia/city/estado).
 *
 * Estrategia SESIÓN 07.5.C (synthetic-derived deterministic fallback):
 *  - Zero external signals (SEDESOL/INEGI/SSC pending L-NN ingest).
 *  - Seed-based hash (scope_id, day) → baseline + daily jitter deterministas.
 *  - Momentum = diff vs previous day. Volatility = rolling stddev 7d window.
 *  - confidence='medium' para últimos 30d, 'low' para resto.
 *  - components jsonb marca data_source='synthetic-derived-v1' para auditoría.
 *  - Upsert chunked (500 rows/batch) con natural key (scope_type, scope_id,
 *    country_code, period_date).
 *  - withIngestRun wrapper fuente='compute_zone_pulse' periodicity='daily'.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/compute/07_compute-zone-pulse.ts
 *
 * Flags:
 *   --dry-run              Log preview sin mutar zone_pulse_scores. NO UPSERT.
 *   --limit-zones=N        Procesa sólo N zones (default: 300, max 300).
 *   --lookback-days=N      Días de histórico por zone (default: 365).
 *   --country=XX           ISO country code (default: MX).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/types/database.ts';
import { withIngestRun } from '../ingest/lib/ingest-run-helper.ts';

type CliArgs = {
  dryRun: boolean;
  limitZones: number;
  lookbackDays: number;
  country: string;
};

type ZoneRow = {
  id: string;
  scope_id: string;
  scope_type: string;
  country_code: string;
};

type PulseRow = Database['public']['Tables']['zone_pulse_scores']['Insert'];

type PulseComputation = {
  pulseScore: number;
  baseline: number;
  jitter: number;
  activityIndex: number;
};

type PulseSeriesEntry = {
  period_date: string;
  pulse_score: number;
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  components: {
    data_source: 'synthetic-derived-v1';
    momentum: number;
    volatility: number;
    activity_index: number;
  };
};

const DEFAULT_COUNTRY = 'MX';
const DEFAULT_LIMIT_ZONES = 300;
const DEFAULT_LOOKBACK_DAYS = 365;
const MAX_ZONES_CAP = 300;
const MAX_LOOKBACK_CAP = 400;
const CHUNK_SIZE = 500;
const JITTER_AMPLITUDE = 15;
const RECENT_WINDOW_DAYS = 30;
const VOLATILITY_WINDOW = 7;
const SOURCE = 'compute_zone_pulse';
const DATA_SOURCE_TAG = 'synthetic-derived-v1' as const;

const VALID_PULSE_SCOPE_TYPES: readonly string[] = ['colonia', 'alcaldia', 'city', 'estado'];

/**
 * Deterministic hash de (scope_id, dayIndex) → número en [0, 1).
 * Implementación xmur3-like: bit-mixing sobre string con seed numérico.
 * No criptográfica; sólo estable y bien distribuida para jitter sintético.
 */
export function hashSeed(scopeId: string, dayIndex: number): number {
  let h = 2166136261 ^ dayIndex;
  for (let i = 0; i < scopeId.length; i++) {
    h = Math.imul(h ^ scopeId.charCodeAt(i), 16777619);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatDateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compute pulse para una zone en un día específico. Pure, stateless.
 *  - baseline: derivado de seed-of-(scope_id, -1) → estable per-zone.
 *  - jitter: hashSeed(scope_id, dayIndex) mapeado a ±JITTER_AMPLITUDE.
 *  - activity_index: hashSeed(scope_id, dayIndex+10000) ∈ [0, 1].
 */
export function computePulseForZoneDay(scopeId: string, dayIndex: number): PulseComputation {
  const baselineSeed = hashSeed(scopeId, -1);
  const baseline = 30 + baselineSeed * 40; // [30, 70]
  const jitterSeed = hashSeed(scopeId, dayIndex);
  const jitter = (jitterSeed - 0.5) * 2 * JITTER_AMPLITUDE; // [-15, +15]
  const activityIndex = hashSeed(scopeId, dayIndex + 10000);
  const pulseScore = clamp(baseline + jitter, 0, 100);
  return {
    pulseScore: round2(pulseScore),
    baseline: round2(baseline),
    jitter: round2(jitter),
    activityIndex: round2(activityIndex),
  };
}

/**
 * Genera la serie temporal completa (lookbackDays días) para una zone.
 * dayIndex = 0 es el día más antiguo; dayIndex = lookbackDays-1 es hoy.
 *  - momentum[0] = 0; momentum[i] = pulse[i] - pulse[i-1].
 *  - volatility[i] = stddev(pulse[i-6..i]) cuando i >= 6; 0 antes.
 *  - confidence = 'medium' si (lookbackDays-1 - i) < RECENT_WINDOW_DAYS else 'low'.
 */
export function computePulseSeries(
  scopeId: string,
  lookbackDays: number,
  referenceDate: Date = new Date(),
): PulseSeriesEntry[] {
  if (lookbackDays <= 0) return [];
  const entries: PulseSeriesEntry[] = [];
  const pulseScores: number[] = [];

  const refUTC = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );

  for (let i = 0; i < lookbackDays; i++) {
    const comp = computePulseForZoneDay(scopeId, i);
    pulseScores.push(comp.pulseScore);

    const momentum =
      i === 0 ? 0 : round2(comp.pulseScore - (pulseScores[i - 1] ?? comp.pulseScore));

    let volatility = 0;
    if (i >= VOLATILITY_WINDOW - 1) {
      const window = pulseScores.slice(i - (VOLATILITY_WINDOW - 1), i + 1);
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const variance = window.reduce((acc, v) => acc + (v - mean) ** 2, 0) / window.length;
      volatility = round2(Math.sqrt(variance));
    }

    // dayIndex=0 → oldest; dayIndex=lookbackDays-1 → today.
    const daysFromToday = lookbackDays - 1 - i;
    const periodMs = refUTC - daysFromToday * 86400000;
    const periodDate = formatDateUTC(new Date(periodMs));

    const confidence: PulseSeriesEntry['confidence'] =
      daysFromToday < RECENT_WINDOW_DAYS ? 'medium' : 'low';

    entries.push({
      period_date: periodDate,
      pulse_score: clamp(comp.pulseScore, 0, 100),
      confidence,
      components: {
        data_source: DATA_SOURCE_TAG,
        momentum,
        volatility,
        activity_index: comp.activityIndex,
      },
    });
  }

  return entries;
}

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limitZones = DEFAULT_LIMIT_ZONES;
  let lookbackDays = DEFAULT_LOOKBACK_DAYS;
  let country = DEFAULT_COUNTRY;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--limit-zones=')) {
      const n = Number.parseInt(a.slice('--limit-zones='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-zone-pulse] --limit-zones inválido: "${a}"`);
      }
      limitZones = n;
    } else if (a.startsWith('--lookback-days=')) {
      const n = Number.parseInt(a.slice('--lookback-days='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-zone-pulse] --lookback-days inválido: "${a}"`);
      }
      lookbackDays = n;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).trim().toUpperCase();
      if (raw === '' || raw.length !== 2) {
        throw new Error(`[compute-zone-pulse] --country inválido: "${a}"`);
      }
      country = raw;
    }
  }
  return { dryRun, limitZones, lookbackDays, country };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(
      `[compute-zone-pulse] Falta env var requerida: ${name}. Exportala antes de correr.`,
    );
  }
  return v;
}

export async function fetchZonesForPulse(
  supabase: SupabaseClient<Database>,
  country: string,
  limit: number,
): Promise<ZoneRow[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, scope_id, scope_type, country_code')
    .eq('country_code', country)
    .in('scope_type', VALID_PULSE_SCOPE_TYPES as string[])
    .order('scope_id', { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`[compute-zone-pulse] zones fetch: ${error.message}`);
  }
  return (data ?? []) as ZoneRow[];
}

function buildPulseRows(zone: ZoneRow, country: string, lookbackDays: number): PulseRow[] {
  const series = computePulseSeries(zone.scope_id, lookbackDays);
  return series.map(
    (entry): PulseRow => ({
      scope_type: zone.scope_type,
      scope_id: zone.scope_id,
      country_code: country,
      period_date: entry.period_date,
      business_births: 0,
      business_deaths: 0,
      foot_traffic_day: null,
      foot_traffic_night: null,
      calls_911_count: null,
      events_count: null,
      pulse_score: entry.pulse_score,
      confidence: entry.confidence,
      components: entry.components,
    }),
  );
}

async function upsertChunked(
  supabase: SupabaseClient<Database>,
  rows: PulseRow[],
  tag: string,
): Promise<{ inserted: number; dlq: number }> {
  let inserted = 0;
  let dlq = 0;
  const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const chunkIdx = Math.floor(i / CHUNK_SIZE) + 1;
    const { error } = await supabase
      .from('zone_pulse_scores')
      .upsert(chunk, { onConflict: 'scope_type,scope_id,country_code,period_date' });
    if (error) {
      dlq += chunk.length;
      console.error(
        `${tag} chunk ${chunkIdx}/${totalChunks} FAILED: ${error.message} (rows=${chunk.length})`,
      );
    } else {
      inserted += chunk.length;
      console.log(`${tag} chunk ${chunkIdx}/${totalChunks} inserted=${chunk.length}`);
    }
  }
  return { inserted, dlq };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const tag = '[compute-zone-pulse]';
  console.log(
    `${tag} dryRun=${args.dryRun} country=${args.country} limitZones=${args.limitZones} lookbackDays=${args.lookbackDays}`,
  );

  if (args.limitZones > MAX_ZONES_CAP || args.lookbackDays > MAX_LOOKBACK_CAP) {
    throw new Error(
      `${tag} cap excedido: limitZones=${args.limitZones} (max ${MAX_ZONES_CAP}) × lookbackDays=${args.lookbackDays} (max ${MAX_LOOKBACK_CAP}). Máximo 120k rows por corrida.`,
    );
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const zones = await fetchZonesForPulse(supabase, args.country, args.limitZones);
  console.log(`${tag} zones_matched=${zones.length}`);

  if (zones.length === 0) {
    console.warn(`${tag} No hay zones válidas para country=${args.country}. Exit clean.`);
    return 0;
  }

  const rowsPerZone = args.lookbackDays;
  const expectedRows = zones.length * rowsPerZone;
  console.log(`${tag} expected_rows=${expectedRows} (${zones.length} zones × ${rowsPerZone} days)`);

  if (args.dryRun) {
    const sampleZone = zones[0];
    if (sampleZone) {
      const sample = buildPulseRows(sampleZone, args.country, Math.min(3, args.lookbackDays));
      console.log(
        `${tag} DRY RUN — sample (first 3 rows for zone=${sampleZone.scope_id}):`,
        JSON.stringify(sample, null, 2),
      );
    }
    console.log(`${tag} DRY RUN — would upsert ${expectedRows} rows total.`);
    return 0;
  }

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: args.country,
      triggeredBy: 'cli:compute-zone-pulse',
      expectedPeriodicity: 'daily',
      meta: {
        script: '07_compute-zone-pulse.ts',
        zones_total: zones.length,
        lookback_days: args.lookbackDays,
        data_source: DATA_SOURCE_TAG,
        expected_rows: expectedRows,
      },
    },
    async () => {
      let inserted = 0;
      let dlq = 0;
      let lastPeriodEnd: string | null = null;

      for (const zone of zones) {
        try {
          const rows = buildPulseRows(zone, args.country, args.lookbackDays);
          if (rows.length === 0) continue;
          const last = rows[rows.length - 1];
          if (last) lastPeriodEnd = last.period_date;
          const out = await upsertChunked(supabase, rows, tag);
          inserted += out.inserted;
          dlq += out.dlq;
        } catch (e) {
          dlq += args.lookbackDays;
          console.error(
            `${tag} throw zone=${zone.scope_id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      return {
        counts: { inserted, updated: 0, skipped: 0, dlq },
        lastSuccessfulPeriodEnd: lastPeriodEnd,
      };
    },
  );

  console.log(
    `${tag} done: status=${result.status} counts=${JSON.stringify(result.counts)} duration_ms=${result.durationMs}`,
  );
  return result.status === 'success' ? 0 : 1;
}

const invokedAsScript =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedAsScript) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error('[compute-zone-pulse] FATAL:', err);
      process.exit(1);
    });
}
