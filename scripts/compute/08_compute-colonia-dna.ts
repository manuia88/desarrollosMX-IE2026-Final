#!/usr/bin/env node
/**
 * Batch compute colonia DNA 64-dim L2-normalized embeddings para TODAS las
 * colonias MX registradas en public.zones (scope_type='colonia'). Determinista
 * (zero LLM). Cada embedding se persiste en public.colonia_dna_vectors con
 * `vector pgvector(64)` + components jsonb (top-5 contributors + breakdown +
 * feature_sources).
 *
 * Composición 64-dim (asserted):
 *   [0..22]  (23) N-scores features (indicator codes N0-N4).
 *   [23..36] (14) DMX zone-scope indices.
 *   [37..46] (10) demographics proxy (deterministic hash — tabla
 *                 zone_demographics no existe; zone_demographics_cache es
 *                 view parcial).
 *   [47..51] (5)  macro context MX latest (macro_series).
 *   [52..54] (3)  h3/geo encoded (lat,lng normalizados + hash bucket).
 *   [55..63] (9)  padding (zeros).
 *
 * Normalización:
 *   1. Raw 0-100 → [0, 1] via /100 (defaults 50 → 0.5).
 *   2. Top-5 contributors computados ANTES de L2 (sobre raw [0,1]).
 *   3. L2 norm: v_i /= sqrt(sum(v_j^2)); final magnitude ≈ 1.0 ± 0.001.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/compute/08_compute-colonia-dna.ts
 *
 * Flags:
 *   --dry-run         Log preview sin mutar colonia_dna_vectors. NO UPSERT.
 *   --limit=N         Procesa sólo N colonias (default: 210, cap: 300).
 *   --country=XX      ISO country code (default: MX).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/types/database.ts';
import { withIngestRun } from '../ingest/lib/ingest-run-helper.ts';

type CliArgs = {
  dryRun: boolean;
  limit: number;
  country: string;
};

type ZoneRow = {
  id: string;
  scope_id: string;
  scope_type: string;
  country_code: string;
};

type ZoneGeoRow = ZoneRow & {
  lat: number | null;
  lng: number | null;
  h3_r8: string | null;
};

type ColoniaDnaInsert = Database['public']['Tables']['colonia_dna_vectors']['Insert'];

export type FeatureCategory = 'n_score' | 'dmx' | 'demographic' | 'macro' | 'h3' | 'padding';

export type FeatureContributor = {
  feature_name: string;
  contribution: number;
  category: FeatureCategory;
  dim_index: number;
};

export type FeatureInputs = {
  /** Raw score 0-100; missing → default 50. */
  nScores: Record<string, number | null>;
  /** Raw DMX value 0-100; missing → default 50. */
  dmxValues: Record<string, number | null>;
  /** Demographics raw value in [0, 1]; missing → deterministic hash via scopeId. */
  demographics: Record<string, number | null>;
  /** Macro normalized [0, 1]; missing → 0.5. */
  macro: Record<string, number | null>;
  /** Optional geo { lat, lng, h3 }; missing → deterministic hash. */
  geo: { lat: number | null; lng: number | null; h3: string | null };
  /** scope_id para fallback determinístico. */
  scopeId: string;
};

type FeatureBuildResult = {
  /** Raw [0,1] feature vector length 64, pre-normalization. */
  raw: number[];
  /** Per-dim metadata (name + category). */
  meta: Array<{ name: string; category: FeatureCategory }>;
  /** Counts of non-default (explicitly provided) features per category. */
  sources: { nScoresCoverage: number; dmxCoverage: number };
};

const DEFAULT_COUNTRY = 'MX';
const DEFAULT_LIMIT = 210;
const MAX_LIMIT_CAP = 300;
const VECTOR_DIM = 64;
const SOURCE = 'compute_colonia_dna';
const METHODOLOGY_VERSION = 'v1.0';
const EPSILON = 1e-12;
const SCOPE_TYPE_COLONIA = 'colonia';

// 23 N-score indicator codes (N0-N4 taxonomy subset, alphabetical).
export const N_SCORE_CODES: readonly string[] = [
  'A02',
  'A05',
  'B01',
  'B04',
  'C01',
  'F01',
  'F02',
  'F03',
  'F04',
  'F05',
  'F06',
  'F07',
  'F08',
  'F09',
  'F10',
  'F12',
  'F15',
  'H01',
  'H05',
  'H07',
  'H11',
  'H14',
  'H17',
];

