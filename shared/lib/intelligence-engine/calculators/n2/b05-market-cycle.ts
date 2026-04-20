// B05 Market Cycle — score N2 que clasifica la zona/alcaldía en una fase del
// ciclo inmobiliario: expansion | pico | contraccion | recuperacion.
// Plan FASE 10 §10.A.4. Catálogo 03.8 §B05.
//
// Regla de decisión (matriz):
//   expansion:     momentum>60  && absorcion_creciente  && precios_subiendo
//   pico:          momentum<40  && absorcion_decreciente && precios_altos
//   contraccion:   momentum<30  && absorcion_baja        && precios_bajando
//   recuperacion:  momentum 30-60 && absorcion_ascendente && precios_estabilizados
//
// Inputs:
//   - macro_tiie: tasa interbancaria (contexto)
//   - B08_absorption_trend: {direction, slope} ('ascending'|'flat'|'descending')
//   - A12_price_fairness_avg: nivel de precios vs justo (0-100; altos >70, bajos <40)
//   - N11_momentum: momentum zona 0-100
//   - B01_demand: demanda 0-100
//
// Output: {fase, confidence_pct, indicators: {momentum, absorption, price, demand}, mensaje}
//
// D13 — critical deps: B01 (demand), B08 (absorption), N11 (momentum). Si alguna
// insufficient_data → fase='insufficient', score_value=0. Si critical low → cap medium.
// A12 price fairness es supporting (no bloquea).
//
// Tier 2 (no requiere snapshots históricos, sólo lectura de scores N0/N1 al period).

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectDepConfidences, propagateConfidence } from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export type B05Phase = 'expansion' | 'pico' | 'contraccion' | 'recuperacion' | 'insufficient';

export type B05AbsorptionTrend = 'ascending' | 'flat' | 'descending';

export const methodology = {
  formula:
    'Matriz fase por zona: expansion=(N11>60 ∧ B08.ascending ∧ A12>60); pico=(N11<40 ∧ B08.descending ∧ A12>70); contraccion=(N11<30 ∧ B01<40 ∧ A12<45); recuperacion=(30≤N11≤60 ∧ B08.ascending ∧ 45≤A12≤60).',
  sources: [
    'zone_scores:N11',
    'zone_scores:B01',
    'zone_scores:B08',
    'zone_scores:A12',
    'macro_series:tiie',
  ],
  weights: {
    momentum: 0.35,
    absorption: 0.3,
    demand: 0.2,
    price_fairness: 0.15,
  },
  dependencies: [
    { score_id: 'B01', weight: 0.2, role: 'demanda', critical: true },
    { score_id: 'B08', weight: 0.3, role: 'absorcion_trend', critical: true },
    { score_id: 'N11', weight: 0.35, role: 'momentum', critical: true },
    { score_id: 'A12', weight: 0.15, role: 'price_fairness', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §B05 Market Cycle',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b05-market-cycle',
    },
    {
      name: 'Plan FASE 10 §10.A.4',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    min_coverage_pct: 75,
    high_coverage_pct: 100,
  },
  // D14 — sensitivity_analysis: documenta cómo cambiar un input mueve el resultado.
  // Útil para explicabilidad B2B y para que UI/Copilot describa "qué mueve la aguja".
  sensitivity_analysis: {
    most_sensitive_input: 'N11_momentum',
    impact_notes: [
      'N11±10 puede cambiar fase entre expansion/recuperacion/pico',
      'B08 direction flip (ascending↔descending) puede mover fase en un salto',
      'A12 sólo afecta umbrales precio; fase rara vez cambia sólo por A12',
      'B01 demand baja <40 es necesaria para detectar contraccion',
    ],
  },
} as const;

export const reasoning_template =
  'Mercado de {zona_name} en fase {fase}: momentum N11={N11_momentum}, absorción {absorption_trend}, precio A12={A12_price_fairness}, demanda B01={B01_demand}, TIIE={macro_tiie}%. {mensaje}. Confianza {confidence}.';

export interface B05Indicators {
  readonly momentum: number | null;
  readonly absorption: B05AbsorptionTrend | null;
  readonly price: number | null;
  readonly demand: number | null;
  readonly macro_tiie: number | null;
}

export interface B05Components extends Record<string, unknown> {
  readonly fase: B05Phase;
  readonly confidence_pct: number;
  readonly indicators: B05Indicators;
  readonly mensaje: string;
  readonly missing_dimensions: readonly string[];
  readonly available_count: number;
  readonly total_count: number;
  readonly coverage_pct: number;
  readonly cap_reason: string | null;
  readonly capped_by: readonly string[];
}

export interface B05RawInput {
  readonly N11_momentum: number | null;
  readonly B01_demand: number | null;
  readonly B08_absorption_trend: B05AbsorptionTrend | null;
  readonly A12_price_fairness_avg: number | null;
  readonly macro_tiie: number | null;
  readonly confidences?: {
    readonly N11?: Confidence;
    readonly B01?: Confidence;
    readonly B08?: Confidence;
    readonly A12?: Confidence;
  };
}

export interface B05ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B05Components;
}

