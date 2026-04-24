#!/usr/bin/env node
/**
 * Batch compute constelaciones — edges + clusters + topology — para colonias MX.
 * Determinista (zero LLM). Hidrata 3 tablas en una sola corrida:
 *
 *   zone_constellations_edges   (1 row por par ordered, UPSERT onConflict
 *                                source_colonia_id,target_colonia_id,period_date)
 *   zone_constellation_clusters (1 row por zone × period_date, UPSERT onConflict
 *                                zone_id,period_date)
 *   zone_topology_metrics       (1 row por zone × snapshot_date, UPSERT onConflict
 *                                zone_id,snapshot_date)
 *
 * Composición edge_types jsonb (4 keys siempre presentes en cada row emitida):
 *   demographic_flow    — cosine similarity de age_distribution (6 buckets)
 *                         desde inegi_census_zone_stats.
 *   economic_complement — 1 - cosine_sim sobre DMX indices económicos (IAB,ICO,
 *                         STR,DEV). Missing → 0.5 neutral.
 *   cultural_affinity   — cosine similarity de colonia_dna_vectors.vector (64-dim
 *                         pgvector). Missing → 0.
 *   spatial_adjacency   — 1 - clamp(dist_km/10, 0, 1) basado en lat/lng haversine.
 *
 * Composite edge_weight = mean(4 weights). Solo se emite row si >= minWeight
 * (default 0.3). Se emite UNA dirección por par (source.scope_id < target.scope_id
 * lexicográficamente) → max 21,945 pares candidatos sobre 210 colonias.
 *
 * Clusters — Louvain-approximation degree-based simple:
 *   init cluster_id[i] = i; iterar 3 pasadas: cada nodo se mueve al cluster_id
 *   del vecino con mayor edge_weight; renumerar 0..K-1.
 *
 * Topology — por zona sobre el grafo emitido:
 *   degree_centrality      — count edges donde zone es source OR target.
 *   closeness_centrality   — sum(1/shortest_path) via BFS (aproximación).
 *   approximate_pagerank   — 10 rondas, damping d=0.85; normalizado sum≈1.
 *   components jsonb       — { neighbor_count, has_edges, algorithm }.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/compute/11_compute-constellations-edges.ts
 *
 * Flags:
 *   --dry-run             Preview 10 zonas → 45 pares, log 5 primeras edges + 1 cluster
 *                         + 1 topology row. NO UPSERT.
 *   --min-weight=0.3      Umbral composite edge_weight (default 0.3).
 *   --limit-pairs=N       Cap defensivo sobre pares candidatos (default 50000).
 *   --country=MX          ISO country code (default MX).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../shared/types/database.ts';
import { withIngestRun } from '../ingest/lib/ingest-run-helper.ts';

type CliArgs = {
  dryRun: boolean;
  minWeight: number;
  limitPairs: number;
  country: string;
};

type ZoneRow = {
  id: string;
  scope_id: string;
  scope_type: string;
  country_code: string;
  lat: number | null;
  lng: number | null;
};

type EdgeInsert = Database['public']['Tables']['zone_constellations_edges']['Insert'];
type ClusterInsert = Database['public']['Tables']['zone_constellation_clusters']['Insert'];
type TopologyInsert = Database['public']['Tables']['zone_topology_metrics']['Insert'];

export type EdgeTypes = {
  demographic_flow: number;
  economic_complement: number;
  cultural_affinity: number;
  spatial_adjacency: number;
};

export type EdgeCandidate = {
  sourceZoneId: string;
  targetZoneId: string;
  sourceScopeId: string;
  targetScopeId: string;
  edgeTypes: EdgeTypes;
  edgeWeight: number;
};

export type ZoneFeatures = {
  zoneId: string;
  scopeId: string;
  lat: number | null;
  lng: number | null;
  ageDistribution: number[] | null; // 6 buckets normalized to sum=1 (percentages)
  economicProfile: number[] | null; // [IAB, ICO, STR, DEV] 0-100
  dnaVector: number[] | null; // 64-dim L2-normalized
};

export type AgeBucketKey =
  | 'age_0_14'
  | 'age_15_29'
  | 'age_30_44'
  | 'age_45_59'
  | 'age_60_74'
  | 'age_75_plus';

const DEFAULT_COUNTRY = 'MX';
const DEFAULT_MIN_WEIGHT = 0.3;
const DEFAULT_LIMIT_PAIRS = 50_000;
const MAX_EMITTED_EDGES = 30_000;
const SOURCE = 'compute_constellations';
const METHODOLOGY_VERSION = 'v1.0';
const SCOPE_TYPE_COLONIA = 'colonia';
const CHUNK_SIZE = 500;
const VECTOR_DIM = 64;
const EPSILON = 1e-12;
const ECONOMIC_CODES: readonly string[] = ['IAB', 'ICO', 'STR', 'DEV'];
const SPATIAL_MAX_KM = 10;
const EARTH_RADIUS_KM = 6371;
const PAGERANK_DAMPING = 0.85;
const PAGERANK_ROUNDS = 10;
const CLUSTER_PASSES = 3;
const DRY_RUN_ZONE_LIMIT = 10;
const DRY_RUN_EDGE_LOG = 5;

// Bucket boundaries [lowerInclusive, upperInclusive] — 6 buckets totaling all ages.
export const AGE_BUCKETS: ReadonlyArray<{ key: AgeBucketKey; lo: number; hi: number }> = [
  { key: 'age_0_14', lo: 0, hi: 14 },
  { key: 'age_15_29', lo: 15, hi: 29 },
  { key: 'age_30_44', lo: 30, hi: 44 },
  { key: 'age_45_59', lo: 45, hi: 59 },
  { key: 'age_60_74', lo: 60, hi: 74 },
  { key: 'age_75_plus', lo: 75, hi: 200 },
];

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let minWeight = DEFAULT_MIN_WEIGHT;
  let limitPairs = DEFAULT_LIMIT_PAIRS;
  let country = DEFAULT_COUNTRY;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--min-weight=')) {
      const n = Number.parseFloat(a.slice('--min-weight='.length));
      if (!Number.isFinite(n) || n < 0 || n > 1) {
        throw new Error(`[compute-constellations-edges] --min-weight inválido: "${a}"`);
      }
      minWeight = n;
    } else if (a.startsWith('--limit-pairs=')) {
      const n = Number.parseInt(a.slice('--limit-pairs='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-constellations-edges] --limit-pairs inválido: "${a}"`);
      }
      limitPairs = n;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).trim().toUpperCase();
      if (raw === '' || raw.length !== 2) {
        throw new Error(`[compute-constellations-edges] --country inválido: "${a}"`);
      }
      country = raw;
    }
  }
  return { dryRun, minWeight, limitPairs, country };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(
      `[compute-constellations-edges] Falta env var requerida: ${name}. Exportala antes de correr.`,
    );
  }
  return v;
}

/**
 * Cosine similarity entre dos vectores de igual longitud. Returns 0 si alguno
 * es all-zeros o si longitudes difieren. Clamped a [0,1] (negativos → 0) para
 * vectores no-negativos; si ambos pueden ser negativos, clamped a [-1,1].
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA < EPSILON || normB < EPSILON) return 0;
  const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  if (!Number.isFinite(sim)) return 0;
  return Math.max(-1, Math.min(1, sim));
}

/**
 * Haversine distance en km entre dos puntos (lat, lng) en grados decimales.
 * Symmetric: haversineKm(A, B) === haversineKm(B, A).
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/**
 * Spatial adjacency weight ∈ [0, 1]. <1 km ≈ 0.9+; 5 km ≈ 0.5; >=10 km = 0.
 */
