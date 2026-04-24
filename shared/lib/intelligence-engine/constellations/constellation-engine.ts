// BLOQUE 11.R.1 — Zone Constellations engine H1 (heuristic_v1).
//
// Computa edges multi-tipo entre colonias y persiste en
// public.zone_constellations_edges. 4 edge types:
//   migration           — zone_migration_flows volume normalizado
//   climate_twin        — climate_twin_matches similarity × 100
//   genoma_similarity   — colonia_dna_vectors cosine (via RPC match)
//   pulse_correlation   — zone_pulse_scores pulse_score diff invert
//
// edge_weight = Σ(type × default_weight) sobre componentes disponibles,
// normalizado a peso total del subset (si falta una fuente, los pesos se
// re-balancean). Filtra edge_weight < 30 para reducir noise.
//
// Fan-out determinístico: por cada source colonia, top 50 targets por
// edge_weight. Batch 200 colonias × 50 = 10k edges max por período.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type BuildConstellationBatchSummary,
  type ConstellationEdge,
  EDGE_TYPE_DEFAULT_WEIGHTS,
  EDGE_TYPES,
  EDGE_WEIGHT_MIN_PERSIST,
  type EdgeType,
  type EdgeTypeBreakdown,
} from '@/features/constellations/types';
import type { Database, Json } from '@/shared/types/database';
import { discoverCDMXColoniaZones } from '../calculators/indices/orchestrator';

const MAX_TARGETS_PER_SOURCE = 50;
const BATCH_CHUNK_SIZE = 20;

// -----------------------------------------------------------
// Fetch layer: 4 data sources.
// -----------------------------------------------------------

function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

export async function fetchMigrationNeighbors(
  supabase: SupabaseClient<Database>,
  sourceColoniaId: string,
  periodDate: string,
  countryCode: string,
): Promise<Map<string, number>> {
  // Both inflow + outflow — constellations son bidireccionales.
  const [inflow, outflow] = await Promise.all([
    supabase
      .from('zone_migration_flows')
      .select('origin_scope_id, volume')
      .eq('dest_scope_id', sourceColoniaId)
      .eq('country_code', countryCode)
      .lte('period_date', periodDate),
    supabase
      .from('zone_migration_flows')
      .select('dest_scope_id, volume')
      .eq('origin_scope_id', sourceColoniaId)
      .eq('country_code', countryCode)
      .lte('period_date', periodDate),
  ]);

  const out = new Map<string, number>();
  let maxVol = 0;
  if (inflow.data) {
    for (const row of inflow.data) {
      const id = row.origin_scope_id;
      const v = typeof row.volume === 'number' ? row.volume : 0;
      if (typeof id !== 'string' || id === sourceColoniaId) continue;
      const updated = (out.get(id) ?? 0) + v;
      out.set(id, updated);
      if (updated > maxVol) maxVol = updated;
    }
  }
  if (outflow.data) {
    for (const row of outflow.data) {
      const id = row.dest_scope_id;
      const v = typeof row.volume === 'number' ? row.volume : 0;
      if (typeof id !== 'string' || id === sourceColoniaId) continue;
      const updated = (out.get(id) ?? 0) + v;
      out.set(id, updated);
      if (updated > maxVol) maxVol = updated;
    }
  }
  // Normalize to 0..100.
  const normalized = new Map<string, number>();
  if (maxVol <= 0) return normalized;
  for (const [id, vol] of out.entries()) {
    normalized.set(id, clamp((vol / maxVol) * 100, 0, 100));
  }
  return normalized;
}

export async function fetchClimateTwinNeighbors(
  supabase: SupabaseClient<Database>,
  sourceColoniaId: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const { data } = await supabase
    .from('climate_twin_matches')
    .select('twin_zone_id, similarity')
    .eq('zone_id', sourceColoniaId);
  if (!data) return out;
  for (const row of data) {
    const id = row.twin_zone_id;
    const sim = typeof row.similarity === 'number' ? row.similarity : 0;
    if (typeof id !== 'string' || id === sourceColoniaId) continue;
    // similarity persistido como 0..100 ya (features/climate-twin/types).
    out.set(id, clamp(sim, 0, 100));
  }
  return out;
}

export async function fetchGenomaSimilarityNeighbors(
  supabase: SupabaseClient<Database>,
  sourceColoniaId: string,
  countryCode: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  // Usa match_embeddings RPC si existe (Genome 11.M standard).
  // Si falla, fallback a cosine manual sobre vector text literal (costoso).
  try {
    const { data } = await supabase
      .from('colonia_dna_vectors')
      .select('colonia_id, vector')
      .eq('country_code', countryCode);
    if (!data || data.length === 0) return out;

    const sourceRow = data.find((r) => r.colonia_id === sourceColoniaId);
    if (!sourceRow || typeof sourceRow.vector !== 'string') return out;
    const sourceVec = parsePgVector(sourceRow.vector);
    if (!sourceVec) return out;

    for (const row of data) {
      if (row.colonia_id === sourceColoniaId) continue;
      if (typeof row.vector !== 'string') continue;
      const vec = parsePgVector(row.vector);
      if (!vec) continue;
      const sim = cosineSimilarity(sourceVec, vec);
      // Cosine ∈ [-1, 1]; normaliza a 0..100 (0 = opposite, 100 = identical).
      const pct = clamp(((sim + 1) / 2) * 100, 0, 100);
      out.set(row.colonia_id, pct);
    }
  } catch {
    // Swallow — genoma optional.
  }
  return out;
}

