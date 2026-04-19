import { createAdminClient } from '@/shared/lib/supabase/admin';
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
import { SHF_ENTIDAD_CVE } from './shf';

// Infonavit Portal Transparencia — CSV admin upload. Datasets mensuales sin
// API pública; el Portal publica CSVs descargables (créditos otorgados por
// delegación, valor vivienda promedio por tipo). Driver acepta csvText como
// input (vía mutation admin.ingestUpload, BLOQUE 7.H). Auto-detecta layout
// Dataset A (por delegación) vs Dataset B (por tipo crédito). Parser CSV
// inline (sin dep externa, consistente con cnbv.ts).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.C.6
//       docs/01_DECISIONES_ARQUITECTONICAS/ADR-010_IE_PIPELINE_ARCHITECTURE.md §D2

export const INFONAVIT_SOURCE = 'infonavit' as const;
export const INFONAVIT_PERIODICITY = 'monthly' as const;

export type InfonavitMetric = 'creditos_otorgados' | 'monto_otorgado' | 'valor_vivienda_promedio';

export type InfonavitUnit = 'count' | 'MXN_mdp';

// Reusa SHF_ENTIDAD_CVE como fuente única de mapeo entidad → CVE_ENT INEGI.
// Incluye "Nacional" 00 + 32 entidades y alias comunes (CDMX, Distrito Federal,
// Coahuila de Zaragoza, etc.).
export const INFONAVIT_ENTIDAD_CVE: Record<string, string> = SHF_ENTIDAD_CVE;

// Headers canónicos Dataset A (por delegación). El detector acepta variantes
// normalizadas (minúsculas, sin acentos, espacios/underscores indistintos).
export const INFONAVIT_HEADER_MAP_A = {
  periodo: 'periodo',
  entidad: 'entidad',
  delegacion: 'delegacion',
  creditos_otorgados: 'creditos_otorgados',
  monto_mdp: 'monto_mdp',
  valor_vivienda_promedio_mdp: 'valor_vivienda_promedio_mdp',
} as const;

// Headers canónicos Dataset B (por tipo crédito).
export const INFONAVIT_HEADER_MAP_B = {
  periodo: 'periodo',
  tipo_credito: 'tipo_credito',
  creditos_otorgados: 'creditos_otorgados',
  monto_mdp: 'monto_mdp',
} as const;

const HEADER_A_ALIASES: Record<string, keyof typeof INFONAVIT_HEADER_MAP_A> = {
  periodo: 'periodo',
  fecha: 'periodo',
  mes: 'periodo',
  entidad: 'entidad',
  estado: 'entidad',
  entidad_federativa: 'entidad',
  delegacion: 'delegacion',
  municipio: 'delegacion',
  oficina: 'delegacion',
  creditos_otorgados: 'creditos_otorgados',
  creditos: 'creditos_otorgados',
  num_creditos: 'creditos_otorgados',
  numero_creditos: 'creditos_otorgados',
  monto_mdp: 'monto_mdp',
  monto: 'monto_mdp',
  monto_otorgado: 'monto_mdp',
  monto_otorgado_mdp: 'monto_mdp',
  valor_vivienda_promedio_mdp: 'valor_vivienda_promedio_mdp',
  valor_vivienda: 'valor_vivienda_promedio_mdp',
  valor_vivienda_promedio: 'valor_vivienda_promedio_mdp',
  valor_promedio_vivienda: 'valor_vivienda_promedio_mdp',
};

const HEADER_B_ALIASES: Record<string, keyof typeof INFONAVIT_HEADER_MAP_B> = {
  periodo: 'periodo',
  fecha: 'periodo',
  mes: 'periodo',
  tipo_credito: 'tipo_credito',
  tipo: 'tipo_credito',
  producto: 'tipo_credito',
  linea_credito: 'tipo_credito',
  creditos_otorgados: 'creditos_otorgados',
  creditos: 'creditos_otorgados',
  num_creditos: 'creditos_otorgados',
  numero_creditos: 'creditos_otorgados',
  monto_mdp: 'monto_mdp',
  monto: 'monto_mdp',
  monto_otorgado: 'monto_mdp',
  monto_otorgado_mdp: 'monto_mdp',
};

