// Shared contracts para Zone Constellations (BLOQUE 11.R).
// "LinkedIn Network de zonas" — grafo multi-tipo de relaciones entre
// colonias: migration (11.G) + climate_twin (11.P) + genoma_similarity (11.M)
// + pulse_correlation (11.F). Louvain clusters + BFS path finder +
// contagion paths Ghost×Constellations + correlation boost Futures.
//
// Persiste en:
//   public.zone_constellations_edges    — schema-native (existente)
//   public.zone_constellation_clusters  — nueva 11.R.-1.2
//
// H1 methodology heuristic_v1 reemplazable FASE 12+ sin cambio schema.

export const CONSTELLATION_METHODOLOGY_HEURISTIC = 'heuristic_v1' as const;

export const EDGE_TYPES = [
  'migration',
  'climate_twin',
  'genoma_similarity',
  'pulse_correlation',
] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

export const EDGE_TYPE_DEFAULT_WEIGHTS = {
  migration: 0.3,
  climate_twin: 0.15,
  genoma_similarity: 0.3,
  pulse_correlation: 0.25,
} as const;

export const EDGE_WEIGHT_MIN_PERSIST = 30 as const;

export interface EdgeTypeBreakdown {
  readonly migration: number; // 0..100
  readonly climate_twin: number;
  readonly genoma_similarity: number;
  readonly pulse_correlation: number;
}

export interface ConstellationEdge {
  readonly source_colonia_id: string;
  readonly target_colonia_id: string;
  readonly target_label: string | null;
  readonly edge_weight: number; // 0..100 weighted avg
  readonly edge_types: EdgeTypeBreakdown;
  readonly period_date: string;
}

export interface ConstellationClusterMember {
  readonly zone_id: string;
  readonly zone_label: string | null;
}

export interface ConstellationCluster {
  readonly cluster_id: number;
  readonly period_date: string;
  readonly members: readonly ConstellationClusterMember[];
  readonly size: number;
}

export interface PathResult {
  readonly nodes: readonly { readonly zone_id: string; readonly zone_label: string | null }[];
  readonly edges: readonly {
    readonly source_colonia_id: string;
    readonly target_colonia_id: string;
    readonly edge_weight: number;
  }[];
  readonly total_weight: number;
  readonly hops: number;
  readonly found: boolean;
}

export interface ContagionPath {
  readonly ghost_source: { readonly zone_id: string; readonly zone_label: string | null };
  readonly real_target: { readonly zone_id: string; readonly zone_label: string | null };
  readonly path_weight: number;
  readonly hops: number;
}

export interface BuildConstellationBatchSummary {
  readonly zones_processed: number;
  readonly edges_upserted: number;
  readonly clusters_computed: number;
  readonly failures: number;
  readonly duration_ms: number;
}
