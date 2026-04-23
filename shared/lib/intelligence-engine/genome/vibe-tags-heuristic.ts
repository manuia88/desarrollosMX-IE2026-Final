// BLOQUE 11.M.1 — Vibe Tags heurística H1 determinística.
//
// Input: colonia_id + score data (zone_scores N0-N3 + dmx_indices recientes).
// Output: Array<{ vibe_tag_id, weight(0-100) }> y persiste en
// public.colonia_vibe_tags (source='heuristic_v1').
//
// 10 tags canónicos (migration 20260423100000_fase11_xl_vibe_tags.sql):
//   walkability, quiet, nightlife, family, foodie, green, bohemian,
//   corporate, safety_perceived, gentrifying.
//
// ADR-022: La heurística v1 es reemplazable FASE 12 N5 por source='llm_v1'
// sin migración de schema.

import type { SupabaseClient } from '@supabase/supabase-js';
import { VIBE_TAG_IDS, type VibeTagId } from '@/features/genome/types';
import type { Database } from '@/shared/types/database';

export const HEURISTIC_SOURCE = 'heuristic_v1' as const;

export interface ZoneScoreRow {
  readonly score_type: string;
  readonly score_value: number | null;
}

export interface DmxIndexRow {
  readonly index_code: string;
  readonly value: number | null;
}

export interface VibeTagsInput {
  readonly coloniaId: string;
  readonly scores: ReadonlyMap<string, number>; // score_id → 0..100
  readonly dmxIndices: ReadonlyMap<string, number>; // index_code → 0..100
}

export interface ComputedVibeTag {
  readonly vibe_tag_id: VibeTagId;
  readonly weight: number; // 0..100, integer 2 decimal
}

