// H14 Buyer Persona — clustering lite (k-means con 6 centroides fijos) sobre
// señales de un comprador (wishlist + search_logs + behavior_signals) para
// predecir el perfil dominante: family / inversor / primera_compra / downsizer /
// second_home / digital_nomad.
// Plan FASE 09 §9.A.5. Catálogo 03.8 §H14.
//
// Señales normalizadas (0-1):
//   recámaras_avg         — promedio de recámaras observadas en wishlist/search
//   precio_avg_norm       — precio avg wishlist escalado a 0-1 con PRECIO_ESCALA_MAX
//   amenidad_score_*      — peso que el usuario da a cada familia de amenidades
//                           (school, roi, credito, mantenimiento_bajo, lifestyle, coworking)
//
// Centroides: 6 perfiles con recámaras_pref / precio_max / amenidades_priority.
// Normalización: recámaras centroides en escala 0-1 (dividiendo por 4 rec max),
// precio en escala 0-1 (precio_centroide / PRECIO_ESCALA_MAX),
// amenidades_priority convierte lista a vector one-hot pesado sobre 6 familias.
//
// Distance = Euclidean.
// Match_pct = softmax(−distances) × 100, redondeado a 1 decimal. Los 6 suman 100.
//
// score_value — confidence en el perfil dominante:
//   margin_top1_vs_top2 ≥ 0.20  → 100 (perfil muy claro)
//   margin_top1_vs_top2 ≥ 0.10  → 70-99 escalado
//   margin < 0.05                → 20-50 escalado (perfil difuso)
//
// Tier 3: requiere ≥20 señales combinadas (wishlist + searches + behavior).
// Category: comprador → output persiste en user_scores.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export type PersonaId =
  | 'family'
  | 'inversor'
  | 'primera_compra'
  | 'downsizer'
  | 'second_home'
  | 'digital_nomad';

export const PERSONA_IDS: readonly PersonaId[] = [
  'family',
  'inversor',
  'primera_compra',
  'downsizer',
  'second_home',
  'digital_nomad',
] as const;

export type AmenidadFamilia =
  | 'schools_parks'
  | 'roi_rental'
  | 'credito_afinidad'
  | 'mantenimiento_bajo'
  | 'lifestyle_premium'
  | 'coworking_internet';

export const AMENIDAD_FAMILIAS: readonly AmenidadFamilia[] = [
  'schools_parks',
  'roi_rental',
  'credito_afinidad',
  'mantenimiento_bajo',
  'lifestyle_premium',
  'coworking_internet',
] as const;

// Escalas de normalización
export const RECAMARAS_MAX = 4; // 4 rec → 1.0
export const PRECIO_ESCALA_MAX = 10_000_000; // 10M MXN → 1.0
export const MIN_SIGNALS_TIER_3 = 20;

export interface PersonaCentroid {
  readonly recamaras: number; // promedio deseado
  readonly precio_max: number; // MXN
  readonly amenidad_vector: Readonly<Record<AmenidadFamilia, number>>;
}

