// Shared contracts for the LifePath feature (BLOQUE 11.O).
// Used by matching engine, tRPC router, quiz form + results UI, and tests.
//
// LifePath = "Stitch Fix de real estate" — cuestionario 15 preguntas →
// matching top-N colonias con afinidad personalizada por 7 componentes
// (familia · budget · movilidad · amenidades · seguridad · verde · vibe).
//
// Persiste en public.lifepath_user_profiles (ALTER 11.O.-1.1):
//   preferences jsonb       ← LifePathAnswers (15 preguntas v1 SEED).
//   matches jsonb           ← LifePathMatch[] top-20 inline.
//   answers_version text    ← 'v1' (versionado del cuestionario).
//   methodology text        ← 'heuristic_v1' (H1) → 'llm_v1' (H2 L137).

export const ANSWERS_VERSION = 'v1' as const;
export const METHODOLOGY_HEURISTIC = 'heuristic_v1' as const;

export const COMPONENT_WEIGHTS = {
  familia: 15,
  budget: 20,
  movilidad: 15,
  amenidades: 15,
  seguridad: 10,
  verde: 10,
  vibe: 15,
} as const;

export type ComponentKey = keyof typeof COMPONENT_WEIGHTS;

export const FAMILY_STATES = [
  'solo',
  'pareja',
  'familia_chica',
  'familia_grande',
  'roommates',
] as const;
export type FamilyState = (typeof FAMILY_STATES)[number];

export const INCOME_RANGES = [
  'lt_15k',
  '15k_30k',
  '30k_60k',
  '60k_100k',
  '100k_200k',
  'gt_200k',
] as const;
export type IncomeRange = (typeof INCOME_RANGES)[number];

export const WORK_MODES = ['presencial', 'hibrido', 'remoto', 'freelance'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const MOBILITY_PREFS = ['auto', 'transporte_publico', 'bici_caminar', 'mixto'] as const;
export type MobilityPref = (typeof MOBILITY_PREFS)[number];

export const VIBE_PACES = ['tranquilo', 'equilibrado', 'vibrante'] as const;
export type VibePace = (typeof VIBE_PACES)[number];

export const HORIZON_OPTIONS = ['1_2y', '3_5y', '5_10y', 'gt_10y'] as const;
export type Horizon = (typeof HORIZON_OPTIONS)[number];

// 15 preguntas v1 SEED.
export interface LifePathAnswers {
  readonly family_state: FamilyState;
  readonly family_priority: number; // 0..10
  readonly income_range: IncomeRange;
  readonly budget_monthly_mxn: number | null; // optional detail
  readonly work_mode: WorkMode;
  readonly mobility_pref: MobilityPref;
  readonly amenities_priority: number; // 0..10
  readonly shopping_priority: number; // 0..10
  readonly security_priority: number; // 0..10
  readonly green_priority: number; // 0..10
  readonly vibe_pace: VibePace;
  readonly vibe_nightlife: number; // 0..10
  readonly vibe_walkable: number; // 0..10
  readonly has_pet: boolean;
  readonly horizon: Horizon;
}

export interface LifePathComponentBreakdown {
  readonly familia: number; // 0..100
  readonly budget: number;
  readonly movilidad: number;
  readonly amenidades: number;
  readonly seguridad: number;
  readonly verde: number;
  readonly vibe: number;
}

export interface LifePathMatch {
  readonly colonia_id: string;
  readonly colonia_label: string | null;
  readonly score: number; // 0..100 weighted sum
  readonly components: LifePathComponentBreakdown;
  readonly top_dmx_indices: readonly { readonly code: string; readonly value: number }[];
  readonly shared_vibe_tags: readonly string[]; // vibe_tag_id list
}

export interface LifePathProfileRow {
  readonly user_id: string;
  readonly preferences: LifePathAnswers;
  readonly matches: readonly LifePathMatch[];
  readonly answers_version: string;
  readonly methodology: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly income_range: IncomeRange | null; // denormalized top-level for quick filters
  readonly family_state: FamilyState | null;
  readonly work_mode: WorkMode | null;
}

export interface ComputeMatchesOptions {
  readonly topN?: number;
  readonly maxCandidates?: number;
}
