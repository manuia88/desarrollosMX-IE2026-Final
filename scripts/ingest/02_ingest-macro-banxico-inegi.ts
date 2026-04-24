#!/usr/bin/env node
/**
 * Populate public.macro_series con series macro MX desde Banxico SIE + INEGI BIE.
 *
 * Estrategia:
 *  - 3 sources independientes (un withIngestRun cada uno):
 *      banxico      → SF43718, SF60648, SF61745, SF44070 (daily)
 *      inegi_inpc   → 628194 INPC general (monthly)
 *      inegi        → 736182 PIB trimestral (quarterly)
 *  - Fetch con timeout 10s + fallback graceful per-serie (warn + dlq++, no abort global).
 *  - Rate-limit defensivo: 100 ms entre requests.
 *  - Upsert chunks 100 con onConflict (country_code, source, series_id, period_start).
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *   BANXICO_TOKEN=... INEGI_TOKEN=... \
 *     node --experimental-strip-types scripts/ingest/02_ingest-macro-banxico-inegi.ts
 *
 * Flags:
 *   --dry-run                Fetch + parse + log preview (primeras 3 rows/serie). NO UPSERT.
 *   --series=ID1,ID2         Filtra series por id (case-sensitive). Default: ALL.
 *   --source=banxico|inegi_inpc|inegi    Filtra por fuente. Default: ALL 3.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../shared/types/database.ts';
import { withIngestRun } from './lib/ingest-run-helper.ts';

type MacroSeriesInsert = Database['public']['Tables']['macro_series']['Insert'];

type SourceKey = 'banxico' | 'inegi_inpc' | 'inegi';

type CliArgs = {
  dryRun: boolean;
  seriesFilter: string[] | null;
  sourceFilter: SourceKey[] | null;
};

type BanxicoSeriesCfg = {
  seriesId: string;
  metricName: string;
  unit: string;
};

type InegiSeriesCfg = {
  seriesId: string; // indicator id
  metricName: string;
  unit: string;
  source: 'inegi_inpc' | 'inegi';
  expectedPeriodicity: 'monthly' | 'quarterly' | 'yearly';
};

type ParsedBanxicoRow = {
  series_id: string;
  period_start: string; // YYYY-MM-DD
  period_end: string; // daily ⇒ == period_start
  value: number;
};

type ParsedInegiRow = {
  period_start: string;
  period_end: string;
  value: number;
  periodicity: 'monthly' | 'quarterly' | 'yearly';
};

type MapBanxicoCfg = {
  seriesId: string;
  metricName: string;
  unit: string;
  source: 'banxico';
  countryCode: string;
  runId: string;
};

type MapInegiCfg = {
  seriesId: string;
  metricName: string;
  unit: string;
  source: 'inegi_inpc' | 'inegi';
  countryCode: string;
  runId: string;
};

type SourceRunSummary = {
  run_id: string;
  status: string;
  inserted: number;
  updated: number;
  skipped: number;
  dlq: number;
  error: string | null;
  duration_ms: number;
};

const COUNTRY = 'MX';
const CHUNK_SIZE = 100;
const RATE_LIMIT_MS = 100;
const FETCH_TIMEOUT_MS = 10_000;

const BANXICO_SERIES: BanxicoSeriesCfg[] = [
  { seriesId: 'SF43718', metricName: 'FX_USD_MXN', unit: 'MXN per USD' },
  { seriesId: 'SF60648', metricName: 'TASA_OBJETIVO', unit: '%' },
  { seriesId: 'SF61745', metricName: 'TIIE_28D', unit: '%' },
  { seriesId: 'SF44070', metricName: 'CETES_28D', unit: '%' },
];

const INEGI_SERIES: InegiSeriesCfg[] = [
  {
    seriesId: '628194',
    metricName: 'INPC_GENERAL',
    unit: 'index',
    source: 'inegi_inpc',
    expectedPeriodicity: 'monthly',
  },
  {
    seriesId: '736182',
    metricName: 'PIB_TRIMESTRAL',
    unit: 'MXN millions',
    source: 'inegi',
    expectedPeriodicity: 'quarterly',
  },
];

const ALL_SOURCES: SourceKey[] = ['banxico', 'inegi_inpc', 'inegi'];

// --------------------------------------------------------------------------
// Helpers puros (exportados para tests)
// --------------------------------------------------------------------------

/**
 * 'DD/MM/YYYY' → 'YYYY-MM-DD'. Throw si formato inválido.
 */
