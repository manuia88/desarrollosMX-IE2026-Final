// A03 Migration — % de búsquedas foráneas (origen otras alcaldías/estados)
// hacia la zona. Plan 8.B.17.2. Catálogo 03.8 §A03. Tier 2.
//
// Fórmula simplificada:
//   score = min(100, pct_busquedas_foraneas × 1.5)
//   50% foraneas → 75 score (alta migración)
//   67% → 100 (top)
//   20% → 30 (flujo residual)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula: 'score = min(100, pct_busquedas_foraneas · 1.5).',
  sources: ['search_logs'],
  weights: { pct_foraneas: 1.5 },
  references: [
    {
      name: 'search_logs (DesarrollosMX IP geolocalización)',
      url: 'internal',
      period: 'trailing_90d',
    },
  ],
  confidence_thresholds: { high: 100, medium: 20, low: 5 },
  validity: { unit: 'months', value: 1 },
} as const;

export const reasoning_template =
  'Migration {zona_name}: {pct_busquedas_foraneas}% búsquedas vienen de fuera de la zona. Top origen: {top_origen_estado}.';

export interface A03Components extends Record<string, unknown> {
  readonly pct_busquedas_foraneas: number;
  readonly top_origen_estado: string;
}

export interface A03RawInput {
  readonly pct_busquedas_foraneas: number;
  readonly top_origen_estado: string;
}

export interface A03ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A03Components;
}

export function computeA03Migration(input: A03RawInput): A03ComputeResult {
  const value = Math.max(0, Math.min(100, Math.round(input.pct_busquedas_foraneas * 1.5)));
  return {
    value,
    confidence:
      input.pct_busquedas_foraneas > 0 && input.pct_busquedas_foraneas <= 100
        ? 'high'
        : 'insufficient_data',
    components: {
      pct_busquedas_foraneas: input.pct_busquedas_foraneas,
      top_origen_estado: input.top_origen_estado,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a03.insufficient';
  if (value >= 75) return 'ie.score.a03.alta_migracion';
  if (value >= 45) return 'ie.score.a03.migracion_moderada';
  if (value >= 20) return 'ie.score.a03.flujo_residual';
  return 'ie.score.a03.sin_migracion';
}

export const a03MigrationCalculator: Calculator = {
  scoreId: 'A03',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    return {
      score_value: 0,
      score_label: getLabelKey(0, 'insufficient_data'),
      components: { reason: 'search_logs not ingested for zone' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence: 'insufficient_data',
      citations: [{ source: 'search_logs', url: 'internal', period: 'pending' }],
      provenance: {
        sources: [{ name: 'search_logs', count: 0 }],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a03MigrationCalculator;
