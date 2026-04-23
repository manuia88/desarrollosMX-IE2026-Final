// BLOQUE 11.M.2 — Genoma Colonias embedding builder 64-dim.
//
// Composición explícita del vector:
//   - 32 features scores N0 normalized (Z-score clamped → [-3, 3] / 6 + 0.5 → [0..1])
//   - 15 features índices DMX normalized (misma técnica)
//   - 10 features vibe tags weight / 100 → [0..1]
//   - 7 features geo (lat, lng, elevación, distancias, área) normalizados [0..1]
//
// Persiste en public.colonia_dna_vectors (REUSE tabla XL — no se crea
// colonia_embeddings nueva para evitar dual source of truth; el campo
// methodology_version actúa como features_version).
//
// Idempotente: skip si computed_at < 7d ago AND methodology_version coincide.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  EMBEDDING_DIM,
  EMBEDDING_FEATURES_VERSION,
  type EmbeddingComponents,
  VIBE_TAG_IDS,
  type VibeTagId,
} from '@/features/genome/types';
import type { Database } from '@/shared/types/database';

// ============================================================
// Catálogos canónicos (orden fijo = orden en vector).
// ============================================================

export const N0_SCORE_ORDER = [
  'F01',
  'F02',
  'F03',
  'F04',
  'F05',
  'F06',
  'F07',
  'H01',
  'H02',
  'H03',
  'H04',
  'H06',
  'H08',
  'H09',
  'H10',
  'H11',
  'A01',
  'A03',
  'A04',
  'B12',
  'D07',
  'N01',
  'N02',
  'N03',
  'N04',
  'N05',
  'N06',
  'N07',
  'N08',
  'N09',
  'N10',
  'N11',
] as const;

export const DMX_INDEX_ORDER = [
  'DMX-IPV',
  'DMX-IAB',
  'DMX-IDS',
  'DMX-IRE',
  'DMX-ICO',
  'DMX-MOM',
  'DMX-LIV',
  'DMX-FAM',
  'DMX-YNG',
  'DMX-GRN',
  'DMX-STR',
  'DMX-INV',
  'DMX-DEV',
  'DMX-GNT',
  'DMX-STA',
] as const;

export const VIBE_ORDER: readonly VibeTagId[] = VIBE_TAG_IDS;

export const GEO_FEATURES = [
  'lat_norm',
  'lng_norm',
  'elevation_norm',
  'distance_centro_norm',
  'distance_coast_norm',
  'distance_airport_norm',
  'area_km2_norm',
] as const;

const N0_LEN = N0_SCORE_ORDER.length; // 32
const DMX_LEN = DMX_INDEX_ORDER.length; // 15
const VIBE_LEN = VIBE_ORDER.length; // 10
const GEO_LEN = GEO_FEATURES.length; // 7
const TOTAL_LEN = N0_LEN + DMX_LEN + VIBE_LEN + GEO_LEN; // 64

if (TOTAL_LEN !== EMBEDDING_DIM) {
  throw new Error(`embedding-builder: TOTAL_LEN=${TOTAL_LEN} but EMBEDDING_DIM=${EMBEDDING_DIM}`);
}

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

// ============================================================
// Normalization helpers.
// ============================================================

// Z-score normalization mapped to [0..1]: (z + 3) / 6, clamped.
// Assumption: all input scores are 0-100 with mean 50 stddev ~20.
function zNormalize(value: number | null): number {
  if (value === null || !Number.isFinite(value)) return 0.5;
  const z = (value - 50) / 20;
  const clampZ = Math.min(Math.max(z, -3), 3);
  return (clampZ + 3) / 6;
}

function minMaxNormalize(value: number | null, min: number, max: number): number {
  if (value === null || !Number.isFinite(value)) return 0.5;
  if (max === min) return 0.5;
  const norm = (value - min) / (max - min);
  return Math.min(Math.max(norm, 0), 1);
}

// ============================================================
// Input bundle.
// ============================================================

export interface GeoFeatures {
  readonly lat: number | null;
  readonly lng: number | null;
  readonly elevation: number | null;
  readonly distance_centro_km: number | null;
  readonly distance_coast_km: number | null;
  readonly distance_airport_km: number | null;
  readonly area_km2: number | null;
}

export interface EmbeddingInput {
  readonly coloniaId: string;
  readonly countryCode: string;
  readonly scores: ReadonlyMap<string, number>;
  readonly dmxIndices: ReadonlyMap<string, number>;
  readonly vibeTags: ReadonlyMap<VibeTagId, number>;
  readonly geo: GeoFeatures;
}

// ============================================================
// Build vector.
// ============================================================