// Centroides hardcoded (catalog-defined). amenidad_vector suma 1.0 por perfil.
export const PERSONA_CENTROIDS: Readonly<Record<PersonaId, PersonaCentroid>> = {
  family: {
    recamaras: 3,
    precio_max: 5_000_000,
    amenidad_vector: {
      schools_parks: 0.6,
      roi_rental: 0,
      credito_afinidad: 0.1,
      mantenimiento_bajo: 0.1,
      lifestyle_premium: 0.1,
      coworking_internet: 0.1,
    },
  },
  inversor: {
    recamaras: 2,
    precio_max: 4_000_000,
    amenidad_vector: {
      schools_parks: 0,
      roi_rental: 0.7,
      credito_afinidad: 0.05,
      mantenimiento_bajo: 0.1,
      lifestyle_premium: 0.05,
      coworking_internet: 0.1,
    },
  },
  primera_compra: {
    recamaras: 1.5,
    precio_max: 3_000_000,
    amenidad_vector: {
      schools_parks: 0.1,
      roi_rental: 0.05,
      credito_afinidad: 0.6,
      mantenimiento_bajo: 0.1,
      lifestyle_premium: 0.05,
      coworking_internet: 0.1,
    },
  },
  downsizer: {
    recamaras: 1.5,
    precio_max: 8_000_000,
    amenidad_vector: {
      schools_parks: 0.05,
      roi_rental: 0.05,
      credito_afinidad: 0.05,
      mantenimiento_bajo: 0.5,
      lifestyle_premium: 0.3,
      coworking_internet: 0.05,
    },
  },
  second_home: {
    recamaras: 2.5,
    precio_max: 10_000_000,
    amenidad_vector: {
      schools_parks: 0.05,
      roi_rental: 0.1,
      credito_afinidad: 0.05,
      mantenimiento_bajo: 0.1,
      lifestyle_premium: 0.65,
      coworking_internet: 0.05,
    },
  },
  digital_nomad: {
    recamaras: 1,
    precio_max: 5_000_000,
    amenidad_vector: {
      schools_parks: 0.05,
      roi_rental: 0.1,
      credito_afinidad: 0.05,
      mantenimiento_bajo: 0.05,
      lifestyle_premium: 0.15,
      coworking_internet: 0.6,
    },
  },
} as const;

export const methodology = {
  formula:
    'k-means lite: 6 centroides fijos; euclidean distance sobre (recamaras_norm, precio_norm, amenidad_vector); match_pct = softmax(−d) × 100.',
  sources: ['wishlist', 'search_logs', 'behavior_signals'],
  weights: {
    recamaras_feature: 0.25,
    precio_feature: 0.25,
    amenidad_feature: 0.5,
  },
  dependencies: [],
  triggers_cascade: ['search_behavior'],
  references: [
    {
      name: 'Catálogo 03.8 §H14 Buyer Persona',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#h14-buyer-persona',
    },
    {
      name: 'Plan FASE 09 §9.A.5',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
  ],
  validity: { unit: 'days', value: 14 } as const,
  tier_gate: {
    min_signals: MIN_SIGNALS_TIER_3,
  },
} as const;

export const reasoning_template =
  'Buyer persona de {user_id} (score_value={score_value}): dominante={perfil_dominante} ({match_top_pct}%), margen vs #2={margin_top}. Señales consumidas: {signals_count}. Perfiles: {perfiles}. Confianza {confidence}.';

export interface H14WishlistSignal {
  readonly project_id: string;
  readonly recamaras: number;
  readonly precio: number;
  readonly amenidades?: readonly string[];
}

export interface H14SearchSignal {
  readonly filter_data: {
    readonly recamaras?: number;
    readonly precio_max?: number;
    readonly amenidades?: readonly string[];
  };
  readonly timestamp?: string;
}

export interface H14BehaviorSignals {
  readonly dwell_time_avg?: number;
  readonly revisit_rate?: number;
  readonly share_count?: number;
}

export interface H14RawInput {
  readonly user_id: string;
  readonly wishlist_projects: readonly H14WishlistSignal[];
  readonly search_logs_last_90d: readonly H14SearchSignal[];
  readonly behavior_signals?: H14BehaviorSignals;
}

export interface H14PerfilMatch {
  readonly id: PersonaId;
  readonly match_pct: number;
}

export interface H14Components extends Record<string, unknown> {
  readonly perfiles: readonly H14PerfilMatch[];
  readonly perfil_dominante: PersonaId | null;
  readonly confidence_perfil: number;
  readonly margin_top1_top2: number;
  readonly signals_count: number;
  readonly user_vector: {
    readonly recamaras_avg: number;
    readonly precio_avg: number;
    readonly amenidad_vector: Readonly<Record<AmenidadFamilia, number>>;
  };
  readonly gated: boolean;
  readonly gate_reason: string | null;
}

export interface H14ComputeOptions {
  readonly bypassGate?: boolean;
}

export interface H14ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H14Components;
}

