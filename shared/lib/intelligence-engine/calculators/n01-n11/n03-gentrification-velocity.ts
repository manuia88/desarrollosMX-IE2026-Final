// N03 Gentrification Velocity — IP propietaria DMX (tier 3).
// Plan §8.C.3 + catálogo 03.8 §N03.
//
// Fórmula:
//   Δ(ratio_PB) = ratio_reciente − ratio_inicial (con ratio_PB = high / basic).
//   Δ(meses)    = (reciente_date − inicial_date) / 30d
//   velocity    = Δ(ratio_PB) / Δ(meses) × 100
//   score       = clamp(50 + velocity × scale, 0, 100)   con scale 25 (0.4/mes → +10)
//
// Gating: requiere ≥2 snapshots DENUE separados ≥3 meses. Si no → insufficient_data.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

const MIN_MONTHS_BETWEEN_SNAPSHOTS = 3;
const VELOCITY_SCALE = 200; // 0.05 ratio_PB/mes → +10 score (velocity_pct 5 × 2 = 10)

export const methodology = {
  formula:
    'velocity = Δ(high/basic) / Δ(meses) × 100. score = clamp(50 + velocity × 25, 0, 100). Requiere ≥2 snapshots separados ≥3 meses.',
  sources: ['denue_snapshots'],
  weights: { velocity: 1.0 },
  references: [
    {
      name: 'Catálogo 03.8 §N03 Gentrification Velocity',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#n03-gentrification-velocity',
    },
  ],
  validity: { unit: 'months', value: 3 } as const,
  snapshot_separation_months_min: MIN_MONTHS_BETWEEN_SNAPSHOTS,
  recommendations: {
    low: ['ie.score.n03.recommendations.low.0', 'ie.score.n03.recommendations.low.1'],
    medium: ['ie.score.n03.recommendations.medium.0', 'ie.score.n03.recommendations.medium.1'],
    high: ['ie.score.n03.recommendations.high.0', 'ie.score.n03.recommendations.high.1'],
    insufficient_data: ['ie.score.n03.recommendations.insufficient_data.0'],
  },
} as const;

export const reasoning_template =
  'Gentrificación de {zona_name} obtiene {score_value} por Δratio_PB {delta_ratio} en {delta_meses} meses (velocity {velocity}). Apertura cafeterías proxy: {apertura_cafeterias}. Confianza {confidence}.';

export type GentrificationBucket = 'low' | 'medium' | 'high';

export interface DenueSnapshotCount {
  readonly snapshot_date: string;
  readonly total: number;
  readonly tier_counts: {
    readonly high: number;
    readonly standard: number;
    readonly basic: number;
  };
  readonly by_macro_category?: Readonly<Record<string, number>>;
}

export interface N03Components extends Record<string, unknown> {
  readonly snapshot_inicial: { date: string; ratio_PB: number } | null;
  readonly snapshot_reciente: { date: string; ratio_PB: number } | null;
  readonly delta_ratio: number;
  readonly delta_meses: number;
  readonly velocity: number;
  readonly tasa_apertura_cafeterias: number;
  readonly tasa_cierre_fondas: number;
  readonly hipsterism_index: number;
  readonly bucket: GentrificationBucket;
  readonly reason?: string;
}

export interface N03RawInput {
  readonly snapshots: readonly DenueSnapshotCount[];
}

export interface N03ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: N03Components;
}

function bucketFor(value: number): GentrificationBucket {
  if (value >= 70) return 'high';
  if (value >= 40) return 'medium';
  return 'low';
}

function ratioPB(s: DenueSnapshotCount): number {
  return s.tier_counts.basic > 0 ? s.tier_counts.high / s.tier_counts.basic : 0;
}

function monthsBetween(dateA: string, dateB: string): number {
  const a = new Date(`${dateA}T00:00:00Z`);
  const b = new Date(`${dateB}T00:00:00Z`);
  const diffMs = b.getTime() - a.getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 30);
}

