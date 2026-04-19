import { createAdminClient } from '@/shared/lib/supabase/admin';
import { correlationHeaders } from '../correlation';
import { type IngestDriver, registerDriver } from '../driver';
import { recordLineage } from '../lineage';
import { type RunIngestOptions, runIngest } from '../orchestrator';
import {
  duplicateDetectionGate,
  outlierFlagGate,
  rowCountSanityGate,
  runQualityGates,
} from '../quality-gates';
import type { IngestCtx, IngestJob, IngestResult } from '../types';

// INEGI BIE API client. API gubernamental gratuita con token en path. Series
// monthly + quarterly MX (INPC, INPP, PIB, materiales construcción, vivienda).
// source_span preserva indicator_id + raw TIME_PERIOD / OBS_VALUE para auditar
// provenance y soporta Constitutional AI GC-7.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.C.2
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2

export const INEGI_BASE =
  'https://www.inegi.org.mx/app/api/indicadores/desarrolladores/jsonxml/INDICATOR';

export const INEGI_SERIES = {
  INPC_GEN: { id: '910414', unit: 'index', periodicity: 'monthly' },
  INPP_CONSTRUCCION: { id: '628194', unit: 'index', periodicity: 'monthly' },
  PIB_REAL: { id: '493911', unit: 'MXN_millones_2013', periodicity: 'quarterly' },
  MATERIALES_CONST: { id: '628193', unit: 'index', periodicity: 'monthly' },
  VIVIENDA_NUEVA: { id: '496001', unit: 'index', periodicity: 'monthly' },
} as const;

export type InegiMetricKey = keyof typeof INEGI_SERIES;
export type InegiPeriodicity = 'monthly' | 'quarterly' | 'yearly';

export interface InegiApiObservation {
  TIME_PERIOD: string;
  OBS_VALUE: string | null;
}

export interface InegiApiSeries {
  INDICADOR: string;
  OBSERVATIONS?: InegiApiObservation[];
}

export interface InegiApiPayload {
  Series?: InegiApiSeries[];
}

export interface InegiParsedRow {
  metric_name: InegiMetricKey;
  series_id: string;
  unit: string;
  periodicity: string;
  period_start: string;
  period_end: string;
  value: number;
  source_span: {
    indicator_id: string;
    raw_time_period: string;
    raw_obs_value: string;
  };
}

const ID_TO_METRIC = new Map<
  string,
  { key: InegiMetricKey; unit: string; periodicity: InegiPeriodicity }
>(
  Object.entries(INEGI_SERIES).map(([k, v]) => [
    v.id,
    {
      key: k as InegiMetricKey,
      unit: v.unit,
      periodicity: v.periodicity as InegiPeriodicity,
    },
  ]),
);

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseInegiPeriod(
  timePeriod: string,
  periodicity: InegiPeriodicity,
): { period_start: string; period_end: string } | null {
  if (typeof timePeriod !== 'string' || timePeriod.length === 0) return null;

  if (periodicity === 'monthly') {
    const m = timePeriod.match(/^(\d{4})\/(\d{2})$/);
    if (!m) return null;
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    if (mm < 1 || mm > 12) return null;
    const lastDay = lastDayOfMonth(yyyy, mm);
    return {
      period_start: `${yyyy}-${pad2(mm)}-01`,
      period_end: `${yyyy}-${pad2(mm)}-${pad2(lastDay)}`,
    };
  }

  if (periodicity === 'quarterly') {
    const m = timePeriod.match(/^(\d{4})\/(\d{2})$/);
    if (!m) return null;
    const yyyy = Number(m[1]);
    const qq = Number(m[2]);
    if (qq < 1 || qq > 4) return null;
    const startMonth = (qq - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const lastDay = lastDayOfMonth(yyyy, endMonth);
    return {
      period_start: `${yyyy}-${pad2(startMonth)}-01`,
      period_end: `${yyyy}-${pad2(endMonth)}-${pad2(lastDay)}`,
    };
  }

  if (periodicity === 'yearly') {
    const m = timePeriod.match(/^(\d{4})$/);
    if (!m) return null;
    const yyyy = Number(m[1]);
    return {
      period_start: `${yyyy}-01-01`,
      period_end: `${yyyy}-12-31`,
    };
  }

  return null;
}

export function parseInegiValue(obsValue: string | null | undefined): number | null {
  if (obsValue == null) return null;
  const t = String(obsValue).trim();
  if (t === '' || t === 'N/E' || t === 'NE' || t.toUpperCase() === 'ND') return null;
  const v = Number.parseFloat(t.replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
}

export function parseInegiPayload(payload: InegiApiPayload): InegiParsedRow[] {
  const out: InegiParsedRow[] = [];
  const series = payload?.Series ?? [];
  for (const s of series) {
    const meta = ID_TO_METRIC.get(s.INDICADOR);
    if (!meta) continue;
    for (const obs of s.OBSERVATIONS ?? []) {
      const period = parseInegiPeriod(obs.TIME_PERIOD, meta.periodicity);
      const value = parseInegiValue(obs.OBS_VALUE);
      if (period == null || value == null) continue;
      out.push({
        metric_name: meta.key,
        series_id: s.INDICADOR,
        unit: meta.unit,
        periodicity: meta.periodicity,
        period_start: period.period_start,
        period_end: period.period_end,
        value,
        source_span: {
          indicator_id: s.INDICADOR,
          raw_time_period: obs.TIME_PERIOD,
          raw_obs_value: obs.OBS_VALUE ?? '',
        },
      });
    }
  }
  return out;
}

export interface FetchInegiOptions {
  token: string;
  runId: string;
  fetchImpl?: typeof fetch;
}

function buildInegiUrl(indicatorIds: string[], token: string): string {
  const ids = indicatorIds.join(',');
  return `${INEGI_BASE}/${ids}/es/0700/false/BIE/2.0/${token}?type=json`;
}

export async function fetchInegiSeries(
  indicatorIds: string[],
  opts: FetchInegiOptions,
): Promise<InegiApiPayload> {
  if (indicatorIds.length === 0) throw new Error('inegi_no_series');
  const url = buildInegiUrl(indicatorIds, opts.token);
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(url, {
    headers: {
      Accept: 'application/json',
      ...correlationHeaders(opts.runId),
    },
  });
  if (!res.ok) {
    throw new Error(`inegi_http_${res.status}`);
  }
  return (await res.json()) as InegiApiPayload;
}

export async function upsertInegiRows(
  rows: InegiParsedRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: 'inegi',
    series_id: r.series_id,
    metric_name: r.metric_name,
    period_start: r.period_start,
    period_end: r.period_end,
    periodicity: r.periodicity,
    unit: r.unit,
    value: r.value,
    run_id: ctx.runId,
    meta: { source_span: r.source_span },
  }));
  const { error, count } = await supabase.from('macro_series').upsert(payload as never, {
    onConflict: 'country_code,source,series_id,period_start',
    count: 'exact',
    ignoreDuplicates: false,
  });
  if (error) return { inserted: 0, errors: [`macro_series_upsert: ${error.message}`] };
  return { inserted: count ?? rows.length, errors: [] };
}

