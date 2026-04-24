// BLOQUE 11.R.1.3 — Path finder BFS (U7).
//
// Encuentra shortest path entre 2 colonias sobre zone_constellations_edges
// del período current. Breadth-first para minimizar hops; empata por
// total_weight (suma de edge_weight en el path).
//
// maxHops default 5 — paths más largos son ruido en 10k edges grafo.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PathResult } from '@/features/constellations/types';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import type { Database } from '@/shared/types/database';

export interface FindPathParams {
  readonly sourceColoniaId: string;
  readonly targetColoniaId: string;
  readonly maxHops?: number;
  readonly periodDate?: string;
  readonly countryCode?: string;
  readonly supabase: SupabaseClient<Database>;
}

interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly weight: number;
}

function buildAdjacency(
  edges: readonly GraphEdge[],
): Map<string, Array<{ node: string; weight: number }>> {
  const adj = new Map<string, Array<{ node: string; weight: number }>>();
  for (const e of edges) {
    if (e.source === e.target) continue;
    const a = adj.get(e.source) ?? [];
    a.push({ node: e.target, weight: e.weight });
    adj.set(e.source, a);
    // Treat edges as undirected for path finding.
    const b = adj.get(e.target) ?? [];
    b.push({ node: e.source, weight: e.weight });
    adj.set(e.target, b);
  }
  return adj;
}

export async function findPath(params: FindPathParams): Promise<PathResult> {
  const { sourceColoniaId, targetColoniaId, supabase } = params;
  const countryCode = params.countryCode ?? 'MX';
  const maxHops = params.maxHops ?? 5;

  const emptyResult: PathResult = {
    nodes: [],
    edges: [],
    total_weight: 0,
    hops: 0,
    found: false,
  };

  if (sourceColoniaId === targetColoniaId) {
    const label = await resolveZoneLabel({
      scopeType: 'colonia',
      scopeId: sourceColoniaId,
      countryCode,
      supabase,
    }).catch(() => null);
    return {
      nodes: [{ zone_id: sourceColoniaId, zone_label: label }],
      edges: [],
      total_weight: 0,
      hops: 0,
      found: true,
    };
  }

  // Fetch edges del período (most recent si no especificado).
  let query = supabase
    .from('zone_constellations_edges')
    .select('source_colonia_id, target_colonia_id, edge_weight, period_date')
    .order('period_date', { ascending: false });
  if (params.periodDate) {
    query = query.eq('period_date', params.periodDate);
  }
  const { data } = await query.limit(20_000);
  if (!data || data.length === 0) return emptyResult;

  // Restrict to most recent period if none specified.
  let maxPeriod = '';
  for (const r of data) {
    if (typeof r.period_date === 'string' && r.period_date > maxPeriod) maxPeriod = r.period_date;
  }
  const filtered = params.periodDate ? data : data.filter((r) => r.period_date === maxPeriod);

  const graphEdges: GraphEdge[] = filtered
    .filter(
      (
        e,
      ): e is {
        source_colonia_id: string;
        target_colonia_id: string;
        edge_weight: number;
        period_date: string;
      } =>
        typeof e.source_colonia_id === 'string' &&
        typeof e.target_colonia_id === 'string' &&
        typeof e.edge_weight === 'number',
    )
    .map((e) => ({
      source: e.source_colonia_id,
      target: e.target_colonia_id,
      weight: e.edge_weight,
    }));
  const adj = buildAdjacency(graphEdges);

  // BFS.
  const visited = new Set<string>([sourceColoniaId]);
  const parent = new Map<string, { prev: string; weight: number }>();
  const queue: Array<{ node: string; hops: number }> = [{ node: sourceColoniaId, hops: 0 }];
  let found = false;

  while (queue.length > 0) {
    const curr = queue.shift();
    if (!curr) break;
    if (curr.hops >= maxHops) continue;
    const neighbors = adj.get(curr.node) ?? [];
    for (const n of neighbors) {
      if (visited.has(n.node)) continue;
      visited.add(n.node);
      parent.set(n.node, { prev: curr.node, weight: n.weight });
      if (n.node === targetColoniaId) {
        found = true;
        queue.length = 0;
        break;
      }
      queue.push({ node: n.node, hops: curr.hops + 1 });
    }
  }

  if (!found) return emptyResult;

  // Reconstruct path.
  const pathNodes: string[] = [targetColoniaId];
  const pathEdges: Array<{
    source_colonia_id: string;
    target_colonia_id: string;
    edge_weight: number;
  }> = [];
  let curr = targetColoniaId;
  let totalWeight = 0;
  while (curr !== sourceColoniaId) {
    const p = parent.get(curr);
    if (!p) break;
    pathEdges.push({
      source_colonia_id: p.prev,
      target_colonia_id: curr,
      edge_weight: p.weight,
    });
    totalWeight += p.weight;
    pathNodes.push(p.prev);
    curr = p.prev;
  }
  pathNodes.reverse();
  pathEdges.reverse();

  const labels = await Promise.all(
    pathNodes.map((zid) =>
      resolveZoneLabel({
        scopeType: 'colonia',
        scopeId: zid,
        countryCode,
        supabase,
      }).catch(() => null),
    ),
  );

  return {
    nodes: pathNodes.map((zid, idx) => ({ zone_id: zid, zone_label: labels[idx] ?? null })),
    edges: pathEdges,
    total_weight: Math.round(totalWeight * 100) / 100,
    hops: pathEdges.length,
    found: true,
  };
}
