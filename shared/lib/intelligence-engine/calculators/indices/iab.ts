// DMX-IAB — Índice Absorción Benchmark. Categoría mercado, tier 3, country MX.
// Plan FASE 11 §DMX-IAB + Catálogo 03.8 §dmx-iab. Registry ver
// shared/lib/intelligence-engine/registry.ts L1502-1514.
//
// Fórmula:
//   IAB = clamp(B08_absorcion_zona_avg / benchmark_cdmx_absorcion × 50, 0, 100)
// - B08_absorcion_zona_avg: mean B08 de proyectos ACTIVOS en la colonia último trimestre.
// - benchmark_cdmx_absorcion: mean B08 de TODOS los proyectos ACTIVOS CDMX último trimestre.
// Gating: requiere ≥50 proyectos activos CDMX; sino confidence=insufficient_data.
//
// Decisión conservadora de zona_avg: tomar mean simple de project_scores.score_value
// para score_type='B08' filtrado por country_code='MX' y último trimestre (90 días)
// dentro del zoneId provisto. Si no hay proyectos en la zona, zona_avg fallback al
// benchmark CDMX (neutral, IAB = 50).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula: 'IAB = clamp(B08_zona_avg / B08_cdmx_avg × 50, 0, 100). Centro 50 = paridad con CDMX.',
  sources: ['project_scores:B08', 'projects_registry'],
  dependencies: [{ score_id: 'B08', weight: 1.0, role: 'absorption', critical: true }],
  references: [
    {
      name: 'Catálogo 03.8 §DMX-IAB',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#dmx-iab-indice-absorcion-benchmark',
    },
    { name: 'Plan FASE 11 §DMX-IAB', url: 'docs/02_PLAN_MAESTRO/FASE_11_IE_INDICES_DMX.md' },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_cdmx_projects: 50, high_cdmx_projects: 200, min_zone_projects: 5 },
  quarter_days: 90,
  circuit_breaker_pct: 20,
} as const;

export const reasoning_template =
  'DMX-IAB zona={zone_id}: {score_value}/100. Zona avg {zone_avg}, CDMX {cdmx_avg}. {n_cdmx} proyectos CDMX en trimestre. Confianza {confidence}.';

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export type IabLabel =
  | 'ie.index.dmx_iab.muy_alta'
  | 'ie.index.dmx_iab.alta'
  | 'ie.index.dmx_iab.paridad'
  | 'ie.index.dmx_iab.baja'
  | 'ie.index.dmx_iab.insufficient';

export function getLabelKey(value: number, confidence: Confidence): IabLabel {
  if (confidence === 'insufficient_data') return 'ie.index.dmx_iab.insufficient';
  if (value >= 75) return 'ie.index.dmx_iab.muy_alta';
  if (value >= 55) return 'ie.index.dmx_iab.alta';
  if (value >= 40) return 'ie.index.dmx_iab.paridad';
  return 'ie.index.dmx_iab.baja';
}

export interface IabConfidenceBreakdown {
  readonly data_freshness: number; // 0..30
  readonly data_completeness: number; // 0..30
  readonly sample_size: number; // 0..20
  readonly methodology_maturity: number; // 0..20
  readonly total: number;
}

export interface IabComponentEntry {
  readonly value: number;
  readonly weight: number;
  readonly citation_source: string;
  readonly citation_period: string;
  readonly sample_count: number;
}

export interface IabComponents extends Record<string, unknown> {
  readonly B08_zona_avg: IabComponentEntry | null;
  readonly B08_cdmx_avg: IabComponentEntry | null;
  readonly ratio: number | null;
  readonly n_projects_zone: number;
  readonly n_projects_cdmx: number;
  readonly _meta: {
    readonly confidence_breakdown: IabConfidenceBreakdown;
    readonly circuit_breaker_triggered: boolean;
    readonly shadow: boolean;
    readonly previous_value: number | null;
  };
}

export interface IabRawInput {
  readonly zone_avg: number | null;
  readonly cdmx_avg: number | null;
  readonly n_projects_zone: number;
  readonly n_projects_cdmx: number;
  readonly period_date: string;
  readonly previous_value?: number | null;
  readonly data_staleness_days?: number;
}

export interface IabComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: IabComponents;
}

function computeConfidenceBreakdown(params: {
  readonly cdmx_count: number;
  readonly zone_count: number;
  readonly both_present: boolean;
  readonly staleness_days: number;
}): IabConfidenceBreakdown {
  const completeness = params.both_present ? 30 : params.cdmx_count > 0 ? 15 : 0;
  const stalenessClamped = Math.max(0, Math.min(90, params.staleness_days));
  const freshness = Math.round(((90 - stalenessClamped) / 90) * 30);
  // Sample size: escalado contra min_cdmx (50) → high_cdmx (200).
  const min = methodology.confidence_thresholds.min_cdmx_projects;
  const high = methodology.confidence_thresholds.high_cdmx_projects;
  const cdmx = params.cdmx_count;
  const cdmxScore =
    cdmx <= 0 ? 0 : cdmx >= high ? 20 : Math.round(Math.max(0, (cdmx - min) / (high - min)) * 20);
  const maturity = 20;
  const total = freshness + completeness + cdmxScore + maturity;
  return {
    data_freshness: freshness,
    data_completeness: completeness,
    sample_size: cdmxScore,
    methodology_maturity: maturity,
    total: Math.max(0, Math.min(100, total)),
  };
}

