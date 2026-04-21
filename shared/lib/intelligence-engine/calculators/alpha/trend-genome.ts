// Trend Genome — detección "zonas alpha" 12-18 meses antes de mainstream.
// BLOQUE 11.H (FASE 11 XL). Standalone calculator — NO usa framework
// Calculator porque persiste en tabla dedicada zone_alpha_alerts (no
// dmx_indices ni zone_scores). Sigue el shape del Pulse Score (pulse-score.ts):
//   - calculateTrendGenome(...): fetch 5 signals + compute + return plain
//     AlphaComputeResult (no DB write).
//
// 5 fuentes con pesos fijos ALPHA_SIGNAL_WEIGHTS:
//   - instagram_heat       0.30 (chefs, galleries, creators, specialty cafés)
//   - denue_alpha          0.25 (aperturas alpha 6m)
//   - migration_inflow     0.20 (inflow high-income decile ≥7)
//   - price_velocity_inv   0.15 (precios aún bajos = oportunidad)
//   - search_volume        0.10 (STUB H1 — Google Trends H2)
//
// Cross-signals tier:
//   - golden_opportunity: migration≥7 + alpha≥75 + pulse>80
//   - confirmed:          migration≥7 + alpha≥75
//   - speculative:        alpha≥75
//   - watchlist:          else

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AlphaComputeResult,
  AlphaConfidence,
  AlphaGenomeComponents,
  AlphaScopeType,
  AlphaSignalBreakdown,
  AlphaSignalKey,
  AlphaTier,
  DenueAlphaSignals,
  InstagramHeatSignals,
} from '@/features/trend-genome/types';
import { ALPHA_SIGNAL_WEIGHTS } from '@/features/trend-genome/types';
import { classifyDenueAperturas } from '@/shared/lib/intelligence-engine/sources/denue-alpha-classifier';
import { fetchInstagramPublicGeotags } from '@/shared/lib/intelligence-engine/sources/instagram-apify';

// ---------- Loose Supabase helper (chainable plain objects en tests) ----------

type LooseClient = SupabaseClient<Record<string, unknown>>;

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as LooseClient).from(table as never);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// ---------- Signal normalization (raw → 0..100) ----------

export function normalizeInstagramHeat(s: InstagramHeatSignals): number {
  const raw =
    s.chef_count + s.gallery_count * 1.5 + s.creator_count * 0.5 + s.specialty_cafe_count * 1.2;
  return Math.min(100, raw * 4);
}

export function normalizeDenueAlpha(s: DenueAlphaSignals): number {
  return Math.min(100, s.total_alpha_openings_6m * 5);
}

export function normalizeMigrationInflow(highIncomeVolume: number): number {
  if (!Number.isFinite(highIncomeVolume) || highIncomeVolume <= 0) return 0;
  return Math.min(100, highIncomeVolume / 20);
}

export function normalizePriceVelocityInv(priceChangePct: number | null): number | null {
  if (priceChangePct === null || !Number.isFinite(priceChangePct)) return null;
  return Math.max(0, 100 - priceChangePct * 2);
}

// ---------- Tier + confidence + TTM ----------

export function timeToMainstreamMonths(score: number): number | null {
  if (score >= 80) return 6;
  if (score >= 65) return 12;
  if (score >= 50) return 18;
  return null;
}

export function classifyAlphaTier(
  alphaScore: number,
  migrationDecile: number | null,
  pulseScore: number | null,
): AlphaTier {
  const migrationOk = migrationDecile !== null && migrationDecile >= 7;
  const scoreOk = alphaScore >= 75;
  if (migrationOk && scoreOk && pulseScore !== null && pulseScore > 80) {
    return 'golden_opportunity';
  }
  if (migrationOk && scoreOk) return 'confirmed';
  if (scoreOk) return 'speculative';
  return 'watchlist';
}

function confidenceFromCount(count: number): AlphaConfidence {
  if (count === 0) return 'insufficient_data';
  if (count >= 3) return 'high';
  if (count === 2) return 'medium';
  return 'low';
}

// ---------- Supabase fetchers ----------

interface MigrationInflowResult {
  readonly decile: number | null;
  readonly volume: number;
  readonly available: boolean;
}

