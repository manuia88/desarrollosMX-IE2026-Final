// BLOQUE 11.R.4 (U13) — Contagion paths Ghost × Constellations.
//
// Query on-demand (DECIDIDO: sin cache persistente H1): revela cómo el
// hype se propaga. Para cada top N ghost zones (ghost_score alto), busca
// neighbor de mayor edge_weight que sea una zona REAL (ghost_score bajo).
// El pair (ghost → real) muestra riesgo de contagio — zonas reales
// potencialmente infectadas por hype de vecinas.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContagionPath } from '@/features/constellations/types';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import type { Database } from '@/shared/types/database';

const GHOST_HIGH_THRESHOLD = 60; // over_hyped (coincide con ghost-engine)
const GHOST_LOW_THRESHOLD = 30; // sub_valued / aligned bajo
const DEFAULT_TOP_N = 5;

export interface FindContagionPathsParams {
  readonly topN?: number;
  readonly periodDate?: string;
  readonly countryCode?: string;
  readonly supabase: SupabaseClient<Database>;
}

export async function findContagionPaths(
  params: FindContagionPathsParams,
): Promise<ContagionPath[]> {
  const { supabase } = params;
  const countryCode = params.countryCode ?? 'MX';
  const topN = params.topN ?? DEFAULT_TOP_N;

  // 1. Fetch top N ghost zones (high ghost_score, current period).
  const { data: ghostRows } = await supabase
    .from('ghost_zones_ranking')
    .select('colonia_id, ghost_score, period_date')
    .eq('country_code', countryCode)
    .gte('ghost_score', GHOST_HIGH_THRESHOLD)
    .order('period_date', { ascending: false })
    .order('ghost_score', { ascending: false })
    .limit(topN * 5);

  if (!ghostRows || ghostRows.length === 0) return [];

  let maxPeriod = '';
  for (const r of ghostRows) {
    if (typeof r.period_date === 'string' && r.period_date > maxPeriod) maxPeriod = r.period_date;
  }
  const topGhostIds = ghostRows
    .filter((r) => r.period_date === maxPeriod)
    .slice(0, topN)
    .map((r) => r.colonia_id)
    .filter((x): x is string => typeof x === 'string');

  if (topGhostIds.length === 0) return [];

  // 2. For each ghost, fetch strongest constellation edges.
  const edgesPeriod = params.periodDate ?? maxPeriod;
  const { data: edges } = await supabase
    .from('zone_constellations_edges')
    .select('source_colonia_id, target_colonia_id, edge_weight')
    .in('source_colonia_id', topGhostIds)
    .eq('period_date', edgesPeriod)
    .order('edge_weight', { ascending: false });

  if (!edges || edges.length === 0) return [];

  // 3. Fetch ghost_score de todos los targets para identificar "real zones".
  const targetIds = Array.from(
    new Set(
      edges.map((e) => e.target_colonia_id).filter((x): x is string => typeof x === 'string'),
    ),
  );
  if (targetIds.length === 0) return [];

  const { data: targetGhostRows } = await supabase
    .from('ghost_zones_ranking')
    .select('colonia_id, ghost_score, period_date')
    .eq('country_code', countryCode)
    .in('colonia_id', targetIds)
    .eq('period_date', maxPeriod);

  const targetGhostScore = new Map<string, number>();
  for (const r of targetGhostRows ?? []) {
    if (typeof r.colonia_id === 'string' && typeof r.ghost_score === 'number') {
      targetGhostScore.set(r.colonia_id, r.ghost_score);
    }
  }

  // 4. Build contagion pairs (ghost → real).
  const pairs: Array<{
    ghostSource: string;
    realTarget: string;
    pathWeight: number;
  }> = [];
  const usedSources = new Set<string>();
  for (const e of edges) {
    const source = e.source_colonia_id;
    const target = e.target_colonia_id;
    if (typeof source !== 'string' || typeof target !== 'string') continue;
    if (usedSources.has(source)) continue; // 1 pair per ghost source (strongest).
    const targetGhost = targetGhostScore.get(target);
    if (typeof targetGhost !== 'number' || targetGhost >= GHOST_LOW_THRESHOLD) continue;
    pairs.push({
      ghostSource: source,
      realTarget: target,
      pathWeight: typeof e.edge_weight === 'number' ? e.edge_weight : 0,
    });
    usedSources.add(source);
  }

  if (pairs.length === 0) return [];

  // 5. Resolve labels.
  const uniqueIds = Array.from(new Set(pairs.flatMap((p) => [p.ghostSource, p.realTarget])));
  const labelEntries = await Promise.all(
    uniqueIds.map(async (zid) => {
      const label = await resolveZoneLabel({
        scopeType: 'colonia',
        scopeId: zid,
        countryCode,
        supabase,
      }).catch(() => null);
      return [zid, label] as const;
    }),
  );
  const labels = new Map<string, string | null>(labelEntries);

  return pairs.map((p) => ({
    ghost_source: {
      zone_id: p.ghostSource,
      zone_label: labels.get(p.ghostSource) ?? null,
    },
    real_target: {
      zone_id: p.realTarget,
      zone_label: labels.get(p.realTarget) ?? null,
    },
    path_weight: p.pathWeight,
    hops: 1,
  }));
}
