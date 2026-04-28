// ADR-059 — Playa del Carmen IE scores calculator
// FASE 14.1 sub-agent 1
// Sintético baseline H1 — replica logic CDMX a nivel narrativo, NO importa
// features/intelligence-engine ni shared/lib/intelligence-engine (read-only canon
// per ADR-055). Calcula 4 score types per zone (pulse_score, futures_alpha,
// ghost, zone_alpha) con valores en rangos canon Playa tourist hot.
//
// Provenance canon ADR-018: is_synthetic=true + adr='ADR-059'. Disclosure flag
// visible UI marca "Datos sintéticos H1".
//
// H2: reemplaza con ingestion real (Catastro Quintana Roo + INEGI BIE turismo +
// AirROI metrics colonia-level con pricing $0.10/call confirmed empírico).

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';

type ZoneScoresInsert = Database['public']['Tables']['zone_scores']['Insert'];

export interface PlayaScoreInput {
  readonly zoneId: string;
  readonly scopeId: string;
  readonly lat: number;
  readonly lng: number;
}

export type PlayaScoreType = 'pulse_score' | 'futures_alpha' | 'ghost' | 'zone_alpha';

export interface PlayaScoreRow {
  readonly zoneId: string;
  readonly scoreType: PlayaScoreType;
  readonly scoreValue: number;
  readonly confidence: 'high' | 'medium' | 'low';
}

export interface CalculatePlayaIEScoresResult {
  readonly inserted: number;
  readonly scores: ReadonlyArray<PlayaScoreRow>;
}

interface ScoreRange {
  readonly min: number;
  readonly max: number;
}

const SCORE_RANGES: Record<PlayaScoreType, ScoreRange> = {
  pulse_score: { min: 70, max: 90 },
  futures_alpha: { min: 60, max: 85 },
  ghost: { min: 10, max: 30 },
  zone_alpha: { min: 50, max: 75 },
};

// LCG seeded por string hash — sustituye seedrandom (zero dep). Determinístico:
// mismo (scopeId, scoreType) → mismo valor across runs.
function deterministicScore(scopeId: string, scoreType: PlayaScoreType): number {
  const range = SCORE_RANGES[scoreType];
  const seedStr = `${scopeId}::${scoreType}`;
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Convert to unsigned + normalize 0..1.
  const normalized = ((h >>> 0) % 10_000) / 10_000;
  const span = range.max - range.min;
  return Math.round((range.min + normalized * span) * 1000) / 1000;
}

function tierFromScore(score: number): number {
  if (score >= 80) return 1;
  if (score >= 60) return 2;
  if (score >= 40) return 3;
  return 4;
}

function levelFromScore(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function in30DaysIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString();
}

const SCORE_TYPES: ReadonlyArray<PlayaScoreType> = [
  'pulse_score',
  'futures_alpha',
  'ghost',
  'zone_alpha',
];

export async function calculatePlayaIEScores(
  zones: ReadonlyArray<PlayaScoreInput>,
  supabase?: SupabaseClient<Database>,
): Promise<CalculatePlayaIEScoresResult> {
  const client = supabase ?? createAdminClient();
  const periodDate = todayDateString();
  const validUntil = in30DaysIso();
  const computedAt = new Date().toISOString();

  const rows: ZoneScoresInsert[] = [];
  const scores: PlayaScoreRow[] = [];

  for (const zone of zones) {
    for (const scoreType of SCORE_TYPES) {
      const scoreValue = deterministicScore(zone.scopeId, scoreType);
      const tier = tierFromScore(scoreValue);
      const level = levelFromScore(scoreValue);

      scores.push({
        zoneId: zone.zoneId,
        scoreType,
        scoreValue,
        confidence: 'medium',
      });

      rows.push({
        zone_id: zone.zoneId,
        country_code: 'MX',
        score_type: scoreType,
        score_value: scoreValue,
        score_label: scoreType.replace(/_/g, ' '),
        level,
        tier,
        confidence: 'medium',
        components: {} as never,
        inputs_used: {} as never,
        citations: [] as never,
        provenance: {
          is_synthetic: true,
          source: 'F14.1.0_synthetic_baseline',
          adr: 'ADR-059',
          notes: 'Playa del Carmen sintético H1 hasta ingestion real H2',
        } as never,
        period_date: periodDate,
        computed_at: computedAt,
      });
    }
  }

  let inserted = 0;
  if (rows.length > 0) {
    const { error, count } = await client.from('zone_scores').upsert(rows, {
      onConflict: 'zone_id,score_type,period_date',
      count: 'exact',
    });
    if (!error) {
      inserted = count ?? rows.length;
    }
  }

  // valid_until referenced en metadata para H2 ingestion replacement window.
  void validUntil;

  return { inserted, scores };
}