function safe(map: ReadonlyMap<string, number>, key: string): number | null {
  const v = map.get(key);
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// ============================================================
// Reglas determinísticas v1.
// ============================================================

function computeWalkability(input: VibeTagsInput): number {
  // N08 walkability proxy + F03 ecosistema DENUE (amenidades cerca).
  const n08 = safe(input.scores, 'N08');
  const f03 = safe(input.scores, 'F03');
  if (n08 === null && f03 === null) return 0;
  const base = (n08 ?? 0) * 0.7 + (f03 ?? 0) * 0.3;
  return clamp(base);
}

function computeQuiet(input: VibeTagsInput): number {
  // Inverso tráfico + inverso densidad comercial (proxy ruido).
  // F02 transit alto = más ruido → invertir. F03 DENUE density → invertir.
  const f02 = safe(input.scores, 'F02');
  const f03 = safe(input.scores, 'F03');
  if (f02 === null && f03 === null) return 0;
  const noiseProxy = (f02 ?? 0) * 0.4 + (f03 ?? 0) * 0.6;
  return clamp(100 - noiseProxy);
}

function computeNightlife(input: VibeTagsInput): number {
  // F03 ecosistema + DMX-YNG millennial density (restaurants/bars noche).
  const f03 = safe(input.scores, 'F03');
  const yng = safe(input.dmxIndices, 'DMX-YNG');
  if (f03 === null && yng === null) return 0;
  const base = (f03 ?? 0) * 0.5 + (yng ?? 0) * 0.5;
  return clamp(base);
}

function computeFamily(input: VibeTagsInput): number {
  // DMX-FAM índice compuesto zona familiar (schools + parks + safety).
  const fam = safe(input.dmxIndices, 'DMX-FAM');
  if (fam !== null) return clamp(fam);
  // Fallback si falta índice DMX.
  const f04 = safe(input.scores, 'F04'); // schools
  const n10 = safe(input.scores, 'N10'); // parks
  const f01 = safe(input.scores, 'F01'); // safety
  const parts = [f04, n10, f01].filter((x): x is number => x !== null);
  if (parts.length === 0) return 0;
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function computeFoodie(input: VibeTagsInput): number {
  // F03 ecosistema DENUE + subset "foodie" (proxied por N01 comercial mix).
  const f03 = safe(input.scores, 'F03');
  const n01 = safe(input.scores, 'N01');
  if (f03 === null && n01 === null) return 0;
  const base = (f03 ?? 0) * 0.6 + (n01 ?? 0) * 0.4;
  return clamp(base);
}

function computeGreen(input: VibeTagsInput): number {
  // N10 parques + DMX-GRN zona verde índice.
  const grn = safe(input.dmxIndices, 'DMX-GRN');
  const n10 = safe(input.scores, 'N10');
  if (grn === null && n10 === null) return 0;
  const base = (grn ?? 0) * 0.6 + (n10 ?? 0) * 0.4;
  return clamp(base);
}

function computeBohemian(input: VibeTagsInput): number {
  // DMX-GNT gentrificación velocity + DMX-YNG millennial density como proxy cultural.
  const gnt = safe(input.dmxIndices, 'DMX-GNT');
  const yng = safe(input.dmxIndices, 'DMX-YNG');
  if (gnt === null && yng === null) return 0;
  // Bohemia = gentrificación media-alta + alta densidad millennial (proxy arte/música).
  const gntScore = gnt ?? 0;
  const yngScore = yng ?? 0;
  // Peak bohemia en gnt 40-70 (no tan gentrificada que ya cambió la vibra).
  const gntBell = gntScore <= 70 ? gntScore * (1 - (gntScore - 40) / 200) : gntScore * 0.5;
  return clamp(gntBell * 0.5 + yngScore * 0.5);
}

function computeCorporate(input: VibeTagsInput): number {
  // DMX-INV proyecto inversión + N04 uso de suelo comercial/oficinas proxy.
  const inv = safe(input.dmxIndices, 'DMX-INV');
  const n04 = safe(input.scores, 'N04');
  if (inv === null && n04 === null) return 0;
  const base = (inv ?? 0) * 0.6 + (n04 ?? 0) * 0.4;
  return clamp(base);
}

function computeSafetyPerceived(input: VibeTagsInput): number {
  // F01 Safety directo (inverso crime_data).
  const f01 = safe(input.scores, 'F01');
  if (f01 === null) return 0;
  return clamp(f01);
}

function computeGentrifying(input: VibeTagsInput): number {
  // DMX-GNT directo (calculator 11.A).
  const gnt = safe(input.dmxIndices, 'DMX-GNT');
  if (gnt === null) return 0;
  return clamp(gnt);
}

export function computeVibeTagsForColonia(input: VibeTagsInput): ComputedVibeTag[] {
  const raw: ReadonlyArray<readonly [VibeTagId, number]> = [
    ['walkability', computeWalkability(input)],
    ['quiet', computeQuiet(input)],
    ['nightlife', computeNightlife(input)],
    ['family', computeFamily(input)],
    ['foodie', computeFoodie(input)],
    ['green', computeGreen(input)],
    ['bohemian', computeBohemian(input)],
    ['corporate', computeCorporate(input)],
    ['safety_perceived', computeSafetyPerceived(input)],
    ['gentrifying', computeGentrifying(input)],
  ];
  return raw.map(([id, w]) => ({ vibe_tag_id: id, weight: round2(clamp(w)) }));
}

// ============================================================
// Batch persister — idempotent upsert.
// ============================================================

export interface PersistOptions {
  readonly coloniaId: string;
  readonly tags: readonly ComputedVibeTag[];
  readonly supabase: SupabaseClient<Database>;
  readonly source?: string;
}

export async function persistVibeTags(opts: PersistOptions): Promise<void> {
  const source = opts.source ?? HEURISTIC_SOURCE;
  const rows = opts.tags.map((t) => ({
    colonia_id: opts.coloniaId,
    vibe_tag_id: t.vibe_tag_id,
    weight: t.weight,
    source,
    computed_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  const { error } = await opts.supabase
    .from('colonia_vibe_tags')
    .upsert(rows, { onConflict: 'colonia_id,vibe_tag_id' });
  if (error) throw new Error(`persistVibeTags: ${error.message}`);
}

// ============================================================
// Fetch scores + indices for a single colonia.
// ============================================================

export async function fetchVibeInputs(
  coloniaId: string,
  supabase: SupabaseClient<Database>,
): Promise<VibeTagsInput> {
  const scoresRes = await supabase
    .from('zone_scores')
    .select('score_type, score_value')
    .eq('zone_id', coloniaId);
  const scoresMap = new Map<string, number>();
  if (!scoresRes.error && scoresRes.data) {
    for (const row of scoresRes.data as ReadonlyArray<ZoneScoreRow>) {
      if (row.score_value !== null && row.score_type)
        scoresMap.set(row.score_type, row.score_value);
    }
  }

  const idxRes = await supabase
    .from('dmx_indices')
    .select('index_code, value')
    .eq('scope_type', 'colonia')
    .eq('scope_id', coloniaId);
  const idxMap = new Map<string, number>();
  if (!idxRes.error && idxRes.data) {
    for (const row of idxRes.data as ReadonlyArray<DmxIndexRow>) {
      if (row.value !== null && row.index_code) idxMap.set(row.index_code, row.value);
    }
  }

  return { coloniaId, scores: scoresMap, dmxIndices: idxMap };
}

export async function computeAndPersistVibeTagsH1(
  coloniaId: string,
  supabase: SupabaseClient<Database>,
): Promise<ComputedVibeTag[]> {
  const input = await fetchVibeInputs(coloniaId, supabase);
  const tags = computeVibeTagsForColonia(input);
  await persistVibeTags({ coloniaId, tags, supabase });
  return tags;
}

// ============================================================
// Batch de 200 colonias CDMX.
// ============================================================

export async function batchComputeVibeTagsCDMX(
  supabase: SupabaseClient<Database>,
  chunkSize = 20,
): Promise<{ processed: number; failed: string[] }> {
  // Sin tabla zones formal (H1): descubrir colonias activas vía dmx_indices.
  const { data: dmxRows, error } = await supabase
    .from('dmx_indices')
    .select('scope_id')
    .eq('country_code', 'MX')
    .eq('scope_type', 'colonia')
    .limit(2000);

  if (error || !dmxRows) return { processed: 0, failed: [] };

  const idSet = new Set<string>();
  for (const row of dmxRows) {
    if (typeof row.scope_id === 'string') idSet.add(row.scope_id);
  }
  const ids = Array.from(idSet);
  const failed: string[] = [];
  let processed = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map((id) => computeAndPersistVibeTagsH1(id, supabase)),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const id = chunk[j];
      if (r && r.status === 'fulfilled') {
        processed++;
      } else if (id) {
        failed.push(id);
      }
    }
  }
  return { processed, failed };
}

export const VIBE_TAG_ORDER: readonly VibeTagId[] = VIBE_TAG_IDS;