// Map palabras clave de amenidades a familias.
const AMENIDAD_KEYWORDS: Readonly<Record<string, AmenidadFamilia>> = {
  schools: 'schools_parks',
  school: 'schools_parks',
  parks: 'schools_parks',
  park: 'schools_parks',
  escuelas: 'schools_parks',
  parques: 'schools_parks',
  seguridad: 'schools_parks',
  roi_high: 'roi_rental',
  roi: 'roi_rental',
  rental_yield: 'roi_rental',
  renta: 'roi_rental',
  credito: 'credito_afinidad',
  crédito: 'credito_afinidad',
  afinidad: 'credito_afinidad',
  infonavit: 'credito_afinidad',
  mantenimiento_bajo: 'mantenimiento_bajo',
  low_maintenance: 'mantenimiento_bajo',
  lifestyle: 'lifestyle_premium',
  amenities_premium: 'lifestyle_premium',
  premium: 'lifestyle_premium',
  coworking: 'coworking_internet',
  internet: 'coworking_internet',
  ubicacion_central: 'coworking_internet',
};

function normalizeRecamaras(value: number): number {
  return Math.max(0, Math.min(1, value / RECAMARAS_MAX));
}

function normalizePrecio(value: number): number {
  return Math.max(0, Math.min(1, value / PRECIO_ESCALA_MAX));
}

function emptyAmenidadVector(): Record<AmenidadFamilia, number> {
  return {
    schools_parks: 0,
    roi_rental: 0,
    credito_afinidad: 0,
    mantenimiento_bajo: 0,
    lifestyle_premium: 0,
    coworking_internet: 0,
  };
}

function accumulateAmenidades(
  acc: Record<AmenidadFamilia, number>,
  items: readonly string[] | undefined,
): void {
  if (!items) return;
  for (const raw of items) {
    const key = raw.toLowerCase().trim();
    const fam = AMENIDAD_KEYWORDS[key];
    if (fam) {
      acc[fam] = (acc[fam] ?? 0) + 1;
    }
  }
}

function normalizeAmenidadVector(
  acc: Record<AmenidadFamilia, number>,
): Record<AmenidadFamilia, number> {
  const total = AMENIDAD_FAMILIAS.reduce((s, f) => s + (acc[f] ?? 0), 0);
  if (total <= 0) {
    // sin señales de amenidades → vector uniforme 1/6
    const uniform: Record<AmenidadFamilia, number> = emptyAmenidadVector();
    for (const f of AMENIDAD_FAMILIAS) uniform[f] = 1 / 6;
    return uniform;
  }
  const out: Record<AmenidadFamilia, number> = emptyAmenidadVector();
  for (const f of AMENIDAD_FAMILIAS) out[f] = (acc[f] ?? 0) / total;
  return out;
}

function buildUserVector(input: H14RawInput): {
  recamaras_avg: number;
  precio_avg: number;
  amenidad_vector: Record<AmenidadFamilia, number>;
  signals_count: number;
} {
  let rec_sum = 0;
  let rec_n = 0;
  let pre_sum = 0;
  let pre_n = 0;
  const amenAcc = emptyAmenidadVector();
  let signals_count = 0;

  for (const w of input.wishlist_projects) {
    if (Number.isFinite(w.recamaras)) {
      rec_sum += w.recamaras;
      rec_n += 1;
    }
    if (Number.isFinite(w.precio)) {
      pre_sum += w.precio;
      pre_n += 1;
    }
    accumulateAmenidades(amenAcc, w.amenidades);
    signals_count += 1;
  }
  for (const s of input.search_logs_last_90d) {
    if (s.filter_data.recamaras !== undefined && Number.isFinite(s.filter_data.recamaras)) {
      rec_sum += s.filter_data.recamaras;
      rec_n += 1;
    }
    if (s.filter_data.precio_max !== undefined && Number.isFinite(s.filter_data.precio_max)) {
      pre_sum += s.filter_data.precio_max;
      pre_n += 1;
    }
    accumulateAmenidades(amenAcc, s.filter_data.amenidades);
    signals_count += 1;
  }

  // Behavior signals cuentan para gate pero no mueven centroide (no hay eje).
  if (input.behavior_signals) {
    const b = input.behavior_signals;
    if (b.dwell_time_avg !== undefined) signals_count += 1;
    if (b.revisit_rate !== undefined) signals_count += 1;
    if (b.share_count !== undefined) signals_count += b.share_count;
  }

  const recamaras_avg = rec_n > 0 ? rec_sum / rec_n : 2; // default neutro
  const precio_avg = pre_n > 0 ? pre_sum / pre_n : 4_000_000;
  const amenidad_vector = normalizeAmenidadVector(amenAcc);
  return { recamaras_avg, precio_avg, amenidad_vector, signals_count };
}

