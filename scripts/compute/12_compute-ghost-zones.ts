#!/usr/bin/env node
/**
 * Batch compute ghost_zones_ranking para todas las colonias MX registradas en
 * public.zones (scope_type='colonia'). Determinista (zero LLM). Cada fila
 * persiste un `ghost_score` 0-100 compuesto por 4 factores + `transition_probability`
 * [0,1] via sigmoid (U-D-4 spec) + `rank` ordinal DESC por ghost_score.
 *
 * Factores (pesos sumados = 1.00):
 *   F1 — pulse_trend_down_12m  (30%): regresión lineal simple sobre pulse_score
 *                                      365d de zone_pulse_scores. slope <= -0.1 → 100;
 *                                      slope >= 0.1 → 0; lineal; missing → 50.
 *   F2 — price_stagnant_proxy  (25%): |delta|<=2% delta 12m sobre zone_scores
 *                                      (F01..F05 family). |delta|<=2 → 100;
 *                                      |delta|>=20 → 0; <2 puntos → 50.
 *   F3 — demographics_aging    (20%): aging_share = suma pct buckets >=45 en
 *                                      inegi_census_zone_stats.age_distribution.
 *                                      50% → 100, 25% → 0, lineal; missing → 50.
 *   F4 — occupancy_low         (25%): latest dmx_indices STA (stability proxy).
 *                                      value<=30 → 100, value>=80 → 0, lineal;
 *                                      missing → 50.
 *
 * Transition probability (U-D-4):
 *   z = 0.02*ghost_score + 0.01*negative_momentum + 0.5*dna_sim_top5_ghosts_avg - 2
 *   transition_probability = sigmoid(z) ∈ [0, 1]
 *   Donde:
 *     negative_momentum = max(0, -slope_per_day * 100)  (de F1)
 *     dna_sim_top5_ghosts_avg = avg cosine similarity vector 64-dim contra los
 *                                top-5 seed ghosts (excluye self).
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
 *     node --experimental-strip-types scripts/compute/12_compute-ghost-zones.ts
 *
 * Flags:
 *   --dry-run         Log preview 10 sample colonias sin mutar ghost_zones_ranking.
 *   --limit=N         Procesa sólo N colonias (default: 210).
 *   --threshold=N     Umbral logging ghost-prone (default: 60). No skippea upserts.
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
  threshold: number;
  country: string;
};

type ZoneRow = {
  id: string;
  scope_id: string;
  scope_type: string;
  country_code: string;
};

type GhostRankingInsert = Database['public']['Tables']['ghost_zones_ranking']['Insert'];

export type PulsePoint = { dayIndex: number; pulseScore: number };

export type AgeBucket = { age_group: string; percentage: number };

export type Factors = {
  f1_pulse_trend_down: number;
  f2_price_stagnant: number;
  f3_demographics_aging: number;
  f4_occupancy_low: number;
  slope_per_day: number;
};

export type GhostComputation = {
  zoneId: string;
  scopeId: string;
  factors: Factors;
  ghostScore: number;
  negativeMomentum: number;
  dnaVector: number[] | null;
  transitionProbability: number | null;
  rank: number;
};

const DEFAULT_COUNTRY = 'MX';
const DEFAULT_LIMIT = 210;
const DEFAULT_THRESHOLD = 60;
const MAX_LIMIT_CAP = 300;
const SOURCE = 'compute_ghost_zones';
const METHODOLOGY_VERSION = 'v1.0';
const SCOPE_TYPE_COLONIA = 'colonia';
const VECTOR_DIM = 64;
const UPSERT_CHUNK = 500;
const PULSE_LOOKBACK_DAYS = 365;
const PRICE_FAMILY_CODES: readonly string[] = ['F01', 'F02', 'F03', 'F04', 'F05'];
const DMX_STA_CODE = 'STA';
const TOP_SEED_GHOSTS = 5;

export const FACTOR_WEIGHTS = {
  f1: 0.3,
  f2: 0.25,
  f3: 0.2,
  f4: 0.25,
} as const;

// Sanity: weights sum 1.00.
const WEIGHT_SUM = FACTOR_WEIGHTS.f1 + FACTOR_WEIGHTS.f2 + FACTOR_WEIGHTS.f3 + FACTOR_WEIGHTS.f4;
if (Math.abs(WEIGHT_SUM - 1.0) > 1e-9) {
  throw new Error(`[compute-ghost-zones] FACTOR_WEIGHTS sum=${WEIGHT_SUM} ≠ 1.00`);
}

function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limit = DEFAULT_LIMIT;
  let threshold = DEFAULT_THRESHOLD;
  let country = DEFAULT_COUNTRY;
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`[compute-ghost-zones] --limit inválido: "${a}"`);
      }
      limit = n;
    } else if (a.startsWith('--threshold=')) {
      const n = Number.parseFloat(a.slice('--threshold='.length));
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        throw new Error(`[compute-ghost-zones] --threshold inválido: "${a}"`);
      }
      threshold = n;
    } else if (a.startsWith('--country=')) {
      const raw = a.slice('--country='.length).trim().toUpperCase();
      if (raw === '' || raw.length !== 2) {
        throw new Error(`[compute-ghost-zones] --country inválido: "${a}"`);
      }
      country = raw;
    }
  }
  if (limit > MAX_LIMIT_CAP) {
    throw new Error(
      `[compute-ghost-zones] --limit=${limit} excede cap=${MAX_LIMIT_CAP}. Ajustar o seed más colonias.`,
    );
  }
  return { dryRun, limit, threshold, country };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (v == null || v === '') {
    throw new Error(
      `[compute-ghost-zones] Falta env var requerida: ${name}. Exportala antes de correr.`,
    );
  }
  return v;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear regression slope sobre array de puntos (x=dayIndex, y=pulseScore).
 * Retorna 0 para <2 puntos o si todos los x son iguales.
 */
