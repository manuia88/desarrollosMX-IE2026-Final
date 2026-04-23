// BLOQUE 11.M.3 — findSimilarColonias: búsqueda vectorial pgvector cosine.
//
// Consulta public.colonia_dna_vectors (tabla XL 11.A reutilizada) usando
// operador <=> (cosine distance). Retorna top-N con metadata enriquecida:
//   - colonia_label (zone-label-resolver 11.I.bis)
//   - top_shared_vibe_tags (cross-ref colonia_vibe_tags)
//   - top_dmx_indices (cross-ref dmx_indices del target para contexto)

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type FindSimilarOptions,
  type SharedVibeTag,
  type SimilarityResult,
  VIBE_TAG_IDS,
  type VibeTagId,
} from '@/features/genome/types';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import type { Database } from '@/shared/types/database';

const DEFAULT_TOP_N = 10;
const DEFAULT_MIN_SIM = 0.7;
const MAX_CANDIDATES = 2000;

export interface FindSimilarInput extends FindSimilarOptions {
  readonly coloniaId: string;
  readonly supabase: SupabaseClient<Database>;
}

function parseVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    const arr = raw.map((x) => Number(x));
    if (arr.every((x) => Number.isFinite(x))) return arr;
    return null;
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/^\[/, '').replace(/\]$/, '');
  if (!trimmed) return null;
  const parts = trimmed.split(',').map((s) => Number.parseFloat(s.trim()));
  if (parts.some((x) => Number.isNaN(x))) return null;
  return parts;
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function findSimilarColonias(input: FindSimilarInput): Promise<SimilarityResult[]> {
  const topN = input.topN ?? DEFAULT_TOP_N;
  const minSim = input.minSimilarity ?? DEFAULT_MIN_SIM;
  const minDmxLiv = input.minDmxLiv ?? null;
  const { supabase, coloniaId } = input;

  const { data: sourceRow, error: sourceErr } = await supabase
    .from('colonia_dna_vectors')
    .select('colonia_id, vector, country_code')
    .eq('colonia_id', coloniaId)
    .maybeSingle();

  if (sourceErr || !sourceRow) return [];

  const sourceVec = parseVector(sourceRow.vector);
  if (!sourceVec) return [];

  const { data: candidates, error: candErr } = await supabase
    .from('colonia_dna_vectors')
    .select('colonia_id, vector')
    .eq('country_code', sourceRow.country_code)
    .neq('colonia_id', coloniaId)
    .limit(MAX_CANDIDATES);

  if (candErr || !candidates) return [];

  const scored: Array<{ colonia_id: string; similarity: number; distance: number }> = [];
  for (const row of candidates) {
    const v = parseVector(row.vector);
    if (!v) continue;
    const sim = cosineSimilarity(sourceVec, v);
    if (sim >= minSim) {
      scored.push({
        colonia_id: row.colonia_id,
        similarity: Math.round(sim * 10000) / 10000,
        distance: Math.round((1 - sim) * 10000) / 10000,
      });
    }
  }
  scored.sort((a, b) => b.similarity - a.similarity);
  const top = scored.slice(0, topN);

  if (top.length === 0) return [];

  const ids = top.map((x) => x.colonia_id);

  // Filter por minDmxLiv si se pide.
  let livPass: Set<string> | null = null;
  if (minDmxLiv !== null) {
    const { data: livRows } = await supabase
      .from('dmx_indices')
      .select('scope_id, value')
      .eq('index_code', 'DMX-LIV')
      .eq('scope_type', 'colonia')
      .in('scope_id', ids)
      .gte('value', minDmxLiv);
    livPass = new Set<string>();
    if (livRows) {
      for (const r of livRows) {
        if (typeof r.scope_id === 'string') livPass.add(r.scope_id);
      }
    }
  }

  const [sourceVibeRes, candVibeRes, dmxRes] = await Promise.all([
    supabase
      .from('colonia_vibe_tags')
      .select('vibe_tag_id, weight')
      .eq('colonia_id', coloniaId)
      .eq('source', 'heuristic_v1'),
    supabase
      .from('colonia_vibe_tags')
      .select('colonia_id, vibe_tag_id, weight')
      .in('colonia_id', ids)
      .eq('source', 'heuristic_v1'),
    supabase
      .from('dmx_indices')
      .select('scope_id, index_code, value')
      .eq('scope_type', 'colonia')
      .in('scope_id', ids),
  ]);

  const sourceVibes = new Map<VibeTagId, number>();
  if (sourceVibeRes.data) {
    for (const row of sourceVibeRes.data) {
      const id = row.vibe_tag_id as VibeTagId;
      if ((VIBE_TAG_IDS as readonly string[]).includes(id)) {
        sourceVibes.set(id, Number(row.weight));
      }
    }
  }

  const candVibesById = new Map<string, Map<VibeTagId, number>>();
  if (candVibeRes.data) {
    for (const row of candVibeRes.data) {
      const cid = row.colonia_id;
      if (typeof cid !== 'string') continue;
      const tag = row.vibe_tag_id as VibeTagId;
      if (!(VIBE_TAG_IDS as readonly string[]).includes(tag)) continue;
      const inner = candVibesById.get(cid) ?? new Map<VibeTagId, number>();
      inner.set(tag, Number(row.weight));
      candVibesById.set(cid, inner);
    }
  }

  const dmxByColonia = new Map<string, Array<{ code: string; value: number }>>();
  if (dmxRes.data) {
    for (const row of dmxRes.data) {
      const sid = row.scope_id;
      if (typeof sid !== 'string') continue;
      const arr = dmxByColonia.get(sid) ?? [];
      if (row.index_code && typeof row.value === 'number') {
        arr.push({ code: row.index_code, value: row.value });
      }
      dmxByColonia.set(sid, arr);
    }
  }

  const labels = await Promise.all(
    ids.map((id) =>
      resolveZoneLabel({
        scopeType: 'colonia',
        scopeId: id,
        countryCode: sourceRow.country_code,
        supabase,
      }).catch(() => null),
    ),
  );

  const results: SimilarityResult[] = [];
  for (let i = 0; i < top.length; i++) {
    const scoredEntry = top[i];
    if (!scoredEntry) continue;
    if (livPass && !livPass.has(scoredEntry.colonia_id)) continue;

    const candVibes = candVibesById.get(scoredEntry.colonia_id);
    const shared: SharedVibeTag[] = [];
    if (candVibes) {
      for (const [tag, wSelf] of sourceVibes) {
        const wOther = candVibes.get(tag);
        if (typeof wOther === 'number' && wSelf > 60 && wOther > 60) {
          shared.push({ vibe_tag_id: tag, weight_self: wSelf, weight_other: wOther });
        }
      }
    }
    shared.sort((a, b) => b.weight_other + b.weight_self - (a.weight_other + a.weight_self));

    const dmxArr = dmxByColonia.get(scoredEntry.colonia_id) ?? [];
    dmxArr.sort((a, b) => b.value - a.value);

    results.push({
      colonia_id: scoredEntry.colonia_id,
      colonia_label: labels[i] ?? null,
      similarity: scoredEntry.similarity,
      distance: scoredEntry.distance,
      top_shared_vibe_tags: shared.slice(0, 3),
      top_dmx_indices: dmxArr.slice(0, 3),
    });
  }

  return results;
}
