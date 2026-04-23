// BLOQUE 11.O.1 — LifePath matching engine (heuristic_v1 SEED).
//
// computeLifePathMatches transforma 15 respuestas del cuestionario en
// top-20 colonias con score 0..100 + breakdown por 7 componentes
// ponderados. Determinístico (misma entrada → mismo output).
// Reemplazable FASE 12 N5 por llm_v1 sin cambio de schema (L137 ADR-022).
//
// Pipeline:
//   1. Carga candidatos (colonias con datos DMX mínimos).
//   2. Fan-out 3 queries paralelas (DMX · vibe_tags · zone labels).
//   3. Para cada colonia, 7 component scores con priority-weighted
//      envelope (user priority amplifica/atenúa el peso base).
//   4. Weighted sum 0..100.
//   5. Sort desc, top-20.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  COMPONENT_WEIGHTS,
  type ComponentKey,
  type LifePathAnswers,
  type LifePathComponentBreakdown,
  type LifePathMatch,
} from '@/features/lifepath/types';
import { resolveZoneLabel } from '@/shared/lib/market/zone-label-resolver';
import type { Database } from '@/shared/types/database';

const DEFAULT_TOP_N = 20;
const MAX_CANDIDATES = 500;

export interface ComputeLifePathMatchesInput {
  readonly answers: LifePathAnswers;
  readonly supabase: SupabaseClient<Database>;
  readonly countryCode?: string;
  readonly topN?: number;
  readonly maxCandidates?: number;
}

interface ColoniaRaw {
  readonly colonia_id: string;
  readonly dmx: Map<string, number>;
  readonly vibe_tags: Map<string, number>;
  readonly safety_n0: number | null;
}