export function computeLinearSlope(points: ReadonlyArray<PulsePoint>): number {
  if (points.length < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.dayIndex;
    sumY += p.pulseScore;
  }
  const n = points.length;
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    const dx = p.dayIndex - meanX;
    num += dx * (p.pulseScore - meanY);
    den += dx * dx;
  }
  if (den === 0) return 0;
  return num / den;
}

/**
 * F1 — pulse_trend_down: slope <= -0.1 → 100; slope >= 0.1 → 0; lineal; <1 pt → 50.
 */
export function factorPulseTrendDown(points: ReadonlyArray<PulsePoint>): number {
  if (points.length === 0) return 50;
  if (points.length < 2) return 50;
  const slope = computeLinearSlope(points);
  // slope <= -0.1 → 100; slope >= 0.1 → 0.
  // Linear: contribution = (0.1 - slope) / 0.2 * 100.
  const raw = ((0.1 - slope) / 0.2) * 100;
  return clamp(raw, 0, 100);
}

/**
 * F2 — price_stagnant_proxy: |delta|<=2% → 100; |delta|>=20% → 0; lineal; <2 pts → 50.
 * Recibe pareja (latestValue, twelveMonthsAgoValue).
 */
export function factorPriceStagnant(
  latest: number | null | undefined,
  twelveMonthsAgo: number | null | undefined,
): number {
  if (
    latest == null ||
    twelveMonthsAgo == null ||
    !Number.isFinite(latest) ||
    !Number.isFinite(twelveMonthsAgo)
  ) {
    return 50;
  }
  if (twelveMonthsAgo === 0) {
    // Evitar divide-by-zero; tratar como neutral.
    return 50;
  }
  const deltaPct = ((latest - twelveMonthsAgo) / Math.abs(twelveMonthsAgo)) * 100;
  const absDelta = Math.abs(deltaPct);
  if (absDelta <= 2) return 100;
  if (absDelta >= 20) return 0;
  // Linear: contribution = 100 * (20 - absDelta) / 18.
  const raw = (100 * (20 - absDelta)) / 18;
  return clamp(raw, 0, 100);
}

/**
 * F3 — demographics_aging: aging_share (pct 45+) 50% → 100, 25% → 0, lineal.
 * Acepta array de buckets {age_group, percentage}; missing/empty → 50 neutral.
 */