async function fetchMigrationInflow(
  supabase: SupabaseClient,
  zoneId: string,
  scopeType: AlphaScopeType,
  countryCode: string,
  periodDate: string,
): Promise<MigrationInflowResult> {
  try {
    const res = await castFrom(supabase, 'zone_migration_flows')
      .select('volume,income_decile_dest')
      .eq('dest_scope_id', zoneId)
      .eq('dest_scope_type', scopeType)
      .eq('country_code', countryCode)
      .lte('period_date', periodDate)
      .limit(5000);
    if (res.error || !res.data) return { decile: null, volume: 0, available: false };
    const rows = res.data as unknown as Array<{
      volume: unknown;
      income_decile_dest: unknown;
    }>;
    let highIncomeVolume = 0;
    let maxDecile: number | null = null;
    let seen = false;
    for (const r of rows) {
      if (!r) continue;
      const d = r.income_decile_dest;
      const v = r.volume;
      if (!isFiniteNumber(v)) continue;
      seen = true;
      if (isFiniteNumber(d) && d >= 7) {
        highIncomeVolume += v;
        if (maxDecile === null || d > maxDecile) maxDecile = d;
      }
    }
    return { decile: maxDecile, volume: highIncomeVolume, available: seen };
  } catch {
    return { decile: null, volume: 0, available: false };
  }
}

interface PriceVelocityResult {
  readonly change_pct: number | null;
  readonly available: boolean;
}

async function fetchPriceVelocity(
  supabase: SupabaseClient,
  zoneId: string,
  countryCode: string,
  periodDate: string,
): Promise<PriceVelocityResult> {
  try {
    const anchor = new Date(`${periodDate}T00:00:00Z`);
    const sixMonthsAgo = new Date(anchor.getTime());
    sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
    const fromISO = sixMonthsAgo.toISOString().slice(0, 10);

    const res = await castFrom(supabase, 'zona_snapshots')
      .select('period,precio_m2_promedio')
      .eq('zone_id', zoneId)
      .eq('country_code', countryCode)
      .gte('period', fromISO)
      .lte('period', periodDate)
      .order('period', { ascending: true })
      .limit(100);
    if (res.error || !res.data) return { change_pct: null, available: false };
    const rows = res.data as unknown as Array<{ period: unknown; precio_m2_promedio: unknown }>;
    const prices: Array<{ period: string; price: number }> = [];
    for (const r of rows) {
      if (!r) continue;
      const p = r.period;
      const v = r.precio_m2_promedio;
      if (typeof p !== 'string' || !isFiniteNumber(v)) continue;
      prices.push({ period: p, price: v });
    }
    if (prices.length < 2) return { change_pct: null, available: false };
    const first = prices[0];
    const last = prices[prices.length - 1];
    if (!first || !last || first.price <= 0) return { change_pct: null, available: false };
    const changePct = ((last.price - first.price) / first.price) * 100;
    return { change_pct: changePct, available: true };
  } catch {
    return { change_pct: null, available: false };
  }
}

async function fetchPulseScore(
  supabase: SupabaseClient,
  zoneId: string,
  scopeType: AlphaScopeType,
  countryCode: string,
): Promise<number | null> {
  try {
    const res = await castFrom(supabase, 'zone_pulse_scores')
      .select('pulse_score')
      .eq('scope_id', zoneId)
      .eq('scope_type', scopeType)
      .eq('country_code', countryCode)
      .order('period_date', { ascending: false })
      .limit(1);
    if (res.error || !res.data) return null;
    const rows = res.data as unknown as Array<{ pulse_score: unknown }>;
    const first = rows[0];
    if (!first || !isFiniteNumber(first.pulse_score)) return null;
    return first.pulse_score;
  } catch {
    return null;
  }
}

// ---------- Signal bundle (pre-compute input) ----------

export interface TrendGenomeSignals {
  readonly instagram: InstagramHeatSignals | null;
  readonly denue: DenueAlphaSignals | null;
  readonly migration: MigrationInflowResult;
  readonly price: PriceVelocityResult;
  readonly pulse_score: number | null;
}

// ---------- Compute (pure, given signals) ----------

interface ComputeInput {
  readonly signals: TrendGenomeSignals;
}

interface NormalizedSignal {
  readonly key: AlphaSignalKey;
  readonly raw_value: number | null;
  readonly normalized: number | null;
  readonly available: boolean;
  readonly source: string;
}

