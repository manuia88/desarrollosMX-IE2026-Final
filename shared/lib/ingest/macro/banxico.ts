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

// Banxico SIE API client. Fuente H1 única con endpoint REST directo (resto de
// macro MX son admin-upload o PDF extract). source_span en meta permite
// auditar provenance y soporta Constitutional AI GC-7 para consistencia
// con ingestores LLM downstream (bbva_research, fovissste).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.C.1
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2

const BANXICO_BASE = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series';

// Series IDs verificados vs. catálogo Banxico SIE (actualizado 2026-Q1). Si
// Banxico renombra/retira una serie, el sampler/outlier gate alertará por
// row_count_sanity.
export const BANXICO_SERIES = {
  tasa_referencia: { id: 'SF43783', unit: 'pct', periodicity: 'daily' },
  TIIE28: { id: 'SF60653', unit: 'pct', periodicity: 'daily' },
  USD_MXN_FIX: { id: 'SF43718', unit: 'MXN_per_USD', periodicity: 'daily' },
  UDI: { id: 'SP68257', unit: 'MXN', periodicity: 'daily' },
} as const;

export type BanxicoMetricKey = keyof typeof BANXICO_SERIES;

export interface BanxicoApiDato {
  fecha: string;
  dato: string;
}

export interface BanxicoApiSeries {
  idSerie: string;
  titulo: string;
  datos?: BanxicoApiDato[];
}

export interface BanxicoApiPayload {
  bmx: { series: BanxicoApiSeries[] };
}

export interface BanxicoParsedRow {
  metric_name: BanxicoMetricKey;
  series_id: string;
  unit: string;
  periodicity: string;
  period_start: string;
  period_end: string;
  value: number;
  source_span: {
    id_serie: string;
    titulo: string;
    raw_fecha: string;
    raw_dato: string;
  };
}

const ID_TO_METRIC = new Map<string, { key: BanxicoMetricKey; unit: string; periodicity: string }>(
  Object.entries(BANXICO_SERIES).map(([k, v]) => [
    v.id,
    { key: k as BanxicoMetricKey, unit: v.unit, periodicity: v.periodicity },
  ]),
);

export function parseBanxicoDate(fecha: string): string | null {
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm}-${dd}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return iso;
}

export function parseBanxicoValue(dato: string | null | undefined): number | null {
  if (dato == null) return null;
  const t = String(dato).trim();
  if (t === '' || t === 'N/E' || t === 'NE' || t.toUpperCase() === 'ND') return null;
  const v = Number.parseFloat(t.replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
}

export function parseBanxicoPayload(payload: BanxicoApiPayload): BanxicoParsedRow[] {
  const out: BanxicoParsedRow[] = [];
  const series = payload?.bmx?.series ?? [];
  for (const s of series) {
    const meta = ID_TO_METRIC.get(s.idSerie);
    if (!meta) continue;
    for (const p of s.datos ?? []) {
      const iso = parseBanxicoDate(p.fecha);
      const v = parseBanxicoValue(p.dato);
      if (iso == null || v == null) continue;
      out.push({
        metric_name: meta.key,
        series_id: s.idSerie,
        unit: meta.unit,
        periodicity: meta.periodicity,
        period_start: iso,
        period_end: iso,
        value: v,
        source_span: {
          id_serie: s.idSerie,
          titulo: s.titulo,
          raw_fecha: p.fecha,
          raw_dato: p.dato,
        },
      });
    }
  }
  return out;
}

export interface FetchBanxicoOptions {
  token: string;
  runId: string;
  fromDate?: string;
  toDate?: string;
  fetchImpl?: typeof fetch;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function fetchBanxicoSeries(
  seriesIds: string[],
  opts: FetchBanxicoOptions,
): Promise<BanxicoApiPayload> {
  if (seriesIds.length === 0) throw new Error('banxico_no_series');
  const ids = seriesIds.join(',');
  const suffix =
    opts.fromDate && opts.toDate ? `/datos/${opts.fromDate}/${opts.toDate}` : '/datos/oportuno';
  const url = `${BANXICO_BASE}/${ids}${suffix}`;
  const doFetch = opts.fetchImpl ?? fetch;
  const res = await doFetch(url, {
    headers: {
      'Bmx-Token': opts.token,
      Accept: 'application/json',
      ...correlationHeaders(opts.runId),
    },
  });
  if (!res.ok) {
    throw new Error(`banxico_http_${res.status}`);
  }
  return (await res.json()) as BanxicoApiPayload;
}

export async function upsertBanxicoRows(
  rows: BanxicoParsedRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: 'banxico',
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

export const banxicoDriver: IngestDriver<void, BanxicoApiPayload> = {
  source: 'banxico',
  category: 'macro',
  defaultPeriodicity: 'daily',
  async fetch(ctx) {
    const token = process.env.BANXICO_TOKEN;
    if (!token) throw new Error('missing_env: BANXICO_TOKEN');
    const ids = Object.values(BANXICO_SERIES).map((s) => s.id);
    return await fetchBanxicoSeries(ids, { token, runId: ctx.runId });
  },
  async parse(payload) {
    return parseBanxicoPayload(payload);
  },
  async upsert(rows, ctx) {
    const parsed = rows as BanxicoParsedRow[];
    const { inserted, errors } = await upsertBanxicoRows(parsed, ctx);
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

registerDriver(banxicoDriver);

export interface IngestBanxicoOptions {
  triggeredBy?: string;
  fromDate?: string;
  toDate?: string;
  saveRaw?: boolean;
  retries?: number;
}

export async function ingestBanxico(options: IngestBanxicoOptions = {}): Promise<IngestResult> {
  const periodEnd = options.toDate ?? todayISO();

  const job: IngestJob<BanxicoApiPayload> = {
    source: 'banxico',
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'cron:daily',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const token = process.env.BANXICO_TOKEN;
      if (!token) throw new Error('missing_env: BANXICO_TOKEN');
      const seriesIds = Object.values(BANXICO_SERIES).map((s) => s.id);
      const payload = await fetchBanxicoSeries(seriesIds, {
        token,
        runId: ctx.runId,
        ...(options.fromDate && options.toDate
          ? { fromDate: options.fromDate, toDate: options.toDate }
          : {}),
      });

      const parsed = parseBanxicoPayload(payload);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<BanxicoParsedRow>({ min: 0 }),
          duplicateDetectionGate<BanxicoParsedRow>((r) => `${r.series_id}:${r.period_start}`),
          outlierFlagGate<BanxicoParsedRow>((r) => r.value),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertBanxicoRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: 'banxico',
              destinationTable: 'macro_series',
              upstreamUrl: `${BANXICO_BASE}/${r.series_id}/datos/oportuno`,
              transformation: 'banxico_sie_parse',
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