export function factorDemographicsAging(
  buckets: ReadonlyArray<AgeBucket> | null | undefined,
): number {
  if (buckets == null || buckets.length === 0) return 50;
  let agingShare = 0;
  let hasData = false;
  for (const b of buckets) {
    if (typeof b.percentage !== 'number' || !Number.isFinite(b.percentage)) continue;
    hasData = true;
    const group = b.age_group;
    // Buckets considerados "aging" (>=45): 45-59, 60-74, 75+, 45+, 60+, 65+, 75+.
    if (
      group === '45-59' ||
      group === '60-74' ||
      group === '75+' ||
      group === '45+' ||
      group === '60+' ||
      group === '65+'
    ) {
      agingShare += b.percentage;
    }
  }
  if (!hasData) return 50;
  // aging_share 25 → 0; 50 → 100. Linear.
  const raw = ((agingShare - 25) / 25) * 100;
  return clamp(raw, 0, 100);
}

/**
 * F4 — occupancy_low (STA proxy): value<=30 → 100; value>=80 → 0; lineal; missing → 50.
 */
export function factorOccupancyLow(staValue: number | null | undefined): number {
  if (staValue == null || !Number.isFinite(staValue)) return 50;
  const v = clamp(staValue, 0, 100);
  if (v <= 30) return 100;
  if (v >= 80) return 0;
  // Linear: contribution = 100 * (80 - v) / 50.
  const raw = (100 * (80 - v)) / 50;
  return clamp(raw, 0, 100);
}

/**
 * Composite ghost_score 0-100 con pesos FACTOR_WEIGHTS (30/25/20/25).
 */
export function computeGhostScore(factors: Omit<Factors, 'slope_per_day'>): number {
  const score =
    FACTOR_WEIGHTS.f1 * factors.f1_pulse_trend_down +
    FACTOR_WEIGHTS.f2 * factors.f2_price_stagnant +
    FACTOR_WEIGHTS.f3 * factors.f3_demographics_aging +
    FACTOR_WEIGHTS.f4 * factors.f4_occupancy_low;
  return clamp(score, 0, 100);
}

/**
 * Sigmoid canónica: 1 / (1 + e^-x).
 */
export function sigmoid(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  if (x > 500) return 1;
  if (x < -500) return 0;
  return 1 / (1 + Math.exp(-x));
}

/**
 * Cosine similarity sobre dos vectores de dimensión arbitraria (pero iguales).
 * Retorna 0 si alguno tiene magnitud 0 o longitudes difieren.
 */