export const inegiDriver: IngestDriver<void, InegiApiPayload> = {
  source: 'inegi',
  category: 'macro',
  defaultPeriodicity: 'monthly',
  async fetch(ctx) {
    const token = process.env.INEGI_TOKEN;
    if (!token) throw new Error('missing_env: INEGI_TOKEN');
    const ids = Object.values(INEGI_SERIES).map((s) => s.id);
    return await fetchInegiSeries(ids, { token, runId: ctx.runId });
  },
  async parse(payload) {
    return parseInegiPayload(payload);
  },
  async upsert(rows, ctx) {
    const parsed = rows as InegiParsedRow[];
    const { inserted, errors } = await upsertInegiRows(parsed, ctx);
    return {
      rows_inserted: inserted,
      rows_updated: 0,
      rows_skipped: 0,
      rows_dlq: 0,
      errors,
      cost_estimated_usd: 0,
    };
  },
};

registerDriver(inegiDriver);

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${yyyy}-${mm}-${dd}`;
}

export interface IngestInegiOptions {
  triggeredBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

export async function ingestInegi(options: IngestInegiOptions = {}): Promise<IngestResult> {
  const periodEnd = todayISO();

  const job: IngestJob<InegiApiPayload> = {
    source: 'inegi',
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'cron:monthly',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const token = process.env.INEGI_TOKEN;
      if (!token) throw new Error('missing_env: INEGI_TOKEN');
      const indicatorIds = Object.values(INEGI_SERIES).map((s) => s.id);
      const payload = await fetchInegiSeries(indicatorIds, {
        token,
        runId: ctx.runId,
      });

      const parsed = parseInegiPayload(payload);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<InegiParsedRow>({ min: 0 }),
          duplicateDetectionGate<InegiParsedRow>((r) => `${r.series_id}:${r.period_start}`),
          outlierFlagGate<InegiParsedRow>((r) => r.value),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertInegiRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: 'inegi',
              destinationTable: 'macro_series',
              upstreamUrl: `${INEGI_BASE}/${r.series_id}/es/0700/false/BIE/2.0`,
              transformation: 'inegi_bie_parse',
              sourceSpan: r.source_span as unknown as Record<string, unknown>,
            })),
          );
        } catch {
          // lineage best-effort
        }
      }

      return {
        rows_inserted: inserted,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: 0,
        errors,
        cost_estimated_usd: 0,
        meta: { quality_gate_warnings: gates.warnings, rows_parsed: parsed.length },
        rawPayload: payload,
      };
    },
  };

  const runOpts: RunIngestOptions = {
    saveRaw: options.saveRaw ?? true,
    bumpWatermarkOnSuccess: { periodEnd },
  };
  if (typeof options.retries === 'number') runOpts.retries = options.retries;

  return await runIngest(job, runOpts);
}
