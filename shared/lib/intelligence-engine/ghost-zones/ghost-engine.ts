// BLOQUE 11.Q.1 — Ghost Zones detector heurístico H1.
//
// "Rotten Tomatoes del real estate" — detecta colonias sobre-hypeadas
// (high buzz · low DMX fundamentals) o sub-valoradas (low buzz · high
// DMX fundamentals). Stubs determinísticos hash-based (FNV-1a) para
// search_volume + press_mentions; reemplazables FASE 13 (L-NN) por
// ingestion real (Google Trends + press APIs GDELT/Agenda Propia).
//
// Pipeline computeGhostScore:
//   1. heuristicSearchVolume(coloniaId, periodDate) → 0..10000
//   2. heuristicPressMentions(coloniaId, periodDate) → 0..500
//   3. Fetch DMX-LIV + DMX-INV + DMX-IAB → dmx_avg (0..100)
//   4. search_norm = search_volume/10000 × 100 (0..100)
//   5. press_norm = press_mentions/500 × 100 (0..100)
//   6. dmx_gap_component = max(0, 50 - dmx_avg/2) × 2 (0..100 — gap ve fundamentals)
//   7. ghost_score = search_norm × 0.4 + press_norm × 0.3 + dmx_gap_component × 0.3
//   8. hype_halving_warning = (search_norm + press_norm) / max(dmx_avg, 10) >= 3
//   9. hype_level derivado por ghost_score threshold
//
// Persistencia idempotente por (colonia_id, period_date) en
// public.ghost_zones_ranking (UNIQUE constraint). rank post-batch.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type BuildGhostZonesBatchSummary,
  GHOST_COMPONENT_WEIGHTS,
  type GhostScoreBreakdown,
  HYPE_HALVING_THRESHOLD,
  type HypeLevel,
} from '@/features/ghost-zones/types';
import type { Database } from '@/shared/types/database';
import { discoverCDMXColoniaZones } from '../calculators/indices/orchestrator';

const SEARCH_VOLUME_MAX = 10_000;
const PRESS_MENTIONS_MAX = 500;
const BATCH_CHUNK_SIZE = 20;
const DMX_INDICES_FOR_FUNDAMENTALS = ['LIV', 'INV', 'IAB'] as const;

// ---------------------------------------------------------------
// FNV-1a hash 32-bit — determinístico, rápido, sin deps.
// ---------------------------------------------------------------

function fnv1a32(input: string): number {
  let hash = 0x81_1c_9d_c5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply (bitwise ops force unsigned wrap).
    hash = Math.imul(hash, 0x01_00_01_93);
  }
  // Force unsigned 32-bit.
  return hash >>> 0;
}

function hashToRange(seed: string, min: number, max: number): number {
  if (max <= min) return min;
  const h = fnv1a32(seed);
  const span = max - min + 1;
  return min + (h % span);
}

export function heuristicSearchVolume(coloniaId: string, periodDate: string): number {
  // Pattern-based: uses both colonia + period to vary across time.
  return hashToRange(`search:${coloniaId}:${periodDate}`, 0, SEARCH_VOLUME_MAX);
}

export function heuristicPressMentions(coloniaId: string, periodDate: string): number {
  return hashToRange(`press:${coloniaId}:${periodDate}`, 0, PRESS_MENTIONS_MAX);
}

// ---------------------------------------------------------------
// DMX fundamentals fetch (batched for efficiency in buildAll).
// ---------------------------------------------------------------

async function fetchDmxFundamentalsByZone(
  supabase: SupabaseClient<Database>,
  coloniaIds: readonly string[],
  periodDate: string,
  countryCode: string,
): Promise<Map<string, Map<string, number>>> {
  const byZone = new Map<string, Map<string, number>>();
  if (coloniaIds.length === 0) return byZone;

  const { data } = await supabase
    .from('dmx_indices')
    .select('scope_id, index_code, value, period_date')
    .eq('country_code', countryCode)
    .eq('scope_type', 'zone')
    .in('index_code', [...DMX_INDICES_FOR_FUNDAMENTALS])
    .in('scope_id', [...coloniaIds])
    .lte('period_date', periodDate)
    .order('period_date', { ascending: false });

  if (!data) return byZone;

  for (const row of data) {
    const sid = row.scope_id;
    const code = row.index_code;
    const value = row.value;
    if (typeof sid !== 'string' || typeof code !== 'string' || typeof value !== 'number') continue;
    const inner = byZone.get(sid) ?? new Map<string, number>();
    // order desc → first hit per code wins (most recent ≤ periodDate).
    if (!inner.has(code)) {
      inner.set(code, value);
      byZone.set(sid, inner);
    }
  }
  return byZone;
}