export function spatialAdjacency(
  latA: number | null,
  lngA: number | null,
  latB: number | null,
  lngB: number | null,
): number {
  if (latA == null || lngA == null || latB == null || lngB == null) return 0;
  if (!Number.isFinite(latA) || !Number.isFinite(lngA)) return 0;
  if (!Number.isFinite(latB) || !Number.isFinite(lngB)) return 0;
  const d = haversineKm(latA, lngA, latB, lngB);
  const normalized = Math.max(0, Math.min(1, d / SPATIAL_MAX_KM));
  return 1 - normalized;
}

/**
 * Parser pgvector text format `[v0,v1,...,v63]` → number[] de longitud `dim`.
 * Returns null si malformado. Rechaza vacíos, sin brackets, NaN, longitudes
 * distintas al esperado.
 */
export function parsePgVector(text: string | null | undefined, dim = VECTOR_DIM): number[] | null {
  if (text == null) return null;
  const s = text.trim();
  if (s.length < 2) return null;
  if (!s.startsWith('[') || !s.endsWith(']')) return null;
  const inner = s.slice(1, -1).trim();
  if (inner.length === 0) return null;
  const parts = inner.split(',');
  if (parts.length !== dim) return null;
  const out: number[] = [];
  for (const p of parts) {
    const v = Number.parseFloat(p);
    if (!Number.isFinite(v)) return null;
    out.push(v);
  }
  return out;
}