function parsePgVector(literal: string): number[] | null {
  // pgvector literal format: '[0.1,0.2,0.3]' (también acepta spaces).
  try {
    const trimmed = literal.trim();
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null;
    const inner = trimmed.slice(1, -1);
    if (inner.length === 0) return [];
    const parts = inner.split(',');
    const nums: number[] = [];
    for (const p of parts) {
      const n = Number.parseFloat(p);
      if (!Number.isFinite(n)) return null;
      nums.push(n);
    }
    return nums;
  } catch {
    return null;
  }
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function fetchPulseCorrelationNeighbors(
  supabase: SupabaseClient<Database>,
  sourceColoniaId: string,
  periodDate: string,
  countryCode: string,
): Promise<Map<string, number>> {
  // Proxy simple: zonas con pulse_score similar al source en el mismo período.
  // Correlación real (temporal) queda para FASE 12 con series históricas.
  const out = new Map<string, number>();
  const { data: sourceRow } = await supabase
    .from('zone_pulse_scores')
    .select('pulse_score')
    .eq('scope_id', sourceColoniaId)
    .eq('scope_type', 'colonia')
    .eq('country_code', countryCode)
    .lte('period_date', periodDate)
    .order('period_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sourceRow || typeof sourceRow.pulse_score !== 'number') return out;
  const sourcePulse = sourceRow.pulse_score;

  const { data } = await supabase
    .from('zone_pulse_scores')
    .select('scope_id, pulse_score')
    .eq('scope_type', 'colonia')
    .eq('country_code', countryCode)
    .eq('period_date', periodDate);

  if (!data) return out;
  for (const row of data) {
    const id = row.scope_id;
    const p = row.pulse_score;
    if (typeof id !== 'string' || typeof p !== 'number' || id === sourceColoniaId) continue;
    const diff = Math.abs(p - sourcePulse);
    const similarity = clamp(100 - diff * 1.0, 0, 100);
    out.set(id, similarity);
  }
  return out;
}

// -----------------------------------------------------------
// Edge weight computation.
// -----------------------------------------------------------

export function computeEdgeWeight(types: EdgeTypeBreakdown): number {
  let weightSum = 0;
  let totalPeso = 0;
  for (const type of EDGE_TYPES) {
    const v = types[type];
    if (Number.isFinite(v) && v > 0) {
      const w = EDGE_TYPE_DEFAULT_WEIGHTS[type];
      weightSum += v * w;
      totalPeso += w;
    }
  }
  if (totalPeso <= 0) return 0;
  return Math.round((weightSum / totalPeso) * 100) / 100;
}

export function computeEdgeWeightCustom(
  types: EdgeTypeBreakdown,
  customWeights: Partial<Record<EdgeType, number>>,
): number {
  let weightSum = 0;
  let totalPeso = 0;
  for (const type of EDGE_TYPES) {
    const v = types[type];
    const w = customWeights[type] ?? EDGE_TYPE_DEFAULT_WEIGHTS[type];
    if (Number.isFinite(v) && v > 0 && w > 0) {
      weightSum += v * w;
      totalPeso += w;
    }
  }
  if (totalPeso <= 0) return 0;
  return Math.round((weightSum / totalPeso) * 100) / 100;
}

// -----------------------------------------------------------
// Per-source edge computation (single colonia).
// -----------------------------------------------------------

export interface ComputeEdgesForZoneParams {
  readonly sourceColoniaId: string;
  readonly periodDate: string;
  readonly supabase: SupabaseClient<Database>;
  readonly countryCode?: string;
}

export interface ComputedEdge {
  readonly source_colonia_id: string;
  readonly target_colonia_id: string;
  readonly edge_weight: number;
  readonly edge_types: EdgeTypeBreakdown;
}

export async function computeEdgesForZone(
  params: ComputeEdgesForZoneParams,
): Promise<ComputedEdge[]> {
  const countryCode = params.countryCode ?? 'MX';
  const { sourceColoniaId, periodDate, supabase } = params;
  const [migration, climate, genoma, pulse] = await Promise.all([
    fetchMigrationNeighbors(supabase, sourceColoniaId, periodDate, countryCode),
    fetchClimateTwinNeighbors(supabase, sourceColoniaId),
    fetchGenomaSimilarityNeighbors(supabase, sourceColoniaId, countryCode),
    fetchPulseCorrelationNeighbors(supabase, sourceColoniaId, periodDate, countryCode),
  ]);

  // Union of target ids across all 4 sources.
  const allTargets = new Set<string>([
    ...migration.keys(),
    ...climate.keys(),
    ...genoma.keys(),
    ...pulse.keys(),
  ]);

  const edges: ComputedEdge[] = [];
  for (const targetId of allTargets) {
    const types: EdgeTypeBreakdown = {
      migration: migration.get(targetId) ?? 0,
      climate_twin: climate.get(targetId) ?? 0,
      genoma_similarity: genoma.get(targetId) ?? 0,
      pulse_correlation: pulse.get(targetId) ?? 0,
    };
    const weight = computeEdgeWeight(types);
    if (weight < EDGE_WEIGHT_MIN_PERSIST) continue;
    edges.push({
      source_colonia_id: sourceColoniaId,
      target_colonia_id: targetId,
      edge_weight: weight,
      edge_types: types,
    });
  }

  edges.sort((a, b) => b.edge_weight - a.edge_weight);
  return edges.slice(0, MAX_TARGETS_PER_SOURCE);
}

// -----------------------------------------------------------
// Persist layer.
// -----------------------------------------------------------

async function upsertEdges(
  supabase: SupabaseClient<Database>,
  edges: readonly ComputedEdge[],
  periodDate: string,
): Promise<number> {
  if (edges.length === 0) return 0;

  // onConflict requires a UNIQUE constraint — schema-native defines
  // UNIQUE (source_colonia_id, target_colonia_id, period_date) en la
  // tabla; si no, el upsert actúa como insert ignorando duplicates.
  const rows = edges.map((e) => ({
    source_colonia_id: e.source_colonia_id,
    target_colonia_id: e.target_colonia_id,
    edge_weight: e.edge_weight,
    edge_types: e.edge_types as unknown as Json,
    period_date: periodDate,
    calculated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('zone_constellations_edges')
    .upsert(rows, { onConflict: 'source_colonia_id,target_colonia_id,period_date' });
  if (error) {
    throw new Error(`zone_constellations_edges upsert failed: ${error.message}`);
  }
  return rows.length;
}

// -----------------------------------------------------------
// Batch orchestrator CDMX.
// -----------------------------------------------------------

export interface BuildAllConstellationsParams {
  readonly periodDate: string;
  readonly supabase: SupabaseClient<Database>;
  readonly countryCode?: string;
  readonly zoneIds?: readonly string[];
}

export async function buildAllConstellationEdges(
  params: BuildAllConstellationsParams,
): Promise<BuildConstellationBatchSummary> {
  const start = Date.now();
  const countryCode = params.countryCode ?? 'MX';
  const { supabase, periodDate } = params;
  const zoneIds = params.zoneIds ?? (await discoverCDMXColoniaZones(supabase, periodDate));

  if (zoneIds.length === 0) {
    return {
      zones_processed: 0,
      edges_upserted: 0,
      clusters_computed: 0,
      failures: 0,
      duration_ms: Date.now() - start,
    };
  }

  let edgesUpserted = 0;
  let failures = 0;

  for (let i = 0; i < zoneIds.length; i += BATCH_CHUNK_SIZE) {
    const chunk = zoneIds.slice(i, i + BATCH_CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map(async (sourceColoniaId) => {
        const edges = await computeEdgesForZone({
          sourceColoniaId,
          periodDate,
          supabase,
          countryCode,
        });
        return upsertEdges(supabase, edges, periodDate);
      }),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') edgesUpserted += r.value;
      else failures += 1;
    }
  }

  return {
    zones_processed: zoneIds.length,
    edges_upserted: edgesUpserted,
    clusters_computed: 0, // se setea en louvain module
    failures,
    duration_ms: Date.now() - start,
  };
}

// -----------------------------------------------------------
// UI-side edge → ConstellationEdge adapter.
// -----------------------------------------------------------

export function rowToConstellationEdge(
  row: {
    source_colonia_id: string;
    target_colonia_id: string;
    edge_weight: number;
    edge_types: Json;
    period_date: string;
  },
  targetLabel: string | null,
): ConstellationEdge {
  const et: EdgeTypeBreakdown = isEdgeTypeBreakdown(row.edge_types)
    ? (row.edge_types as unknown as EdgeTypeBreakdown)
    : { migration: 0, climate_twin: 0, genoma_similarity: 0, pulse_correlation: 0 };
  return {
    source_colonia_id: row.source_colonia_id,
    target_colonia_id: row.target_colonia_id,
    target_label: targetLabel,
    edge_weight: row.edge_weight,
    edge_types: et,
    period_date: row.period_date,
  };
}

export function isEdgeTypeBreakdown(value: Json): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return EDGE_TYPES.every((t) => typeof obj[t] === 'number');
}