function distanceToCentroid(
  userRec: number,
  userPre: number,
  userAmen: Record<AmenidadFamilia, number>,
  centroid: PersonaCentroid,
): number {
  const rec_d = normalizeRecamaras(userRec) - normalizeRecamaras(centroid.recamaras);
  const pre_d = normalizePrecio(userPre) - normalizePrecio(centroid.precio_max);
  let amen_sq = 0;
  for (const f of AMENIDAD_FAMILIAS) {
    const du = userAmen[f] ?? 0;
    const dc = centroid.amenidad_vector[f] ?? 0;
    const d = du - dc;
    amen_sq += d * d;
  }
  return Math.sqrt(rec_d * rec_d + pre_d * pre_d + amen_sq);
}

// Temperature del softmax. Valor alto = distribución más plana (mezcla varios
// perfiles); valor bajo = un solo perfil domina. T=0.25 es sweet spot empírico
// para que Polanco mixto (lifestyle + roi + mantenimiento) reparta entre
// inversor, downsizer y second_home en vez de colapsar a uno.
export const SOFTMAX_TEMPERATURE = 0.25;

function softmaxNeg(distances: readonly number[]): number[] {
  const T = SOFTMAX_TEMPERATURE;
  const scaled = distances.map((d) => -d / T);
  const max = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return sum > 0 ? exps.map((e) => e / sum) : distances.map(() => 1 / distances.length);
}

function confidenceFromMargin(margin: number): number {
  // margin ≥ 0.20 → 100; 0.10 → ~70; 0.05 → ~40; 0.02 → ~20
  if (margin >= 0.2) return 100;
  if (margin >= 0.1) return Math.round(70 + ((margin - 0.1) / 0.1) * 30);
  if (margin >= 0.05) return Math.round(40 + ((margin - 0.05) / 0.05) * 30);
  if (margin >= 0.02) return Math.round(20 + ((margin - 0.02) / 0.03) * 20);
  return 20;
}

