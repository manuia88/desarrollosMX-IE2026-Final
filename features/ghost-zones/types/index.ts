// Shared contracts for the Ghost Zones feature (BLOQUE 11.Q).
// Used by ghost engine, tRPC router, ranking + timeline UI, LifePath badge
// cross-function, and tests.
//
// Ghost Zones = "Rotten Tomatoes del real estate" — detecta colonias
// sobre-hypeadas (high buzz · low DMX fundamentals) o sub-valoradas.
// Stub H1 determinístico hash-based (FNV-1a) para search_volume +
// press_mentions. Reemplazable FASE 13 por ingestion real (L-NN).
//
// Persiste en public.ghost_zones_ranking (ya existente — schema-native).

export const GHOST_METHODOLOGY_HEURISTIC = 'heuristic_v1' as const;

export const GHOST_COMPONENT_WEIGHTS = {
  search: 0.4,
  press: 0.3,
  dmx_gap: 0.3,
} as const;

export const HYPE_HALVING_THRESHOLD = 3 as const;

export interface GhostScoreBreakdown {
  readonly search_component: number; // 0..100
  readonly press_component: number; // 0..100
  readonly dmx_gap_component: number; // 0..100
}

export type HypeLevel = 'sub_valued' | 'aligned' | 'over_hyped' | 'extreme_hype';

export interface GhostZoneRanking {
  readonly colonia_id: string;
  readonly colonia_label: string | null;
  readonly country_code: string;
  readonly period_date: string;
  readonly ghost_score: number; // 0..100
  readonly rank: number | null;
  readonly search_volume: number;
  readonly press_mentions: number;
  readonly score_total: number | null; // DMX fundamentals avg (for UI transparency)
  readonly breakdown: GhostScoreBreakdown;
  readonly hype_level: HypeLevel;
  readonly hype_halving_warning: boolean;
  readonly calculated_at: string;
}

export interface GhostTimelinePoint {
  readonly period_date: string;
  readonly ghost_score: number;
  readonly search_volume: number;
  readonly press_mentions: number;
  readonly breakdown: GhostScoreBreakdown;
}

export interface ComputeGhostScoreOptions {
  readonly coloniaId: string;
  readonly periodDate: string;
  readonly countryCode?: string;
}

export interface BuildGhostZonesBatchSummary {
  readonly zones_processed: number;
  readonly rows_upserted: number;
  readonly failures: number;
  readonly duration_ms: number;
}