export function parseBanxicoDate(fechaDDMMYYYY: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fechaDDMMYYYY);
  if (m == null) {
    throw new Error(`[ingest:macro-banxico-inegi] fecha Banxico inválida: "${fechaDDMMYYYY}"`);
  }
  const dd = m[1];
  const mm = m[2];
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Parsea JSON Banxico SIE { bmx: { series: [{ idSerie, datos: [{ fecha, dato }] }] } }.
 * Skippea 'N/E' (no disponible). Retorna rows flat listos para mapBanxicoRowsToMacroSeries.
 * Retorna array vacío si el JSON no contiene series o datos.
 */
export function parseBanxicoResponse(json: unknown): ParsedBanxicoRow[] {
  const rows: ParsedBanxicoRow[] = [];
  if (!isRecord(json)) return rows;
  const bmx = json.bmx;
  if (!isRecord(bmx)) return rows;
  const series = bmx.series;
  if (!Array.isArray(series)) return rows;

  for (const s of series) {
    if (!isRecord(s)) continue;
    const idSerie = s.idSerie;
    if (typeof idSerie !== 'string' || idSerie === '') continue;
    const datos = s.datos;
    if (!Array.isArray(datos)) continue;

    for (const d of datos) {
      if (!isRecord(d)) continue;
      const fecha = d.fecha;
      const dato = d.dato;
      if (typeof fecha !== 'string' || typeof dato !== 'string') continue;
      if (dato === 'N/E' || dato === '' || dato === 'null') continue;

      const value = Number(dato.replace(/,/g, ''));
      if (!Number.isFinite(value)) continue;

      let iso: string;
      try {
        iso = parseBanxicoDate(fecha);
      } catch {
        continue;
      }

      rows.push({
        series_id: idSerie,
        period_start: iso,
        period_end: iso,
        value,
      });
    }
  }
  return rows;
}

/**
 * Convierte 'YYYY/MM' a { period_start: 'YYYY-MM-01', period_end: último día mes }.
 */