function buildNormalized(signals: TrendGenomeSignals): NormalizedSignal[] {
  const ig = signals.instagram;
  const denue = signals.denue;
  const mig = signals.migration;
  const price = signals.price;

  const instagramAvailable =
    ig !== null &&
    (ig.chef_count > 0 ||
      ig.gallery_count > 0 ||
      ig.creator_count > 0 ||
      ig.specialty_cafe_count > 0);
  const igRaw = ig
    ? ig.chef_count +
      ig.gallery_count * 1.5 +
      ig.creator_count * 0.5 +
      ig.specialty_cafe_count * 1.2
    : null;
  const igNormalized = ig && instagramAvailable ? normalizeInstagramHeat(ig) : null;

  const denueAvailable = denue !== null && denue.total_alpha_openings_6m > 0;
  const denueRaw = denue ? denue.total_alpha_openings_6m : null;
  const denueNormalized = denue && denueAvailable ? normalizeDenueAlpha(denue) : null;

  const migAvailable = mig.available && mig.volume > 0;
  const migRaw = mig.volume;
  const migNormalized = migAvailable ? normalizeMigrationInflow(mig.volume) : null;

  const priceAvailable = price.available && price.change_pct !== null;
  const priceRaw = price.change_pct;
  const priceNormalized = priceAvailable ? normalizePriceVelocityInv(price.change_pct) : null;

  // search_volume: STUB H1 — always 0 / unavailable.
  return [
    {
      key: 'instagram_heat',
      raw_value: igRaw,
      normalized: igNormalized,
      available: instagramAvailable,
      source: 'apify_instagram',
    },
    {
      key: 'denue_alpha',
      raw_value: denueRaw,
      normalized: denueNormalized,
      available: denueAvailable,
      source: 'denue_alpha_classifier',
    },
    {
      key: 'migration_inflow',
      raw_value: migRaw,
      normalized: migNormalized,
      available: migAvailable,
      source: 'zone_migration_flows',
    },
    {
      key: 'price_velocity_inv',
      raw_value: priceRaw,
      normalized: priceNormalized,
      available: priceAvailable,
      source: 'zona_snapshots',
    },
    {
      key: 'search_volume',
      raw_value: null,
      normalized: null,
      available: false,
      source: 'google_trends_stub',
    },
  ];
}

function countRealSources(normalized: readonly NormalizedSignal[]): number {
  // Real sources = IG + DENUE + Migration (los 3 no-stub). search_volume es
  // stub; price_velocity_inv es data interna pero no cuenta como "fuente real"
  // para el confidence tier de alpha.
  let count = 0;
  const realKeys: readonly AlphaSignalKey[] = ['instagram_heat', 'denue_alpha', 'migration_inflow'];
  for (const n of normalized) {
    if (realKeys.includes(n.key) && n.available) count += 1;
  }
  return count;
}

function buildBreakdown(
  normalized: readonly NormalizedSignal[],
  sumWeightedAvailable: number,
): AlphaSignalBreakdown[] {
  const breakdowns: AlphaSignalBreakdown[] = [];
  for (const n of normalized) {
    const weight = ALPHA_SIGNAL_WEIGHTS[n.key];
    const contribution =
      n.available && n.normalized !== null && sumWeightedAvailable > 0
        ? ((n.normalized * weight) / sumWeightedAvailable) * 100
        : 0;
    breakdowns.push({
      key: n.key,
      raw_value: n.raw_value,
      normalized_0_100: n.normalized,
      weight,
      contribution_pct: Number(contribution.toFixed(2)),
      available: n.available,
      source: n.source,
    });
  }
  return breakdowns;
}

function findBreakdown(
  breakdowns: readonly AlphaSignalBreakdown[],
  key: AlphaSignalKey,
): AlphaSignalBreakdown {
  for (const b of breakdowns) if (b.key === key) return b;
  // Should never happen — buildBreakdown always emits all 5 keys.
  return {
    key,
    raw_value: null,
    normalized_0_100: null,
    weight: ALPHA_SIGNAL_WEIGHTS[key],
    contribution_pct: 0,
    available: false,
    source: 'unknown',
  };
}

