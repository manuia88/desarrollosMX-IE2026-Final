// Persistencia de scores — UPSERT en zone_scores / project_scores / user_scores.
// Tablas creadas en migration BLOQUE 8.A.3. Provenance (U4) se escribe
// directo desde CalculatorOutput.provenance.
//
// Las 3 funciones respetan UNIQUE(entity_id, score_type, period_date) y el
// trigger archive_score_before_update (BEFORE UPDATE) inserta la fila anterior
// en score_history automáticamente — no se llama explícitamente desde aquí.
//
// U13 v3 — comparable_zones precalculadas al persistir (solo zone_scores).
// Migration 20260419213000_ie_zone_scores_comparable_zones.sql agrega la
// columna jsonb. Top 3 zonas con mismo score_type + period_date y valor más
// cercano (ABS(value - new_value) ASC). Vacío [] si <3 zonas disponibles.
//
// D2 v4 — deltas first-class (3m/6m/12m).
// Migration 20260419215000_ie_scores_v3_deltas_ranking.sql agrega columna
// jsonb deltas en zone_scores + project_scores. persist.ts consulta
// score_history lookback ±15 días al T-3m/6m/12m y computa delta =
// currentValue − lookbackValue. null si no hay data en la ventana.
//
// D3 v4 — ranking explícito vs todas zonas país.
// Mismo migration agrega columna jsonb ranking. persist.ts cuenta pre-UPSERT
// zonas/proyectos mismo country+score+period con value > currentValue.
// position = count + 1. percentile = (1 − position/total) × 100.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScoreRegistryEntry } from '../registry';
import type { CalculatorInput, CalculatorOutput } from './base';

// Tipado laxo porque las tablas zone_scores/project_scores/user_scores/score_history
// se crean en la migration de BLOQUE 8.A.3 y los types se regeneran después.
// Usamos from(name as never) para evitar TS2345 hasta que db:types corra.
type LooseClient = SupabaseClient<Record<string, unknown>>;

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

export interface PersistResult {
  readonly ok: boolean;
  readonly error?: string;
}

export interface ComparableZone {
  readonly zone_id: string;
  readonly value: number;
  readonly delta: number;
}

// D31 FASE 10 SESIÓN 2/3 — property-level comparables (A08 Comparador Multi-D).
// Se persiste en tabla property_comparables separada de zone_scores (el scope
// es unidad individual, no zona). UNIQUE (property_id, score_id, period_date).
export interface ComparableProperty {
  readonly property_id: string;
  readonly similarity: number;
  readonly delta: number;
  readonly dimensions_matched: readonly string[];
}

// D2 — deltas lookback 3m/6m/12m (null si no hay data en la ventana ±15d).
export interface ScoreDeltas {
  readonly '3m': number | null;
  readonly '6m': number | null;
  readonly '12m': number | null;
}

// D3 — ranking vs todas zonas/proyectos mismo country+score+period.
// position = count(value > currentValue) + 1. percentile = (1 − position/total) × 100.
export interface ScoreRanking {
  readonly position: number;
  readonly total: number;
  readonly percentile: number;
}

function buildRow(
  output: CalculatorOutput,
  registry: ScoreRegistryEntry,
  input: CalculatorInput,
  entityColumn: 'zone_id' | 'project_id' | 'user_id',
  entityId: string,
): Record<string, unknown> {
  return {
    [entityColumn]: entityId,
    country_code: input.countryCode,
    score_type: registry.score_id,
    score_value: output.score_value,
    score_label: output.score_label,
    level: registry.level,
    tier: registry.tier,
    confidence: output.confidence,
    components: output.components,
    inputs_used: output.inputs_used,
    citations: output.citations,
    provenance: output.provenance,
    trend_vs_previous: output.trend_vs_previous ?? null,
    trend_direction: output.trend_direction ?? null,
    valid_until: output.valid_until ?? null,
    period_date: input.periodDate,
    computed_at: new Date().toISOString(),
    // D19 — ml_explanations jsonb (empty {} si no aplica).
    ml_explanations: output.ml_explanations ?? {},
  };
}