export function buildEmbeddingVector(input: EmbeddingInput): {
  readonly vector: number[];
  readonly components: EmbeddingComponents;
} {
  const scoresArr: number[] = N0_SCORE_ORDER.map((id) => zNormalize(input.scores.get(id) ?? null));
  const dmxArr: number[] = DMX_INDEX_ORDER.map((code) =>
    zNormalize(input.dmxIndices.get(code) ?? null),
  );
  const vibeArr: number[] = VIBE_ORDER.map((id) => {
    const w = input.vibeTags.get(id);
    if (typeof w !== 'number' || !Number.isFinite(w)) return 0;
    return Math.min(Math.max(w, 0), 100) / 100;
  });

  const g = input.geo;
  const geoArr: number[] = [
    minMaxNormalize(g.lat, 14, 33), // MX lat range approx
    minMaxNormalize(g.lng, -118, -86), // MX lng range approx
    minMaxNormalize(g.elevation, 0, 3000),
    minMaxNormalize(g.distance_centro_km, 0, 60),
    minMaxNormalize(g.distance_coast_km, 0, 500),
    minMaxNormalize(g.distance_airport_km, 0, 50),
    minMaxNormalize(g.area_km2, 0, 50),
  ];

  const vector: number[] = [...scoresArr, ...dmxArr, ...vibeArr, ...geoArr];

  if (vector.length !== EMBEDDING_DIM) {
    throw new Error(`buildEmbeddingVector: got ${vector.length} dims, expected ${EMBEDDING_DIM}`);
  }

  const presentScores =
    N0_SCORE_ORDER.filter((id) => input.scores.has(id)).length +
    DMX_INDEX_ORDER.filter((c) => input.dmxIndices.has(c)).length +
    VIBE_ORDER.filter((id) => input.vibeTags.has(id)).length;

  const components: EmbeddingComponents = {
    features_version: EMBEDDING_FEATURES_VERSION,
    dim: EMBEDDING_DIM,
    breakdown: {
      scores_n0_n3: scoresArr,
      dmx_indices: dmxArr,
      vibe_tags: vibeArr,
      geo: geoArr,
    },
    sources_available: presentScores,
    coverage_pct: (presentScores / (N0_LEN + DMX_LEN + VIBE_LEN)) * 100,
  };

  return { vector, components };
}

// ============================================================
// Vector ↔ pgvector text format.
// ============================================================

export function vectorToPgLiteral(v: readonly number[]): string {
  return `[${v.map((x) => (Number.isFinite(x) ? x.toString() : '0')).join(',')}]`;
}

// ============================================================
// Fetch helpers.
// ============================================================

async function fetchScoresMap(
  coloniaId: string,
  supabase: SupabaseClient<Database>,
): Promise<Map<string, number>> {
  const res = await supabase
    .from('zone_scores')
    .select('score_type, score_value')
    .eq('zone_id', coloniaId);
  const map = new Map<string, number>();
  if (!res.error && res.data) {
    for (const row of res.data) {
      if (row.score_value !== null && row.score_type) {
        map.set(row.score_type, row.score_value);
      }
    }
  }
  return map;
}

async function fetchDmxIndicesMap(
  coloniaId: string,
  supabase: SupabaseClient<Database>,
): Promise<Map<string, number>> {
  const res = await supabase
    .from('dmx_indices')
    .select('index_code, value')
    .eq('scope_type', 'colonia')
    .eq('scope_id', coloniaId);
  const map = new Map<string, number>();
  if (!res.error && res.data) {
    for (const row of res.data) {
      if (row.value !== null && row.index_code) {
        map.set(row.index_code, row.value);
      }
    }
  }
  return map;
}

async function fetchVibeTagsMap(
  coloniaId: string,
  supabase: SupabaseClient<Database>,
): Promise<Map<VibeTagId, number>> {
  const res = await supabase
    .from('colonia_vibe_tags')
    .select('vibe_tag_id, weight')
    .eq('colonia_id', coloniaId)
    .eq('source', 'heuristic_v1');
  const map = new Map<VibeTagId, number>();
  if (!res.error && res.data) {
    for (const row of res.data) {
      const id = row.vibe_tag_id as VibeTagId | undefined;
      if (id && (VIBE_TAG_IDS as readonly string[]).includes(id)) {
        map.set(id, Number(row.weight));
      }
    }
  }
  return map;
}

