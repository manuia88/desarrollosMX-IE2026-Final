// B14 Buyer Persona Proyecto — agrega H14 buyer personas de los contactos
// interesados en un proyecto (wishlist + busquedas matching + visitas +
// operaciones) + demografía zona para estimar el mix de perfiles que mejor
// matchea el proyecto.
// Plan FASE 10 §10.A.8. Catálogo 03.8 §B14. Tier 2. Categoría proyecto.
//
// FÓRMULA:
//   Para cada contacto interesado en el proyecto se consume el vector H14
//   `perfiles` (6 tipos). Cada contacto aporta un voto ponderado por su
//   `weight_contacto` (interacciones / visitas / operaciones pesan más) y
//   por la certeza (score_value H14 / 100).
//   Sum weighted vectors → normalizar a 100% → mix_personas.
//
//   dominant_persona = argmax(mix_personas).
//   diversidad_index = 1 − Σ p_i² (Simpson inverso), 0 = monótono, cerca de 1 = plural.
//
// Output top mix ej Polanco studios: 60% digital_nomad + 30% inversor + 10% otros.
//
// D19 — usamos explainPrediction sobre la función predictiva "dominant
// persona share from behavior" (weights). Esto persiste ml_explanations
// en project_scores via persist.ts.
//
// Tier gate (Tier 2): requiere ≥3 contactos con H14 válido (>0 signals cada uno).
// Critical deps (D13): H14 (sin buyer personas individuales no hay mix).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import {
  computeSensitivity,
  type Explanation,
  explainPrediction,
  type FeatureValue,
  type PredictFn,
} from '../../explainable/lime-approximation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export type PersonaId =
  | 'family'
  | 'inversor'
  | 'primera_compra'
  | 'downsizer'
  | 'second_home'
  | 'digital_nomad';

export const PERSONA_IDS: readonly PersonaId[] = [
  'family',
  'inversor',
  'primera_compra',
  'downsizer',
  'second_home',
  'digital_nomad',
] as const;

export const MIN_CONTACTOS_TIER_2 = 3;
export const OTHER_THRESHOLD_PCT = 5; // perfiles <5% se agregan en "otros" al output top

// Peso por tipo de interacción del contacto con el proyecto.
export const INTERACTION_WEIGHTS = {
  wishlist_add: 1,
  busqueda_match: 1,
  visita_agendada: 2,
  visita_realizada: 3,
  oferta_enviada: 5,
  operacion_cerrada: 10,
} as const;

export type InteractionType = keyof typeof INTERACTION_WEIGHTS;

export const CRITICAL_DEPS: readonly string[] = ['H14'] as const;

export const methodology = {
  formula:
    'mix_personas = normalize(Σ_contactos weight_contacto · H14_persona_vector · (H14_score/100))',
  sources: ['user_scores:H14', 'busqueda_proyectos', 'visitas', 'operaciones', 'zonas:demografía'],
  weights: {
    interaction_wishlist: INTERACTION_WEIGHTS.wishlist_add,
    interaction_visita: INTERACTION_WEIGHTS.visita_realizada,
    interaction_operacion: INTERACTION_WEIGHTS.operacion_cerrada,
  },
  dependencies: [{ score_id: 'H14', weight: 1.0, role: 'buyer_persona_contacto', critical: true }],
  triggers_cascade: ['persona_mix_changed'],
  references: [
    {
      name: 'Catálogo 03.8 §B14 Buyer Persona Proyecto',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b14-buyer-persona-proyecto',
    },
    {
      name: 'Plan FASE 10 §10.A.8',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 14 } as const,
  confidence_thresholds: {
    min_coverage_pct: 50,
    high_coverage_pct: 100,
  },
  sensitivity_analysis: [
    { dimension_id: 'H14', impact_pct_per_10pct_change: 10.0 },
    { dimension_id: 'contactos_count', impact_pct_per_10pct_change: 3.0 },
  ],
  tier_gate: {
    min_contactos: MIN_CONTACTOS_TIER_2,
  },
} as const;

export const reasoning_template =
  'Buyer Persona Proyecto {proyecto_id}: dominante={dominant_persona} ({dominant_pct}%), mezcla {top_mix}. Contactos analizados: {contactos_count}. Diversidad {diversidad_index}. Confianza {confidence}.';

export interface B14ContactoInput {
  readonly contactoId: string;
  readonly h14_perfiles: Readonly<Record<PersonaId, number>>; // match_pct 0-100
  readonly h14_score_value: number; // 0-100 confidence del dominante
  readonly interactions: readonly InteractionType[];
}

export interface B14RawInput {
  readonly proyecto_id: string;
  readonly contactos: readonly B14ContactoInput[];
  readonly zona_demografia?: Readonly<Record<PersonaId, number>>; // prior opcional 0-1
  readonly deps?: readonly DepConfidence[];
}

export interface B14MixEntry {
  readonly persona: PersonaId | 'otros';
  readonly weight_pct: number;
}

export interface B14Components extends Record<string, unknown> {
  readonly proyecto_id: string;
  readonly mix_personas: readonly B14MixEntry[];
  readonly full_vector: Readonly<Record<PersonaId, number>>;
  readonly dominant_persona: PersonaId | null;
  readonly diversidad_index: number;
  readonly contactos_count: number;
  readonly total_weight: number;
  readonly coverage_pct: number;
  readonly missing_dimensions: readonly string[];
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
  readonly gated: boolean;
  readonly gate_reason: string | null;
}

export interface B14ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B14Components;
  readonly ml_explanations: Readonly<{
    readonly method: Explanation['method'];
    readonly baseline_prediction: number;
    readonly delta_pct: number;
    readonly top_contributors: Explanation['top_contributors'];
    readonly sensitivity: readonly {
      readonly dimension_id: string;
      readonly impact_pct_per_10pct_change: number;
    }[];
  }>;
}