function monthlyRange(year: number, month: number): { start: string; end: string } {
  const mm = String(month).padStart(2, '0');
  const start = `${year}-${mm}-01`;
  // último día mes: día 0 del mes siguiente (UTC-safe)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/**
 * Convierte 'YYYY/QQ' (Q=1..4) a rango trimestral.
 * Q1=Ene-Mar, Q2=Abr-Jun, Q3=Jul-Sep, Q4=Oct-Dic.
 */
function quarterlyRange(year: number, quarter: number): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1; // 1,4,7,10
  const endMonth = startMonth + 2; // 3,6,9,12
  const mmStart = String(startMonth).padStart(2, '0');
  const start = `${year}-${mmStart}-01`;
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  const mmEnd = String(endMonth).padStart(2, '0');
  const end = `${year}-${mmEnd}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function yearlyRange(year: number): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/**
 * Parsea JSON INEGI BIE { Series: [{ INDICADOR, OBSERVATIONS: [{ TIME_PERIOD, OBS_VALUE }] }] }.
 * Skippea OBS_VALUE null/vacío. `indicator` se usa solo para log contextual — si el JSON
 * viene con un INDICADOR diferente igual procesa (INEGI siempre devuelve lo que se pidió).
 */
export function parseInegiBieResponse(json: unknown, _indicator: string): ParsedInegiRow[] {
  const rows: ParsedInegiRow[] = [];
  if (!isRecord(json)) return rows;
  const series = json.Series;
  if (!Array.isArray(series)) return rows;

  for (const s of series) {
    if (!isRecord(s)) continue;
    const obs = s.OBSERVATIONS;
    if (!Array.isArray(obs)) continue;

    for (const o of obs) {
      if (!isRecord(o)) continue;
      const timePeriod = o.TIME_PERIOD;
      const obsValueRaw = o.OBS_VALUE;
      if (typeof timePeriod !== 'string' || timePeriod === '') continue;
      if (obsValueRaw == null || obsValueRaw === '' || obsValueRaw === 'null') continue;

      const obsValueStr = typeof obsValueRaw === 'string' ? obsValueRaw : String(obsValueRaw);
      const value = Number(obsValueStr.replace(/,/g, ''));
      if (!Number.isFinite(value)) continue;

      // 'YYYY/MM', 'YYYY/QQ', o 'YYYY'
      const slashIdx = timePeriod.indexOf('/');
      if (slashIdx === -1) {
        // Yearly 'YYYY'
        if (!/^\d{4}$/.test(timePeriod)) continue;
        const year = Number(timePeriod);
        if (!Number.isFinite(year)) continue;
        const r = yearlyRange(year);
        rows.push({
          period_start: r.start,
          period_end: r.end,
          value,
          periodicity: 'yearly',
        });
        continue;
      }

      const yearStr = timePeriod.slice(0, slashIdx);
      const restStr = timePeriod.slice(slashIdx + 1);
      const year = Number(yearStr);
      if (!Number.isFinite(year) || !/^\d{4}$/.test(yearStr)) continue;

      // Quarterly detecta 'Q1'..'Q4' o número 1..4 (1 char). Monthly 2 chars 01..12.
      // INEGI BIE para PIB trimestral devuelve 'YYYY/1'..'YYYY/4' (un dígito sin 'Q').
      if (/^\d{1}$/.test(restStr)) {
        const q = Number(restStr);
        if (q < 1 || q > 4) continue;
        const r = quarterlyRange(year, q);
        rows.push({
          period_start: r.start,
          period_end: r.end,
          value,
          periodicity: 'quarterly',
        });
        continue;
      }

      if (/^\d{2}$/.test(restStr)) {
        const m = Number(restStr);
        if (m < 1 || m > 12) continue;
        const r = monthlyRange(year, m);
        rows.push({
          period_start: r.start,
          period_end: r.end,
          value,
          periodicity: 'monthly',
        });
        continue;
      }

      // 'Q1' prefix alt forma
      const qMatch = /^Q([1-4])$/.exec(restStr);
      if (qMatch != null) {
        const qRaw = qMatch[1];
        if (qRaw == null) continue;
        const q = Number(qRaw);
        const r = quarterlyRange(year, q);
        rows.push({
          period_start: r.start,
          period_end: r.end,
          value,
          periodicity: 'quarterly',
        });
      }
    }
  }
  return rows;
}

/**
 * Mapea rows Banxico parseadas a MacroSeriesInsert[] con periodicity='daily'.
 */
export function mapBanxicoRowsToMacroSeries(
  rows: ParsedBanxicoRow[],
  cfg: MapBanxicoCfg,
): MacroSeriesInsert[] {
  return rows
    .filter((r) => r.series_id === cfg.seriesId)
    .map<MacroSeriesInsert>((r) => ({
      country_code: cfg.countryCode,
      source: cfg.source,
      series_id: cfg.seriesId,
      metric_name: cfg.metricName,
      value: r.value,
      unit: cfg.unit,
      period_start: r.period_start,
      period_end: r.period_end,
      periodicity: 'daily',
      run_id: cfg.runId,
      meta: {} as Json,
    }));
}

/**
 * Mapea rows INEGI parseadas a MacroSeriesInsert[] con periodicity tomada de cada row.
 */
export function mapInegiRowsToMacroSeries(
  rows: ParsedInegiRow[],
  cfg: MapInegiCfg,
): MacroSeriesInsert[] {
  return rows.map<MacroSeriesInsert>((r) => ({
    country_code: cfg.countryCode,
    source: cfg.source,
    series_id: cfg.seriesId,
    metric_name: cfg.metricName,
    value: r.value,
    unit: cfg.unit,
    period_start: r.period_start,
    period_end: r.period_end,
    periodicity: r.periodicity,
    run_id: cfg.runId,
    meta: {} as Json,
  }));
}

// --------------------------------------------------------------------------
// CLI plumbing + HTTP + main
// --------------------------------------------------------------------------

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let seriesFilter: string[] | null = null;
  let sourceFilter: SourceKey[] | null = null;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--series=')) {
      const raw = a.slice('--series='.length).trim();
      if (raw === '') continue;
      seriesFilter = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (a.startsWith('--source=')) {
      const raw = a.slice('--source='.length).trim();
      if (raw === '') continue;
      const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const invalid = parts.filter((p): p is string => !ALL_SOURCES.includes(p as SourceKey));
      if (invalid.length > 0) {
        throw new Error(
          `[ingest:macro-banxico-inegi] --source inválido: "${invalid.join(
            ', ',
          )}". Valores: ${ALL_SOURCES.join(', ')}`,
        );
      }
      sourceFilter = parts as SourceKey[];
    }
  }
  return { dryRun, seriesFilter, sourceFilter };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(
      `[ingest:macro-banxico-inegi] Falta env var requerida: ${name}. Exportala antes de correr.`,
    );
  }
  return v;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(to);
  }
}

