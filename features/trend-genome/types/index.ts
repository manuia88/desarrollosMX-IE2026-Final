// Shared contracts for the Trend Genome feature (BLOQUE 11.H).
// Consumed by:
//   - Ingestion adapters (shared/lib/intelligence-engine/sources/instagram-apify.ts,
//     denue-alpha-classifier.ts)
//   - Algorithm (shared/lib/intelligence-engine/calculators/alpha/trend-genome.ts)
//   - Alerts engine (shared/lib/intelligence-engine/calculators/alpha/alerts-engine.ts)
//   - tRPC router (server/trpc/routers/trend-genome.ts)
//   - UI (features/trend-genome/)
//
// Trend Genome detecta "zonas alpha" 12-18 meses antes de que suban precios
// mainstream, combinando señales débiles tempranas:
//   - Instagram geo-tags públicos (chefs, galerías, creators) via Apify — 30%
//   - DENUE aperturas alpha 6m (cafés especialidad, galerías, fine dining) — 25%
//   - Migration inflow high-income decile ≥7 (desde 11.G) — 20%
//   - Price velocity 6m invertido (precios aún bajos = oportunidad) — 15%
//   - Search volume growth (stub H1 — Google Trends H2) — 10%
//
// Persiste en:
//   - public.zone_alpha_alerts (score + time_to_mainstream + signals jsonb)
//   - public.influencer_heat_zones (raw Instagram agregado, sin PII)

export type AlphaScopeType = 'colonia' | 'alcaldia' | 'city' | 'estado';

// ---------------- Signal sources ----------------

export const ALPHA_SIGNAL_KEYS = [
  'instagram_heat',
  'denue_alpha',
  'migration_inflow',
  'price_velocity_inv',
  'search_volume',
] as const;
export type AlphaSignalKey = (typeof ALPHA_SIGNAL_KEYS)[number];

// Peso por signal. Suman 1.0. Documentado en ADR-027 + 03.8_CATALOGO.
export const ALPHA_SIGNAL_WEIGHTS: Readonly<Record<AlphaSignalKey, number>> = {
  instagram_heat: 0.3,
  denue_alpha: 0.25,
  migration_inflow: 0.2,
  price_velocity_inv: 0.15,
  search_volume: 0.1,
} as const;

// ---------------- Instagram (ADR-027 compliance) ----------------

// Raw bundle del adapter Instagram Apify. Handles ya vienen HASHEADOS
// (sha256 sin reversible). Jamás persistir plaintext.
export interface InstagramHeatSignals {
  readonly chef_count: number;
  readonly gallery_count: number;
  readonly creator_count: number;
  readonly specialty_cafe_count: number;
  readonly raw_handles_hashed: readonly string[];
  readonly source_confidence: number; // 0..1
  readonly limitation: string | null;
}

// ---------------- DENUE alpha ----------------

// Diccionario alpha SCIAN — categorías que marcan gentrificación temprana.
export const DENUE_ALPHA_KEYWORDS: readonly string[] = [
  'café especialidad',
  'especialidad',
  'galería arte',
  'galería',
  'restaurante internacional',
  'fine dining',
  'coworking',
  'estudio yoga',
  'restaurante vegano',
  'vegano',
  'slow coffee',
  'bookstore independiente',
  'librería independiente',
  'boutique artesanal',
] as const;

export interface DenueAlphaSignals {
  readonly specialty_cafe_count: number;
  readonly gallery_count: number;
  readonly boutique_count: number;
  readonly total_alpha_openings_6m: number;
  readonly sample_names: readonly string[];
  readonly source_confidence: number; // 0..1
  readonly limitation: string | null;
}

// ---------------- Trend Genome result ----------------

export type AlphaConfidence = 'high' | 'medium' | 'low' | 'insufficient_data';

// Breakdown por fuente — qué % del score viene de cada signal (UPGRADE #3
// transparencia). Usado en AlphaZoneCard.
export interface AlphaSignalBreakdown {
  readonly key: AlphaSignalKey;
  readonly raw_value: number | null; // valor raw de la fuente
  readonly normalized_0_100: number | null;
  readonly weight: number; // peso del signal en el score
  readonly contribution_pct: number; // % del score final que aporta esta fuente
  readonly available: boolean;
  readonly source: string;
}

