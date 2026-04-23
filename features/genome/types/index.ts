// Shared contracts for the Genoma Colonias feature (BLOQUE 11.M).
// Used by embedding-builder, similarity-engine, vibe-tags heuristic,
// tRPC router (futuro), public API /api/v1/similar/[coloniaId], and UI.
//
// Genoma Colonias = búsqueda vectorial 64-dim + vibe tags canónicos.
// Reutiliza tabla existente public.colonia_dna_vectors (migration XL
// 20260421100000) para almacenar el embedding.
// Vibe tags en public.vibe_tags + public.colonia_vibe_tags (11.M.-1.1).

export const EMBEDDING_DIM = 64 as const;
export const EMBEDDING_FEATURES_VERSION = 'v1_h1' as const;

export const VIBE_TAG_IDS = [
  'walkability',
  'quiet',
  'nightlife',
  'family',
  'foodie',
  'green',
  'bohemian',
  'corporate',
  'safety_perceived',
  'gentrifying',
] as const;
export type VibeTagId = (typeof VIBE_TAG_IDS)[number];

export type VibeSource = 'heuristic_v1' | 'llm_v1';

export interface VibeTagWeight {
  readonly vibe_tag_id: VibeTagId;
  readonly weight: number; // 0..100
  readonly source: VibeSource;
}

export interface VibeTagLabel {
  readonly id: VibeTagId;
  readonly label_es: string;
  readonly label_en: string;
  readonly label_pt: string;
  readonly sort_order: number;
}

// Vector representation for the genome embedding. Persisted as pgvector
// text literal (`[0.1,0.2,...]`) via Supabase client.
export type EmbeddingVector64 = readonly number[];

// Feature-level breakdown stored alongside the embedding in
// colonia_dna_vectors.components jsonb for transparency + reproducibility.
export interface EmbeddingComponents extends Record<string, unknown> {
  readonly features_version: typeof EMBEDDING_FEATURES_VERSION;
  readonly dim: typeof EMBEDDING_DIM;
  readonly breakdown: {
    readonly scores_n0_n3: readonly number[]; // 32 features
    readonly dmx_indices: readonly number[]; // 15 features
    readonly vibe_tags: readonly number[]; // 10 features (0-1 from weight/100)
    readonly geo: readonly number[]; // 7 features
  };
  readonly sources_available: number;
  readonly coverage_pct: number;
}

export interface ColoniaEmbeddingRow {
  readonly colonia_id: string;
  readonly country_code: string;
  readonly vector: EmbeddingVector64;
  readonly components: EmbeddingComponents;
  readonly computed_at: string;
  readonly methodology_version: string; // acts as features_version alias
}

export interface SharedVibeTag {
  readonly vibe_tag_id: VibeTagId;
  readonly weight_self: number;
  readonly weight_other: number;
}

export interface SimilarityResult {
  readonly colonia_id: string;
  readonly colonia_label: string | null;
  readonly similarity: number; // 0..1 (1 = identical)
  readonly distance: number; // cosine distance
  readonly top_shared_vibe_tags: readonly SharedVibeTag[];
  readonly top_dmx_indices: readonly { readonly code: string; readonly value: number }[];
}

export interface FindSimilarOptions {
  readonly topN?: number;
  readonly minSimilarity?: number;
  readonly minDmxLiv?: number | null;
}