function toYyyyMmDd(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function fetchBanxicoSeries(
  seriesIds: string[],
  startDate: string,
  endDate: string,
  token: string,
): Promise<unknown> {
  const joined = seriesIds.join(',');
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${joined}/datos/${startDate}/${endDate}`;
  const res = await fetchWithTimeout(url, {
    headers: {
      'Bmx-Token': token,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Banxico HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as unknown;
}

async function fetchInegiIndicator(indicatorId: string, token: string): Promise<unknown> {
  const url = `https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR/${indicatorId}/es/0700/false/BIE/2.0/${token}?type=json`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    throw new Error(`INEGI HTTP ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as unknown;
}

async function upsertInChunks(
  supabase: SupabaseClient<Database>,
  rows: MacroSeriesInsert[],
): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('macro_series')
      .upsert(chunk, { onConflict: 'country_code,source,series_id,period_start' });
    if (error) {
      throw new Error(`upsert macro_series chunk[${i}..${i + chunk.length}]: ${error.message}`);
    }
    written += chunk.length;
  }
  return written;
}

function pickLastPeriodEnd(rows: MacroSeriesInsert[]): string | null {
  let max: string | null = null;
  for (const r of rows) {
    if (max == null || r.period_end > max) {
      max = r.period_end;
    }
  }
  return max;
}