/**
 * Demographic flow weight: cosine similarity de age_distribution vector
 * (6 buckets). Requires both zones. Missing → 0.
 */
export function demographicFlow(
  aAgeDist: readonly number[] | null,
  bAgeDist: readonly number[] | null,
): number {
  if (aAgeDist == null || bAgeDist == null) return 0;
  if (aAgeDist.length !== AGE_BUCKETS.length || bAgeDist.length !== AGE_BUCKETS.length) return 0;
  return Math.max(0, cosineSimilarity(aAgeDist, bAgeDist));
}

/**
 * Economic complement weight: 1 - cosine_sim sobre economic DMX indices
 * [IAB, ICO, STR, DEV]. Missing ambos → 0.5 neutral (sin datos no se sabe).
 */
export function economicComplement(
  aProfile: readonly number[] | null,
  bProfile: readonly number[] | null,
): number {
  if (aProfile == null || bProfile == null) return 0.5;
  if (aProfile.length !== ECONOMIC_CODES.length || bProfile.length !== ECONOMIC_CODES.length) {
    return 0.5;
  }
  const sim = cosineSimilarity(aProfile, bProfile);
  return Math.max(0, Math.min(1, 1 - sim));
}

/**
 * Cultural affinity weight: cosine similarity de 64-dim colonia_dna_vectors.
 * Missing ambos → 0.
 */
export function culturalAffinity(
  aDna: readonly number[] | null,
  bDna: readonly number[] | null,
): number {
  if (aDna == null || bDna == null) return 0;
  if (aDna.length === 0 || aDna.length !== bDna.length) return 0;
  return Math.max(0, cosineSimilarity(aDna, bDna));
}

/**
 * Composite edge_weight = mean(4 weights), clamped a [0, 1].
 */
export function compositeEdgeWeight(edgeTypes: EdgeTypes): number {
  const w =
    (edgeTypes.demographic_flow +
      edgeTypes.economic_complement +
      edgeTypes.cultural_affinity +
      edgeTypes.spatial_adjacency) /
    4;
  return Math.max(0, Math.min(1, w));
}

/**
 * Extracts `[age_0_14, age_15_29, age_30_44, age_45_59, age_60_74, age_75_plus]`
 * percentages (0-100 or 0-1) desde un array `age_distribution` jsonb con entries
 * `{age_group, percentage}` — age_group puede ser "0-14", "0_14", "0 a 14", etc.
 * Returns null si no se pudo extraer ningún bucket.
 */
export function extractAgeDistribution(raw: Json | null | undefined): number[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const buckets = new Array<number>(AGE_BUCKETS.length).fill(0);
  let anyFound = false;
  for (const entry of raw) {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    const ageGroup = obj.age_group;
    const percentage = obj.percentage;
    if (typeof ageGroup !== 'string') continue;
    if (typeof percentage !== 'number' || !Number.isFinite(percentage)) continue;
    const normalized = ageGroup.replace(/[_\s]+/g, '-');
    // Attempt to parse "N-M" or "N+" or "N"
    const plusMatch = normalized.match(/^(\d+)\s*\+?$/);
    const rangeMatch = normalized.match(/^(\d+)\s*-\s*(\d+)$/);
    let lo = Number.NaN;
    let hi = Number.NaN;
    if (rangeMatch) {
      lo = Number.parseInt(rangeMatch[1] ?? '', 10);
      hi = Number.parseInt(rangeMatch[2] ?? '', 10);
    } else if (plusMatch) {
      lo = Number.parseInt(plusMatch[1] ?? '', 10);
      hi = 200;
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) continue;
    // Assign to bucket by midpoint
    const mid = (lo + hi) / 2;
    for (let i = 0; i < AGE_BUCKETS.length; i++) {
      const bucket = AGE_BUCKETS[i];
      if (bucket == null) continue;
      if (mid >= bucket.lo && mid <= bucket.hi) {
        buckets[i] = (buckets[i] ?? 0) + percentage;
        anyFound = true;
        break;
      }
    }
  }
  if (!anyFound) return null;
  return buckets;
}

