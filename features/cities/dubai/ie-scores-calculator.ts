// STUB ADR-018 — synthetic IE scores hasta Reelly real ingestion (H2).
// FASE 14.1 — Dubai IE scores (ADR-059 §Step 3).
// Genera 4 score types sintéticos: pulse, futures_alpha, ghost, zone_alpha.
// provenance.is_synthetic=true + adr='ADR-059' explícito en cada row.

import type { SupabaseClient } from '@supabase/supabase-js';
import { DUBAI_ZONES_CANON } from './data-loader';

export type DubaiScoreType = 'pulse' | 'futures_alpha' | 'ghost' | 'zone_alpha';

export interface DubaiIEScore {
  readonly zoneSlug: string;
  readonly scoreType: DubaiScoreType;
  readonly scoreValue: number;
  readonly level: 0 | 1 | 2 | 3 | 4 | 5;
  readonly tier: 1 | 2 | 3 | 4;
  readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  readonly provenance: {
    readonly is_synthetic: true;
    readonly adr: 'ADR-059';
    readonly source: 'F14.1.0_synthetic_baseline_dubai_pre_reelly';
  };
}

/**
 * Synthetic baseline scores Dubai global hub:
 * - pulse 75-95 (Dubai global hub momentum)
 * - futures_alpha 80-95 (ultra premium expectations)
 * - ghost 3-15 (low ghost — high transparency markets)
 * - zone_alpha 70-90 (alpha vs global average elevated)
 *
 * Variación deterministic por zoneSlug (seed-based) — same input = same output.
 */
function syntheticScoreFor(
  zoneSlug: string,
  scoreType: DubaiScoreType,
): { value: number; level: 0 | 1 | 2 | 3 | 4 | 5; tier: 1 | 2 | 3 | 4 } {
  // deterministic hash slug → 0-99
  let h = 0;
  for (let i = 0; i < zoneSlug.length; i += 1) {
    h = (h * 31 + zoneSlug.charCodeAt(i)) >>> 0;
  }
  const offset = h % 21; // 0-20

  let value: number;
  switch (scoreType) {
    case 'pulse':
      value = 75 + offset; // 75-95
      break;
    case 'futures_alpha':
      value = 80 + (offset % 16); // 80-95
      break;
    case 'ghost':
      value = 3 + (offset % 13); // 3-15
      break;
    case 'zone_alpha':
      value = 70 + offset; // 70-90
      break;
  }

  // level 0-5 from value (ghost inverted: low=good)
  let level: 0 | 1 | 2 | 3 | 4 | 5;
  if (scoreType === 'ghost') {
    level = value <= 5 ? 5 : value <= 8 ? 4 : value <= 11 ? 3 : value <= 14 ? 2 : 1;
  } else {
    level = value >= 90 ? 5 : value >= 85 ? 4 : value >= 80 ? 3 : value >= 75 ? 2 : 1;
  }

  // tier 1-4 (top-bottom)
  const tier: 1 | 2 | 3 | 4 = level >= 4 ? 1 : level === 3 ? 2 : level === 2 ? 3 : 4;

  return { value, level, tier };
}

/**
 * calculateDubaiIEScores: STUB ADR-018 hasta Reelly real ingestion.
 * Genera 4 scores × 8 zones = 32 rows synthetic baseline.
 * Cada row: provenance.is_synthetic=true + adr='ADR-059'.
 */
export function calculateDubaiIEScores(): ReadonlyArray<DubaiIEScore> {
  const scoreTypes: ReadonlyArray<DubaiScoreType> = [
    'pulse',
    'futures_alpha',
    'ghost',
    'zone_alpha',
  ];

  const out: DubaiIEScore[] = [];
  for (const zone of DUBAI_ZONES_CANON) {
    for (const scoreType of scoreTypes) {
      const { value, level, tier } = syntheticScoreFor(zone.slug, scoreType);
      out.push({
        zoneSlug: zone.slug,
        scoreType,
        scoreValue: value,
        level,
        tier,
        confidence: 'insufficient_data',
        provenance: {
          is_synthetic: true,
          adr: 'ADR-059',
          source: 'F14.1.0_synthetic_baseline_dubai_pre_reelly',
        },
      });
    }
  }
  return out;
}

export interface InsertDubaiScoresResult {
  readonly inserted: number;
  readonly errors: ReadonlyArray<{ readonly zoneSlug: string; readonly message: string }>;
}

/**
 * INSERT zone_scores rows synthetic — solo H1 mientras Reelly no esté activo.
 * Real Reelly ingestion H2 reemplaza estos rows con provenance.is_synthetic=false.
 */
export async function insertDubaiSyntheticScores(
  // biome-ignore lint/suspicious/noExplicitAny: Supabase generic client typing diferido types regen post-merge
  supabase: SupabaseClient<any, 'public', any>,
): Promise<InsertDubaiScoresResult> {
  const errors: Array<{ zoneSlug: string; message: string }> = [];
  let inserted = 0;

  const scores = calculateDubaiIEScores();

  // Resolve zone_id por slug
  const { data: zoneRows, error: zonesErr } = await supabase
    .from('zones')
    .select('id, scope_id')
    .eq('country_code', 'AE')
    .eq('parent_scope_id', 'dubai');

  if (zonesErr || !zoneRows) {
    return {
      inserted: 0,
      errors: [{ zoneSlug: '*', message: zonesErr?.message ?? 'no zones returned' }],
    };
  }

  const scopeIdToZoneId = new Map<string, string>();
  for (const row of zoneRows) {
    if (row.id && row.scope_id) {
      scopeIdToZoneId.set(row.scope_id as string, row.id as string);
    }
  }

  const slugToScopeId = new Map<string, string>();
  for (const z of DUBAI_ZONES_CANON) {
    slugToScopeId.set(z.slug, z.scope_id);
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const score of scores) {
    const scopeId = slugToScopeId.get(score.zoneSlug);
    const zoneId = scopeId ? scopeIdToZoneId.get(scopeId) : undefined;
    if (!zoneId) {
      errors.push({ zoneSlug: score.zoneSlug, message: 'zone_id not found' });
      continue;
    }

    const { error: insErr } = await supabase.from('zone_scores').insert({
      zone_id: zoneId,
      score_type: score.scoreType,
      score_value: score.scoreValue,
      level: score.level,
      tier: score.tier,
      confidence: score.confidence,
      period_date: today,
      provenance: score.provenance,
    });

    if (insErr) {
      errors.push({ zoneSlug: score.zoneSlug, message: insErr.message });
      continue;
    }

    inserted += 1;
  }

  return { inserted, errors };
}