export function computeTrendGenome(input: ComputeInput): AlphaComputeResult {
  const { signals } = input;
  const normalized = buildNormalized(signals);
  const realSourcesCount = countRealSources(normalized);

  if (realSourcesCount === 0) {
    // No insufficient — price_velocity_inv alone cannot drive alpha detection.
    const emptyBreakdown = buildBreakdown(normalized, 0);
    const components: AlphaGenomeComponents = {
      instagram_heat: findBreakdown(emptyBreakdown, 'instagram_heat'),
      denue_alpha: findBreakdown(emptyBreakdown, 'denue_alpha'),
      migration_inflow: findBreakdown(emptyBreakdown, 'migration_inflow'),
      price_velocity_inv: findBreakdown(emptyBreakdown, 'price_velocity_inv'),
      search_volume: findBreakdown(emptyBreakdown, 'search_volume'),
      data_sources_available: 0,
      coverage_pct: 0,
      tier: 'watchlist',
      migration_inflow_decile: signals.migration.decile,
      pulse_score: signals.pulse_score,
    };
    return {
      alpha_score: 0,
      time_to_mainstream_months: null,
      confidence: 'insufficient_data',
      components,
      signals_jsonb: buildSignalsJsonb(signals, 'watchlist', null, 'insufficient_data'),
    };
  }

  // Weighted sum — uses ALPHA_SIGNAL_WEIGHTS fijos (no renormalización).
  // Los signals no disponibles contribuyen 0 al numerador; denominador fijo
  // implícito (suma pesos = 1.0) → confidence degrada sin re-pesar.
  let weightedSum = 0;
  let sumWeightedAvailable = 0;
  for (const n of normalized) {
    if (!n.available || n.normalized === null) continue;
    const w = ALPHA_SIGNAL_WEIGHTS[n.key];
    weightedSum += n.normalized * w;
    sumWeightedAvailable += n.normalized * w;
  }

  const alphaScore = Math.round(Math.max(0, Math.min(100, weightedSum)));
  const breakdowns = buildBreakdown(normalized, sumWeightedAvailable);

  const confidence = confidenceFromCount(realSourcesCount);
  const ttmMonths = timeToMainstreamMonths(alphaScore);
  const tier = classifyAlphaTier(alphaScore, signals.migration.decile, signals.pulse_score);

  const availableCount = normalized.filter((n) => n.available).length;

  const components: AlphaGenomeComponents = {
    instagram_heat: findBreakdown(breakdowns, 'instagram_heat'),
    denue_alpha: findBreakdown(breakdowns, 'denue_alpha'),
    migration_inflow: findBreakdown(breakdowns, 'migration_inflow'),
    price_velocity_inv: findBreakdown(breakdowns, 'price_velocity_inv'),
    search_volume: findBreakdown(breakdowns, 'search_volume'),
    data_sources_available: availableCount,
    coverage_pct: Math.round((availableCount / 5) * 100),
    tier,
    migration_inflow_decile: signals.migration.decile,
    pulse_score: signals.pulse_score,
  };

  return {
    alpha_score: alphaScore,
    time_to_mainstream_months: ttmMonths,
    confidence,
    components,
    signals_jsonb: buildSignalsJsonb(signals, tier, ttmMonths, confidence),
  };
}

function buildSignalsJsonb(
  signals: TrendGenomeSignals,
  tier: AlphaTier,
  ttmMonths: number | null,
  confidence: AlphaConfidence,
): Record<string, unknown> {
  const ig = signals.instagram;
  const denue = signals.denue;
  return {
    ig: ig
      ? {
          chef: ig.chef_count,
          gal: ig.gallery_count,
          cre: ig.creator_count,
          cafe: ig.specialty_cafe_count,
        }
      : null,
    denue: denue
      ? {
          cafe: denue.specialty_cafe_count,
          gal: denue.gallery_count,
          bou: denue.boutique_count,
          total: denue.total_alpha_openings_6m,
        }
      : null,
    mig: {
      decile: signals.migration.decile,
      vol: signals.migration.volume,
    },
    price: {
      delta_pct: signals.price.change_pct,
    },
    tier,
    ttm_months: ttmMonths,
    confidence,
  };
}

// ---------- Main export (fetch + compute) ----------

export interface CalculateTrendGenomeParams {
  readonly zoneId: string;
  readonly scopeType: AlphaScopeType;
  readonly countryCode: string;
  readonly period: string; // YYYY-MM-DD
  readonly supabase: SupabaseClient;
  readonly fetchImpl?: typeof fetch;
  readonly apifyToken?: string;
  readonly signalsOverride?: TrendGenomeSignals;
}

export async function calculateTrendGenome(
  p: CalculateTrendGenomeParams,
): Promise<AlphaComputeResult> {
  if (p.signalsOverride) {
    return computeTrendGenome({ signals: p.signalsOverride });
  }

  const igParams = {
    zoneId: p.zoneId,
    scopeType: p.scopeType,
    countryCode: p.countryCode,
    period: p.period,
    supabase: p.supabase,
    ...(p.fetchImpl ? { fetchImpl: p.fetchImpl } : {}),
    ...(p.apifyToken ? { apifyToken: p.apifyToken } : {}),
  };
  const denueParams = {
    zoneId: p.zoneId,
    scopeType: p.scopeType,
    countryCode: p.countryCode,
    period: p.period,
    supabase: p.supabase,
  };

  const [igResult, denueResult, migrationResult, priceResult, pulseScore] = await Promise.all([
    fetchInstagramPublicGeotags(igParams).catch(() => null),
    classifyDenueAperturas(denueParams).catch(() => null),
    fetchMigrationInflow(p.supabase, p.zoneId, p.scopeType, p.countryCode, p.period),
    fetchPriceVelocity(p.supabase, p.zoneId, p.countryCode, p.period),
    fetchPulseScore(p.supabase, p.zoneId, p.scopeType, p.countryCode),
  ]);

  const signals: TrendGenomeSignals = {
    instagram: igResult,
    denue: denueResult,
    migration: migrationResult,
    price: priceResult,
    pulse_score: pulseScore,
  };

  return computeTrendGenome({ signals });
}