export function computeN03Gentrification(input: N03RawInput): N03ComputeResult {
  const sorted = [...input.snapshots].sort((a, b) =>
    a.snapshot_date.localeCompare(b.snapshot_date),
  );
  const inicial = sorted[0];
  const reciente = sorted[sorted.length - 1];

  if (!inicial || !reciente || sorted.length < 2) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        snapshot_inicial: inicial
          ? { date: inicial.snapshot_date, ratio_PB: ratioPB(inicial) }
          : null,
        snapshot_reciente: reciente
          ? { date: reciente.snapshot_date, ratio_PB: ratioPB(reciente) }
          : null,
        delta_ratio: 0,
        delta_meses: 0,
        velocity: 0,
        tasa_apertura_cafeterias: 0,
        tasa_cierre_fondas: 0,
        hipsterism_index: 0,
        bucket: 'low',
        reason: 'Score disponible tras 2 snapshots DENUE separados ≥3 meses',
      },
    };
  }

  const delta_meses = monthsBetween(inicial.snapshot_date, reciente.snapshot_date);
  if (delta_meses < MIN_MONTHS_BETWEEN_SNAPSHOTS) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        snapshot_inicial: { date: inicial.snapshot_date, ratio_PB: ratioPB(inicial) },
        snapshot_reciente: { date: reciente.snapshot_date, ratio_PB: ratioPB(reciente) },
        delta_ratio: 0,
        delta_meses: Number(delta_meses.toFixed(2)),
        velocity: 0,
        tasa_apertura_cafeterias: 0,
        tasa_cierre_fondas: 0,
        hipsterism_index: 0,
        bucket: 'low',
        reason: `Snapshots separados ${delta_meses.toFixed(1)}m (<${MIN_MONTHS_BETWEEN_SNAPSHOTS}m)`,
      },
    };
  }

  const ratio_inicial = ratioPB(inicial);
  const ratio_reciente = ratioPB(reciente);
  const delta_ratio = ratio_reciente - ratio_inicial;
  const velocity = delta_meses > 0 ? (delta_ratio / delta_meses) * 100 : 0;

  // velocity = delta_ratio/delta_meses × 100 (puntos porcentuales por mes).
  // score = 50 + velocity × (SCALE/100) → 50 + velocity × 2 con SCALE 200.
  const value = Math.max(0, Math.min(100, Math.round(50 + (velocity * VELOCITY_SCALE) / 100)));

  // Hipsterism proxy: apertura cafeterías (si existe en by_macro_category)
  const cafeteria_inicial = inicial.by_macro_category?.cafeterias ?? 0;
  const cafeteria_reciente = reciente.by_macro_category?.cafeterias ?? 0;
  const tasa_apertura_cafeterias = cafeteria_reciente - cafeteria_inicial;

  const fonda_inicial = (inicial.by_macro_category?.gastronomia ?? 0) - cafeteria_inicial;
  const fonda_reciente = (reciente.by_macro_category?.gastronomia ?? 0) - cafeteria_reciente;
  const tasa_cierre_fondas = Math.max(0, fonda_inicial - fonda_reciente);
  const hipsterism_index =
    fonda_inicial > 0 ? tasa_apertura_cafeterias / Math.max(1, fonda_inicial) : 0;

  return {
    value,
    confidence: 'high', // snapshots explícitos — no hay ambigüedad
    components: {
      snapshot_inicial: { date: inicial.snapshot_date, ratio_PB: Number(ratio_inicial.toFixed(3)) },
      snapshot_reciente: {
        date: reciente.snapshot_date,
        ratio_PB: Number(ratio_reciente.toFixed(3)),
      },
      delta_ratio: Number(delta_ratio.toFixed(3)),
      delta_meses: Number(delta_meses.toFixed(2)),
      velocity: Number(velocity.toFixed(3)),
      tasa_apertura_cafeterias,
      tasa_cierre_fondas,
      hipsterism_index: Number(hipsterism_index.toFixed(3)),
      bucket: bucketFor(value),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.n03.insufficient';
  if (value >= 80) return 'ie.score.n03.gentrificacion_rapida';
  if (value >= 60) return 'ie.score.n03.gentrificacion_moderada';
  if (value >= 40) return 'ie.score.n03.cambio_leve';
  return 'ie.score.n03.estable';
}

export function getRecommendationKeys(value: number, confidence: Confidence): readonly string[] {
  if (confidence === 'insufficient_data') return methodology.recommendations.insufficient_data;
  return methodology.recommendations[bucketFor(value)];
}

export const n03GentrificationCalculator: Calculator = {
  scoreId: 'N03',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    // Prod path: query geo_snapshots source='denue' para zone+country
    // últimos 2 snapshots con separación ≥3m. H1 sin ingestor snapshots →
    // insufficient.
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'Score disponible tras 2 snapshots DENUE (≥3 meses)',
      },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [{ source: 'denue_snapshots', url: 'https://www.inegi.org.mx/app/mapa/denue/' }],
      provenance: {
        sources: [{ name: 'denue_snapshots', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default n03GentrificationCalculator;
