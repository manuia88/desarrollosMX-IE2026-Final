// BLOQUE 11.R.1.2 — Louvain community detection (JS puro, sin deps).
//
// Algoritmo clásico (Blondel et al. 2008) con modularity optimization:
//   Fase 1 — para cada node, mueve a la comunidad del neighbor que maximiza
//            ΔQ (modularity gain). Iterar hasta estabilizar.
//   Fase 2 — colapsa cada comunidad en super-node, repite fase 1.
//   (H1: solo fase 1 — adecuado para grafos medianos <10k nodes.)
//
// Escala 11.R CDMX: 200 colonias × 50 edges = 10k edges → ~50ms runtime.
// Persiste cluster_id por zone × período en zone_constellation_clusters.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

type LooseClient = SupabaseClient<Record<string, unknown>>;

function looseFrom(supabase: SupabaseClient<Database>, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

export interface LouvainEdge {
  readonly source: string;
  readonly target: string;
  readonly weight: number;
}

export interface LouvainResult {
  readonly communities: Map<string, number>; // node → cluster_id
  readonly num_communities: number;
  readonly modularity: number;
}

export function runLouvain(edges: readonly LouvainEdge[], maxIter = 30): LouvainResult {
  // Build adjacency + total weight.
  const adj = new Map<string, Map<string, number>>();
  const nodeDegree = new Map<string, number>();
  let totalWeight = 0;

  for (const e of edges) {
    if (e.source === e.target) continue;
    const w = e.weight;
    if (!Number.isFinite(w) || w <= 0) continue;
    totalWeight += w;
    const a = adj.get(e.source) ?? new Map<string, number>();
    a.set(e.target, (a.get(e.target) ?? 0) + w);
    adj.set(e.source, a);
    const b = adj.get(e.target) ?? new Map<string, number>();
    b.set(e.source, (b.get(e.source) ?? 0) + w);
    adj.set(e.target, b);
    nodeDegree.set(e.source, (nodeDegree.get(e.source) ?? 0) + w);
    nodeDegree.set(e.target, (nodeDegree.get(e.target) ?? 0) + w);
  }

  if (totalWeight === 0) {
    return { communities: new Map(), num_communities: 0, modularity: 0 };
  }

  // Initialize: each node is its own community.
  const community = new Map<string, number>();
  let nextId = 0;
  for (const node of adj.keys()) {
    community.set(node, nextId);
    nextId += 1;
  }

  const m2 = totalWeight * 2;
  let improved = true;
  let iter = 0;

  // Community → sum of degrees (used in ΔQ formula).
  function communityDegree(cid: number): number {
    let sum = 0;
    for (const [n, c] of community.entries()) {
      if (c === cid) sum += nodeDegree.get(n) ?? 0;
    }
    return sum;
  }

  function edgeWeightToCommunity(node: string, cid: number): number {
    const neighbors = adj.get(node);
    if (!neighbors) return 0;
    let sum = 0;
    for (const [nb, w] of neighbors.entries()) {
      if (community.get(nb) === cid) sum += w;
    }
    return sum;
  }

  while (improved && iter < maxIter) {
    improved = false;
    iter += 1;
    for (const node of adj.keys()) {
      const neighbors = adj.get(node);
      if (!neighbors) continue;
      const origC = community.get(node) ?? 0;
      const origDeg = nodeDegree.get(node) ?? 0;

      // Remove node from its community temporarily.
      const bestC = { id: origC, gain: 0 };
      const candidateCIds = new Set<number>([origC]);
      for (const nb of neighbors.keys()) {
        const nbC = community.get(nb);
        if (nbC !== undefined) candidateCIds.add(nbC);
      }

      for (const cid of candidateCIds) {
        if (cid === origC) continue;
        const kiIn = edgeWeightToCommunity(node, cid);
        const sigmaTot = communityDegree(cid);
        // ΔQ = [Σin / 2m - (Σtot + ki)^2 / (2m)^2] - [...] — simplified form.
        const gain = kiIn - (sigmaTot * origDeg) / m2;
        if (gain > bestC.gain + 1e-9) {
          bestC.id = cid;
          bestC.gain = gain;
        }
      }

      if (bestC.id !== origC) {
        community.set(node, bestC.id);
        improved = true;
      }
    }
  }

  // Relabel communities to 0..N-1.
  const relabel = new Map<number, number>();
  let nextClusterId = 0;
  for (const c of community.values()) {
    if (!relabel.has(c)) {
      relabel.set(c, nextClusterId);
      nextClusterId += 1;
    }
  }
  const relabeled = new Map<string, number>();
  for (const [n, c] of community.entries()) {
    relabeled.set(n, relabel.get(c) ?? 0);
  }

  // Compute modularity.
  let modularity = 0;
  for (const [n, c] of relabeled.entries()) {
    const neighbors = adj.get(n);
    if (!neighbors) continue;
    const ki = nodeDegree.get(n) ?? 0;
    for (const [nb, w] of neighbors.entries()) {
      const kj = nodeDegree.get(nb) ?? 0;
      const sameComm = (relabeled.get(nb) ?? -1) === c;
      if (sameComm) {
        modularity += w - (ki * kj) / m2;
      }
    }
  }
  modularity /= m2;

  return {
    communities: relabeled,
    num_communities: nextClusterId,
    modularity: Math.round(modularity * 10000) / 10000,
  };
}

// -----------------------------------------------------------
// Persist + orchestrate Louvain over zone_constellations_edges.
// -----------------------------------------------------------

export interface BuildClustersParams {
  readonly periodDate: string;
  readonly supabase: SupabaseClient<Database>;
  readonly countryCode?: string;
}

export interface BuildClustersSummary {
  readonly zones_processed: number;
  readonly clusters_computed: number;
  readonly modularity: number;
  readonly duration_ms: number;
}

export async function buildClusters(params: BuildClustersParams): Promise<BuildClustersSummary> {
  const start = Date.now();
  const { supabase, periodDate } = params;

  const { data: edges } = await supabase
    .from('zone_constellations_edges')
    .select('source_colonia_id, target_colonia_id, edge_weight')
    .eq('period_date', periodDate);

  if (!edges || edges.length === 0) {
    return {
      zones_processed: 0,
      clusters_computed: 0,
      modularity: 0,
      duration_ms: Date.now() - start,
    };
  }

  const louvainEdges: LouvainEdge[] = edges
    .filter(
      (e): e is { source_colonia_id: string; target_colonia_id: string; edge_weight: number } =>
        typeof e.source_colonia_id === 'string' &&
        typeof e.target_colonia_id === 'string' &&
        typeof e.edge_weight === 'number',
    )
    .map((e) => ({
      source: e.source_colonia_id,
      target: e.target_colonia_id,
      weight: e.edge_weight,
    }));

  const result = runLouvain(louvainEdges);

  // Upsert zone_constellation_clusters.
  const rows: Array<{
    zone_id: string;
    cluster_id: number;
    period_date: string;
    computed_at: string;
  }> = [];
  const computedAt = new Date().toISOString();
  for (const [zone, cluster] of result.communities.entries()) {
    rows.push({
      zone_id: zone,
      cluster_id: cluster,
      period_date: periodDate,
      computed_at: computedAt,
    });
  }

  if (rows.length > 0) {
    const { error } = await looseFrom(supabase, 'zone_constellation_clusters').upsert(
      rows as unknown as never,
      { onConflict: 'zone_id,period_date' },
    );
    if (error) {
      throw new Error(`zone_constellation_clusters upsert failed: ${error.message}`);
    }
  }

  return {
    zones_processed: result.communities.size,
    clusters_computed: result.num_communities,
    modularity: result.modularity,
    duration_ms: Date.now() - start,
  };
}