const CRITICAL_DEPS: readonly string[] = ['B01', 'B08', 'N11'];
const TOTAL_DEPS = 4;

function classifyPhase(
  momentum: number,
  absorption: B05AbsorptionTrend,
  price: number,
  demand: number,
): { fase: B05Phase; mensaje: string } {
  // Orden de evaluación: contraccion → pico → expansion → recuperacion.
  if (momentum < 30 && absorption !== 'ascending' && price < 45 && demand < 40) {
    return {
      fase: 'contraccion',
      mensaje: 'Contracción: momentum y demanda bajos, precios cediendo.',
    };
  }
  if (momentum < 40 && absorption === 'descending' && price >= 70) {
    return {
      fase: 'pico',
      mensaje: 'Pico de ciclo: momentum se enfría con precios aún altos.',
    };
  }
  if (momentum > 60 && absorption === 'ascending' && price >= 60) {
    return {
      fase: 'expansion',
      mensaje: 'Expansión: momentum fuerte, absorción creciente y precios subiendo.',
    };
  }
  if (
    momentum >= 30 &&
    momentum <= 60 &&
    absorption === 'ascending' &&
    price >= 45 &&
    price <= 65
  ) {
    return {
      fase: 'recuperacion',
      mensaje: 'Recuperación: momentum moderado, absorción ascendente, precios estabilizados.',
    };
  }
  // Fallback heurístico por momentum.
  if (momentum >= 60) {
    return {
      fase: 'expansion',
      mensaje: 'Expansión probable (heurística por momentum).',
    };
  }
  if (momentum >= 30) {
    return {
      fase: 'recuperacion',
      mensaje: 'Recuperación probable (heurística por momentum).',
    };
  }
  return {
    fase: 'contraccion',
    mensaje: 'Contracción probable (heurística por momentum bajo).',
  };
}

function phaseToValue(fase: B05Phase): number {
  switch (fase) {
    case 'expansion':
      return 80;
    case 'recuperacion':
      return 60;
    case 'pico':
      return 40;
    case 'contraccion':
      return 20;
    default:
      return 0;
  }
}

function confidenceToPct(c: Confidence): number {
  switch (c) {
    case 'high':
      return 90;
    case 'medium':
      return 70;
    case 'low':
      return 45;
    default:
      return 0;
  }
}