/**
 * Assigns cluster_id per zone using degree-based Louvain-approximation.
 * 3 passes: each node moves to the cluster_id of its highest-weight neighbor.
 * Renumbers to contiguous 0..K-1.
 */
export function assignClusters(
  zoneIds: readonly string[],
  edges: ReadonlyArray<{ sourceZoneId: string; targetZoneId: string; edgeWeight: number }>,
): Map<string, number> {
  const clusterOf = new Map<string, number>();
  for (let i = 0; i < zoneIds.length; i++) {
    const zid = zoneIds[i];
    if (zid == null) continue;
    clusterOf.set(zid, i);
  }

  // neighbors[zone] = [{ neighbor, weight }]
  const neighbors = new Map<string, Array<{ neighbor: string; weight: number }>>();
  for (const zid of zoneIds) {
    neighbors.set(zid, []);
  }
  for (const edge of edges) {
    const a = neighbors.get(edge.sourceZoneId);
    const b = neighbors.get(edge.targetZoneId);
    if (a != null) a.push({ neighbor: edge.targetZoneId, weight: edge.edgeWeight });
    if (b != null) b.push({ neighbor: edge.sourceZoneId, weight: edge.edgeWeight });
  }

  for (let pass = 0; pass < CLUSTER_PASSES; pass++) {
    for (const zid of zoneIds) {
      const nbrs = neighbors.get(zid);
      if (nbrs == null || nbrs.length === 0) continue;
      let best = nbrs[0];
      if (best == null) continue;
      for (let i = 1; i < nbrs.length; i++) {
        const candidate = nbrs[i];
        if (candidate == null) continue;
        if (candidate.weight > best.weight) best = candidate;
      }
      const bestClusterId = clusterOf.get(best.neighbor);
      if (bestClusterId != null) {
        clusterOf.set(zid, bestClusterId);
      }
    }
  }

  // Renumber to contiguous 0..K-1 by first-seen order in zoneIds.
  const remap = new Map<number, number>();
  let nextId = 0;
  const finalClusters = new Map<string, number>();
  for (const zid of zoneIds) {
    const raw = clusterOf.get(zid);
    if (raw == null) continue;
    let mapped = remap.get(raw);
    if (mapped == null) {
      mapped = nextId;
      remap.set(raw, nextId);
      nextId += 1;
    }
    finalClusters.set(zid, mapped);
  }
  return finalClusters;
}

/**
 * Degree centrality: count of edges where zone is source OR target.
 */
export function computeDegreeCentrality(
  zoneIds: readonly string[],
  edges: ReadonlyArray<{ sourceZoneId: string; targetZoneId: string }>,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const zid of zoneIds) result.set(zid, 0);
  for (const edge of edges) {
    result.set(edge.sourceZoneId, (result.get(edge.sourceZoneId) ?? 0) + 1);
    result.set(edge.targetZoneId, (result.get(edge.targetZoneId) ?? 0) + 1);
  }
  return result;
}

/**
 * Closeness centrality approximation: BFS por nodo, sum(1/shortest_path) sobre
 * nodos alcanzables. Isolated node = 0.
 */
export function computeClosenessCentrality(
  zoneIds: readonly string[],
  edges: ReadonlyArray<{ sourceZoneId: string; targetZoneId: string }>,
): Map<string, number> {
  const adj = new Map<string, string[]>();
  for (const zid of zoneIds) adj.set(zid, []);
  for (const edge of edges) {
    const a = adj.get(edge.sourceZoneId);
    const b = adj.get(edge.targetZoneId);
    if (a != null) a.push(edge.targetZoneId);
    if (b != null) b.push(edge.sourceZoneId);
  }

  const result = new Map<string, number>();
  for (const start of zoneIds) {
    const dist = new Map<string, number>();
    dist.set(start, 0);
    const queue: string[] = [start];
    let head = 0;
    while (head < queue.length) {
      const node = queue[head];
      head += 1;
      if (node == null) continue;
      const d = dist.get(node);
      if (d == null) continue;
      const nbrs = adj.get(node);
      if (nbrs == null) continue;
      for (const nb of nbrs) {
        if (!dist.has(nb)) {
          dist.set(nb, d + 1);
          queue.push(nb);
        }
      }
    }
    let sum = 0;
    for (const [node, d] of dist) {
      if (node === start) continue;
      if (d > 0) sum += 1 / d;
    }
    result.set(start, sum);
  }
  return result;
}