export function computeIab(input: IabRawInput): IabComputeResult {
  const both_present = isFiniteNumber(input.zone_avg) && isFiniteNumber(input.cdmx_avg);
  const breakdown = computeConfidenceBreakdown({
    cdmx_count: input.n_projects_cdmx,
    zone_count: input.n_projects_zone,
    both_present,
    staleness_days: input.data_staleness_days ?? 0,
  });

  // Insufficient if CDMX fleet < 50 or no valid CDMX avg.
  if (
    input.n_projects_cdmx < methodology.confidence_thresholds.min_cdmx_projects ||
    !isFiniteNumber(input.cdmx_avg) ||
    input.cdmx_avg <= 0
  ) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        B08_zona_avg: null,
        B08_cdmx_avg: null,
        ratio: null,
        n_projects_zone: input.n_projects_zone,
        n_projects_cdmx: input.n_projects_cdmx,
        _meta: {
          confidence_breakdown: breakdown,
          circuit_breaker_triggered: false,
          shadow: false,
          previous_value: input.previous_value ?? null,
        },
      },
    };
  }

  // Zona vacía: fallback conservador → IAB = 50 (paridad) con confidence low.
  const zone_avg_effective = isFiniteNumber(input.zone_avg) ? input.zone_avg : input.cdmx_avg;
  const ratio = zone_avg_effective / input.cdmx_avg;
  const raw = ratio * 50;
  const value = Math.round(clamp100(raw));

  let confidence: Confidence;
  if (
    !isFiniteNumber(input.zone_avg) ||
    input.n_projects_zone < methodology.confidence_thresholds.min_zone_projects
  ) {
    confidence = 'low';
  } else if (breakdown.total >= 75) {
    confidence = 'high';
  } else if (breakdown.total >= 50) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  let circuit_breaker_triggered = false;
  const prev = input.previous_value;
  if (isFiniteNumber(prev) && prev > 0) {
    const deltaPct = (Math.abs(value - prev) / prev) * 100;
    circuit_breaker_triggered = deltaPct > methodology.circuit_breaker_pct;
  }

  return {
    value,
    confidence,
    components: {
      B08_zona_avg: isFiniteNumber(input.zone_avg)
        ? {
            value: Number(input.zone_avg.toFixed(3)),
            weight: 0.5,
            citation_source: 'project_scores:B08',
            citation_period: input.period_date,
            sample_count: input.n_projects_zone,
          }
        : null,
      B08_cdmx_avg: {
        value: Number(input.cdmx_avg.toFixed(3)),
        weight: 0.5,
        citation_source: 'project_scores:B08:cdmx',
        citation_period: input.period_date,
        sample_count: input.n_projects_cdmx,
      },
      ratio: Number(ratio.toFixed(4)),
      n_projects_zone: input.n_projects_zone,
      n_projects_cdmx: input.n_projects_cdmx,
      _meta: {
        confidence_breakdown: breakdown,
        circuit_breaker_triggered,
        shadow: false,
        previous_value: input.previous_value ?? null,
      },
    },
  };
}

// ---- Supabase helpers ----
type LooseClient = SupabaseClient<Record<string, unknown>>;
function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

async function fetchAvgB08(
  supabase: SupabaseClient,
  countryCode: string,
  periodDate: string,
  zoneId: string | null,
): Promise<{ avg: number | null; count: number; max_staleness_days: number }> {
  const anchor = new Date(`${periodDate}T00:00:00Z`);
  const from = new Date(anchor.getTime());
  from.setUTCDate(from.getUTCDate() - methodology.quarter_days);
  const fromISO = from.toISOString().slice(0, 10);

  let q = castFrom(supabase, 'project_scores')
    .select('score_value, period_date, project_id')
    .eq('country_code', countryCode)
    .eq('score_type', 'B08')
    .gte('period_date', fromISO)
    .lte('period_date', periodDate);

  if (zoneId) {
    // Filtrar por zona requiere join con projects → best-effort via columna si existe.
    // H1: project_scores no garantiza zone_id. Estrategia conservadora: si el cliente
    // no filtra por zone, agregar TODOS los proyectos del país en el trimestre.
    // Cuando se necesite zona específica, caller injecta zoneId y query usa la columna
    // si existe (supabase ignora .eq inválidos con error que sw detectamos).
    q = q.eq('zone_id', zoneId);
  }

  const { data, error } = await q;
  if (error || !data) return { avg: null, count: 0, max_staleness_days: methodology.quarter_days };
  const rows = data as unknown as Array<{ score_value: number; period_date: string }>;
  const validRows = rows.filter(
    (r) => typeof r.score_value === 'number' && Number.isFinite(r.score_value),
  );
  if (validRows.length === 0)
    return { avg: null, count: 0, max_staleness_days: methodology.quarter_days };

  const sum = validRows.reduce((acc, r) => acc + r.score_value, 0);
  const avg = sum / validRows.length;
  const maxDays = validRows.reduce((m, r) => {
    const dt = new Date(`${r.period_date}T00:00:00Z`);
    const days = Math.round((anchor.getTime() - dt.getTime()) / 86_400_000);
    return Math.max(m, days);
  }, 0);
  return { avg, count: validRows.length, max_staleness_days: maxDays };
}