export function cosineSimilarity64(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * pgvector text format `[v0,v1,...,vN]` → number[]. Retorna null si inválido.
 */
export function parsePgVector64(raw: string | null | undefined): number[] | null {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null;
  const inner = trimmed.slice(1, -1);
  if (inner.length === 0) return null;
  const parts = inner.split(',');
  const out: number[] = [];
  for (const p of parts) {
    const n = Number.parseFloat(p);
    if (!Number.isFinite(n)) return null;
    out.push(n);
  }
  if (out.length !== VECTOR_DIM) return null;
  return out;
}

/**
 * Transition probability via sigmoid (U-D-4).
 */
export function computeTransitionProbability(
  ghostScore: number,
  negativeMomentum: number,
  dnaSimTop5GhostsAvg: number,
): number {
  const z = 0.02 * ghostScore + 0.01 * negativeMomentum + 0.5 * dnaSimTop5GhostsAvg - 2;
  return clamp(sigmoid(z), 0, 1);
}

/**
 * Negative momentum derivado del slope F1. slope=-0.1 → 10.
 */
export function computeNegativeMomentum(slopePerDay: number): number {
  if (!Number.isFinite(slopePerDay)) return 0;
  return Math.max(0, -slopePerDay * 100);
}

// ========================================================================
// Data fetchers
// ========================================================================

export async function fetchColoniaZones(
  supabase: SupabaseClient<Database>,
  country: string,
  limit: number,
): Promise<ZoneRow[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, scope_id, scope_type, country_code')
    .eq('country_code', country)
    .eq('scope_type', SCOPE_TYPE_COLONIA)
    .order('scope_id', { ascending: true })
    .limit(limit);
  if (error) {
    throw new Error(`[compute-ghost-zones] zones fetch: ${error.message}`);
  }
  return (data ?? []) as ZoneRow[];
}

export async function fetchPulseHistory(
  supabase: SupabaseClient<Database>,
  scopeId: string,
  country: string,
): Promise<PulsePoint[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PULSE_LOOKBACK_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('zone_pulse_scores')
    .select('period_date, pulse_score')
    .eq('scope_id', scopeId)
    .eq('scope_type', SCOPE_TYPE_COLONIA)
    .eq('country_code', country)
    .gte('period_date', cutoffStr)
    .order('period_date', { ascending: true });
  if (error || !data) return [];
  const base = new Date(cutoffStr).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const out: PulsePoint[] = [];
  for (const row of data) {
    if (typeof row.pulse_score !== 'number' || !Number.isFinite(row.pulse_score)) continue;
    const d = new Date(row.period_date).getTime();
    const dayIndex = Math.round((d - base) / dayMs);
    out.push({ dayIndex, pulseScore: row.pulse_score });
  }
  return out;
}

export async function fetchPriceDelta(
  supabase: SupabaseClient<Database>,
  zoneId: string,
  country: string,
): Promise<{ latest: number | null; twelveMonthsAgo: number | null }> {
  const { data, error } = await supabase
    .from('zone_scores')
    .select('score_type, score_value, period_date')
    .eq('zone_id', zoneId)
    .eq('country_code', country)
    .in('score_type', PRICE_FAMILY_CODES as string[])
    .order('period_date', { ascending: false })
    .limit(1000);
  if (error || !data || data.length === 0) {
    return { latest: null, twelveMonthsAgo: null };
  }
  // Average per period across family codes (simple proxy).
  const byPeriod = new Map<string, { sum: number; count: number }>();
  for (const row of data) {
    if (typeof row.score_value !== 'number' || !Number.isFinite(row.score_value)) continue;
    const existing = byPeriod.get(row.period_date);
    if (existing) {
      existing.sum += row.score_value;
      existing.count += 1;
    } else {
      byPeriod.set(row.period_date, { sum: row.score_value, count: 1 });
    }
  }
  if (byPeriod.size === 0) return { latest: null, twelveMonthsAgo: null };
  const sortedPeriods = Array.from(byPeriod.keys()).sort((a, b) => (a < b ? 1 : -1));
  const latestKey = sortedPeriods[0];
  if (latestKey == null) return { latest: null, twelveMonthsAgo: null };
  const latestAgg = byPeriod.get(latestKey);
  const latest = latestAgg != null ? latestAgg.sum / latestAgg.count : null;
  // Find period approximately 12 months before latestKey (closest available).
  const latestDate = new Date(latestKey).getTime();
  const targetDate = latestDate - 365 * 24 * 60 * 60 * 1000;
  let bestKey: string | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const key of sortedPeriods) {
    if (key === latestKey) continue;
    const diff = Math.abs(new Date(key).getTime() - targetDate);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestKey = key;
    }
  }
  let twelveMonthsAgo: number | null = null;
  if (bestKey != null) {
    const agg = byPeriod.get(bestKey);
    twelveMonthsAgo = agg != null ? agg.sum / agg.count : null;
  }
  return { latest, twelveMonthsAgo };
}