/**
 * Approximate PageRank: 10 rondas, damping d=0.85. Undirected: usa degree
 * como out-degree. Normalized so sum ≈ 1. Isolated nodes convergen a 1/N.
 */
export function computeApproximatePageRank(
  zoneIds: readonly string[],
  edges: ReadonlyArray<{ sourceZoneId: string; targetZoneId: string }>,
): Map<string, number> {
  const n = zoneIds.length;
  if (n === 0) return new Map();
  const adj = new Map<string, string[]>();
  const degree = new Map<string, number>();
  for (const zid of zoneIds) {
    adj.set(zid, []);
    degree.set(zid, 0);
  }
  for (const edge of edges) {
    const a = adj.get(edge.sourceZoneId);
    const b = adj.get(edge.targetZoneId);
    if (a != null) a.push(edge.targetZoneId);
    if (b != null) b.push(edge.sourceZoneId);
    degree.set(edge.sourceZoneId, (degree.get(edge.sourceZoneId) ?? 0) + 1);
    degree.set(edge.targetZoneId, (degree.get(edge.targetZoneId) ?? 0) + 1);
  }

  let pr = new Map<string, number>();
  for (const zid of zoneIds) pr.set(zid, 1 / n);

  const teleport = (1 - PAGERANK_DAMPING) / n;
  for (let round = 0; round < PAGERANK_ROUNDS; round++) {
    const next = new Map<string, number>();
    for (const zid of zoneIds) next.set(zid, teleport);
    let danglingMass = 0;
    for (const zid of zoneIds) {
      const deg = degree.get(zid) ?? 0;
      if (deg === 0) {
        danglingMass += pr.get(zid) ?? 0;
      }
    }
    const danglingShare = (PAGERANK_DAMPING * danglingMass) / n;
    for (const zid of zoneIds) {
      next.set(zid, (next.get(zid) ?? 0) + danglingShare);
    }
    for (const zid of zoneIds) {
      const deg = degree.get(zid) ?? 0;
      if (deg === 0) continue;
      const share = (PAGERANK_DAMPING * (pr.get(zid) ?? 0)) / deg;
      const nbrs = adj.get(zid);
      if (nbrs == null) continue;
      for (const nb of nbrs) {
        next.set(nb, (next.get(nb) ?? 0) + share);
      }
    }
    pr = next;
  }

  // Normalize sum to 1 (drift guard).
  let total = 0;
  for (const v of pr.values()) total += v;
  if (total > EPSILON) {
    const normalized = new Map<string, number>();
    for (const [k, v] of pr) normalized.set(k, v / total);
    return normalized;
  }
  return pr;
}

export async function fetchColoniaZones(
  supabase: SupabaseClient<Database>,
  country: string,
): Promise<ZoneRow[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, scope_id, scope_type, country_code, lat, lng')
    .eq('country_code', country)
    .eq('scope_type', SCOPE_TYPE_COLONIA)
    .order('scope_id', { ascending: true });
  if (error) {
    throw new Error(`[compute-constellations-edges] zones fetch: ${error.message}`);
  }
  return (data ?? []) as ZoneRow[];
}

async function fetchAgeDistributions(
  supabase: SupabaseClient<Database>,
  zoneIds: readonly string[],
): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>();
  if (zoneIds.length === 0) return result;
  const { data, error } = await supabase
    .from('inegi_census_zone_stats')
    .select('zone_id, age_distribution, snapshot_date')
    .in('zone_id', zoneIds as string[])
    .order('snapshot_date', { ascending: false });
  if (error || !data) return result;
  for (const row of data) {
    const zid = row.zone_id;
    if (result.has(zid)) continue;
    const parsed = extractAgeDistribution(row.age_distribution);
    if (parsed != null) result.set(zid, parsed);
  }
  return result;
}