async function fetchPreviousIab(
  supabase: SupabaseClient,
  zoneId: string | null,
  countryCode: string,
  periodDate: string,
): Promise<number | null> {
  try {
    let q = castFrom(supabase, 'dmx_indices')
      .select('value, period_date')
      .eq('country_code', countryCode)
      .eq('index_code', 'DMX-IAB')
      .lt('period_date', periodDate)
      .order('period_date', { ascending: false })
      .limit(1);
    if (zoneId) q = q.eq('zone_id', zoneId);
    const { data, error } = await q;
    if (error || !data) return null;
    const rows = data as unknown as Array<{ value: number }>;
    const first = rows[0];
    if (!first || !isFiniteNumber(first.value)) return null;
    return first.value;
  } catch {
    return null;
  }
}

async function writeAuditLog(
  supabase: SupabaseClient,
  params: {
    readonly index_code: string;
    readonly zone_id: string | null;
    readonly country_code: string;
    readonly period_date: string;
    readonly value: number;
    readonly confidence: Confidence;
    readonly shadow: boolean;
    readonly circuit_breaker_triggered: boolean;
    readonly components: Readonly<Record<string, unknown>>;
  },
): Promise<void> {
  try {
    await castFrom(supabase, 'dmx_indices_audit_log').insert({
      index_code: params.index_code,
      zone_id: params.zone_id,
      country_code: params.country_code,
      period_date: params.period_date,
      value: params.value,
      confidence: params.confidence,
      shadow: params.shadow,
      circuit_breaker_triggered: params.circuit_breaker_triggered,
      components: params.components,
      computed_at: new Date().toISOString(),
    } as never);
  } catch {
    // best-effort
  }
}

export const iabCalculator: Calculator = {
  scoreId: 'DMX-IAB',
  version,
  tier: 3,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const shadow_mode = input.params?.shadow_mode === true;
    const audit_log = input.params?.audit_log === true;

    const [zone, cdmx, previous_value] = await Promise.all([
      input.zoneId
        ? fetchAvgB08(supabase, input.countryCode, input.periodDate, input.zoneId)
        : Promise.resolve({ avg: null, count: 0, max_staleness_days: 0 }),
      fetchAvgB08(supabase, input.countryCode, input.periodDate, null),
      fetchPreviousIab(supabase, input.zoneId ?? null, input.countryCode, input.periodDate),
    ]);

    const result = computeIab({
      zone_avg: zone.avg,
      cdmx_avg: cdmx.avg,
      n_projects_zone: zone.count,
      n_projects_cdmx: cdmx.count,
      period_date: input.periodDate,
      previous_value,
      data_staleness_days: Math.max(zone.max_staleness_days, cdmx.max_staleness_days),
    });

    const components_with_shadow: IabComponents = {
      ...result.components,
      _meta: { ...result.components._meta, shadow: shadow_mode },
    };

    if (audit_log) {
      await writeAuditLog(supabase, {
        index_code: 'DMX-IAB',
        zone_id: input.zoneId ?? null,
        country_code: input.countryCode,
        period_date: input.periodDate,
        value: result.value,
        confidence: result.confidence,
        shadow: shadow_mode,
        circuit_breaker_triggered: result.components._meta.circuit_breaker_triggered,
        components: components_with_shadow,
      });
    }

    const trend_vs_previous = isFiniteNumber(previous_value)
      ? Number((result.value - previous_value).toFixed(2))
      : undefined;
    const trend_direction =
      trend_vs_previous === undefined
        ? undefined
        : trend_vs_previous > 1
          ? 'mejorando'
          : trend_vs_previous < -1
            ? 'empeorando'
            : 'estable';

    return {
      score_value: result.value,
      score_label: getLabelKey(result.value, result.confidence),
      components: components_with_shadow,
      inputs_used: {
        zoneId: input.zoneId ?? null,
        periodDate: input.periodDate,
        n_projects_zone: zone.count,
        n_projects_cdmx: cdmx.count,
      },
      confidence: result.confidence,
      citations: [
        { source: 'project_scores:B08:zone', period: input.periodDate, count: zone.count },
        { source: 'project_scores:B08:cdmx', period: input.periodDate, count: cdmx.count },
      ],
      ...(trend_vs_previous !== undefined ? { trend_vs_previous } : {}),
      ...(trend_direction !== undefined ? { trend_direction } : {}),
      provenance: {
        sources: [
          { name: 'project_scores', period: input.periodDate, count: zone.count + cdmx.count },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        zone_id: input.zoneId ?? 'cdmx_aggregate',
        zone_avg: zone.avg ?? 0,
        cdmx_avg: cdmx.avg ?? 0,
        n_cdmx: cdmx.count,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default iabCalculator;
