// FASE 14.1 — Guadalajara city expansion (ADR-059 §Step 3).
// IE scores sintéticos baseline H1 — 4 score_types per zona (32 rows total).
// provenance.is_synthetic=true + adr='ADR-059' (transparency canon ADR-018).
// Ingestion real H2 reemplaza estos valores via persist.ts canon CDMX.

import type { SupabaseClient } from '@supabase/supabase-js';
import { GDL_ZONES_CANON, type ZoneInsertGdl } from './data-loader';
import type { GdlIEScoreInsert, GdlScoreType } from './types';

const SCORE_TYPES: ReadonlyArray<GdlScoreType> = ['pulse', 'futures_alpha', 'ghost', 'zone_alpha'];

/**
 * Hash determinístico simple (FNV-1a 32-bit) sobre slug+scoreType.
 * Garantiza valores reproducibles cross-runs sin RNG.
 */
function deterministicHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function scoreInRange(slug: string, scoreType: GdlScoreType, min: number, max: number): number {
  const seed = deterministicHash(`${slug}::${scoreType}`);
  const range = max - min;
  return Math.round((min + (seed % (range * 10)) / 10) * 10) / 10;
}

function scoreRangeFor(scoreType: GdlScoreType): readonly [number, number] {
  // Rangos canon GDL (business hub → pulse fuerte, ghost bajo).
  switch (scoreType) {
    case 'pulse':
      return [75, 92];
    case 'futures_alpha':
      return [65, 85];
    case 'ghost':
      return [8, 25];
    case 'zone_alpha':
      return [60, 80];
  }
}

function levelFromScore(value: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (value >= 90) return 5;
  if (value >= 80) return 4;
  if (value >= 65) return 3;
  if (value >= 45) return 2;
  if (value >= 25) return 1;
  return 0;
}

function tierFromScore(value: number): 1 | 2 | 3 | 4 {
  if (value >= 80) return 1;
  if (value >= 65) return 2;
  if (value >= 45) return 3;
  return 4;
}

/**
 * Build canonical synthetic IE scores baseline for each GDL zone.
 * 8 zonas × 4 score_types = 32 inserts.
 */
export function buildGdlSyntheticScores(
  zones: ReadonlyArray<ZoneInsertGdl> = GDL_ZONES_CANON,
): ReadonlyArray<GdlIEScoreInsert> {
  const out: GdlIEScoreInsert[] = [];
  for (const zone of zones) {
    for (const scoreType of SCORE_TYPES) {
      const [min, max] = scoreRangeFor(scoreType);
      const value = scoreInRange(zone.slug, scoreType, min, max);
      out.push({
        zoneSlug: zone.slug,
        scoreType,
        scoreValue: value,
        level: levelFromScore(value),
        tier: tierFromScore(value),
        confidence: 'medium',
        provenance: {
          is_synthetic: true,
          adr: 'ADR-059',
          source: 'F14.1.0_synthetic_baseline',
        },
      });
    }
  }
  return out;
}

export interface CalculateGdlIEScoresResult {
  readonly inserted: number;
  readonly errors: ReadonlyArray<{ readonly zoneSlug: string; readonly message: string }>;
}

/**
 * Persist 32 synthetic IE scores (8 zonas × 4 score_types) en `zone_scores`.
 * UPSERT por (zone_id, score_type, period_date).
 */
export async function calculateGuadalajaraIEScores(
  // biome-ignore lint/suspicious/noExplicitAny: Supabase generic client typing diferido types regen post-merge
  supabase: SupabaseClient<any, 'public', any>,
  zones: ReadonlyArray<ZoneInsertGdl> = GDL_ZONES_CANON,
): Promise<CalculateGdlIEScoresResult> {
  const errors: Array<{ zoneSlug: string; message: string }> = [];
  let inserted = 0;
  const periodDate = new Date().toISOString().slice(0, 10);
  const synthetic = buildGdlSyntheticScores(zones);

  for (const zone of zones) {
    const { data: zoneRow, error: lookupErr } = await supabase
      .from('zones')
      .select('id')
      .eq('country_code', zone.country_code)
      .eq('scope_type', zone.scope_type)
      .eq('scope_id', zone.scope_id)
      .maybeSingle();

    if (lookupErr || !zoneRow?.id) {
      errors.push({
        zoneSlug: zone.slug,
        message: lookupErr?.message ?? 'zone not found — run loadGuadalajaraZones first',
      });
      continue;
    }

    const zoneScores = synthetic.filter((s) => s.zoneSlug === zone.slug);
    for (const score of zoneScores) {
      const { error: insertErr } = await supabase.from('zone_scores').upsert(
        {
          zone_id: zoneRow.id,
          country_code: zone.country_code,
          score_type: score.scoreType,
          score_value: score.scoreValue,
          level: score.level,
          tier: score.tier,
          confidence: score.confidence,
          components: {},
          inputs_used: {},
          citations: [],
          provenance: score.provenance,
          period_date: periodDate,
        },
        { onConflict: 'zone_id,score_type,period_date' },
      );

      if (insertErr) {
        errors.push({ zoneSlug: zone.slug, message: `${score.scoreType}: ${insertErr.message}` });
        continue;
      }
      inserted += 1;
    }
  }

  return { inserted, errors };
}