// 14 DMX zone-scope index codes (alphabetical).
export const DMX_INDEX_CODES: readonly string[] = [
  'DEV',
  'FAM',
  'GNT',
  'GRN',
  'IAB',
  'ICO',
  'IDS',
  'IPV',
  'IRE',
  'LIV',
  'MOM',
  'STA',
  'STR',
  'YNG',
];

// 10 demographic feature keys (proxies; deterministic hash fallback H1).
export const DEMOGRAPHIC_KEYS: readonly string[] = [
  'population_density',
  'median_age',
  'household_size',
  'income_median',
  'education_years',
  'unemployment_rate',
  'youth_pct',
  'senior_pct',
  'foreign_born_pct',
  'rental_pct',
];

// 5 macro context feature keys (MX latest).
export const MACRO_KEYS: readonly string[] = [
  'inflation_yoy',
  'policy_rate',
  'fx_usd',
  'gdp_growth',
  'unemployment_national',
];

// 3 h3/geo-encoded dims + 9 padding zeros.
const H3_KEYS: readonly string[] = ['h3_lat_norm', 'h3_lng_norm', 'h3_hash_bucket'];
const PADDING_COUNT = 9;

const DIM_BREAKDOWN = {
  n_score: N_SCORE_CODES.length,
  dmx: DMX_INDEX_CODES.length,
  demographic: DEMOGRAPHIC_KEYS.length,
  macro: MACRO_KEYS.length,
  h3: H3_KEYS.length,
  padding: PADDING_COUNT,
} as const;

// Sanity-check at module load — fail fast si alguien altera constantes.
const TOTAL_DIMS =
  DIM_BREAKDOWN.n_score +
  DIM_BREAKDOWN.dmx +
  DIM_BREAKDOWN.demographic +
  DIM_BREAKDOWN.macro +
  DIM_BREAKDOWN.h3 +
  DIM_BREAKDOWN.padding;
if (TOTAL_DIMS !== VECTOR_DIM) {
  throw new Error(`[compute-colonia-dna] DIM_BREAKDOWN sum=${TOTAL_DIMS} ≠ ${VECTOR_DIM}`);
}

/**
 * Deterministic hash de (scope_id, dim_index) → número en [0, 1).
 * Misma firma que hashSeed en 07_compute-zone-pulse.ts — reimplementado inline
 * para evitar cross-script import (sibling B.1 completó script 07 en paralelo).
 */