// Normaliza header: lowercase, strip accents, trim, colapsa espacios/underscores.
export function normalizeHeader(raw: string): string {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s\-./]+/g, '_')
    .replace(/_+/g, '_');
}

export function slugify(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function detectInfonavitDataset(headers: string[]): 'A' | 'B' | null {
  const norm = headers.map(normalizeHeader);
  const has = (k: string): boolean => norm.includes(k);

  const hasPeriodoA = norm.some((h) => HEADER_A_ALIASES[h] === 'periodo');
  const hasEntidad = norm.some((h) => HEADER_A_ALIASES[h] === 'entidad');
  const hasDelegacion = norm.some((h) => HEADER_A_ALIASES[h] === 'delegacion');
  const hasCreditosA = norm.some((h) => HEADER_A_ALIASES[h] === 'creditos_otorgados');
  const hasMontoA = norm.some((h) => HEADER_A_ALIASES[h] === 'monto_mdp');

  if (hasPeriodoA && hasEntidad && hasDelegacion && hasCreditosA && hasMontoA) {
    return 'A';
  }

  const hasPeriodoB = norm.some((h) => HEADER_B_ALIASES[h] === 'periodo');
  const hasTipo = norm.some((h) => HEADER_B_ALIASES[h] === 'tipo_credito');
  const hasCreditosB = norm.some((h) => HEADER_B_ALIASES[h] === 'creditos_otorgados');
  const hasMontoB = norm.some((h) => HEADER_B_ALIASES[h] === 'monto_mdp');

  if (hasPeriodoB && hasTipo && hasCreditosB && hasMontoB) {
    return 'B';
  }

  // Guard contra false positives: si existe 'entidad' o 'delegacion' caemos en A
  // sólo si cumplió arriba. Si no, es unreconizable.
  void has; // evita unused warn en algunos paths
  return null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

// Parsea periodo en formatos comunes: 'YYYY-MM', 'YYYY/MM', 'MM/YYYY',
// 'YYYY-MM-DD', 'enero 2025', 'ene-2025'. Regresa period_start y period_end
// como primer/último día del mes.
const MONTH_ES: Record<string, number> = {
  ene: 1,
  enero: 1,
  feb: 2,
  febrero: 2,
  mar: 3,
  marzo: 3,
  abr: 4,
  abril: 4,
  may: 5,
  mayo: 5,
  jun: 6,
  junio: 6,
  jul: 7,
  julio: 7,
  ago: 8,
  agosto: 8,
  sep: 9,
  sept: 9,
  septiembre: 9,
  oct: 10,
  octubre: 10,
  nov: 11,
  noviembre: 11,
  dic: 12,
  diciembre: 12,
};

export function parseInfonavitPeriod(
  raw: string | number | null | undefined,
): { period_start: string; period_end: string } | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === '') return null;

  // YYYY-MM or YYYY/MM
  const m1 = s.match(/^(\d{4})[\s\-/._](\d{1,2})$/);
  if (m1?.[1] && m1[2]) {
    const y = Number(m1[1]);
    const mo = Number(m1[2]);
    if (mo >= 1 && mo <= 12) {
      return {
        period_start: `${y}-${pad2(mo)}-01`,
        period_end: `${y}-${pad2(mo)}-${pad2(lastDayOfMonth(y, mo))}`,
      };
    }
  }

  // MM/YYYY
  const m2 = s.match(/^(\d{1,2})[\s\-/._](\d{4})$/);
  if (m2?.[1] && m2[2]) {
    const mo = Number(m2[1]);
    const y = Number(m2[2]);
    if (mo >= 1 && mo <= 12) {
      return {
        period_start: `${y}-${pad2(mo)}-01`,
        period_end: `${y}-${pad2(mo)}-${pad2(lastDayOfMonth(y, mo))}`,
      };
    }
  }

  // YYYY-MM-DD → extrae YYYY-MM
  const m3 = s.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (m3?.[1] && m3[2]) {
    const y = Number(m3[1]);
    const mo = Number(m3[2]);
    if (mo >= 1 && mo <= 12) {
      return {
        period_start: `${y}-${pad2(mo)}-01`,
        period_end: `${y}-${pad2(mo)}-${pad2(lastDayOfMonth(y, mo))}`,
      };
    }
  }

  // 'enero 2025' | 'ene-2025' | 'enero-2025'
  const lower = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const m4 = lower.match(/^([a-z]+)[\s\-_./]+(\d{4})$/);
  if (m4?.[1] && m4[2]) {
    const mo = MONTH_ES[m4[1]];
    const y = Number(m4[2]);
    if (mo && mo >= 1 && mo <= 12) {
      return {
        period_start: `${y}-${pad2(mo)}-01`,
        period_end: `${y}-${pad2(mo)}-${pad2(lastDayOfMonth(y, mo))}`,
      };
    }
  }
  const m5 = lower.match(/^(\d{4})[\s\-_./]+([a-z]+)$/);
  if (m5?.[1] && m5[2]) {
    const y = Number(m5[1]);
    const mo = MONTH_ES[m5[2]];
    if (mo && mo >= 1 && mo <= 12) {
      return {
        period_start: `${y}-${pad2(mo)}-01`,
        period_end: `${y}-${pad2(mo)}-${pad2(lastDayOfMonth(y, mo))}`,
      };
    }
  }

  return null;
}

