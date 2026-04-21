// C04 Objection Killer (AI) — score N3 + narrativa AI para el asesor.
// Dado feedback_text del contacto con objeción, usa Claude Haiku (D32) +
// evidencias IE (scores zona/proyecto/AVM) para sugerir respuesta.
// Plan FASE 10 §10.B.8. Catálogo 03.8 §C04. Tier 3. Categoría dev.
//
// D32 FASE 10 SESIÓN 2/3: methodology.ai_narrative = true. El wrapper
// run-score.ts invoca generateNarrative al persistir. Registra con
// registerCalculatorMeta.
//
// Matching taxonomía fija de 6 categorías → template base + evidencia.
// Citations obligatorias: precio (F09+A12) / ubicación (F08+N08) /
// seguridad (F01+N04) / construccion (H05) / condiciones (A01) / otra.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';
import { registerCalculatorMeta } from '../run-score';

export const version = '1.0.0';

export type ObjectionCategory =
  | 'precio'
  | 'ubicacion'
  | 'seguridad'
  | 'construccion'
  | 'condiciones'
  | 'otra';

export const methodology = {
  formula:
    'score = evidencia_availability × 0.5 + objection_match_confidence × 0.3 + evidencia_strength × 0.2',
  sources: ['interaction_feedback', 'ai_prompt_versions', 'zone_scores', 'project_scores'],
  categories: ['precio', 'ubicacion', 'seguridad', 'construccion', 'condiciones', 'otra'],
  dependencies: [
    { score_id: 'F09', weight: 0.2, role: 'evidencia_precio', critical: false },
    { score_id: 'A12', weight: 0.2, role: 'price_fairness', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §C04 Objection Killer',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#c04-objection-killer',
    },
    { name: 'Plan FASE 10 §10.B.8', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: { min_coverage_pct: 40, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'evidence', impact_pct_per_10pct_change: 5.0 },
    { dimension_id: 'match', impact_pct_per_10pct_change: 3.0 },
  ],
  ai_narrative: true,
} as const;

export const reasoning_template =
  'Objeción {category} detectada en contacto {contact_id}. Evidencias IE: {evidence_summary}. Réplica recomendada basada en {top_citations}.';

// Registra meta para D32 narrative al startup del calculador.
registerCalculatorMeta('C04', {
  ai_narrative: true,
  reasoning_template,
});

export interface CitedEvidence {
  readonly score_id: string;
  readonly value: number;
  readonly direction: 'refuta' | 'matiza' | 'confirma';
  readonly note: string;
}

export interface C04Components extends Record<string, unknown> {
  readonly category: ObjectionCategory;
  readonly category_match_confidence: number;
  readonly evidences: readonly CitedEvidence[];
  readonly evidence_availability_pct: number;
  readonly recommended_reply_template: string;
  readonly missing_sources: readonly string[];
}

export interface C04RawInput {
  readonly objection_text: string;
  readonly detected_category?: ObjectionCategory;
  readonly available_scores: Readonly<
    Partial<Record<'F09' | 'A12' | 'F08' | 'N08' | 'F01' | 'N04' | 'H05' | 'A01', number>>
  >;
}

export interface C04ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: C04Components;
}

const CATEGORY_KEYWORDS: Record<ObjectionCategory, readonly string[]> = {
  precio: ['precio', 'caro', 'costoso', 'barato', 'descuento', 'rebaja'],
  ubicacion: ['ubicación', 'ubicacion', 'lejos', 'cerca', 'zona', 'colonia'],
  seguridad: ['seguridad', 'inseguro', 'peligro', 'robo', 'crime'],
  construccion: ['construcción', 'calidad', 'acabados', 'obra', 'avance', 'desarrollador'],
  condiciones: ['enganche', 'financiamiento', 'hipoteca', 'mensualidad', 'plazo', 'crédito'],
  otra: [],
};

const TEMPLATES: Record<ObjectionCategory, string> = {
  precio:
    'El precio por m² refleja un percentil {percentil_precio} vs comparables; Value Score F09 {f09} indica oportunidad {oportunidad_valor}.',
  ubicacion:
    'La zona tiene LQI F08 de {f08}, walkability N08 {n08}. Acceso a servicios validado por ecosystem Score.',
  seguridad:
    'Índice seguridad F01 {f01} y trayectoria N04 {n04} muestran tendencia {tendencia_seguridad}.',
  construccion: 'Trust Score H05 del desarrollador {h05}, avance de obra verificado.',
  condiciones: 'Affordability A01 {a01} indica que el esquema encaja en el presupuesto declarado.',
  otra: 'Evidencias IE disponibles para la zona y el proyecto se adjuntan en citations.',
};