async function runBanxicoSource(
  supabase: SupabaseClient<Database>,
  args: CliArgs,
  token: string,
): Promise<SourceRunSummary> {
  const tag = '[ingest:macro-banxico-inegi]';
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 365);
  const startDate = toYyyyMmDd(start);
  const endDate = toYyyyMmDd(end);

  const seriesCfgs = BANXICO_SERIES.filter(
    (cfg) => args.seriesFilter == null || args.seriesFilter.includes(cfg.seriesId),
  );

  if (seriesCfgs.length === 0) {
    console.log(`${tag} banxico: ninguna serie coincide con --series. Skip.`);
    return {
      run_id: 'skipped',
      status: 'skipped',
      inserted: 0,
      updated: 0,
      skipped: 0,
      dlq: 0,
      error: null,
      duration_ms: 0,
    };
  }

  const result = await withIngestRun(
    supabase,
    {
      source: 'banxico',
      countryCode: COUNTRY,
      triggeredBy: 'cli:ingest-macro-banxico-inegi',
      expectedPeriodicity: 'daily',
      meta: {
        script: '02_ingest-macro-banxico-inegi.ts',
        dry_run: args.dryRun,
        series_filter: args.seriesFilter,
        start_date: startDate,
        end_date: endDate,
      } as Json,
      upsertWatermarkOnSuccess: !args.dryRun,
    },
    async ({ runId }) => {
      let inserted = 0;
      let dlq = 0;
      const skipped = 0;
      let maxPeriodEnd: string | null = null;

      for (const cfg of seriesCfgs) {
        try {
          const json = await fetchBanxicoSeries([cfg.seriesId], startDate, endDate, token);
          const parsed = parseBanxicoResponse(json);
          const mapped = mapBanxicoRowsToMacroSeries(parsed, {
            seriesId: cfg.seriesId,
            metricName: cfg.metricName,
            unit: cfg.unit,
            source: 'banxico',
            countryCode: COUNTRY,
            runId,
          });

          if (args.dryRun) {
            console.log(
              `${tag} banxico dry-run ${cfg.seriesId} (${cfg.metricName}): ${mapped.length} rows. preview:`,
            );
            console.log(JSON.stringify(mapped.slice(0, 3), null, 2));
          } else if (mapped.length > 0) {
            const written = await upsertInChunks(supabase, mapped);
            inserted += written;
            const lastEnd = pickLastPeriodEnd(mapped);
            if (lastEnd != null && (maxPeriodEnd == null || lastEnd > maxPeriodEnd)) {
              maxPeriodEnd = lastEnd;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`${tag} banxico ${cfg.seriesId} FAILED: ${msg} (skipping, dlq++)`);
          dlq++;
        }
        await sleep(RATE_LIMIT_MS);
      }

      return {
        counts: { inserted, updated: 0, skipped, dlq },
        lastSuccessfulPeriodEnd: maxPeriodEnd,
      };
    },
  );

  return {
    run_id: result.runId,
    status: result.status,
    inserted: result.counts.inserted,
    updated: result.counts.updated,
    skipped: result.counts.skipped,
    dlq: result.counts.dlq ?? 0,
    error: result.error,
    duration_ms: result.durationMs,
  };
}