export function parseInfonavitValue(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = String(v).trim();
  if (t === '' || t === '-' || t === '—') return null;
  const upper = t.toUpperCase();
  if (upper === 'N/D' || upper === 'ND' || upper === 'N/E' || upper === 'NE') return null;
  const n = Number.parseFloat(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// CSV line parser que respeta comillas dobles (incluye comas dentro de
// campos quoted y escapes ""). Consistente con el parser inline de cnbv.ts.
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function resolveCve(entidadRaw: string): string | null {
  const name = entidadRaw.trim();
  if (name === '') return null;
  const direct = INFONAVIT_ENTIDAD_CVE[name];
  if (direct) return direct;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(INFONAVIT_ENTIDAD_CVE)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

export interface InfonavitSourceSpanA {
  dataset: 'A';
  raw_row_index: number;
  raw_headers: string[];
  raw_row: Record<string, string>;
  entidad_o_tipo: string;
  cve: string;
}

export interface InfonavitSourceSpanB {
  dataset: 'B';
  raw_row_index: number;
  raw_headers: string[];
  raw_row: Record<string, string>;
  entidad_o_tipo: string;
  cve: null;
}

export type InfonavitSourceSpan = InfonavitSourceSpanA | InfonavitSourceSpanB;

export interface InfonavitParsedRow {
  metric_name: InfonavitMetric;
  series_id: string;
  unit: InfonavitUnit;
  periodicity: typeof INFONAVIT_PERIODICITY;
  period_start: string;
  period_end: string;
  value: number;
  source_span: InfonavitSourceSpan;
}

function buildRowRecord(headers: string[], cols: string[]): Record<string, string> {
  const rec: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h) rec[h] = cols[i] ?? '';
  }
  return rec;
}

function getByAlias<K extends string>(
  rec: Record<string, string>,
  aliases: Record<string, K>,
  target: K,
): string | undefined {
  for (const [alias, canonical] of Object.entries(aliases)) {
    if (canonical !== target) continue;
    if (alias in rec) {
      const v = rec[alias];
      if (v != null && String(v).trim() !== '') return v;
    }
  }
  return undefined;
}

export function parseInfonavitCsv(csvText: string): InfonavitParsedRow[] {
  if (!csvText || csvText.trim() === '') return [];
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];

  const rawHeaderLine = lines[0];
  if (!rawHeaderLine) return [];
  const rawHeaders = parseCsvLine(rawHeaderLine);
  const normHeaders = rawHeaders.map(normalizeHeader);
  const dataset = detectInfonavitDataset(rawHeaders);
  if (dataset == null) {
    throw new Error('infonavit_csv_headers_not_recognized');
  }

  const out: InfonavitParsedRow[] = [];

  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    if (!line) continue;
    const cols = parseCsvLine(line);
    const rec = buildRowRecord(normHeaders, cols);

    if (dataset === 'A') {
      const periodoRaw = getByAlias(rec, HEADER_A_ALIASES, 'periodo');
      const entidadRaw = getByAlias(rec, HEADER_A_ALIASES, 'entidad');
      const delegacionRaw = getByAlias(rec, HEADER_A_ALIASES, 'delegacion');
      const creditosRaw = getByAlias(rec, HEADER_A_ALIASES, 'creditos_otorgados');
      const montoRaw = getByAlias(rec, HEADER_A_ALIASES, 'monto_mdp');
      const valorRaw = getByAlias(rec, HEADER_A_ALIASES, 'valor_vivienda_promedio_mdp');

      if (periodoRaw == null || entidadRaw == null || delegacionRaw == null) continue;
      const period = parseInfonavitPeriod(periodoRaw);
      if (period == null) continue;
      const cve = resolveCve(entidadRaw);
      if (cve == null) continue;
      const slugDeleg = slugify(delegacionRaw);
      if (slugDeleg === '') continue;

      const span: InfonavitSourceSpanA = {
        dataset: 'A',
        raw_row_index: r,
        raw_headers: rawHeaders,
        raw_row: rec,
        entidad_o_tipo: entidadRaw,
        cve,
      };

      const creditos = parseInfonavitValue(creditosRaw);
      if (creditos != null) {
        out.push({
          metric_name: 'creditos_otorgados',
          series_id: `creditos_${cve}_${slugDeleg}`,
          unit: 'count',
          periodicity: INFONAVIT_PERIODICITY,
          period_start: period.period_start,
          period_end: period.period_end,
          value: creditos,
          source_span: span,
        });
      }

      const monto = parseInfonavitValue(montoRaw);
      if (monto != null) {
        out.push({
          metric_name: 'monto_otorgado',
          series_id: `monto_${cve}_${slugDeleg}`,
          unit: 'MXN_mdp',
          periodicity: INFONAVIT_PERIODICITY,
          period_start: period.period_start,
          period_end: period.period_end,
          value: monto,
          source_span: span,
        });
      }

      const valor = parseInfonavitValue(valorRaw);
      if (valor != null) {
        out.push({
          metric_name: 'valor_vivienda_promedio',
          series_id: `valor_vivienda_${cve}_${slugDeleg}`,
          unit: 'MXN_mdp',
          periodicity: INFONAVIT_PERIODICITY,
          period_start: period.period_start,
          period_end: period.period_end,
          value: valor,
          source_span: span,
        });
      }
    } else {
      // dataset B
      const periodoRaw = getByAlias(rec, HEADER_B_ALIASES, 'periodo');
      const tipoRaw = getByAlias(rec, HEADER_B_ALIASES, 'tipo_credito');
      const creditosRaw = getByAlias(rec, HEADER_B_ALIASES, 'creditos_otorgados');
      const montoRaw = getByAlias(rec, HEADER_B_ALIASES, 'monto_mdp');

      if (periodoRaw == null || tipoRaw == null) continue;
      const period = parseInfonavitPeriod(periodoRaw);
      if (period == null) continue;
      const slugTipo = slugify(tipoRaw);
      if (slugTipo === '') continue;

      const span: InfonavitSourceSpanB = {
        dataset: 'B',
        raw_row_index: r,
        raw_headers: rawHeaders,
        raw_row: rec,
        entidad_o_tipo: tipoRaw,
        cve: null,
      };

      const creditos = parseInfonavitValue(creditosRaw);
      if (creditos != null) {
        out.push({
          metric_name: 'creditos_otorgados',
          series_id: `creditos_tipo_${slugTipo}`,
          unit: 'count',
          periodicity: INFONAVIT_PERIODICITY,
          period_start: period.period_start,
          period_end: period.period_end,
          value: creditos,
          source_span: span,
        });
      }

      const monto = parseInfonavitValue(montoRaw);
      if (monto != null) {
        out.push({
          metric_name: 'monto_otorgado',
          series_id: `monto_tipo_${slugTipo}`,
          unit: 'MXN_mdp',
          periodicity: INFONAVIT_PERIODICITY,
          period_start: period.period_start,
          period_end: period.period_end,
          value: monto,
          source_span: span,
        });
      }
    }
  }

  return out;
}

