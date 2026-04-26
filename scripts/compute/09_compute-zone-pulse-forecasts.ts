#!/usr/bin/env node
/**
 * Batch compute H+30d forecasts por zone a partir del histórico 90d más reciente
 * en public.zone_pulse_scores. Persiste en public.pulse_forecasts con natural
 * key (zone_id, forecast_date, methodology).
 *
 * Estrategia SESIÓN 07.5.C (moving average baseline):
 *  - Fetch last 90d of pulse_score por (scope_type, scope_id, country_code).
 *  - Si <30 data points → skip zone (dlq++ con reason=insufficient_data).
 *  - mean(30d) + stddev(30d, population) → flat forecast 30d con bandas ±1σ.
 *  - value_lower = mean - stddev; value_upper = mean + stddev (clamp 0..100).
 *  - Schema BD NO tiene columnas para ±2σ ni jsonb meta → [AUTO-DECISION] D9:
 *    sólo persistimos ±1σ. Futuro: time-decay + bandas asimétricas cuando
 *    upgrademos methodology a 'decay_v1'.
 *  - Upsert chunked (500 rows/batch) con onConflict='zone_id,forecast_date,methodology'.
 *  - withIngestRun wrapper fuente='compute_pulse_forecasts' periodicity='daily'.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/compute/09_compute-zone-pulse-forecasts.ts
 *
 * Flags:
 *   --dry-run              Log preview sin mutar pulse_forecasts. NO UPSERT.
 *   --limit-zones=N        Procesa sólo N zones (default: 300, max 300).
 *   --horizon-days=N       Días hacia el futuro por zone (default: 30).
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
  horizonDays: number;
  country: string;
};

type ZoneRow = {
  id: string;
  scope_id: string;
  scope_type: string;
  country_code: string;
};

type ForecastRow = Database['public']['Tables']['pulse_forecasts']['Insert'];

export type ForecastSeriesEntry = {
  forecast_date: string;
  value: number;
  value_lower: number;
  value_upper: number;
  methodology: 'moving_avg_v1';
};

const DEFAULT_COUNTRY = 'MX';
const DEFAULT_LIMIT_ZONES = 300;
const DEFAULT_HORIZON_DAYS = 30;
const MAX_ZONES_CAP = 300;
const MAX_HORIZON_CAP = 60;
const HISTORY_WINDOW = 90;
const MIN_DATA_POINTS = 30;
const CHUNK_SIZE = 500;
const METHODOLOGY: 'moving_avg_v1' = 'moving_avg_v1';
const SOURCE = 'compute_pulse_forecasts';

const VALID_FORECAST_SCOPE_TYPES: readonly string[] = ['colonia', 'alcaldia', 'city', 'estado'];

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
 * Media aritmética simple. Throws si values está vacío (callers deben validar).
 */
export function computeMovingAverage(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('[compute-pulse-forecasts] computeMovingAverage: empty array');
  }
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * Desviación estándar poblacional (divide por N, no N-1). Throws si values
 * está vacío. Constant array → 0.
 */
export function computeStdDev(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error('[compute-pulse-forecasts] computeStdDev: empty array');
  }
  const mean = computeMovingAverage(values);
  let acc = 0;
  for (const v of values) {
    const d = v - mean;
    acc += d * d;
  }
  return Math.sqrt(acc / values.length);
}

/**
 * Genera forecast flat (H+1 .. H+horizon) desde histórico values.
 *  - Requiere >= MIN_DATA_POINTS valores. Sino throws.
 *  - Usa los últimos MIN_DATA_POINTS (asume values ordered ASC por fecha).
 *  - value = clamp(mean, 0, 100); bandas = mean ±1σ clamped.
 *  - Todas las entries del horizon comparten value/lower/upper (flat baseline).
 *  - Dates monotónicos desde tomorrow a today+horizon sin gaps.
 */