export function computeB05MarketCycle(input: B05RawInput): B05ComputeResult {
  const missing: string[] = [];
  if (input.N11_momentum === null || !Number.isFinite(input.N11_momentum)) missing.push('N11');
  if (input.B01_demand === null || !Number.isFinite(input.B01_demand)) missing.push('B01');
  if (input.B08_absorption_trend === null) missing.push('B08');
  if (input.A12_price_fairness_avg === null || !Number.isFinite(input.A12_price_fairness_avg))
    missing.push('A12');

  const available_count = TOTAL_DEPS - missing.length;
  const coverage_pct = Math.round((available_count / TOTAL_DEPS) * 100);

  // Critical missing → insufficient_data.
  const criticalMissing = missing.filter((s) => CRITICAL_DEPS.includes(s));
  if (criticalMissing.length > 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        fase: 'insufficient',
        confidence_pct: 0,
        indicators: {
          momentum: input.N11_momentum,
          absorption: input.B08_absorption_trend,
          price: input.A12_price_fairness_avg,
          demand: input.B01_demand,
          macro_tiie: input.macro_tiie,
        },
        mensaje: 'Datos insuficientes para clasificar ciclo de mercado.',
        missing_dimensions: missing,
        available_count,
        total_count: TOTAL_DEPS,
        coverage_pct,
        cap_reason: 'critical_dependency_missing',
        capped_by: criticalMissing,
      },
    };
  }

  const momentum = input.N11_momentum as number;
  const demand = input.B01_demand as number;
  const absorption = input.B08_absorption_trend as B05AbsorptionTrend;
  const price = input.A12_price_fairness_avg ?? 50; // supporting fallback neutro

  const { fase, mensaje } = classifyPhase(momentum, absorption, price, demand);
  const value = phaseToValue(fase);

  // Confidence propagation (D13).
  const depConfs = [
    { scoreId: 'N11', confidence: input.confidences?.N11 ?? 'medium' },
    { scoreId: 'B01', confidence: input.confidences?.B01 ?? 'medium' },
    { scoreId: 'B08', confidence: input.confidences?.B08 ?? 'medium' },
    ...(input.A12_price_fairness_avg !== null
      ? [{ scoreId: 'A12', confidence: input.confidences?.A12 ?? 'medium' }]
      : []),
  ] as const;
  const { critical, supporting } = collectDepConfidences(depConfs, CRITICAL_DEPS);
  const propagation = propagateConfidence({
    critical,
    supporting,
    coverage_pct,
    min_coverage_pct: methodology.confidence_thresholds.min_coverage_pct,
    high_coverage_pct: methodology.confidence_thresholds.high_coverage_pct,
  });

  return {
    value,
    confidence: propagation.confidence,
    components: {
      fase,
      confidence_pct: confidenceToPct(propagation.confidence),
      indicators: {
        momentum,
        absorption,
        price: input.A12_price_fairness_avg,
        demand,
        macro_tiie: input.macro_tiie,
      },
      mensaje,
      missing_dimensions: missing,
      available_count,
      total_count: TOTAL_DEPS,
      coverage_pct,
      cap_reason: propagation.cap_reason,
      capped_by: propagation.capped_by,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b05.insufficient';
  if (value >= 80) return 'ie.score.b05.expansion';
  if (value >= 60) return 'ie.score.b05.recuperacion';
  if (value >= 40) return 'ie.score.b05.pico';
  return 'ie.score.b05.contraccion';
}

interface ZoneScoreRow {
  readonly score_type: string;
  readonly score_value: number | null;
  readonly confidence: Confidence | null;
  readonly components: Record<string, unknown> | null;
}

type LooseClient = SupabaseClient<Record<string, unknown>>;

async function fetchDeps(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<{
  input: B05RawInput;
  sources: Array<{ name: string; count: number }>;
}> {
  const input: {
    N11_momentum: number | null;
    B01_demand: number | null;
    B08_absorption_trend: B05AbsorptionTrend | null;
    A12_price_fairness_avg: number | null;
    macro_tiie: number | null;
    confidences: {
      N11?: Confidence;
      B01?: Confidence;
      B08?: Confidence;
      A12?: Confidence;
    };
  } = {
    N11_momentum: null,
    B01_demand: null,
    B08_absorption_trend: null,
    A12_price_fairness_avg: null,
    macro_tiie: null,
    confidences: {},
  };
  const sources: Array<{ name: string; count: number }> = [];

  try {
    const { data } = await (supabase as unknown as LooseClient)
      .from('zone_scores' as never)
      .select('score_type, score_value, confidence, components')
      .eq('zone_id', zoneId)
      .eq('period_date', periodDate)
      .in('score_type', ['N11', 'B01', 'B08', 'A12']);
    if (data) {
      const rows = data as unknown as readonly ZoneScoreRow[];
      for (const row of rows) {
        if (row.score_type === 'N11' && row.score_value !== null) {
          input.N11_momentum = row.score_value;
          if (row.confidence) input.confidences.N11 = row.confidence;
          sources.push({ name: 'zone_scores:N11', count: 1 });
        } else if (row.score_type === 'B01' && row.score_value !== null) {
          input.B01_demand = row.score_value;
          if (row.confidence) input.confidences.B01 = row.confidence;
          sources.push({ name: 'zone_scores:B01', count: 1 });
        } else if (row.score_type === 'B08') {
          const comp = row.components as { trend_direction?: B05AbsorptionTrend } | null;
          if (comp?.trend_direction) input.B08_absorption_trend = comp.trend_direction;
          else if (row.score_value !== null) {
            // Derive from value as fallback.
            input.B08_absorption_trend =
              row.score_value >= 65 ? 'ascending' : row.score_value <= 35 ? 'descending' : 'flat';
          }
          if (row.confidence) input.confidences.B08 = row.confidence;
          sources.push({ name: 'zone_scores:B08', count: 1 });
        } else if (row.score_type === 'A12' && row.score_value !== null) {
          input.A12_price_fairness_avg = row.score_value;
          if (row.confidence) input.confidences.A12 = row.confidence;
          sources.push({ name: 'zone_scores:A12', count: 1 });
        }
      }
    }
  } catch {
    // swallow — insufficient_data propagation handles missing.
  }

  return { input, sources };
}

export const b05MarketCycleCalculator: Calculator = {
  scoreId: 'B05',
  version,
  tier: 2,
  async run(input: CalculatorInput, supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const valid_until = computeValidUntil(new Date(computed_at), methodology.validity);
    const zoneId = input.zoneId;
    if (!zoneId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: {
          reason: 'B05 requiere zoneId para fetch dependencias.',
        },
        inputs_used: { periodDate: input.periodDate, zoneId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'zone_scores', count: 0 }],
          computed_at,
          calculator_version: version,
        },
        template_vars: { zona_name: 'desconocida' },
        valid_until,
      };
    }

    const { input: raw, sources } = await fetchDeps(supabase, zoneId, input.periodDate);
    const result = computeB05MarketCycle(raw);

    const citations = methodology.dependencies.map((d) => ({
      source: `zone_scores:${d.score_id}`,
      period: input.periodDate,
    }));

    return {
      score_value: result.value,
      score_label: getLabelKey(result.value, result.confidence),
      components: result.components,
      inputs_used: { periodDate: input.periodDate, zoneId },
      confidence: result.confidence,
      citations,
      provenance: {
        sources:
          sources.length > 0
            ? sources
            : [{ name: 'zone_scores', count: result.components.available_count }],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        zona_name: zoneId,
        fase: result.components.fase,
        N11_momentum: String(raw.N11_momentum ?? 'n/a'),
        B01_demand: String(raw.B01_demand ?? 'n/a'),
        absorption_trend: String(raw.B08_absorption_trend ?? 'n/a'),
        A12_price_fairness: String(raw.A12_price_fairness_avg ?? 'n/a'),
        macro_tiie: String(raw.macro_tiie ?? 'n/a'),
        mensaje: result.components.mensaje,
      },
      valid_until,
    };
  },
};

export default b05MarketCycleCalculator;