// H1: lee geo features desde zona_snapshots.payload (JSON). Graceful-degrade
// a valores neutros (null → normalized 0.5) si el payload no tiene el campo.
// H2: tabla zones canónica con columnas típicas (agendado L137).
async function fetchGeoFeatures(
  coloniaId: string,
  supabase: SupabaseClient<Database>,
): Promise<GeoFeatures> {
  const { data } = await supabase
    .from('zona_snapshots')
    .select('payload')
    .eq('zone_id', coloniaId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload =
    data?.payload && typeof data.payload === 'object' && !Array.isArray(data.payload)
      ? (data.payload as Record<string, unknown>)
      : {};

  const asNum = (x: unknown): number | null =>
    typeof x === 'number' && Number.isFinite(x) ? x : null;

  return {
    lat: asNum(payload.lat),
    lng: asNum(payload.lng),
    elevation: asNum(payload.elevation),
    distance_centro_km: asNum(payload.distance_centro_km),
    distance_coast_km: asNum(payload.distance_coast_km),
    distance_airport_km: asNum(payload.distance_airport_km),
    area_km2: asNum(payload.area_km2),
  };
}

// ============================================================
// Main builder.
// ============================================================

export interface BuildOptions {
  readonly coloniaId: string;
  readonly supabase: SupabaseClient<Database>;
  readonly force?: boolean;
  readonly countryCode?: string;
}

export interface BuildResult {
  readonly skipped: boolean;
  readonly reason?: string;
  readonly vector?: number[];
  readonly components?: EmbeddingComponents;
}

export async function buildColoniaEmbedding(opts: BuildOptions): Promise<BuildResult> {
  const country = opts.countryCode ?? 'MX';

  if (!opts.force) {
    const { data: existing } = await opts.supabase
      .from('colonia_dna_vectors')
      .select('computed_at, methodology_version')
      .eq('colonia_id', opts.coloniaId)
      .maybeSingle();
    if (existing) {
      const age = Date.now() - new Date(existing.computed_at).getTime();
      if (age < STALE_MS && existing.methodology_version === EMBEDDING_FEATURES_VERSION) {
        return { skipped: true, reason: 'fresh_cache' };
      }
    }
  }

  const [scores, dmxIndices, vibeTags, geo] = await Promise.all([
    fetchScoresMap(opts.coloniaId, opts.supabase),
    fetchDmxIndicesMap(opts.coloniaId, opts.supabase),
    fetchVibeTagsMap(opts.coloniaId, opts.supabase),
    fetchGeoFeatures(opts.coloniaId, opts.supabase),
  ]);

  const { vector, components } = buildEmbeddingVector({
    coloniaId: opts.coloniaId,
    countryCode: country,
    scores,
    dmxIndices,
    vibeTags,
    geo,
  });

  const literal = vectorToPgLiteral(vector);
  const { error } = await opts.supabase.from('colonia_dna_vectors').upsert(
    {
      colonia_id: opts.coloniaId,
      country_code: country,
      vector: literal,
      components:
        components as unknown as Database['public']['Tables']['colonia_dna_vectors']['Insert']['components'],
      computed_at: new Date().toISOString(),
      methodology_version: EMBEDDING_FEATURES_VERSION,
    },
    { onConflict: 'colonia_id' },
  );
  if (error) throw new Error(`buildColoniaEmbedding: ${error.message}`);

  return { skipped: false, vector, components };
}

// ============================================================
// Batch — todas las colonias CDMX.
// ============================================================

export async function batchBuildAllCDMXEmbeddings(
  supabase: SupabaseClient<Database>,
  chunkSize = 20,
): Promise<{ processed: number; skipped: number; failed: string[] }> {
  // Usa colonia_dna_vectors como catálogo de colonias candidatas + scope_id en
  // dmx_indices o zone_pulse_scores como fallback (ADR-018 — zone_id es UUID
  // canónico sin tabla zones formal; H2 introducirá tabla zones).
  const { data: dmxRows } = await supabase
    .from('dmx_indices')
    .select('scope_id')
    .eq('country_code', 'MX')
    .eq('scope_type', 'colonia')
    .limit(2000);
  const idSet = new Set<string>();
  if (dmxRows) {
    for (const row of dmxRows) {
      if (typeof row.scope_id === 'string') idSet.add(row.scope_id);
    }
  }
  const ids = Array.from(idSet);
  const failed: string[] = [];
  let processed = 0;
  let skipped = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map((id) => buildColoniaEmbedding({ coloniaId: id, supabase })),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const id = chunk[j];
      if (r && r.status === 'fulfilled') {
        if (r.value.skipped) skipped++;
        else processed++;
      } else if (id) {
        failed.push(id);
      }
    }
  }
  return { processed, skipped, failed };
}

export const EMBEDDING_BUILDER_METADATA = {
  features_version: EMBEDDING_FEATURES_VERSION,
  total_dim: TOTAL_LEN,
  n0_dim: N0_LEN,
  dmx_dim: DMX_LEN,
  vibe_dim: VIBE_LEN,
  geo_dim: GEO_LEN,
} as const;