export function buildForecastSeries(
  values: readonly number[],
  horizonDays: number,
  referenceDate: Date = new Date(),
): ForecastSeriesEntry[] {
  if (horizonDays <= 0) return [];
  if (values.length < MIN_DATA_POINTS) {
    throw new Error(
      `[compute-pulse-forecasts] buildForecastSeries: insufficient data (got ${values.length}, need ${MIN_DATA_POINTS})`,
    );
  }

  const window = values.slice(-MIN_DATA_POINTS);
  const mean = computeMovingAverage(window);
  const stddev = computeStdDev(window);

  const value = round2(clamp(mean, 0, 100));
  const valueLower = round2(clamp(mean - stddev, 0, 100));
  const valueUpper = round2(clamp(mean + stddev, 0, 100));

  const refUTC = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );

  const entries: ForecastSeriesEntry[] = [];
  for (let i = 1; i <= horizonDays; i++) {
    const dateMs = refUTC + i * 86400000;
    entries.push({
      forecast_date: formatDateUTC(new Date(dateMs)),
      value,
      value_lower: valueLower,
      value_upper: valueUpper,
      methodology: METHODOLOGY,
    });
  }
  return entries;
}

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limitZones = DEFAULT_LIMIT_ZONES;
  let horizonDays = DEFAULT_HORIZON_DAYS;
  let country = DEFAULT_COUNTRY;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--limit-zones=')) {
      const n = Number.parseInt(a.slice('--limit-zones='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-pulse-forecasts] --limit-zones inválido: "${a}"`);
      }
      limitZones = n;
    } else if (a.startsWith('--horizon-days=')) {
      const n = Number.parseInt(a.slice('--horizon-days='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-pulse-forecasts] --horizon-days inválido: "${a}"`);
      }
      horizonDays = n;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).trim().toUpperCase();
      if (raw === '' || raw.length !== 2) {
        throw new Error(`[compute-pulse-forecasts] --country inválido: "${a}"`);
      }
      country = raw;
    }
  }
  return { dryRun, limitZones, horizonDays, country };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(
      `[compute-pulse-forecasts] Falta env var requerida: ${name}. Exportala antes de correr.`,
    );
  }
  return v;
}

export async function fetchZonesForForecast(
  supabase: SupabaseClient<Database>,
  country: string,
  limit: number,
): Promise<ZoneRow[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, scope_id, scope_type, country_code')
    .eq('country_code', country)
    .in('scope_type', VALID_FORECAST_SCOPE_TYPES as string[])
    .order('scope_id', { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`[compute-pulse-forecasts] zones fetch: ${error.message}`);
  }
  return (data ?? []) as ZoneRow[];
}

/**
 * Fetch last HISTORY_WINDOW días de pulse_score para una zone. Retorna valores
 * ordenados ASC por period_date (últimos al final). Skips null pulse_score.
 */
export async function fetchPulseHistory(
  supabase: SupabaseClient<Database>,
  zone: ZoneRow,
): Promise<number[]> {
  const { data, error } = await supabase
    .from('zone_pulse_scores')
    .select('period_date, pulse_score')
    .eq('scope_type', zone.scope_type)
    .eq('scope_id', zone.scope_id)
    .eq('country_code', zone.country_code)
    .order('period_date', { ascending: false })
    .limit(HISTORY_WINDOW);
  if (error) {
    throw new Error(`[compute-pulse-forecasts] pulse_scores fetch: ${error.message}`);
  }
  const rows = (data ?? []) as Array<{ period_date: string; pulse_score: number | null }>;
  // order ASC by period_date so tail = most recent
  const sortedAsc = rows.slice().sort((a, b) => a.period_date.localeCompare(b.period_date));
  const values: number[] = [];
  for (const r of sortedAsc) {
    if (r.pulse_score != null && Number.isFinite(r.pulse_score)) {
      values.push(r.pulse_score);
    }
  }
  return values;
}

function buildForecastRows(
  zone: ZoneRow,
  country: string,
  entries: readonly ForecastSeriesEntry[],
): ForecastRow[] {
  return entries.map(
    (entry): ForecastRow => ({
      zone_id: zone.id,
      country_code: country,
      forecast_date: entry.forecast_date,
      value: entry.value,
      value_lower: entry.value_lower,
      value_upper: entry.value_upper,
      methodology: entry.methodology,
    }),
  );
}

