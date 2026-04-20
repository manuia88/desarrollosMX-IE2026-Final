// A04 Arbitrage — spread primaria vs secundaria por zona. Identifica zonas
// con premium anómalo sobre secundaria. Plan 8.B.17.3. Catálogo 03.8 §A04.
// Tier 2.
//
// Fórmula:
//   spread_pct = (precio_m2_primaria − precio_m2_secundaria) / secundaria × 100
//   score      = min(100, max(0, spread_pct · 5))
//     spread 20%+ → score 100 (arbitraje alto)
//     spread 10%  → score 50
//     spread 0-5% → score 0-25
//     spread neg  → score 0 (anomalía inversa, flag)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula:
    'spread_pct = (primaria − secundaria) / secundaria · 100; score = min(100, max(0, spread · 5)).',
  sources: ['market_prices_secondary', 'unidades_primaria'],
  weights: { spread_multiplier: 5 },
  references: [
    {
      name: 'Unidades primarias (DesarrollosMX)',
      url: 'internal',
      period: 'realtime',
    },
  ],
  confidence_thresholds: { high: 1, medium: 0, low: 0 },
  validity: { unit: 'months', value: 1 },
} as const;

export const reasoning_template =
  'Arbitrage {zona_name}: primaria {precio_m2_primaria}/m² vs secundaria {precio_m2_secundaria}/m². Spread {spread_pct}%.';

export interface A04Components extends Record<string, unknown> {
  readonly precio_m2_primaria_mxn: number;
  readonly precio_m2_secundaria_mxn: number;
  readonly spread_mxn: number;
  readonly spread_pct: number;
  readonly arbitraje_nivel: 'alto' | 'moderado' | 'bajo' | 'sin_spread' | 'anomalia_inversa';
}

export interface A04RawInput {
  readonly precio_m2_primaria_mxn: number;
  readonly precio_m2_secundaria_mxn: number;
}

export interface A04ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A04Components;
}

function classifyArbitraje(spread_pct: number): A04Components['arbitraje_nivel'] {
  if (spread_pct < 0) return 'anomalia_inversa';
  if (spread_pct >= 20) return 'alto';
  if (spread_pct >= 10) return 'moderado';
  if (spread_pct >= 3) return 'bajo';
  return 'sin_spread';
}

export function computeA04Arbitrage(input: A04RawInput): A04ComputeResult {
  const spread_mxn = input.precio_m2_primaria_mxn - input.precio_m2_secundaria_mxn;
  const spread_pct =
    input.precio_m2_secundaria_mxn > 0 ? (spread_mxn / input.precio_m2_secundaria_mxn) * 100 : 0;
  const value = Math.max(0, Math.min(100, Math.round(spread_pct * 5)));

  return {
    value,
    confidence:
      input.precio_m2_primaria_mxn > 0 && input.precio_m2_secundaria_mxn > 0
        ? 'high'
        : 'insufficient_data',
    components: {
      precio_m2_primaria_mxn: input.precio_m2_primaria_mxn,
      precio_m2_secundaria_mxn: input.precio_m2_secundaria_mxn,
      spread_mxn: Math.round(spread_mxn),
      spread_pct: Number(spread_pct.toFixed(2)),
      arbitraje_nivel: classifyArbitraje(spread_pct),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a04.insufficient';
  if (value >= 80) return 'ie.score.a04.arbitraje_alto';
  if (value >= 50) return 'ie.score.a04.arbitraje_moderado';
  if (value >= 15) return 'ie.score.a04.arbitraje_bajo';
  return 'ie.score.a04.sin_arbitraje';
}

export const a04ArbitrageCalculator: Calculator = {
  scoreId: 'A04',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    return {
      score_value: 0,
      score_label: getLabelKey(0, 'insufficient_data'),
      components: { reason: 'market_prices_secondary + unidades primaria no ingested' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence: 'insufficient_data',
      citations: [{ source: 'market_prices_secondary', url: 'internal', period: 'pending' }],
      provenance: {
        sources: [{ name: 'market_prices_secondary', count: 0 }],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a04ArbitrageCalculator;