export function hashSeed(scopeId: string, dimIndex: number): number {
  let h = 2166136261 ^ dimIndex;
  for (let i = 0; i < scopeId.length; i++) {
    h = Math.imul(h ^ scopeId.charCodeAt(i), 16777619);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limit = DEFAULT_LIMIT;
  let country = DEFAULT_COUNTRY;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-colonia-dna] --limit inválido: "${a}"`);
      }
      limit = n;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).trim().toUpperCase();
      if (raw === '' || raw.length !== 2) {
        throw new Error(`[compute-colonia-dna] --country inválido: "${a}"`);
      }
      country = raw;
    }
  }
  if (limit > MAX_LIMIT_CAP) {
    throw new Error(
      `[compute-colonia-dna] --limit=${limit} excede cap=${MAX_LIMIT_CAP}. Ajustar o seed más colonias.`,
    );
  }
  return { dryRun, limit, country };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(
      `[compute-colonia-dna] Falta env var requerida: ${name}. Exportala antes de correr.`,
    );
  }
  return v;
}

/**
 * Mapea score raw 0-100 → [0, 1]. Default 50 si null.
 */
function normalizeScore(value: number | null | undefined, defaultRaw = 50): number {
  const v = value == null || !Number.isFinite(value) ? defaultRaw : value;
  const clamped = Math.max(0, Math.min(100, v));
  return clamped / 100;
}

/**
 * Mapea valor [0, 1] → [0, 1]. Default 0.5 si null.
 */
function normalizeUnit(value: number | null | undefined, defaultVal = 0.5): number {
  const v = value == null || !Number.isFinite(value) ? defaultVal : value;
  return Math.max(0, Math.min(1, v));
}

/**
 * Extrae 3 dimensiones determinísticas del geo:
 *   - lat normalizada a [0,1] via (lat + 90) / 180
 *   - lng normalizada a [0,1] via (lng + 180) / 360
 *   - hash bucket determinístico sobre (h3 || `${lat},${lng}` || scopeId)
 * Si no hay geo, fallback a hashSeed(scopeId, 52..54).
 */
function encodeGeo(
  geo: FeatureInputs['geo'],
  scopeId: string,
): { latNorm: number; lngNorm: number; hashBucket: number } {
  const lat = geo.lat;
  const lng = geo.lng;
  const h3 = geo.h3;

  const latNorm =
    lat == null || !Number.isFinite(lat)
      ? hashSeed(scopeId, 52)
      : Math.max(0, Math.min(1, (lat + 90) / 180));
  const lngNorm =
    lng == null || !Number.isFinite(lng)
      ? hashSeed(scopeId, 53)
      : Math.max(0, Math.min(1, (lng + 180) / 360));
  const bucketSeed = h3 ?? (lat != null && lng != null ? `${lat},${lng}` : scopeId);
  const hashBucket = hashSeed(bucketSeed, 54);
  return { latNorm, lngNorm, hashBucket };
}

/**
 * Construye el vector raw [0,1]^64 pre-normalización + metadata per-dim.
 * Orden exacto: n_score (23) → dmx (14) → demographic (10) → macro (5) → h3 (3) → padding (9).
 */
export function buildFeatureVector(inputs: FeatureInputs): FeatureBuildResult {
  const raw: number[] = [];
  const meta: Array<{ name: string; category: FeatureCategory }> = [];
  let nScoresCoverage = 0;
  let dmxCoverage = 0;

  // Dims 0..22 — N-scores
  for (const code of N_SCORE_CODES) {
    const rawVal = inputs.nScores[code];
    if (rawVal != null && Number.isFinite(rawVal)) nScoresCoverage += 1;
    raw.push(normalizeScore(rawVal));
    meta.push({ name: code, category: 'n_score' });
  }

  // Dims 23..36 — DMX
  for (const code of DMX_INDEX_CODES) {
    const rawVal = inputs.dmxValues[code];
    if (rawVal != null && Number.isFinite(rawVal)) dmxCoverage += 1;
    raw.push(normalizeScore(rawVal));
    meta.push({ name: `DMX_${code}`, category: 'dmx' });
  }

  // Dims 37..46 — demographics (hash fallback si missing)
  for (let i = 0; i < DEMOGRAPHIC_KEYS.length; i++) {
    const key = DEMOGRAPHIC_KEYS[i] ?? `demo_${i}`;
    const provided = inputs.demographics[key];
    const value =
      provided != null && Number.isFinite(provided)
        ? normalizeUnit(provided)
        : hashSeed(inputs.scopeId, 37 + i);
    raw.push(value);
    meta.push({ name: key, category: 'demographic' });
  }

  // Dims 47..51 — macro
  for (const key of MACRO_KEYS) {
    raw.push(normalizeUnit(inputs.macro[key]));
    meta.push({ name: key, category: 'macro' });
  }

  // Dims 52..54 — h3/geo
  const geoEncoded = encodeGeo(inputs.geo, inputs.scopeId);
  raw.push(geoEncoded.latNorm);
  meta.push({ name: 'h3_lat_norm', category: 'h3' });
  raw.push(geoEncoded.lngNorm);
  meta.push({ name: 'h3_lng_norm', category: 'h3' });
  raw.push(geoEncoded.hashBucket);
  meta.push({ name: 'h3_hash_bucket', category: 'h3' });

  // Dims 55..63 — padding
  for (let i = 0; i < PADDING_COUNT; i++) {
    raw.push(0);
    meta.push({ name: `padding_${i}`, category: 'padding' });
  }

  if (raw.length !== VECTOR_DIM) {
    throw new Error(`[compute-colonia-dna] raw length=${raw.length} ≠ ${VECTOR_DIM}`);
  }

  return { raw, meta, sources: { nScoresCoverage, dmxCoverage } };
}

/**
 * L2-normalize in place-safe: retorna vector nuevo con magnitude ≈ 1.0.
 * All-zeros input → retorna zero vector (no divide by zero).
 */
export function normalizeVector(raw: readonly number[]): number[] {
  let sumSquares = 0;
  for (const v of raw) sumSquares += v * v;
  const magnitude = Math.sqrt(sumSquares);
  if (magnitude < EPSILON) {
    return raw.map(() => 0);
  }
  return raw.map((v) => v / magnitude);
}

/**
 * Top-5 contributors por magnitude (DESC) computados sobre raw [0,1] vector
 * ANTES de L2 (D10 + U-C-3 spec).
 */
export function computeTopContributors(
  raw: readonly number[],
  meta: ReadonlyArray<{ name: string; category: FeatureCategory }>,
  topN = 5,
): FeatureContributor[] {
  if (raw.length !== meta.length) {
    throw new Error(
      `[compute-colonia-dna] computeTopContributors: raw.length=${raw.length} ≠ meta.length=${meta.length}`,
    );
  }
  const indexed: FeatureContributor[] = raw.map((value, idx) => {
    const m = meta[idx];
    const name = m?.name ?? `dim_${idx}`;
    const category = m?.category ?? 'padding';
    return {
      feature_name: name,
      contribution: Number(Math.abs(value).toFixed(6)),
      category,
      dim_index: idx,
    };
  });
  indexed.sort((a, b) => b.contribution - a.contribution);
  return indexed.slice(0, topN);
}

/**
 * pgvector text format: `[v0,v1,...,v63]` con 8 decimales.
 */
export function serializePgVector(vector: readonly number[]): string {
  if (vector.length !== VECTOR_DIM) {
    throw new Error(
      `[compute-colonia-dna] serializePgVector: length=${vector.length} ≠ ${VECTOR_DIM}`,
    );
  }
  return `[${vector.map((v) => v.toFixed(8)).join(',')}]`;
}

export async function fetchColoniaZones(
  supabase: SupabaseClient<Database>,
  country: string,
  limit: number,
): Promise<ZoneGeoRow[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, scope_id, scope_type, country_code, lat, lng, h3_r8')
    .eq('country_code', country)
    .eq('scope_type', SCOPE_TYPE_COLONIA)
    .order('scope_id', { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`[compute-colonia-dna] zones fetch: ${error.message}`);
  }
  return (data ?? []) as ZoneGeoRow[];
}

export async function fetchLatestZoneScores(
  supabase: SupabaseClient<Database>,
  zoneId: string,
  country: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('zone_scores')
    .select('score_type, score_value, period_date')
    .eq('zone_id', zoneId)
    .eq('country_code', country)
    .in('score_type', N_SCORE_CODES as string[])
    .order('period_date', { ascending: false })
    .limit(500);
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data) {
    const code = row.score_type;
    if (!N_SCORE_CODES.includes(code)) continue;
    if (out[code] != null) continue; // ya captured (latest first por orden)
    if (typeof row.score_value !== 'number' || !Number.isFinite(row.score_value)) continue;
    out[code] = row.score_value;
  }
  return out;
}

export async function fetchLatestDmxIndices(
  supabase: SupabaseClient<Database>,
  scopeId: string,
  country: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('dmx_indices')
    .select('index_code, value, period_date')
    .eq('scope_id', scopeId)
    .eq('scope_type', SCOPE_TYPE_COLONIA)
    .eq('country_code', country)
    .eq('is_shadow', false)
    .in('index_code', DMX_INDEX_CODES as string[])
    .order('period_date', { ascending: false })
    .limit(200);
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data) {
    const code = row.index_code;
    if (!DMX_INDEX_CODES.includes(code)) continue;
    if (out[code] != null) continue;
    if (typeof row.value !== 'number' || !Number.isFinite(row.value)) continue;
    out[code] = row.value;
  }
  return out;
}

/**
 * Fetch macro_series latest value per metric_name for MX. Normalizes raw domain
 * values into [0, 1] via clamp-to-typical-range rough heuristic (H1):
 *   inflation_yoy (% 0-20)          → /20
 *   policy_rate (% 0-20)            → /20
 *   fx_usd (MXN/USD 10-30)          → (v-10)/20
 *   gdp_growth (-10 to +10)         → (v+10)/20
 *   unemployment_national (% 0-20)  → /20
 * Defaults a 0.5 si falta o fuera de rango.
 */
export function normalizeMacroValue(metric: string, value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  switch (metric) {
    case 'inflation_yoy':
    case 'policy_rate':
    case 'unemployment_national':
      return Math.max(0, Math.min(1, value / 20));
    case 'fx_usd':
      return Math.max(0, Math.min(1, (value - 10) / 20));
    case 'gdp_growth':
      return Math.max(0, Math.min(1, (value + 10) / 20));
    default:
      return 0.5;
  }
}

export async function fetchLatestMacroSeries(
  supabase: SupabaseClient<Database>,
  country: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('macro_series')
    .select('metric_name, value, period_end')
    .eq('country_code', country)
    .in('metric_name', MACRO_KEYS as string[])
    .order('period_end', { ascending: false })
    .limit(500);
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data) {
    const key = row.metric_name;
    if (!MACRO_KEYS.includes(key)) continue;
    if (out[key] != null) continue;
    if (typeof row.value !== 'number' || !Number.isFinite(row.value)) continue;
    out[key] = normalizeMacroValue(key, row.value);
  }
  return out;
}

async function computeDnaForColonia(
  supabase: SupabaseClient<Database>,
  zone: ZoneGeoRow,
  country: string,
  macro: Record<string, number>,
): Promise<ColoniaDnaInsert> {
  const [nScores, dmxValues] = await Promise.all([
    fetchLatestZoneScores(supabase, zone.id, country),
    fetchLatestDmxIndices(supabase, zone.scope_id, country),
  ]);

  const inputs: FeatureInputs = {
    nScores,
    dmxValues,
    demographics: {}, // zone_demographics table no existe → hash fallback
    macro,
    geo: { lat: zone.lat, lng: zone.lng, h3: zone.h3_r8 },
    scopeId: zone.scope_id,
  };

  const { raw, meta, sources } = buildFeatureVector(inputs);
  const topContributors = computeTopContributors(raw, meta, 5);
  const normalized = normalizeVector(raw);
  const pgVector = serializePgVector(normalized);

  const components = {
    top_5_contributors: topContributors,
    category_breakdown: DIM_BREAKDOWN,
    feature_sources: {
      n_scores_coverage: sources.nScoresCoverage,
      dmx_coverage: sources.dmxCoverage,
      demographics_fallback: 'hash_deterministic_h1',
      macro_country: country,
    },
  };

  return {
    colonia_id: zone.id,
    country_code: country,
    vector: pgVector,
    components: components as unknown as ColoniaDnaInsert['components'],
    methodology_version: METHODOLOGY_VERSION,
  };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const tag = '[compute-colonia-dna]';
  console.log(`${tag} dryRun=${args.dryRun} country=${args.country} limit=${args.limit}`);

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const zones = await fetchColoniaZones(supabase, args.country, args.limit);
  console.log(`${tag} colonias_matched=${zones.length}`);

  if (zones.length === 0) {
    console.warn(`${tag} No hay colonias para country=${args.country}. Exit clean.`);
    return 0;
  }

  const macro = await fetchLatestMacroSeries(supabase, args.country);
  console.log(`${tag} macro_keys_available=${Object.keys(macro).length}/${MACRO_KEYS.length}`);

  if (args.dryRun) {
    const sample = zones.slice(0, 3);
    for (const zone of sample) {
      const row = await computeDnaForColonia(supabase, zone, args.country, macro);
      const magnitude = Math.sqrt(
        row.vector
          .slice(1, -1)
          .split(',')
          .map((s) => Number.parseFloat(s))
          .reduce((acc, v) => acc + v * v, 0),
      );
      console.log(
        `${tag} DRY scope_id=${zone.scope_id} magnitude=${magnitude.toFixed(6)} components_preview=${JSON.stringify(
          row.components,
        ).slice(0, 160)}...`,
      );
    }
    console.log(`${tag} DRY RUN — would upsert ${zones.length} colonia_dna_vectors rows`);
    return 0;
  }

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: args.country,
      triggeredBy: 'cli:compute-colonia-dna',
      expectedPeriodicity: 'on_demand',
      meta: {
        script: '08_compute-colonia-dna.ts',
        colonias_total: zones.length,
        methodology_version: METHODOLOGY_VERSION,
        vector_dim: VECTOR_DIM,
      },
    },
    async () => {
      let processed = 0;
      let dlq = 0;
      const skipped = 0;
      for (const zone of zones) {
        try {
          const row = await computeDnaForColonia(supabase, zone, args.country, macro);
          const { error } = await supabase
            .from('colonia_dna_vectors')
            .upsert(row, { onConflict: 'colonia_id' });
          if (error) {
            dlq += 1;
            console.error(`${tag} upsert fail scope_id=${zone.scope_id}: ${error.message}`);
          } else {
            processed += 1;
          }
        } catch (e) {
          dlq += 1;
          console.error(
            `${tag} throw scope_id=${zone.scope_id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      return {
        counts: { inserted: 0, updated: processed, skipped, dlq },
        lastSuccessfulPeriodEnd: new Date().toISOString().slice(0, 10),
      };
    },
  );

  console.log(
    `${tag} done: status=${result.status} counts=${JSON.stringify(result.counts)} duration_ms=${result.durationMs}`,
  );
  return result.status === 'success' ? 0 : 1;
}

const invokedAsScript =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedAsScript) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      console.error('[compute-colonia-dna] FATAL:', err);
      process.exit(1);
    });
}