async function upsertChunked(
  supabase: SupabaseClient<Database>,
  rows: ForecastRow[],
  tag: string,
): Promise<{ inserted: number; dlq: number }> {
  let inserted = 0;
  let dlq = 0;
  const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const chunkIdx = Math.floor(i / CHUNK_SIZE) + 1;
    const { error } = await supabase
      .from('pulse_forecasts')
      .upsert(chunk, { onConflict: 'zone_id,forecast_date,methodology' });
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
  const tag = '[compute-pulse-forecasts]';
  console.log(
    `${tag} dryRun=${args.dryRun} country=${args.country} limitZones=${args.limitZones} horizonDays=${args.horizonDays}`,
  );

  if (args.limitZones > MAX_ZONES_CAP || args.horizonDays > MAX_HORIZON_CAP) {
    throw new Error(
      `${tag} cap excedido: limitZones=${args.limitZones} (max ${MAX_ZONES_CAP}) × horizonDays=${args.horizonDays} (max ${MAX_HORIZON_CAP}). Máximo 18k rows por corrida.`,
    );
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const zones = await fetchZonesForForecast(supabase, args.country, args.limitZones);
  console.log(`${tag} zones_matched=${zones.length}`);

  if (zones.length === 0) {
    console.warn(`${tag} No hay zones válidas para country=${args.country}. Exit clean.`);
    return 0;
  }

  const expectedRowsMax = zones.length * args.horizonDays;
  console.log(
    `${tag} expected_rows_max=${expectedRowsMax} (${zones.length} zones × ${args.horizonDays} days)`,
  );

  if (args.dryRun) {
    const sampleZone = zones[0];
    if (sampleZone) {
      try {
        const history = await fetchPulseHistory(supabase, sampleZone);
        console.log(
          `${tag} DRY RUN — sample zone=${sampleZone.scope_id} history_points=${history.length}`,
        );
        if (history.length >= MIN_DATA_POINTS) {
          const sample = buildForecastSeries(history, Math.min(3, args.horizonDays));
          console.log(
            `${tag} DRY RUN — sample first 3 forecast entries:`,
            JSON.stringify(sample, null, 2),
          );
        } else {
          console.log(`${tag} DRY RUN — sample zone insufficient_data; would skip.`);
        }
      } catch (e) {
        console.log(`${tag} DRY RUN — sample throw: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    console.log(`${tag} DRY RUN — would upsert up to ${expectedRowsMax} rows total.`);
    return 0;
  }

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: args.country,
      triggeredBy: 'cli:compute-pulse-forecasts',
      expectedPeriodicity: 'daily',
      meta: {
        script: '09_compute-zone-pulse-forecasts.ts',
        zones_total: zones.length,
        horizon_days: args.horizonDays,
        history_window: HISTORY_WINDOW,
        min_data_points: MIN_DATA_POINTS,
        methodology: METHODOLOGY,
        expected_rows_max: expectedRowsMax,
      },
    },
    async () => {
      let inserted = 0;
      let skipped = 0;
      let dlq = 0;
      let lastForecastDate: string | null = null;

      for (const zone of zones) {
        try {
          const history = await fetchPulseHistory(supabase, zone);
          if (history.length < MIN_DATA_POINTS) {
            skipped += 1;
            dlq += 1;
            console.log(
              `${tag} skip zone=${zone.scope_id} reason=insufficient_data points=${history.length} (min=${MIN_DATA_POINTS})`,
            );
            continue;
          }
          const series = buildForecastSeries(history, args.horizonDays);
          if (series.length === 0) continue;
          const rows = buildForecastRows(zone, args.country, series);
          const last = rows[rows.length - 1];
          if (last) lastForecastDate = last.forecast_date;
          const out = await upsertChunked(supabase, rows, tag);
          inserted += out.inserted;
          dlq += out.dlq;
        } catch (e) {
          dlq += args.horizonDays;
          console.error(
            `${tag} throw zone=${zone.scope_id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      return {
        counts: { inserted, updated: 0, skipped, dlq },
        lastSuccessfulPeriodEnd: lastForecastDate,
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
      console.error('[compute-pulse-forecasts] FATAL:', err);
      process.exit(1);
    });
}