export interface InfonavitDriverInput {
  csvText: string;
}

export async function upsertInfonavitRows(
  rows: InfonavitParsedRow[],
  ctx: IngestCtx,
): Promise<{ inserted: number; errors: string[] }> {
  if (rows.length === 0) return { inserted: 0, errors: [] };
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({
    country_code: ctx.countryCode,
    source: INFONAVIT_SOURCE,
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

export const infonavitDriver: IngestDriver<InfonavitDriverInput, string> = {
  source: INFONAVIT_SOURCE,
  category: 'macro',
  defaultPeriodicity: INFONAVIT_PERIODICITY,
  async fetch(_ctx, input) {
    if (!input?.csvText || input.csvText.trim() === '') {
      throw new Error('infonavit_missing_csv');
    }
    return input.csvText;
  },
  async parse(payload) {
    return parseInfonavitCsv(payload);
  },
  async upsert(rows, ctx) {
    const parsed = rows as InfonavitParsedRow[];
    const { inserted, errors } = await upsertInfonavitRows(parsed, ctx);
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

registerDriver(infonavitDriver);

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  return `${yyyy}-${mm}-${dd}`;
}

export interface IngestInfonavitOptions {
  triggeredBy?: string;
  uploadedBy?: string;
  saveRaw?: boolean;
  retries?: number;
}

export async function ingestInfonavitCsv(
  csvText: string,
  options: IngestInfonavitOptions = {},
): Promise<IngestResult> {
  if (!csvText || csvText.trim() === '') throw new Error('infonavit_missing_csv');
  const periodEnd = todayISO();

  const job: IngestJob<string> = {
    source: INFONAVIT_SOURCE,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: options.triggeredBy ?? 'admin_upload',
    estimatedCostUsd: 0,
    async run(ctx: IngestCtx) {
      const parsed = parseInfonavitCsv(csvText);

      const gates = await runQualityGates(
        parsed,
        [
          rowCountSanityGate<InfonavitParsedRow>({ min: 0 }),
          duplicateDetectionGate<InfonavitParsedRow>((r) => `${r.series_id}:${r.period_start}`),
          outlierFlagGate<InfonavitParsedRow>((r) => r.value),
        ],
        ctx,
      );

      if (!gates.ok) {
        throw new Error(
          `quality_gates_failed: ${gates.failures.map((f) => `${f.gate}=${f.reason}`).join('; ')}`,
        );
      }

      const { inserted, errors } = await upsertInfonavitRows(parsed, ctx);

      if (parsed.length > 0) {
        try {
          await recordLineage(
            parsed.slice(0, 100).map((r) => ({
              runId: ctx.runId,
              source: INFONAVIT_SOURCE,
              destinationTable: 'macro_series',
              upstreamUrl: 'https://portaltransparencia.infonavit.org.mx/',
              transformation: 'infonavit_csv_parse',
              sourceSpan: r.source_span as unknown as Record<string, unknown>,
            })),
          );
        } catch {
          // lineage best-effort
        }
      }

      const meta: Record<string, unknown> = {
        quality_gate_warnings: gates.warnings,
        rows_parsed: parsed.length,
      };
      if (options.uploadedBy) meta.uploaded_by = options.uploadedBy;

      return {
        rows_inserted: inserted,
        rows_updated: 0,
        rows_skipped: 0,
        rows_dlq: 0,
        errors,
        cost_estimated_usd: 0,
        meta,
        rawPayload: csvText,
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