function dmxAverageFromMap(dmxMap: Map<string, number> | undefined): number | null {
  if (!dmxMap || dmxMap.size === 0) return null;
  let sum = 0;
  let count = 0;
  for (const code of DMX_INDICES_FOR_FUNDAMENTALS) {
    const v = dmxMap.get(code);
    if (typeof v === 'number' && Number.isFinite(v)) {
      sum += v;
      count += 1;
    }
  }
  return count > 0 ? sum / count : null;
}

// ---------------------------------------------------------------
// Ghost score calculation.
// ---------------------------------------------------------------

export interface GhostScoreComputation {
  readonly ghost_score: number;
  readonly search_volume: number;
  readonly press_mentions: number;
  readonly dmx_avg: number | null;
  readonly breakdown: GhostScoreBreakdown;
  readonly hype_halving_warning: boolean;
  readonly hype_level: HypeLevel;
}

export function deriveHypeLevel(ghostScore: number, hypeHalvingWarning: boolean): HypeLevel {
  if (hypeHalvingWarning || ghostScore >= 80) return 'extreme_hype';
  if (ghostScore >= 60) return 'over_hyped';
  if (ghostScore >= 35) return 'aligned';
  return 'sub_valued';
}

export function computeGhostScorePure(params: {
  searchVolume: number;
  pressMentions: number;
  dmxAvg: number | null;
}): GhostScoreComputation {
  const { searchVolume, pressMentions, dmxAvg } = params;
  const searchNorm = (searchVolume / SEARCH_VOLUME_MAX) * 100;
  const pressNorm = (pressMentions / PRESS_MENTIONS_MAX) * 100;
  // dmx_avg null → treat as 50 (neutral) para evitar bias.
  const dmxAvgSafe = typeof dmxAvg === 'number' ? dmxAvg : 50;
  const dmxGap = Math.max(0, 50 - dmxAvgSafe / 2) * 2; // 0..100

  const searchComponent = Math.round(searchNorm * 100) / 100;
  const pressComponent = Math.round(pressNorm * 100) / 100;
  const dmxGapComponent = Math.round(dmxGap * 100) / 100;

  const ghostScore =
    searchComponent * GHOST_COMPONENT_WEIGHTS.search +
    pressComponent * GHOST_COMPONENT_WEIGHTS.press +
    dmxGapComponent * GHOST_COMPONENT_WEIGHTS.dmx_gap;

  const ghostClamped = Math.max(0, Math.min(100, Math.round(ghostScore * 100) / 100));

  // hype halving: señal divergente — buzz >> fundamentals. divisor floor 10 evita div/0.
  const hypeRatio = (searchNorm + pressNorm) / Math.max(dmxAvgSafe, 10);
  const hypeHalvingWarning = hypeRatio >= HYPE_HALVING_THRESHOLD;

  const hypeLevel = deriveHypeLevel(ghostClamped, hypeHalvingWarning);

  return {
    ghost_score: ghostClamped,
    search_volume: searchVolume,
    press_mentions: pressMentions,
    dmx_avg: typeof dmxAvg === 'number' ? Math.round(dmxAvg * 100) / 100 : null,
    breakdown: {
      search_component: searchComponent,
      press_component: pressComponent,
      dmx_gap_component: dmxGapComponent,
    },
    hype_halving_warning: hypeHalvingWarning,
    hype_level: hypeLevel,
  };
}

// ---------------------------------------------------------------
// Persist layer.
// ---------------------------------------------------------------

export interface ComputeAndPersistParams {
  readonly coloniaId: string;
  readonly periodDate: string;
  readonly countryCode?: string;
  readonly supabase: SupabaseClient<Database>;
}

