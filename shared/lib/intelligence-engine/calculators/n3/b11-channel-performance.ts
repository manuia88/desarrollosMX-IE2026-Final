// B11 Channel Performance — score N3 por canal de adquisición (Inmuebles24,
// ML, Facebook, referencias, DMX directo). Mide conversión leads→visits→
// operations + ROI por canal.
// Plan FASE 10 §10.B.7. Catálogo 03.8 §B11. Tier 3. Categoría dev.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const methodology = {
  formula:
    'score = conversion_global × 0.4 + ROI_norm × 0.35 + volume_norm × 0.15 + cost_per_op_inv × 0.1',
  sources: ['operaciones', 'marketing_spend', 'leads', 'visits'],
  dependencies: [
    { score_id: 'OPS', weight: 0.4, role: 'conversion', critical: true },
    { score_id: 'ROI', weight: 0.35, role: 'roi', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §B11 Channel Performance',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b11-channel-performance',
    },
    { name: 'Plan FASE 10 §10.B.7', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_coverage_pct: 70, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'ops', impact_pct_per_10pct_change: 4.0 },
    { dimension_id: 'roi', impact_pct_per_10pct_change: 3.5 },
  ],
} as const;

export const reasoning_template =
  'Channel {channel}: {leads} leads → {visits} visits → {operations} ops. ROI {roi_pct}%. Score {score_value}.';

export interface ChannelMetrics {
  readonly channel: string;
  readonly leads: number;
  readonly visits: number;
  readonly operations: number;
  readonly revenue_mxn: number;
  readonly spend_mxn: number;
}

export interface B11ChannelOutput {
  readonly channel: string;
  readonly leads: number;
  readonly visits: number;
  readonly operations: number;
  readonly conversion_lead_to_visit: number;
  readonly conversion_visit_to_op: number;
  readonly conversion_global: number;
  readonly roi_pct: number;
  readonly cost_per_op_mxn: number;
  readonly score: number;
  readonly rank: number;
}

export interface B11Components extends Record<string, unknown> {
  readonly channels: readonly B11ChannelOutput[];
  readonly top_channel: string | null;
  readonly worst_channel: string | null;
  readonly global_conversion: number;
  readonly global_roi_pct: number;
}

export interface B11RawInput {
  readonly channels: readonly ChannelMetrics[];
}

export interface B11ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B11Components;
}

function safeDiv(n: number, d: number): number {
  return d > 0 ? n / d : 0;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function computeB11Channel(input: B11RawInput): B11ComputeResult {
  if (input.channels.length === 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        channels: [],
        top_channel: null,
        worst_channel: null,
        global_conversion: 0,
        global_roi_pct: 0,
      },
    };
  }

  // Compute per channel.
  const enriched = input.channels.map((c) => {
    const conv_lead_visit = safeDiv(c.visits, c.leads) * 100;
    const conv_visit_op = safeDiv(c.operations, c.visits) * 100;
    const conv_global = safeDiv(c.operations, c.leads) * 100;
    const roi_pct = c.spend_mxn > 0 ? ((c.revenue_mxn - c.spend_mxn) / c.spend_mxn) * 100 : 0;
    const cost_per_op = c.operations > 0 ? c.spend_mxn / c.operations : 0;
    return {
      channel: c.channel,
      leads: c.leads,
      visits: c.visits,
      operations: c.operations,
      conversion_lead_to_visit: Number(conv_lead_visit.toFixed(2)),
      conversion_visit_to_op: Number(conv_visit_op.toFixed(2)),
      conversion_global: Number(conv_global.toFixed(2)),
      roi_pct: Number(roi_pct.toFixed(2)),
      cost_per_op_mxn: Math.round(cost_per_op),
      score: 0,
      rank: 0,
      _raw: c,
    };
  });

  // Normalizar para score 0-100.
  const maxConv = Math.max(...enriched.map((e) => e.conversion_global), 1);
  const maxRoi = Math.max(...enriched.map((e) => e.roi_pct), 1);
  const maxOps = Math.max(...enriched.map((e) => e.operations), 1);
  const minCost = Math.min(
    ...enriched.filter((e) => e.cost_per_op_mxn > 0).map((e) => e.cost_per_op_mxn),
    Number.POSITIVE_INFINITY,
  );

  for (const e of enriched) {
    const conv_n = (e.conversion_global / maxConv) * 100;
    const roi_n = e.roi_pct > 0 ? (e.roi_pct / maxRoi) * 100 : 0;
    const vol_n = (e.operations / maxOps) * 100;
    const cost_inv_n =
      e.cost_per_op_mxn > 0 && minCost < Number.POSITIVE_INFINITY
        ? (minCost / e.cost_per_op_mxn) * 100
        : 0;
    e.score = Math.round(clamp100(conv_n * 0.4 + roi_n * 0.35 + vol_n * 0.15 + cost_inv_n * 0.1));
  }

  // Rank descendente por score.
  const sorted = [...enriched].sort((a, b) => b.score - a.score);
  sorted.forEach((e, idx) => {
    e.rank = idx + 1;
  });

  const totalLeads = input.channels.reduce((s, c) => s + c.leads, 0);
  const totalOps = input.channels.reduce((s, c) => s + c.operations, 0);
  const totalRev = input.channels.reduce((s, c) => s + c.revenue_mxn, 0);
  const totalSpend = input.channels.reduce((s, c) => s + c.spend_mxn, 0);
  const global_conversion = Number((safeDiv(totalOps, totalLeads) * 100).toFixed(2));
  const global_roi_pct =
    totalSpend > 0 ? Number((((totalRev - totalSpend) / totalSpend) * 100).toFixed(2)) : 0;

  const channels: B11ChannelOutput[] = enriched.map(({ _raw: _r, ...rest }) => rest);

  const top = sorted[0];
  const worst = sorted[sorted.length - 1];
  const score = top?.score ?? 0;

  const enough = totalOps >= 3; // min 3 ops para confidence rich.
  const confidence: Confidence = enough ? 'medium' : 'low';

  return {
    value: score,
    confidence,
    components: {
      channels,
      top_channel: top?.channel ?? null,
      worst_channel: worst?.channel ?? null,
      global_conversion,
      global_roi_pct,
    },
  };
}

export function getLabelKey(score: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b11.insufficient';
  if (score >= 75) return 'ie.score.b11.excelente';
  if (score >= 55) return 'ie.score.b11.bueno';
  if (score >= 35) return 'ie.score.b11.regular';
  return 'ie.score.b11.pobre';
}

export const b11ChannelPerformanceCalculator: Calculator = {
  scoreId: 'B11',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence = Array.isArray(params.channels) ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'prod path stub — invocar computeB11Channel directo' },
      inputs_used: { periodDate: input.periodDate, projectId: input.projectId ?? null },
      confidence,
      citations: [
        { source: 'operaciones', period: input.periodDate },
        { source: 'marketing_spend', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'operaciones', count: 0 },
          { name: 'marketing_spend', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { channel: 'agregado' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default b11ChannelPerformanceCalculator;