const CATEGORY_REQUIRED_SOURCES: Record<
  ObjectionCategory,
  ReadonlyArray<keyof C04RawInput['available_scores']>
> = {
  precio: ['F09', 'A12'],
  ubicacion: ['F08', 'N08'],
  seguridad: ['F01', 'N04'],
  construccion: ['H05'],
  condiciones: ['A01'],
  otra: [],
};

function detectCategory(text: string): { category: ObjectionCategory; confidence: number } {
  const lower = text.toLowerCase();
  const scores: Array<{ category: ObjectionCategory; hits: number }> = [];
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [ObjectionCategory, readonly string[]]
  >) {
    if (kws.length === 0) continue;
    const hits = kws.filter((k) => lower.includes(k)).length;
    if (hits > 0) scores.push({ category: cat, hits });
  }
  scores.sort((a, b) => b.hits - a.hits);
  if (scores.length === 0 || !scores[0]) return { category: 'otra', confidence: 0.3 };
  const top = scores[0];
  const total = scores.reduce((s, x) => s + x.hits, 0);
  return {
    category: top.category,
    confidence: total > 0 ? top.hits / total : 0,
  };
}

function buildEvidences(
  input: C04RawInput,
  category: ObjectionCategory,
): { evidences: CitedEvidence[]; missing: string[] } {
  const required = CATEGORY_REQUIRED_SOURCES[category];
  const evidences: CitedEvidence[] = [];
  const missing: string[] = [];
  for (const r of required) {
    const v = input.available_scores[r];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      missing.push(r);
      continue;
    }
    const direction: CitedEvidence['direction'] =
      v >= 70 ? 'refuta' : v >= 40 ? 'matiza' : 'confirma';
    evidences.push({
      score_id: r,
      value: v,
      direction,
      note: `${r}=${v}`,
    });
  }
  return { evidences, missing };
}

export function computeC04Objection(input: C04RawInput): C04ComputeResult {
  const { category, confidence: matchConf } = input.detected_category
    ? { category: input.detected_category, confidence: 1 }
    : detectCategory(input.objection_text);

  const { evidences, missing } = buildEvidences(input, category);
  const required = CATEGORY_REQUIRED_SOURCES[category];
  const availability = required.length > 0 ? evidences.length / required.length : 1;
  const evidenceStrength =
    evidences.length > 0 ? evidences.reduce((s, e) => s + e.value, 0) / evidences.length / 100 : 0;

  const raw = availability * 100 * 0.5 + matchConf * 100 * 0.3 + evidenceStrength * 100 * 0.2;
  const value = Math.round(Math.max(0, Math.min(100, raw)));

  const recommended_reply_template = TEMPLATES[category];

  let confidence: Confidence = 'medium';
  if (availability === 0) confidence = 'insufficient_data';
  else if (availability === 1 && matchConf >= 0.7) confidence = 'high';
  else if (availability < 0.5 || matchConf < 0.4) confidence = 'low';

  return {
    value,
    confidence,
    components: {
      category,
      category_match_confidence: Number(matchConf.toFixed(3)),
      evidences,
      evidence_availability_pct: Math.round(availability * 100),
      recommended_reply_template,
      missing_sources: missing,
    },
  };
}

export function getLabelKey(category: ObjectionCategory, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.c04.insufficient';
  return `ie.score.c04.${category}`;
}

export const c04ObjectionKillerCalculator: Calculator = {
  scoreId: 'C04',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence =
      typeof params.objection_text === 'string' ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey('otra', confidence),
      components: { reason: 'prod path stub — invocar computeC04Objection directo' },
      inputs_used: { periodDate: input.periodDate, projectId: input.projectId ?? null },
      confidence,
      citations: [
        { source: 'interaction_feedback', period: input.periodDate },
        { source: 'ai_prompt_versions', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'interaction_feedback', count: 0 },
          { name: 'ai_prompt_versions', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { contact_id: 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default c04ObjectionKillerCalculator;