async function fetchEconomicProfiles(
  supabase: SupabaseClient<Database>,
  scopeIds: readonly string[],
  country: string,
): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>();
  if (scopeIds.length === 0) return result;
  const { data, error } = await supabase
    .from('dmx_indices')
    .select('scope_id, index_code, value, period_date')
    .in('scope_id', scopeIds as string[])
    .eq('scope_type', SCOPE_TYPE_COLONIA)
    .eq('country_code', country)
    .eq('is_shadow', false)
    .in('index_code', ECONOMIC_CODES as string[])
    .order('period_date', { ascending: false });
  if (error || !data) return result;
  // { scopeId → { code → value } } taking latest per (scope, code)
  const latest = new Map<string, Map<string, number>>();
  for (const row of data) {
    if (typeof row.value !== 'number' || !Number.isFinite(row.value)) continue;
    const code = row.index_code;
    if (!ECONOMIC_CODES.includes(code)) continue;
    let inner = latest.get(row.scope_id);
    if (inner == null) {
      inner = new Map();
      latest.set(row.scope_id, inner);
    }
    if (!inner.has(code)) inner.set(code, row.value);
  }
  for (const [scopeId, inner] of latest) {
    const profile: number[] = [];
    let hasAny = false;
    for (const code of ECONOMIC_CODES) {
      const v = inner.get(code);
      if (v != null) {
        hasAny = true;
        profile.push(v);
      } else {
        profile.push(50); // default neutral 0-100 scale
      }
    }
    if (hasAny) result.set(scopeId, profile);
  }
  return result;
}

async function fetchDnaVectors(
  supabase: SupabaseClient<Database>,
  zoneIds: readonly string[],
): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>();
  if (zoneIds.length === 0) return result;
  const { data, error } = await supabase
    .from('colonia_dna_vectors')
    .select('colonia_id, vector')
    .in('colonia_id', zoneIds as string[]);
  if (error || !data) return result;
  for (const row of data) {
    const parsed = parsePgVector(row.vector, VECTOR_DIM);
    if (parsed != null) result.set(row.colonia_id, parsed);
  }
  return result;
}

export async function buildZoneFeatures(
  supabase: SupabaseClient<Database>,
  zones: readonly ZoneRow[],
  country: string,
): Promise<Map<string, ZoneFeatures>> {
  const zoneIds = zones.map((z) => z.id);
  const scopeIds = zones.map((z) => z.scope_id);
  const [ageDistMap, econMap, dnaMap] = await Promise.all([
    fetchAgeDistributions(supabase, zoneIds),
    fetchEconomicProfiles(supabase, scopeIds, country),
    fetchDnaVectors(supabase, zoneIds),
  ]);
  const out = new Map<string, ZoneFeatures>();
  for (const z of zones) {
    out.set(z.id, {
      zoneId: z.id,
      scopeId: z.scope_id,
      lat: z.lat,
      lng: z.lng,
      ageDistribution: ageDistMap.get(z.id) ?? null,
      economicProfile: econMap.get(z.scope_id) ?? null,
      dnaVector: dnaMap.get(z.id) ?? null,
    });
  }
  return out;
}

/**
 * Computes the 4 edge type weights + composite for a pair (a, b).
 * Does NOT filter by threshold — caller decides.
 */
export function computeEdgeForPair(a: ZoneFeatures, b: ZoneFeatures): EdgeTypes {
  return {
    demographic_flow: demographicFlow(a.ageDistribution, b.ageDistribution),
    economic_complement: economicComplement(a.economicProfile, b.economicProfile),
    cultural_affinity: culturalAffinity(a.dnaVector, b.dnaVector),
    spatial_adjacency: spatialAdjacency(a.lat, a.lng, b.lat, b.lng),
  };
}

/**
 * Generates ordered-pair candidates with source.scope_id < target.scope_id.
 * One direction only → C(n,2) pairs.
 */
export function enumerateOrderedPairs(zones: readonly ZoneRow[]): Array<[ZoneRow, ZoneRow]> {
  const sorted = [...zones].sort((x, y) =>
    x.scope_id < y.scope_id ? -1 : x.scope_id > y.scope_id ? 1 : 0,
  );
  const out: Array<[ZoneRow, ZoneRow]> = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (a == null || b == null) continue;
      out.push([a, b]);
    }
  }
  return out;
}

async function chunkedUpsertEdges(
  supabase: SupabaseClient<Database>,
  rows: readonly EdgeInsert[],
): Promise<{ updated: number; dlq: number }> {
  let updated = 0;
  let dlq = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('zone_constellations_edges')
      .upsert(chunk as EdgeInsert[], {
        onConflict: 'source_colonia_id,target_colonia_id,period_date',
      });
    if (error) {
      dlq += chunk.length;
      console.error(`[compute-constellations-edges] upsert edges chunk fail: ${error.message}`);
    } else {
      updated += chunk.length;
    }
  }
  return { updated, dlq };
}