export async function fetchAgeDistribution(
  supabase: SupabaseClient<Database>,
  zoneId: string,
): Promise<AgeBucket[]> {
  const { data, error } = await supabase
    .from('inegi_census_zone_stats')
    .select('age_distribution, snapshot_date')
    .eq('zone_id', zoneId)
    .order('snapshot_date', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return [];
  const row = data[0];
  if (row == null) return [];
  const dist = row.age_distribution;
  if (!Array.isArray(dist)) return [];
  const out: AgeBucket[] = [];
  for (const entry of dist) {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const ageGroup = record.age_group;
    const percentage = record.percentage;
    if (typeof ageGroup !== 'string') continue;
    if (typeof percentage !== 'number' || !Number.isFinite(percentage)) continue;
    out.push({ age_group: ageGroup, percentage });
  }
  return out;
}

export async function fetchStaValue(
  supabase: SupabaseClient<Database>,
  scopeId: string,
  country: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('dmx_indices')
    .select('value, period_date')
    .eq('scope_id', scopeId)
    .eq('scope_type', SCOPE_TYPE_COLONIA)
    .eq('country_code', country)
    .eq('is_shadow', false)
    .eq('index_code', DMX_STA_CODE)
    .order('period_date', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  if (row == null) return null;
  if (typeof row.value !== 'number' || !Number.isFinite(row.value)) return null;
  return row.value;
}

export async function fetchColoniaDnaVector(
  supabase: SupabaseClient<Database>,
  coloniaId: string,
): Promise<number[] | null> {
  const { data, error } = await supabase
    .from('colonia_dna_vectors')
    .select('vector')
    .eq('colonia_id', coloniaId)
    .limit(1)
    .maybeSingle();
  if (error || data == null) return null;
  return parsePgVector64(data.vector);
}

// ========================================================================
// Main pipeline
// ========================================================================

async function computeFactorsForColonia(
  supabase: SupabaseClient<Database>,
  zone: ZoneRow,
  country: string,
): Promise<{ factors: Factors; dnaVector: number[] | null }> {
  const [pulse, priceDelta, ageBuckets, staValue, dnaVector] = await Promise.all([
    fetchPulseHistory(supabase, zone.scope_id, country),
    fetchPriceDelta(supabase, zone.id, country),
    fetchAgeDistribution(supabase, zone.id),
    fetchStaValue(supabase, zone.scope_id, country),
    fetchColoniaDnaVector(supabase, zone.id),
  ]);

  const slopePerDay = computeLinearSlope(pulse);
  const factors: Factors = {
    f1_pulse_trend_down: factorPulseTrendDown(pulse),
    f2_price_stagnant: factorPriceStagnant(priceDelta.latest, priceDelta.twelveMonthsAgo),
    f3_demographics_aging: factorDemographicsAging(ageBuckets),
    f4_occupancy_low: factorOccupancyLow(staValue),
    slope_per_day: slopePerDay,
  };
  return { factors, dnaVector };
}

function identifyTopSeedGhosts(
  computations: ReadonlyArray<GhostComputation>,
  topN: number,
): GhostComputation[] {
  const withVector = computations.filter(
    (c) => c.dnaVector != null && c.dnaVector.length === VECTOR_DIM,
  );
  const sorted = [...withVector].sort((a, b) => b.ghostScore - a.ghostScore);
  return sorted.slice(0, topN);
}

export function computeDnaSimilarityToSeeds(
  selfVector: number[] | null,
  selfZoneId: string,
  seeds: ReadonlyArray<GhostComputation>,
): number {
  if (selfVector == null || selfVector.length !== VECTOR_DIM) return 0.5;
  const sims: number[] = [];
  for (const seed of seeds) {
    if (seed.zoneId === selfZoneId) continue;
    if (seed.dnaVector == null) continue;
    const sim = cosineSimilarity64(selfVector, seed.dnaVector);
    // cosine similarity ∈ [-1, 1]. Rescale to [0, 1].
    sims.push((sim + 1) / 2);
  }
  if (sims.length === 0) return 0.5;
  let sum = 0;
  for (const s of sims) sum += s;
  return sum / sims.length;
}

function formatPreview(comp: GhostComputation): string {
  const f = comp.factors;
  return (
    `scope_id=${comp.scopeId} rank=${comp.rank} ghost=${comp.ghostScore.toFixed(2)} ` +
    `F1=${f.f1_pulse_trend_down.toFixed(1)} F2=${f.f2_price_stagnant.toFixed(1)} ` +
    `F3=${f.f3_demographics_aging.toFixed(1)} F4=${f.f4_occupancy_low.toFixed(1)} ` +
    `tp=${comp.transitionProbability != null ? comp.transitionProbability.toFixed(3) : 'null'}`
  );
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv);
  const tag = '[compute-ghost-zones]';
  console.log(
    `${tag} dryRun=${args.dryRun} country=${args.country} limit=${args.limit} threshold=${args.threshold}`,
  );

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

  const periodDate = new Date().toISOString().slice(0, 10);

  if (args.dryRun) {
    const sample = zones.slice(0, Math.min(10, zones.length));
    const partial: GhostComputation[] = [];
    for (const zone of sample) {
      const { factors, dnaVector } = await computeFactorsForColonia(supabase, zone, args.country);
      const ghostScore = computeGhostScore(factors);
      const negativeMomentum = computeNegativeMomentum(factors.slope_per_day);
      partial.push({
        zoneId: zone.id,
        scopeId: zone.scope_id,
        factors,
        ghostScore,
        negativeMomentum,
        dnaVector,
        transitionProbability: null,
        rank: 0,
      });
    }
    partial.sort((a, b) => b.ghostScore - a.ghostScore);
    const seeds = identifyTopSeedGhosts(partial, TOP_SEED_GHOSTS);
    partial.forEach((c, idx) => {
      c.rank = idx + 1;
      const dnaSim = computeDnaSimilarityToSeeds(c.dnaVector, c.zoneId, seeds);
      c.transitionProbability = computeTransitionProbability(
        c.ghostScore,
        c.negativeMomentum,
        dnaSim,
      );
    });
    for (const c of partial) {
      console.log(`${tag} DRY ${formatPreview(c)}`);
    }
    console.log(`${tag} DRY RUN — would upsert ${zones.length} ghost_zones_ranking rows`);
    return 0;
  }

  const result = await withIngestRun(
    supabase,
    {
      source: SOURCE,
      countryCode: args.country,
      triggeredBy: 'cli:compute-ghost-zones',
      expectedPeriodicity: 'monthly',
      meta: {
        script: '12_compute-ghost-zones.ts',
        colonias_total: zones.length,
        threshold: args.threshold,
        period_date: periodDate,
        methodology_version: METHODOLOGY_VERSION,
      },
    },
    async () => {
      // Phase 1: factors + ghostScore + dna vector per colonia.
      const computations: GhostComputation[] = [];
      let fetchDlq = 0;
      for (const zone of zones) {
        try {
          const { factors, dnaVector } = await computeFactorsForColonia(
            supabase,
            zone,
            args.country,
          );
          const ghostScore = computeGhostScore(factors);
          const negativeMomentum = computeNegativeMomentum(factors.slope_per_day);
          computations.push({
            zoneId: zone.id,
            scopeId: zone.scope_id,
            factors,
            ghostScore,
            negativeMomentum,
            dnaVector,
            transitionProbability: null,
            rank: 0,
          });
        } catch (e) {
          fetchDlq += 1;
          console.error(
            `${tag} compute fail scope_id=${zone.scope_id}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      // Phase 2: rank + top-5 seed ghosts + transition_probability.
      computations.sort((a, b) => b.ghostScore - a.ghostScore);
      const seeds = identifyTopSeedGhosts(computations, TOP_SEED_GHOSTS);
      computations.forEach((c, idx) => {
        c.rank = idx + 1;
        const dnaSim = computeDnaSimilarityToSeeds(c.dnaVector, c.zoneId, seeds);
        c.transitionProbability = computeTransitionProbability(
          c.ghostScore,
          c.negativeMomentum,
          dnaSim,
        );
      });

      const aboveThreshold = computations.filter((c) => c.ghostScore >= args.threshold).length;
      console.log(
        `${tag} ranking ready: above_threshold(${args.threshold})=${aboveThreshold}/${computations.length} seeds=${seeds.length}`,
      );

      // Phase 3: build rows + upsert chunked.
      const rows: GhostRankingInsert[] = computations.map((c) => ({
        colonia_id: c.zoneId,
        country_code: args.country,
        period_date: periodDate,
        ghost_score: Number(c.ghostScore.toFixed(4)),
        score_total: Number(c.ghostScore.toFixed(4)),
        search_volume: 0,
        press_mentions: 0,
        rank: c.rank,
        transition_probability:
          c.transitionProbability != null ? Number(c.transitionProbability.toFixed(6)) : null,
      }));

      let upserted = 0;
      let upsertDlq = 0;
      for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
        const chunk = rows.slice(i, i + UPSERT_CHUNK);
        const { error } = await supabase
          .from('ghost_zones_ranking')
          .upsert(chunk, { onConflict: 'colonia_id,period_date' });
        if (error) {
          upsertDlq += chunk.length;
          console.error(`${tag} upsert chunk fail (i=${i}): ${error.message}`);
        } else {
          upserted += chunk.length;
        }
      }

      return {
        counts: {
          inserted: 0,
          updated: upserted,
          skipped: 0,
          dlq: fetchDlq + upsertDlq,
        },
        lastSuccessfulPeriodEnd: periodDate,
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
      console.error('[compute-ghost-zones] FATAL:', err);
      process.exit(1);
    });
}