// Golden opportunity flag (UPGRADE #6 cross-pulse): alpha_score ≥75 con
// pulse_score (11.F) >80.
// Confirmed alpha (UPGRADE #5 cross-migration): alpha_score ≥75 con migration
// inflow decile ≥7.
export type AlphaTier = 'confirmed' | 'speculative' | 'golden_opportunity' | 'watchlist';

export interface AlphaGenomeComponents extends Record<string, unknown> {
  readonly instagram_heat: AlphaSignalBreakdown;
  readonly denue_alpha: AlphaSignalBreakdown;
  readonly migration_inflow: AlphaSignalBreakdown;
  readonly price_velocity_inv: AlphaSignalBreakdown;
  readonly search_volume: AlphaSignalBreakdown;
  readonly data_sources_available: number; // 0..5
  readonly coverage_pct: number;
  readonly tier: AlphaTier;
  readonly migration_inflow_decile: number | null;
  readonly pulse_score: number | null;
}

export interface AlphaComputeResult {
  readonly alpha_score: number; // 0..100 rounded
  readonly time_to_mainstream_months: number | null; // 6|12|18|null
  readonly confidence: AlphaConfidence;
  readonly components: AlphaGenomeComponents;
  readonly signals_jsonb: Record<string, unknown>; // para persist en zone_alpha_alerts.signals
}

// ---------------- Persistence rows ----------------

// Row de public.zone_alpha_alerts (migration 20260421100000).
export interface ZoneAlphaAlertRow {
  readonly id: string;
  readonly zone_id: string;
  readonly scope_type: AlphaScopeType;
  readonly country_code: string;
  readonly alpha_score: number;
  readonly time_to_mainstream_months: number | null;
  readonly signals: Record<string, unknown>;
  readonly detected_at: string;
  readonly subscribers_notified: number;
  readonly is_active: boolean;
}

// Row de public.influencer_heat_zones (migration 20260421100000).
// NOTA: raw_handles_hashed NO está en la tabla — hash lives en sources jsonb
// si debug necesario. Compliance ADR-027: no persistir PII.
export interface InfluencerHeatRow {
  readonly id: string;
  readonly zone_id: string;
  readonly scope_type: AlphaScopeType;
  readonly country_code: string;
  readonly period_date: string;
  readonly chef_count: number;
  readonly gallery_count: number;
  readonly creator_count: number;
  readonly specialty_cafe_count: number;
  readonly heat_score: number | null;
  readonly sources: Record<string, unknown>;
  readonly calculated_at: string;
}

// ---------------- Public UI row (tRPC response) ----------------

export interface AlphaZonePublicRow {
  readonly zone_id: string;
  readonly scope_type: AlphaScopeType;
  readonly country_code: string;
  readonly alpha_score: number;
  readonly time_to_mainstream_months: number | null;
  readonly tier: AlphaTier;
  readonly detected_at: string;
  readonly signals_breakdown: AlphaGenomeComponents;
  readonly needs_review: boolean;
}

// Teaser público — solo count, sin detalle (moat preservation).
export interface AlphaCountTeaser {
  readonly country_code: string;
  readonly total_alpha_zones: number;
  readonly confirmed_count: number;
  readonly golden_opportunity_count: number;
  readonly last_updated_at: string | null;
}

// ---------------- Batch orchestrator summary ----------------

export interface TrendGenomeBatchSummary {
  readonly zones_processed: number;
  readonly alphas_detected: number;
  readonly alerts_triggered: number;
  readonly failures: number;
  readonly sources_real: readonly string[];
  readonly sources_stub: readonly string[];
  readonly duration_ms: number;
}

// ---------------- Alert detection (UPGRADE #1 drift) ----------------

export interface AlphaAlertDetection {
  readonly zone_id: string;
  readonly scope_type: AlphaScopeType;
  readonly alpha_score: number;
  readonly previous_score: number | null;
  readonly score_drift_pct: number | null;
  readonly needs_review: boolean; // drift >25% → human validation required
  readonly time_to_mainstream_months: number | null;
  readonly is_new_alpha: boolean; // cross-threshold vs previous period
}
