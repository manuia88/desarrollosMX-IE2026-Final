// Shared contracts for the Migration Flow feature (BLOQUE 11.G).
// Used by ingestion adapters (shared/lib/intelligence-engine/sources/migration-signals.ts),
// aggregator (shared/lib/intelligence-engine/calculators/migration/flow-aggregator.ts),
// tRPC router (server/trpc/routers/migration-flow.ts), and UI (features/migration-flow/).
//
// Migration Flow mide "de dónde a dónde se mueven" los mexicanos entre zonas
// combinando:
//   - RPP escrituras (PRIMARIA, domicilio anterior del comprador) ~35% conf
//   - INEGI ENADID (H1 stub — integración real H2)
//   - INE cambios credencial (H1 stub)
//   - LinkedIn perfiles (H1 stub — Apify actor H2)
//
// Persiste en public.zone_migration_flows (migration 20260421100000).

export type MigrationScopeType = 'colonia' | 'alcaldia' | 'city' | 'estado';
export type MigrationDirection = 'inflow' | 'outflow';

export const MIGRATION_SOURCE_KEYS = ['rpp', 'inegi', 'ine', 'linkedin'] as const;
export type MigrationSourceKey = (typeof MIGRATION_SOURCE_KEYS)[number];

// Peso de confidence por fuente (0..1). RPP es la única fuente real H1;
// los 3 stubs están en 0 hasta H2 integration.
export const MIGRATION_SOURCE_CONFIDENCE: Readonly<Record<MigrationSourceKey, number>> = {
  rpp: 0.35,
  inegi: 0,
  ine: 0,
  linkedin: 0,
} as const;

// source_mix jsonb persistido en BD — desglose de volumen por fuente.
export interface MigrationSourceMix extends Record<string, unknown> {
  readonly rpp: number;
  readonly inegi: number;
  readonly ine: number;
  readonly linkedin: number;
}

export interface MigrationFlowRow {
  readonly id: string;
  readonly origin_scope_type: MigrationScopeType;
  readonly origin_scope_id: string;
  readonly dest_scope_type: MigrationScopeType;
  readonly dest_scope_id: string;
  readonly country_code: string;
  readonly period_date: string;
  readonly volume: number;
  readonly confidence: number | null; // 0..100
  readonly source_mix: MigrationSourceMix;
  readonly income_decile_origin: number | null;
  readonly income_decile_dest: number | null;
  readonly calculated_at: string;
}

// Signal bundle retornado por cada adaptador de sources/migration-signals.ts.
// Una tupla origen→destino con volume y confidence aportada por esa fuente.
export interface MigrationFlowSignal {
  readonly origin_scope_type: MigrationScopeType;
  readonly origin_scope_id: string;
  readonly dest_scope_type: MigrationScopeType;
  readonly dest_scope_id: string;
  readonly volume: number;
  readonly confidence: number; // 0..1 aportado por esta fuente
  readonly source: MigrationSourceKey;
}

// Resultado del merge-by-pair del aggregator antes de persistir.
export interface MigrationFlowAggregate {
  readonly origin_scope_type: MigrationScopeType;
  readonly origin_scope_id: string;
  readonly dest_scope_type: MigrationScopeType;
  readonly dest_scope_id: string;
  readonly volume: number;
  readonly confidence: number; // 0..100 ponderado
  readonly source_mix: MigrationSourceMix;
  readonly income_decile_origin: number | null;
  readonly income_decile_dest: number | null;
  readonly sources_available: number; // 0..4
}

// Summary del batch aggregator (análogo a CDMXBatchSummary).
export interface MigrationFlowBatchSummary {
  readonly scopes_processed: number;
  readonly flows_upserted: number;
  readonly failures: number;
  readonly sources_real: readonly MigrationSourceKey[];
  readonly sources_stub: readonly MigrationSourceKey[];
  readonly duration_ms: number;
}

// Public row for UI + tRPC responses — combina row BD con metadata UI-friendly.
export interface MigrationFlowPublicRow {
  readonly origin_scope_type: MigrationScopeType;
  readonly origin_scope_id: string;
  readonly dest_scope_type: MigrationScopeType;
  readonly dest_scope_id: string;
  readonly country_code: string;
  readonly period_date: string;
  readonly volume: number;
  readonly confidence: number | null;
  readonly source_mix: MigrationSourceMix;
  readonly income_decile_origin: number | null;
  readonly income_decile_dest: number | null;
}

export interface MigrationFlowMapPoint {
  readonly origin_scope_id: string;
  readonly dest_scope_id: string;
  readonly origin_centroid: readonly [number, number] | null;
  readonly dest_centroid: readonly [number, number] | null;
  readonly volume: number;
  readonly income_decile_origin: number | null;
  readonly income_decile_dest: number | null;
}