// P1 helper — calcular valid_until dado un ValidityWindow + ancla (computed_at).
// Centraliza la aritmética para los calculators que usan methodology.validity.
export function computeValidUntil(
  anchor: Date,
  window: { unit: 'hours' | 'days' | 'months'; value: number },
): string {
  const d = new Date(anchor.getTime());
  if (window.unit === 'hours') d.setUTCHours(d.getUTCHours() + window.value);
  else if (window.unit === 'days') d.setUTCDate(d.getUTCDate() + window.value);
  else d.setUTCMonth(d.getUTCMonth() + window.value);
  return d.toISOString();
}

// D2 — helper: sustrae N meses a una ISO date YYYY-MM-DD (UTC-safe).
function subtractMonths(periodDate: string, months: number): Date {
  const d = new Date(`${periodDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

// D2 — helper: ventana ±15 días alrededor de target, devuelve ISO YYYY-MM-DD.
function windowBounds(target: Date): { from: string; to: string } {
  const from = new Date(target.getTime());
  from.setUTCDate(from.getUTCDate() - 15);
  const to = new Date(target.getTime());
  to.setUTCDate(to.getUTCDate() + 15);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

// D2 — delta vs score_history lookback (3m, 6m o 12m) ±15 días.
// Returns null si no hay fila archivada en la ventana.
async function lookbackDelta(
  supabase: SupabaseClient,
  entityType: 'zone' | 'project',
  entityId: string,
  scoreType: string,
  periodDate: string,
  months: number,
  currentValue: number,
): Promise<number | null> {
  try {
    const target = subtractMonths(periodDate, months);
    const { from, to } = windowBounds(target);
    const { data, error } = await castFrom(supabase, 'score_history')
      .select('score_value, period_date')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('score_type', scoreType)
      .gte('period_date', from)
      .lte('period_date', to)
      .order('period_date', { ascending: false })
      .limit(1);
    if (error || !data || (data as unknown[]).length === 0) return null;
    const rows = data as unknown as Array<{ score_value: number }>;
    const firstRow = rows[0];
    if (!firstRow) return null;
    const prev = firstRow.score_value;
    if (typeof prev !== 'number' || !Number.isFinite(prev)) return null;
    return Number((currentValue - prev).toFixed(3));
  } catch {
    return null;
  }
}

// D2 — retorna los 3 deltas en paralelo.
export async function computeDeltas(
  supabase: SupabaseClient,
  entityType: 'zone' | 'project',
  entityId: string,
  scoreType: string,
  periodDate: string,
  currentValue: number,
): Promise<ScoreDeltas> {
  const [d3, d6, d12] = await Promise.all([
    lookbackDelta(supabase, entityType, entityId, scoreType, periodDate, 3, currentValue),
    lookbackDelta(supabase, entityType, entityId, scoreType, periodDate, 6, currentValue),
    lookbackDelta(supabase, entityType, entityId, scoreType, periodDate, 12, currentValue),
  ]);
  return { '3m': d3, '6m': d6, '12m': d12 };
}

// D3 — ranking pre-UPSERT: cuenta filas mismo bucket con value > currentValue.
// Returns {} si la query falla o no hay otras entidades (total<=1 trata como sin ranking).
export async function computeRanking(
  supabase: SupabaseClient,
  table: 'zone_scores' | 'project_scores',
  scoreType: string,
  periodDate: string,
  countryCode: string,
  currentValue: number,
): Promise<ScoreRanking | Record<string, never>> {
  try {
    const baseFilter = castFrom(supabase, table)
      .select('score_value', { count: 'exact', head: false })
      .eq('country_code', countryCode)
      .eq('score_type', scoreType)
      .eq('period_date', periodDate);

    // total count (no head — queremos data también para robustez).
    const totalRes = await baseFilter;
    if (totalRes.error || typeof totalRes.count !== 'number') return {};
    const existing = totalRes.count;
    const total = existing + 1; // incluye la fila que estamos a punto de UPSERT

    // position = # rows con value > currentValue + 1.
    const higherRes = await castFrom(supabase, table)
      .select('score_value', { count: 'exact', head: true })
      .eq('country_code', countryCode)
      .eq('score_type', scoreType)
      .eq('period_date', periodDate)
      .gt('score_value', currentValue);
    if (higherRes.error || typeof higherRes.count !== 'number') return {};

    const position = higherRes.count + 1;
    if (total <= 1) return {}; // sin ranking significativo
    const percentile = Number((((total - position) / total) * 100).toFixed(2));
    return { position, total, percentile };
  } catch {
    return {};
  }
}

// D25 FASE 10 — stability_index rolling 12m sobre score_history.
// stability = clamp(1 - stddev/mean, 0, 1). Null si <3 snapshots en ventana.
// ≥0.85 estable · <0.6 volátil. Persistido en zone_scores.stability_index.
export async function computeStabilityIndex(
  supabase: SupabaseClient,
  entityType: 'zone' | 'project',
  entityId: string,
  scoreType: string,
  periodDate: string,
): Promise<number | null> {
  try {
    const anchor = new Date(`${periodDate}T00:00:00Z`);
    const from = new Date(anchor.getTime());
    from.setUTCMonth(from.getUTCMonth() - 12);
    const { data, error } = await castFrom(supabase, 'score_history')
      .select('score_value')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('score_type', scoreType)
      .gte('period_date', from.toISOString().slice(0, 10))
      .lte('period_date', periodDate);
    if (error || !data) return null;
    const values = (data as unknown as Array<{ score_value: number }>)
      .map((r) => r.score_value)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (values.length < 3) return null;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    if (mean === 0) return null;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);
    const stability = Math.max(0, Math.min(1, 1 - stddev / Math.abs(mean)));
    return Number(stability.toFixed(4));
  } catch {
    return null;
  }
}

// U13 — top 3 zonas mismo score+period con valor más cercano (ABS delta ASC).
// Returns [] si <3 zonas disponibles o si la query falla.
export async function computeComparableZones(
  supabase: SupabaseClient,
  scoreType: string,
  periodDate: string,
  selfZoneId: string,
  selfValue: number,
): Promise<readonly ComparableZone[]> {
  try {
    const { data, error } = await castFrom(supabase, 'zone_scores')
      .select('zone_id, score_value')
      .eq('score_type', scoreType)
      .eq('period_date', periodDate)
      .neq('zone_id', selfZoneId);

    if (error || !data) return [];

    const rows = data as unknown as Array<{ zone_id: string; score_value: number }>;
    if (rows.length < 3) return [];

    return rows
      .filter((r) => typeof r.score_value === 'number' && Number.isFinite(r.score_value))
      .map(
        (r): ComparableZone => ({
          zone_id: r.zone_id,
          value: r.score_value,
          delta: Math.abs(r.score_value - selfValue),
        }),
      )
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 3);
  } catch {
    return [];
  }
}

// D31 — top K properties más similares a la property objetivo en la misma zona
// + tipo_propiedad + rango m2. En H1 usa project_scores como proxy (embeddings
// por unidad aterrizarán con `unidades` en FASE 13-15). Returns [] si <K vecinos.
export async function findComparableProperties(
  supabase: SupabaseClient,
  params: {
    readonly property_id: string;
    readonly score_type: string;
    readonly period_date: string;
    readonly self_value: number;
    readonly k?: number;
  },
): Promise<readonly ComparableProperty[]> {
  const k = params.k ?? 8;
  try {
    const { data, error } = await castFrom(supabase, 'project_scores')
      .select('project_id, score_value')
      .eq('score_type', params.score_type)
      .eq('period_date', params.period_date)
      .neq('project_id', params.property_id);
    if (error || !data) return [];
    const rows = data as unknown as Array<{ project_id: string; score_value: number }>;
    if (rows.length < k) return [];
    return rows
      .filter((r) => typeof r.score_value === 'number' && Number.isFinite(r.score_value))
      .map((r): ComparableProperty => {
        const delta = Math.abs(r.score_value - params.self_value);
        const similarity = Number(Math.max(0, 1 - delta / 100).toFixed(4));
        return {
          property_id: r.project_id,
          similarity,
          delta: Number(delta.toFixed(2)),
          dimensions_matched: [params.score_type],
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);
  } catch {
    return [];
  }
}

// D31 — UPSERT en property_comparables al persistir A08. Best-effort: errores
// NO tumban el persist principal (swallowed). Scopea por country_code para RLS.
async function persistPropertyComparablesRow(
  supabase: SupabaseClient,
  params: {
    readonly property_id: string;
    readonly score_id: string;
    readonly period_date: string;
    readonly country_code: string;
    readonly comparables: readonly ComparableProperty[];
    readonly k: number;
  },
): Promise<void> {
  try {
    await castFrom(supabase, 'property_comparables').upsert(
      {
        property_id: params.property_id,
        score_id: params.score_id,
        period_date: params.period_date,
        country_code: params.country_code,
        comparable_properties: params.comparables,
        k: params.k,
      } as never,
      { onConflict: 'property_id,score_id,period_date' },
    );
  } catch {
    // best-effort
  }
}

export async function persistZoneScore(
  supabase: SupabaseClient,
  output: CalculatorOutput,
  registry: ScoreRegistryEntry,
  input: CalculatorInput,
): Promise<PersistResult> {
  if (!input.zoneId) return { ok: false, error: 'zoneId required for zone score' };

  const [comparableZones, deltas, ranking, stabilityFromHistory] = await Promise.all([
    computeComparableZones(
      supabase,
      registry.score_id,
      input.periodDate,
      input.zoneId,
      output.score_value,
    ),
    computeDeltas(
      supabase,
      'zone',
      input.zoneId,
      registry.score_id,
      input.periodDate,
      output.score_value,
    ),
    computeRanking(
      supabase,
      'zone_scores',
      registry.score_id,
      input.periodDate,
      input.countryCode,
      output.score_value,
    ),
    computeStabilityIndex(supabase, 'zone', input.zoneId, registry.score_id, input.periodDate),
  ]);

  const row = buildRow(output, registry, input, 'zone_id', input.zoneId);
  row.comparable_zones = comparableZones;
  row.deltas = deltas;
  row.ranking = ranking;
  // D25 — stability_index: calculator output prevalece; fallback al histórico.
  row.stability_index = output.stability_index ?? stabilityFromHistory;

  const { error } = await castFrom(supabase, 'zone_scores').upsert(row as never, {
    onConflict: 'zone_id,score_type,period_date',
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function persistProjectScore(
  supabase: SupabaseClient,
  output: CalculatorOutput,
  registry: ScoreRegistryEntry,
  input: CalculatorInput,
): Promise<PersistResult> {
  if (!input.projectId) return { ok: false, error: 'projectId required for project score' };

  const [deltas, ranking, stabilityFromHistory] = await Promise.all([
    computeDeltas(
      supabase,
      'project',
      input.projectId,
      registry.score_id,
      input.periodDate,
      output.score_value,
    ),
    computeRanking(
      supabase,
      'project_scores',
      registry.score_id,
      input.periodDate,
      input.countryCode,
      output.score_value,
    ),
    computeStabilityIndex(
      supabase,
      'project',
      input.projectId,
      registry.score_id,
      input.periodDate,
    ),
  ]);

  const row = buildRow(output, registry, input, 'project_id', input.projectId);
  row.deltas = deltas;
  row.ranking = ranking;
  row.stability_index = output.stability_index ?? stabilityFromHistory;

  const { error } = await castFrom(supabase, 'project_scores').upsert(row as never, {
    onConflict: 'project_id,score_type,period_date',
  });

  // D31 — auto-populate property_comparables cuando score_id es A08.
  if (!error && registry.score_id === 'A08') {
    const comparables = await findComparableProperties(supabase, {
      property_id: input.projectId,
      score_type: registry.score_id,
      period_date: input.periodDate,
      self_value: output.score_value,
    });
    if (comparables.length > 0) {
      await persistPropertyComparablesRow(supabase, {
        property_id: input.projectId,
        score_id: registry.score_id,
        period_date: input.periodDate,
        country_code: input.countryCode,
        comparables,
        k: comparables.length,
      });
    }
  }

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function persistUserScore(
  supabase: SupabaseClient,
  output: CalculatorOutput,
  registry: ScoreRegistryEntry,
  input: CalculatorInput,
): Promise<PersistResult> {
  if (!input.userId) return { ok: false, error: 'userId required for user score' };
  const row = buildRow(output, registry, input, 'user_id', input.userId);
  const { error } = await castFrom(supabase, 'user_scores').upsert(row as never, {
    onConflict: 'user_id,score_type,period_date',
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