export async function computeAndPersistGhostZone(
  params: ComputeAndPersistParams,
): Promise<GhostScoreComputation> {
  const countryCode = params.countryCode ?? 'MX';
  const { coloniaId, periodDate, supabase } = params;
  const dmxMap = await fetchDmxFundamentalsByZone(supabase, [coloniaId], periodDate, countryCode);
  const dmxAvg = dmxAverageFromMap(dmxMap.get(coloniaId));
  const searchVolume = heuristicSearchVolume(coloniaId, periodDate);
  const pressMentions = heuristicPressMentions(coloniaId, periodDate);
  const comp = computeGhostScorePure({
    searchVolume,
    pressMentions,
    dmxAvg,
  });

  const { error } = await supabase.from('ghost_zones_ranking').upsert(
    {
      colonia_id: coloniaId,
      country_code: countryCode,
      period_date: periodDate,
      ghost_score: comp.ghost_score,
      search_volume: comp.search_volume,
      press_mentions: comp.press_mentions,
      score_total: comp.dmx_avg,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: 'colonia_id,period_date' },
  );

  if (error) {
    throw new Error(`ghost_zones_ranking upsert failed: ${error.message}`);
  }

  return comp;
}

// ---------------------------------------------------------------
// Batch orchestrator CDMX + rank update.
// ---------------------------------------------------------------

export interface BuildAllGhostZonesParams {
  readonly periodDate: string;
  readonly supabase: SupabaseClient<Database>;
  readonly countryCode?: string;
  readonly zoneIds?: readonly string[];
}

async function updateGhostRanking(
  supabase: SupabaseClient<Database>,
  periodDate: string,
  countryCode: string,
): Promise<void> {
  const { data } = await supabase
    .from('ghost_zones_ranking')
    .select('id, ghost_score')
    .eq('country_code', countryCode)
    .eq('period_date', periodDate)
    .order('ghost_score', { ascending: false });

  if (!data) return;
  let rank = 1;
  for (const row of data) {
    await supabase.from('ghost_zones_ranking').update({ rank }).eq('id', row.id);
    rank += 1;
  }
}

export async function buildAllCDMXGhostZones(
  params: BuildAllGhostZonesParams,
): Promise<BuildGhostZonesBatchSummary> {
  const start = Date.now();
  const countryCode = params.countryCode ?? 'MX';
  const { supabase, periodDate } = params;
  const zoneIds = params.zoneIds ?? (await discoverCDMXColoniaZones(supabase, periodDate));

  if (zoneIds.length === 0) {
    return {
      zones_processed: 0,
      rows_upserted: 0,
      failures: 0,
      duration_ms: Date.now() - start,
    };
  }

  // Prefetch fundamentals para todo el chunk — evita 200 queries individuales.
  const fundamentalsByZone = await fetchDmxFundamentalsByZone(
    supabase,
    zoneIds,
    periodDate,
    countryCode,
  );

  let rowsUpserted = 0;
  let failures = 0;

  for (let i = 0; i < zoneIds.length; i += BATCH_CHUNK_SIZE) {
    const chunk = zoneIds.slice(i, i + BATCH_CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map(async (coloniaId) => {
        const dmxAvg = dmxAverageFromMap(fundamentalsByZone.get(coloniaId));
        const searchVolume = heuristicSearchVolume(coloniaId, periodDate);
        const pressMentions = heuristicPressMentions(coloniaId, periodDate);
        const comp = computeGhostScorePure({ searchVolume, pressMentions, dmxAvg });

        const { error } = await supabase.from('ghost_zones_ranking').upsert(
          {
            colonia_id: coloniaId,
            country_code: countryCode,
            period_date: periodDate,
            ghost_score: comp.ghost_score,
            search_volume: comp.search_volume,
            press_mentions: comp.press_mentions,
            score_total: comp.dmx_avg,
            calculated_at: new Date().toISOString(),
          },
          { onConflict: 'colonia_id,period_date' },
        );
        if (error) throw new Error(error.message);
      }),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') rowsUpserted += 1;
      else failures += 1;
    }
  }

  await updateGhostRanking(supabase, periodDate, countryCode);

  return {
    zones_processed: zoneIds.length,
    rows_upserted: rowsUpserted,
    failures,
    duration_ms: Date.now() - start,
  };
}