async function chunkedUpsertClusters(
  supabase: SupabaseClient<Database>,
  rows: readonly ClusterInsert[],
): Promise<{ updated: number; dlq: number }> {
  let updated = 0;
  let dlq = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('zone_constellation_clusters')
      .upsert(chunk as ClusterInsert[], { onConflict: 'zone_id,period_date' });
    if (error) {
      dlq += chunk.length;
      console.error(`[compute-constellations-edges] upsert clusters chunk fail: ${error.message}`);
    } else {
      updated += chunk.length;
    }
  }
  return { updated, dlq };
}

async function chunkedUpsertTopology(
  supabase: SupabaseClient<Database>,
  rows: readonly TopologyInsert[],
): Promise<{ updated: number; dlq: number }> {
  let updated = 0;
  let dlq = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('zone_topology_metrics')
      .upsert(chunk as TopologyInsert[], { onConflict: 'zone_id,snapshot_date' });
    if (error) {
      dlq += chunk.length;
      console.error(`[compute-constellations-edges] upsert topology chunk fail: ${error.message}`);
    } else {
      updated += chunk.length;
    }
  }
  return { updated, dlq };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const tag = '[compute-constellations-edges]';
  console.log(
    `${tag} dryRun=${args.dryRun} country=${args.country} minWeight=${args.minWeight} limitPairs=${args.limitPairs}`,
  );

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const allZones = await fetchColoniaZones(supabase, args.country);
  console.log(`${tag} colonias_matched=${allZones.length}`);

  if (allZones.length === 0) {
    console.warn(`${tag} No hay colonias para country=${args.country}. Exit clean.`);
    return 0;
  }

  const periodDate = new Date().toISOString().slice(0, 10);

  if (args.dryRun) {
    const sampleZones = allZones.slice(0, DRY_RUN_ZONE_LIMIT);
    const features = await buildZoneFeatures(supabase, sampleZones, args.country);
    const pairs = enumerateOrderedPairs(sampleZones);
    console.log(`${tag} DRY sample_zones=${sampleZones.length} candidate_pairs=${pairs.length}`);

    const candidates: EdgeCandidate[] = [];
    for (const [a, b] of pairs) {
      const fa = features.get(a.id);
      const fb = features.get(b.id);
      if (fa == null || fb == null) continue;
      const edgeTypes = computeEdgeForPair(fa, fb);
      const edgeWeight = compositeEdgeWeight(edgeTypes);
      if (edgeWeight >= args.minWeight) {
        candidates.push({
          sourceZoneId: a.id,
          targetZoneId: b.id,
          sourceScopeId: a.scope_id,
          targetScopeId: b.scope_id,
          edgeTypes,
          edgeWeight,
        });
      }
    }
    console.log(`${tag} DRY emitted_edges=${candidates.length}`);
    for (const c of candidates.slice(0, DRY_RUN_EDGE_LOG)) {
      console.log(
        `${tag} DRY edge ${c.sourceScopeId}→${c.targetScopeId} w=${c.edgeWeight.toFixed(4)} types=${JSON.stringify(c.edgeTypes)}`,
      );
    }

    const clusters = assignClusters(
      sampleZones.map((z) => z.id),
      candidates,
    );
    const firstZone = sampleZones[0];
    if (firstZone != null) {
      console.log(
        `${tag} DRY cluster sample zone=${firstZone.scope_id} cluster_id=${clusters.get(firstZone.id)}`,
      );
    }

    const degree = computeDegreeCentrality(
      sampleZones.map((z) => z.id),
      candidates,
    );
    const closeness = computeClosenessCentrality(
      sampleZones.map((z) => z.id),
      candidates,
    );
    const pagerank = computeApproximatePageRank(
      sampleZones.map((z) => z.id),
      candidates,
    );
    if (firstZone != null) {
      console.log(
        `${tag} DRY topology zone=${firstZone.scope_id} degree=${degree.get(firstZone.id)} closeness=${(closeness.get(firstZone.id) ?? 0).toFixed(4)} pagerank=${(pagerank.get(firstZone.id) ?? 0).toFixed(6)}`,
      );
    }

    console.log(`${tag} DRY RUN — no upserts performed`);
    return 0;
  }

  // Real run
  const pairs = enumerateOrderedPairs(allZones);
  console.log(`${tag} candidate_pairs=${pairs.length}`);
  if (pairs.length > args.limitPairs) {
    throw new Error(
      `${tag} candidate pairs=${pairs.length} exceeds cap=${args.limitPairs}. Aborting to protect cost.`,
    );
  }

  const features = await buildZoneFeatures(supabase, allZones, args.country);
  console.log(`${tag} features built for ${features.size} zones`);

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: args.country,
      triggeredBy: 'cli:compute-constellations-edges',
      expectedPeriodicity: 'monthly',
      meta: {
        script: '11_compute-constellations-edges.ts',
        colonias_total: allZones.length,
        min_weight: args.minWeight,
        period_date: periodDate,
        methodology_version: METHODOLOGY_VERSION,
      },
    },
    async () => {
      // 1. Compute edges
      const candidates: EdgeCandidate[] = [];
      for (const [a, b] of pairs) {
        const fa = features.get(a.id);
        const fb = features.get(b.id);
        if (fa == null || fb == null) continue;
        const edgeTypes = computeEdgeForPair(fa, fb);
        const edgeWeight = compositeEdgeWeight(edgeTypes);
        if (edgeWeight >= args.minWeight) {
          candidates.push({
            sourceZoneId: a.id,
            targetZoneId: b.id,
            sourceScopeId: a.scope_id,
            targetScopeId: b.scope_id,
            edgeTypes,
            edgeWeight,
          });
        }
      }
      console.log(`${tag} emitted_edges=${candidates.length}`);
      if (candidates.length > MAX_EMITTED_EDGES) {
        throw new Error(
          `${tag} emitted edges=${candidates.length} exceeds cap=${MAX_EMITTED_EDGES}. Abort.`,
        );
      }

      const edgeRows: EdgeInsert[] = candidates.map((c) => ({
        source_colonia_id: c.sourceZoneId,
        target_colonia_id: c.targetZoneId,
        edge_weight: c.edgeWeight,
        edge_types: c.edgeTypes as unknown as Json,
        period_date: periodDate,
      }));
      const edgeRes = await chunkedUpsertEdges(supabase, edgeRows);
      console.log(`${tag} edges upserted=${edgeRes.updated} dlq=${edgeRes.dlq}`);

      // 2. Cluster assignment
      const zoneIds = allZones.map((z) => z.id);
      const clusters = assignClusters(zoneIds, candidates);
      const clusterRows: ClusterInsert[] = [];
      for (const z of allZones) {
        const cid = clusters.get(z.id);
        if (cid == null) continue;
        clusterRows.push({
          zone_id: z.id,
          cluster_id: cid,
          period_date: periodDate,
        });
      }
      const clusterRes = await chunkedUpsertClusters(supabase, clusterRows);
      console.log(`${tag} clusters upserted=${clusterRes.updated} dlq=${clusterRes.dlq}`);

      // 3. Topology metrics
      const degree = computeDegreeCentrality(zoneIds, candidates);
      const closeness = computeClosenessCentrality(zoneIds, candidates);
      const pagerank = computeApproximatePageRank(zoneIds, candidates);
      const topologyRows: TopologyInsert[] = [];
      for (const z of allZones) {
        const deg = degree.get(z.id) ?? 0;
        const close = closeness.get(z.id) ?? 0;
        const pr = pagerank.get(z.id) ?? 0;
        const components: Record<string, Json> = {
          neighbor_count: deg,
          has_edges: deg > 0,
          algorithm: 'pagerank_iter10_damping0.85',
        };
        topologyRows.push({
          zone_id: z.id,
          snapshot_date: periodDate,
          degree_centrality: deg,
          closeness_centrality: close,
          approximate_pagerank: pr,
          components: components as unknown as Json,
        });
      }
      const topoRes = await chunkedUpsertTopology(supabase, topologyRows);
      console.log(`${tag} topology upserted=${topoRes.updated} dlq=${topoRes.dlq}`);

      const totalUpdated = edgeRes.updated + clusterRes.updated + topoRes.updated;
      const totalDlq = edgeRes.dlq + clusterRes.dlq + topoRes.dlq;

      return {
        counts: { inserted: 0, updated: totalUpdated, skipped: 0, dlq: totalDlq },
        lastSuccessfulPeriodEnd: periodDate,
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
      console.error('[compute-constellations-edges] FATAL:', err);
      process.exit(1);
    });
}