function confidenceBucket(score: number, signals: number): Confidence {
  if (signals < MIN_SIGNALS_TIER_3) return 'low';
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

export function computeH14BuyerPersona(
  input: H14RawInput,
  options: H14ComputeOptions = {},
): H14ComputeResult {
  const uv = buildUserVector(input);
  const signals_count = uv.signals_count;
  const gated = !options.bypassGate && signals_count < MIN_SIGNALS_TIER_3;

  if (gated) {
    // Aún computamos el vector y distances para que UI pueda mostrar "preview",
    // pero score_value=0 y confidence='insufficient_data'.
    const distances = PERSONA_IDS.map((p) =>
      distanceToCentroid(uv.recamaras_avg, uv.precio_avg, uv.amenidad_vector, PERSONA_CENTROIDS[p]),
    );
    const match = softmaxNeg(distances);
    const perfiles: H14PerfilMatch[] = PERSONA_IDS.map((p, i) => ({
      id: p,
      match_pct: Number(((match[i] ?? 0) * 100).toFixed(1)),
    }));
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        perfiles,
        perfil_dominante: null,
        confidence_perfil: 0,
        margin_top1_top2: 0,
        signals_count,
        user_vector: {
          recamaras_avg: Number(uv.recamaras_avg.toFixed(2)),
          precio_avg: Number(uv.precio_avg.toFixed(0)),
          amenidad_vector: uv.amenidad_vector,
        },
        gated: true,
        gate_reason: `Se requieren ≥${MIN_SIGNALS_TIER_3} señales user (wishlist+searches+behavior), actualmente ${signals_count}.`,
      },
    };
  }

  const distances = PERSONA_IDS.map((p) =>
    distanceToCentroid(uv.recamaras_avg, uv.precio_avg, uv.amenidad_vector, PERSONA_CENTROIDS[p]),
  );
  const match = softmaxNeg(distances);

  const perfilesUnsorted: H14PerfilMatch[] = PERSONA_IDS.map((p, i) => ({
    id: p,
    match_pct: (match[i] ?? 0) * 100,
  }));
  const perfiles_sorted = [...perfilesUnsorted].sort((a, b) => b.match_pct - a.match_pct);

  // Normalizar match_pct para que sumen exactamente 100 al redondear a 1 decimal.
  const rounded = perfiles_sorted.map((p) => ({
    id: p.id,
    match_pct: Math.round(p.match_pct * 10) / 10,
  }));
  let drift = 100 - rounded.reduce((s, p) => s + p.match_pct, 0);
  drift = Math.round(drift * 10) / 10;
  if (rounded.length > 0 && Math.abs(drift) >= 0.1 && rounded[0]) {
    rounded[0] = {
      id: rounded[0].id,
      match_pct: Number((rounded[0].match_pct + drift).toFixed(1)),
    };
  }

  const top = rounded[0];
  const second = rounded[1];
  const margin = top && second ? (top.match_pct - second.match_pct) / 100 : 0;
  const confidence_perfil = top ? confidenceFromMargin(Math.max(0, margin)) : 0;
  const perfil_dominante: PersonaId | null = top ? top.id : null;

  const confidence = confidenceBucket(confidence_perfil, signals_count);

  return {
    value: confidence_perfil,
    confidence,
    components: {
      perfiles: rounded,
      perfil_dominante,
      confidence_perfil,
      margin_top1_top2: Number(margin.toFixed(3)),
      signals_count,
      user_vector: {
        recamaras_avg: Number(uv.recamaras_avg.toFixed(2)),
        precio_avg: Number(uv.precio_avg.toFixed(0)),
        amenidad_vector: uv.amenidad_vector,
      },
      gated: false,
      gate_reason: null,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h14.insufficient';
  if (value >= 80) return 'ie.score.h14.perfil_claro';
  if (value >= 50) return 'ie.score.h14.perfil_mixto';
  return 'ie.score.h14.perfil_difuso';
}

export const h14BuyerPersonaCalculator: Calculator = {
  scoreId: 'H14',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const confidence: Confidence = 'insufficient_data';
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        perfiles: PERSONA_IDS.map((p) => ({ id: p, match_pct: 0 })),
        perfil_dominante: null,
        confidence_perfil: 0,
        margin_top1_top2: 0,
        signals_count: 0,
        user_vector: {
          recamaras_avg: 0,
          precio_avg: 0,
          amenidad_vector: {
            schools_parks: 0,
            roi_rental: 0,
            credito_afinidad: 0,
            mantenimiento_bajo: 0,
            lifestyle_premium: 0,
            coworking_internet: 0,
          },
        },
        gated: true,
        gate_reason: `Se requieren ≥${MIN_SIGNALS_TIER_3} señales user (wishlist+searches+behavior).`,
        reason:
          'H14 requiere wishlist + search_logs + behavior_signals desde DB. Use computeH14BuyerPersona(input) en tests.',
      },
      inputs_used: { periodDate: input.periodDate, userId: input.userId ?? null },
      confidence,
      citations: [
        { source: 'wishlist' },
        { source: 'search_logs' },
        { source: 'behavior_signals' },
      ],
      provenance: {
        sources: [
          { name: 'wishlist', count: 0 },
          { name: 'search_logs', count: 0 },
          { name: 'behavior_signals', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        user_id: input.userId ?? 'desconocido',
        perfil_dominante: 'n/a',
        match_top_pct: 0,
        margin_top: 0,
        signals_count: 0,
        perfiles: 'n/a',
      },
    };
  },
};

export default h14BuyerPersonaCalculator;