function emptyVector(): Record<PersonaId, number> {
  return {
    family: 0,
    inversor: 0,
    primera_compra: 0,
    downsizer: 0,
    second_home: 0,
    digital_nomad: 0,
  };
}

function sumInteractionWeight(interactions: readonly InteractionType[]): number {
  let w = 0;
  for (const i of interactions) {
    w += INTERACTION_WEIGHTS[i] ?? 0;
  }
  return w;
}

function computeDiversidadIndex(vector: Readonly<Record<PersonaId, number>>): number {
  // Simpson inverso sobre proporciones 0-1.
  const total = PERSONA_IDS.reduce((s, p) => s + (vector[p] ?? 0), 0);
  if (total <= 0) return 0;
  let sq = 0;
  for (const p of PERSONA_IDS) {
    const prop = (vector[p] ?? 0) / total;
    sq += prop * prop;
  }
  return Number((1 - sq).toFixed(3));
}

function buildTopMix(vector: Readonly<Record<PersonaId, number>>): B14MixEntry[] {
  const total = PERSONA_IDS.reduce((s, p) => s + (vector[p] ?? 0), 0);
  if (total <= 0) return [];
  const entries: { persona: PersonaId; weight_pct: number }[] = PERSONA_IDS.map((p) => ({
    persona: p,
    weight_pct: ((vector[p] ?? 0) / total) * 100,
  }));
  entries.sort((a, b) => b.weight_pct - a.weight_pct);

  const top: B14MixEntry[] = [];
  let otrosAcc = 0;
  for (const e of entries) {
    if (e.weight_pct >= OTHER_THRESHOLD_PCT) {
      top.push({
        persona: e.persona,
        weight_pct: Number(e.weight_pct.toFixed(1)),
      });
    } else {
      otrosAcc += e.weight_pct;
    }
  }
  if (otrosAcc > 0) {
    top.push({ persona: 'otros', weight_pct: Number(otrosAcc.toFixed(1)) });
  }
  // Reconcile rounding drift to sum exactly 100.0.
  const sum = top.reduce((s, e) => s + e.weight_pct, 0);
  const drift = Number((100 - sum).toFixed(1));
  if (Math.abs(drift) >= 0.1 && top.length > 0) {
    const first = top[0];
    if (first) {
      top[0] = {
        persona: first.persona,
        weight_pct: Number((first.weight_pct + drift).toFixed(1)),
      };
    }
  }
  return top;
}

function dominantPersonaFromVector(vector: Readonly<Record<PersonaId, number>>): PersonaId | null {
  let best: PersonaId | null = null;
  let bestV = -Infinity;
  for (const p of PERSONA_IDS) {
    const v = vector[p] ?? 0;
    if (v > bestV) {
      bestV = v;
      best = p;
    }
  }
  return bestV > 0 ? best : null;
}