function clamp(x: number, lo: number, hi: number): number {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

function priorityAmplify(baseScore: number, priority0to10: number): number {
  // Priority 5 = neutral (no change). Priority 0 = base × 0.6 (dampened).
  // Priority 10 = base × 1.4 (amplified) but clamped to 100.
  const factor = 0.6 + (priority0to10 / 10) * 0.8;
  return clamp(baseScore * factor, 0, 100);
}

function incomeRangePriceTolerance(range: LifePathAnswers['income_range']): number {
  // Para cada income range, DMX-IPV objetivo (0..100) donde 0=barato 100=caro.
  switch (range) {
    case 'lt_15k':
      return 20;
    case '15k_30k':
      return 35;
    case '30k_60k':
      return 50;
    case '60k_100k':
      return 65;
    case '100k_200k':
      return 80;
    case 'gt_200k':
      return 95;
  }
}

function budgetFitFromIpv(answers: LifePathAnswers, dmxIpv: number | undefined): number {
  // Sin DMX-IPV → neutro 50.
  if (typeof dmxIpv !== 'number') return 50;
  const target = incomeRangePriceTolerance(answers.income_range);
  const diff = Math.abs(dmxIpv - target);
  // diff 0 → 100, diff 50 → 25, diff 100 → 0.
  return clamp(100 - diff * 1.5, 0, 100);
}

function mapVibePrefsToTagWeights(a: LifePathAnswers): Map<string, number> {
  // Convert user preferences into target weights por tag canónico (0..100).
  // Pace influye tranquilo/vibrante. Walkable + nightlife aportan directos.
  const paceQuiet = a.vibe_pace === 'tranquilo' ? 80 : a.vibe_pace === 'equilibrado' ? 50 : 20;
  const paceVibrant = 100 - paceQuiet;

  const map = new Map<string, number>();
  map.set('walkability', a.vibe_walkable * 10);
  map.set('quiet', paceQuiet);
  map.set('nightlife', Math.round(paceVibrant * 0.5 + a.vibe_nightlife * 10 * 0.5));
  map.set('family', a.family_priority * 10);
  map.set('foodie', Math.round((a.amenities_priority + a.shopping_priority) * 5));
  map.set('green', a.green_priority * 10);
  map.set('bohemian', a.vibe_pace === 'vibrante' ? 60 : 30);
  map.set('corporate', a.work_mode === 'presencial' ? 70 : a.work_mode === 'hibrido' ? 50 : 30);
  map.set('safety_perceived', a.security_priority * 10);
  map.set('gentrifying', a.horizon === '1_2y' || a.horizon === '3_5y' ? 40 : 20);
  return map;
}

function vibeCosineSimilarity(
  userWeights: Map<string, number>,
  coloniaWeights: Map<string, number>,
): number {
  if (coloniaWeights.size === 0) return 0;
  let dot = 0;
  let normU = 0;
  let normC = 0;
  const tags = new Set<string>([...userWeights.keys(), ...coloniaWeights.keys()]);
  for (const tag of tags) {
    const u = userWeights.get(tag) ?? 0;
    const c = coloniaWeights.get(tag) ?? 0;
    dot += u * c;
    normU += u * u;
    normC += c * c;
  }
  if (normU === 0 || normC === 0) return 0;
  return dot / (Math.sqrt(normU) * Math.sqrt(normC));
}

function scoreComponents(
  a: LifePathAnswers,
  raw: ColoniaRaw,
  userVibe: Map<string, number>,
): LifePathComponentBreakdown {
  const dmxLIV = raw.dmx.get('DMX-LIV') ?? 50;
  const dmxFAM = raw.dmx.get('DMX-FAM') ?? 50;
  const dmxGRN = raw.dmx.get('DMX-GRN') ?? 50;
  const dmxIAB = raw.dmx.get('DMX-IAB') ?? 50;
  const dmxICO = raw.dmx.get('DMX-ICO') ?? 50;
  const safetyBase = raw.safety_n0 ?? raw.dmx.get('DMX-STA') ?? 50;

  // familia
  const familiaBase =
    a.family_state === 'solo' || a.family_state === 'roommates'
      ? 50
      : a.family_state === 'pareja'
        ? dmxFAM * 0.6 + 40
        : dmxFAM;
  const familiaPet = a.has_pet ? Math.min(100, familiaBase + dmxGRN * 0.1) : familiaBase;
  const familia = priorityAmplify(familiaPet, a.family_priority);

  // budget — usa DMX-IPV (índice precio vivienda) como proxy.
  const dmxIpv = raw.dmx.get('DMX-IPV');
  const budget = budgetFitFromIpv(a, dmxIpv);

  // movilidad: DMX-ICO (conectividad) + DMX-LIV combo; mobility_pref modula.
  const connBase = dmxICO * 0.6 + dmxLIV * 0.4;
  const mobilityAdj =
    a.mobility_pref === 'bici_caminar'
      ? Math.min(100, connBase + (raw.vibe_tags.get('walkability') ?? 50) * 0.2)
      : a.mobility_pref === 'transporte_publico'
        ? connBase
        : a.mobility_pref === 'auto'
          ? clamp(100 - connBase * 0.3, 0, 100) + connBase * 0.5
          : connBase * 0.9 + 10;
  const movilidad = clamp(mobilityAdj, 0, 100);

  // amenidades: DMX-IAB base, priority amplifica
  const amenBase = dmxIAB * 0.7 + dmxLIV * 0.3;
  const amenidades = priorityAmplify(
    amenBase,
    Math.round((a.amenities_priority + a.shopping_priority) / 2),
  );

  // seguridad
  const seguridad = priorityAmplify(safetyBase, a.security_priority);

  // verde
  const verde = priorityAmplify(dmxGRN, a.green_priority);

  // vibe: cosine similarity user preferences vs colonia vibe_tags weights
  const vibeSim = vibeCosineSimilarity(userVibe, raw.vibe_tags);
  const vibe = clamp(vibeSim * 100, 0, 100);

  return {
    familia: Math.round(familia * 100) / 100,
    budget: Math.round(budget * 100) / 100,
    movilidad: Math.round(movilidad * 100) / 100,
    amenidades: Math.round(amenidades * 100) / 100,
    seguridad: Math.round(seguridad * 100) / 100,
    verde: Math.round(verde * 100) / 100,
    vibe: Math.round(vibe * 100) / 100,
  };
}

export function weightedSum(b: LifePathComponentBreakdown): number {
  let sum = 0;
  const keys: ComponentKey[] = [
    'familia',
    'budget',
    'movilidad',
    'amenidades',
    'seguridad',
    'verde',
    'vibe',
  ];
  for (const k of keys) {
    sum += (b[k] * COMPONENT_WEIGHTS[k]) / 100;
  }
  return Math.round(sum * 100) / 100;
}

export async function computeLifePathMatches(
  input: ComputeLifePathMatchesInput,
): Promise<LifePathMatch[]> {
  const topN = input.topN ?? DEFAULT_TOP_N;
  const maxCandidates = input.maxCandidates ?? MAX_CANDIDATES;
  const countryCode = input.countryCode ?? 'MX';
  const { supabase, answers } = input;

  // 1. Candidate colonias — aquellas con al menos DMX-LIV calculado.
  const { data: livRows, error: livErr } = await supabase
    .from('dmx_indices')
    .select('scope_id')
    .eq('scope_type', 'colonia')
    .eq('index_code', 'DMX-LIV')
    .eq('country_code', countryCode)
    .limit(maxCandidates);

  if (livErr || !livRows || livRows.length === 0) return [];

  const ids = Array.from(
    new Set(livRows.map((r) => r.scope_id).filter((x): x is string => typeof x === 'string')),
  );
  if (ids.length === 0) return [];

  // 2. Fan-out paralelo: DMX indices · vibe tags · safety (zone_scores F01).
  const [dmxRes, vibeRes, safetyRes] = await Promise.all([
    supabase
      .from('dmx_indices')
      .select('scope_id, index_code, value')
      .eq('scope_type', 'colonia')
      .eq('country_code', countryCode)
      .in('scope_id', ids),
    supabase
      .from('colonia_vibe_tags')
      .select('colonia_id, vibe_tag_id, weight')
      .in('colonia_id', ids)
      .eq('source', 'heuristic_v1'),
    supabase
      .from('zone_scores')
      .select('zone_id, score_type, score_value')
      .in('zone_id', ids)
      .eq('score_type', 'F01'),
  ]);

  const dmxByColonia = new Map<string, Map<string, number>>();
  if (dmxRes.data) {
    for (const row of dmxRes.data) {
      const sid = row.scope_id;
      if (typeof sid !== 'string' || typeof row.value !== 'number' || !row.index_code) continue;
      const inner = dmxByColonia.get(sid) ?? new Map<string, number>();
      inner.set(row.index_code, row.value);
      dmxByColonia.set(sid, inner);
    }
  }

  const vibeByColonia = new Map<string, Map<string, number>>();
  if (vibeRes.data) {
    for (const row of vibeRes.data) {
      const cid = row.colonia_id;
      if (typeof cid !== 'string') continue;
      const inner = vibeByColonia.get(cid) ?? new Map<string, number>();
      inner.set(row.vibe_tag_id, Number(row.weight));
      vibeByColonia.set(cid, inner);
    }
  }

  const safetyByColonia = new Map<string, number>();
  if (safetyRes.data) {
    for (const row of safetyRes.data) {
      const zid = row.zone_id;
      if (typeof zid !== 'string' || typeof row.score_value !== 'number') continue;
      safetyByColonia.set(zid, row.score_value);
    }
  }

  const userVibe = mapVibePrefsToTagWeights(answers);

  const scored: Array<{ raw: ColoniaRaw; components: LifePathComponentBreakdown; total: number }> =
    [];
  for (const cid of ids) {
    const raw: ColoniaRaw = {
      colonia_id: cid,
      dmx: dmxByColonia.get(cid) ?? new Map(),
      vibe_tags: vibeByColonia.get(cid) ?? new Map(),
      safety_n0: safetyByColonia.get(cid) ?? null,
    };
    const components = scoreComponents(answers, raw, userVibe);
    const total = weightedSum(components);
    scored.push({ raw, components, total });
  }
  scored.sort((a, b) => b.total - a.total);
  const top = scored.slice(0, topN);
  if (top.length === 0) return [];

  const labels = await Promise.all(
    top.map((s) =>
      resolveZoneLabel({
        scopeType: 'colonia',
        scopeId: s.raw.colonia_id,
        countryCode,
        supabase,
      }).catch(() => null),
    ),
  );

  const out: LifePathMatch[] = top.map((s, idx) => {
    const dmxArr = Array.from(s.raw.dmx.entries())
      .map(([code, value]) => ({ code, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
    const sharedTags = Array.from(s.raw.vibe_tags.entries())
      .filter(([tag, weight]) => {
        const userWeight = userVibe.get(tag) ?? 0;
        return weight >= 60 && userWeight >= 50;
      })
      .map(([tag]) => tag)
      .slice(0, 3);
    return {
      colonia_id: s.raw.colonia_id,
      colonia_label: labels[idx] ?? null,
      score: s.total,
      components: s.components,
      top_dmx_indices: dmxArr,
      shared_vibe_tags: sharedTags,
    };
  });

  return out;
}