async function runInegiSource(
  supabase: SupabaseClient<Database>,
  args: CliArgs,
  token: string,
  sourceKey: 'inegi_inpc' | 'inegi',
): Promise<SourceRunSummary> {
  const tag = '[ingest:macro-banxico-inegi]';

  const seriesCfgs = INEGI_SERIES.filter(
    (cfg) =>
      cfg.source === sourceKey &&
      (args.seriesFilter == null || args.seriesFilter.includes(cfg.seriesId)),
  );

  if (seriesCfgs.length === 0) {
    console.log(`${tag} ${sourceKey}: ninguna serie coincide con filters. Skip.`);
    return {
      run_id: 'skipped',
      status: 'skipped',
      inserted: 0,
      updated: 0,
      skipped: 0,
      dlq: 0,
      error: null,
      duration_ms: 0,
    };
  }

  // Lookback client-side: 24 meses INPC, 8 obs PIB (≈2 años).
  const firstCfg = seriesCfgs[0];
  if (firstCfg == null) {
    throw new Error(`${tag} ${sourceKey}: seriesCfgs vacío tras filter check (unreachable)`);
  }
  const lookbackLimit =
    firstCfg.expectedPeriodicity === 'monthly'
      ? 24
      : firstCfg.expectedPeriodicity === 'quarterly'
        ? 8
        : 5;

  const expectedPeriodicity = firstCfg.expectedPeriodicity;

  const result = await withIngestRun(
    supabase,
    {
      source: sourceKey,
      countryCode: COUNTRY,
      triggeredBy: 'cli:ingest-macro-banxico-inegi',
      expectedPeriodicity,
      meta: {
        script: '02_ingest-macro-banxico-inegi.ts',
        dry_run: args.dryRun,
        series_filter: args.seriesFilter,
        lookback_limit: lookbackLimit,
      } as Json,
      upsertWatermarkOnSuccess: !args.dryRun,
    },
    async ({ runId }) => {
      let inserted = 0;
      let dlq = 0;
      const skipped = 0;
      let maxPeriodEnd: string | null = null;

      for (const cfg of seriesCfgs) {
        try {
          const json = await fetchInegiIndicator(cfg.seriesId, token);
          const parsedAll = parseInegiBieResponse(json, cfg.seriesId);
          // Ordena DESC por period_end y toma las últimas `lookbackLimit` observaciones.
          const sortedDesc = [...parsedAll].sort((a, b) =>
            a.period_end < b.period_end ? 1 : a.period_end > b.period_end ? -1 : 0,
          );
          const parsed = sortedDesc.slice(0, lookbackLimit);

          const mapped = mapInegiRowsToMacroSeries(parsed, {
            seriesId: cfg.seriesId,
            metricName: cfg.metricName,
            unit: cfg.unit,
            source: cfg.source,
            countryCode: COUNTRY,
            runId,
          });

          if (args.dryRun) {
            console.log(
              `${tag} ${sourceKey} dry-run ${cfg.seriesId} (${cfg.metricName}): ${mapped.length} rows (from ${parsedAll.length} total). preview:`,
            );
            console.log(JSON.stringify(mapped.slice(0, 3), null, 2));
          } else if (mapped.length > 0) {
            const written = await upsertInChunks(supabase, mapped);
            inserted += written;
            const lastEnd = pickLastPeriodEnd(mapped);
            if (lastEnd != null && (maxPeriodEnd == null || lastEnd > maxPeriodEnd)) {
              maxPeriodEnd = lastEnd;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`${tag} ${sourceKey} ${cfg.seriesId} FAILED: ${msg} (skipping, dlq++)`);
          dlq++;
        }
        await sleep(RATE_LIMIT_MS);
      }

      return {
        counts: { inserted, updated: 0, skipped, dlq },
        lastSuccessfulPeriodEnd: maxPeriodEnd,
      };
    },
  );

  return {
    run_id: result.runId,
    status: result.status,
    inserted: result.counts.inserted,
    updated: result.counts.updated,
    skipped: result.counts.skipped,
    dlq: result.counts.dlq ?? 0,
    error: result.error,
    duration_ms: result.durationMs,
  };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const tag = '[ingest:macro-banxico-inegi]';

  const sources: SourceKey[] = args.sourceFilter ?? ALL_SOURCES;

  console.log(
    `${tag} dryRun=${args.dryRun} series=${args.seriesFilter?.join(',') ?? '(all)'} sources=${sources.join(
      ',',
    )}`,
  );

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const runsSummary: Record<SourceKey, SourceRunSummary | null> = {
    banxico: null,
    inegi_inpc: null,
    inegi: null,
  };

  let globalStatus: 'success' | 'failed' | 'partial' = 'success';

  if (sources.includes('banxico')) {
    const banxicoToken = requireEnv('BANXICO_TOKEN');
    runsSummary.banxico = await runBanxicoSource(supabase, args, banxicoToken);
    if (runsSummary.banxico.status === 'failed') globalStatus = 'failed';
    else if (runsSummary.banxico.dlq > 0 && globalStatus === 'success') globalStatus = 'partial';
  }

  if (sources.includes('inegi_inpc') || sources.includes('inegi')) {
    const inegiToken = requireEnv('INEGI_TOKEN');

    if (sources.includes('inegi_inpc')) {
      runsSummary.inegi_inpc = await runInegiSource(supabase, args, inegiToken, 'inegi_inpc');
      if (runsSummary.inegi_inpc.status === 'failed') globalStatus = 'failed';
      else if (runsSummary.inegi_inpc.dlq > 0 && globalStatus === 'success') {
        globalStatus = 'partial';
      }
    }

    if (sources.includes('inegi')) {
      runsSummary.inegi = await runInegiSource(supabase, args, inegiToken, 'inegi');
      if (runsSummary.inegi.status === 'failed') globalStatus = 'failed';
      else if (runsSummary.inegi.dlq > 0 && globalStatus === 'success') globalStatus = 'partial';
    }
  }

  const output = {
    dry_run: args.dryRun,
    global_status: globalStatus,
    runs_summary: runsSummary,
  };
  console.log(JSON.stringify(output, null, 2));

  return globalStatus === 'failed' ? 1 : 0;
}

// Guard: sólo ejecuta main() cuando el módulo es el entry point (no al importar desde tests).
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
      console.error('[ingest:macro-banxico-inegi] FATAL:', err);
      process.exit(1);
    });
}