// predictFn D19: dado un vector agregado (features por persona) devuelve
// la proporción del dominante (0-100). Si un feature cambia 10% veremos
// cómo cambia la proporción dominante.
function buildPredictFn(baseVector: Readonly<Record<PersonaId, number>>): PredictFn {
  const dominant = dominantPersonaFromVector(baseVector);
  return (features) => {
    if (dominant === null) return 0;
    const total = PERSONA_IDS.reduce((s, p) => s + (features[p] ?? 0), 0);
    if (total <= 0) return 0;
    return ((features[dominant] ?? 0) / total) * 100;
  };
}

export function computeB14BuyerPersonaProyecto(input: B14RawInput): B14ComputeResult {
  const contactos = input.contactos;
  const contactos_count = contactos.length;
  const missing: string[] = [];
  if (contactos_count === 0) missing.push('H14_contactos');

  const coverage_pct =
    contactos_count === 0
      ? 0
      : contactos_count >= MIN_CONTACTOS_TIER_2
        ? 100
        : Math.round((contactos_count / MIN_CONTACTOS_TIER_2) * 100);

  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({
    critical,
    supporting,
    coverage_pct,
    min_coverage_pct: methodology.confidence_thresholds.min_coverage_pct,
    high_coverage_pct: methodology.confidence_thresholds.high_coverage_pct,
  });

  // Tier gate: <3 contactos → insufficient_data + preview.
  if (contactos_count < MIN_CONTACTOS_TIER_2) {
    const emptyVec = emptyVector();
    const baselineExplain = explainPrediction({
      features: PERSONA_IDS.map<FeatureValue>((p) => ({ name: p, value: 0 })),
      predictFn: () => 0,
    });
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        proyecto_id: input.proyecto_id,
        mix_personas: [],
        full_vector: emptyVec,
        dominant_persona: null,
        diversidad_index: 0,
        contactos_count,
        total_weight: 0,
        coverage_pct,
        missing_dimensions: missing,
        capped_by: [],
        cap_reason: 'tier_gate_contactos',
        gated: true,
        gate_reason: `Se requieren ≥${MIN_CONTACTOS_TIER_2} contactos con H14 válido, actualmente ${contactos_count}.`,
      },
      ml_explanations: {
        method: baselineExplain.method,
        baseline_prediction: baselineExplain.baseline_prediction,
        delta_pct: baselineExplain.delta_pct,
        top_contributors: baselineExplain.top_contributors,
        sensitivity: [],
      },
    };
  }

  // Critical dep H14 insufficient — propagate.
  if (propagation.confidence === 'insufficient_data' && deps.length > 0) {
    const emptyVec = emptyVector();
    const baselineExplain = explainPrediction({
      features: PERSONA_IDS.map<FeatureValue>((p) => ({ name: p, value: 0 })),
      predictFn: () => 0,
    });
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        proyecto_id: input.proyecto_id,
        mix_personas: [],
        full_vector: emptyVec,
        dominant_persona: null,
        diversidad_index: 0,
        contactos_count,
        total_weight: 0,
        coverage_pct,
        missing_dimensions: ['H14'],
        capped_by: propagation.capped_by,
        cap_reason: propagation.cap_reason,
        gated: true,
        gate_reason: propagation.cap_reason,
      },
      ml_explanations: {
        method: baselineExplain.method,
        baseline_prediction: baselineExplain.baseline_prediction,
        delta_pct: baselineExplain.delta_pct,
        top_contributors: baselineExplain.top_contributors,
        sensitivity: [],
      },
    };
  }

  const agg: Record<PersonaId, number> = emptyVector();
  let total_weight = 0;
  for (const c of contactos) {
    const interactionW = Math.max(1, sumInteractionWeight(c.interactions));
    const certaintyW = Math.max(0.1, Math.min(1, c.h14_score_value / 100));
    const contactoW = interactionW * certaintyW;
    total_weight += contactoW;
    for (const p of PERSONA_IDS) {
      const pv = c.h14_perfiles[p] ?? 0;
      agg[p] += (pv / 100) * contactoW;
    }
  }

  // Prior demográfico zona (opcional, peso 10% del total_weight).
  if (input.zona_demografia && total_weight > 0) {
    const priorWeight = total_weight * 0.1;
    const priorTotal = PERSONA_IDS.reduce((s, p) => s + (input.zona_demografia?.[p] ?? 0), 0);
    if (priorTotal > 0) {
      for (const p of PERSONA_IDS) {
        agg[p] += ((input.zona_demografia[p] ?? 0) / priorTotal) * priorWeight;
      }
      total_weight += priorWeight;
    }
  }

  const mix_personas = buildTopMix(agg);
  const dominant_persona = dominantPersonaFromVector(agg);
  const diversidad_index = computeDiversidadIndex(agg);

  // score_value = proporción del dominante × 100 (clamp 100).
  const dominantPct = mix_personas.find((m) => m.persona === dominant_persona)?.weight_pct ?? 0;
  const score_value = Math.round(Math.max(0, Math.min(100, dominantPct)));

  // D19 — explain via LIME partial dependence sobre el vector agregado.
  const predictFn = buildPredictFn(agg);
  const features: FeatureValue[] = PERSONA_IDS.map((p) => ({
    name: p,
    value: Number((agg[p] ?? 0).toFixed(4)),
    label: `persona_${p}`,
  }));
  const explanation = explainPrediction({ features, predictFn });
  const sensitivity = computeSensitivity(explanation, explanation.baseline_prediction);

  let confidence: Confidence =
    deps.length > 0
      ? propagation.confidence
      : coverage_pct >= methodology.confidence_thresholds.high_coverage_pct
        ? 'high'
        : 'medium';

  if (confidence === 'insufficient_data' && score_value > 0) confidence = 'low';

  // Bajar confidence si diversidad muy alta (mix sin dominante claro).
  if (diversidad_index >= 0.78 && confidence === 'high') confidence = 'medium';

  return {
    value: score_value,
    confidence,
    components: {
      proyecto_id: input.proyecto_id,
      mix_personas,
      full_vector: {
        family: Number(agg.family.toFixed(4)),
        inversor: Number(agg.inversor.toFixed(4)),
        primera_compra: Number(agg.primera_compra.toFixed(4)),
        downsizer: Number(agg.downsizer.toFixed(4)),
        second_home: Number(agg.second_home.toFixed(4)),
        digital_nomad: Number(agg.digital_nomad.toFixed(4)),
      },
      dominant_persona,
      diversidad_index,
      contactos_count,
      total_weight: Number(total_weight.toFixed(3)),
      coverage_pct,
      missing_dimensions: missing,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
      gated: false,
      gate_reason: null,
    },
    ml_explanations: {
      method: explanation.method,
      baseline_prediction: explanation.baseline_prediction,
      delta_pct: explanation.delta_pct,
      top_contributors: explanation.top_contributors,
      sensitivity,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b14.insufficient';
  if (value >= 60) return 'ie.score.b14.mix_dominante';
  if (value >= 40) return 'ie.score.b14.mix_mixto';
  return 'ie.score.b14.mix_difuso';
}

export const b14BuyerPersonaProyectoCalculator: Calculator = {
  scoreId: 'B14',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const confidence: Confidence = 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        proyecto_id: input.projectId ?? 'desconocido',
        mix_personas: [],
        full_vector: {
          family: 0,
          inversor: 0,
          primera_compra: 0,
          downsizer: 0,
          second_home: 0,
          digital_nomad: 0,
        },
        dominant_persona: null,
        diversidad_index: 0,
        contactos_count: 0,
        gated: true,
        gate_reason:
          'B14 requiere H14 buyer_persona por contacto + interacciones. Use computeB14BuyerPersonaProyecto(input) en tests.',
      },
      inputs_used: {
        periodDate: input.periodDate,
        projectId: input.projectId ?? null,
      },
      confidence,
      citations: [
        { source: 'user_scores:H14', period: input.periodDate },
        { source: 'busqueda_proyectos', period: input.periodDate },
        { source: 'visitas', period: input.periodDate },
        { source: 'operaciones', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'user_scores:H14', count: 0 },
          { name: 'busqueda_proyectos', count: 0 },
          { name: 'visitas', count: 0 },
          { name: 'operaciones', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        proyecto_id: input.projectId ?? 'desconocido',
        dominant_persona: 'n/a',
        dominant_pct: 0,
        top_mix: 'n/a',
        contactos_count: 0,
        diversidad_index: 0,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
      ml_explanations: {
        method: 'lime_local_partial_dependence',
        baseline_prediction: 0,
        delta_pct: 0.1,
        top_contributors: [],
        sensitivity: [],
      },
    };
  },
};

export default b14BuyerPersonaProyectoCalculator;
