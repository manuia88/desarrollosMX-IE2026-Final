// H15 Due Diligence — score N3 con checklist automático 20 puntos (legales,
// técnicos, financieros) para un proyecto. Cada punto pass/fail/na.
// Plan FASE 10 §10.B.12. Catálogo 03.8 §H15. Tier 3. Categoría dev.
//
// Score = (#passed / #aplicables) × 100.
// Crítico fail (cualquier legal) → capped a 40.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export type DDCategory = 'legal' | 'tecnico' | 'financiero';

export const CHECKLIST_ITEMS = [
  // Legales (críticos)
  {
    id: 'uso_suelo_compatible',
    label: 'Uso de Suelo compatible con uso pretendido',
    category: 'legal',
    critical: true,
  },
  {
    id: 'catastro_vigente',
    label: 'Constancia Catastral vigente',
    category: 'legal',
    critical: true,
  },
  {
    id: 'libertad_gravamen',
    label: 'Libertad de Gravamen < 30 días',
    category: 'legal',
    critical: true,
  },
  { id: 'sin_amparos', label: 'Sin amparos activos', category: 'legal', critical: true },
  {
    id: 'licencia_construccion',
    label: 'Licencia de Construcción vigente',
    category: 'legal',
    critical: true,
  },
  {
    id: 'boletas_prediales',
    label: 'Boletas prediales al corriente',
    category: 'legal',
    critical: false,
  },
  {
    id: 'regimen_condominal',
    label: 'Régimen Condominal registrado',
    category: 'legal',
    critical: false,
  },
  // Técnicos
  {
    id: 'avance_obra',
    label: 'Avance de obra conforme al calendario',
    category: 'tecnico',
    critical: false,
  },
  {
    id: 'ingenieria_estructural',
    label: 'Ingeniería estructural validada',
    category: 'tecnico',
    critical: true,
  },
  {
    id: 'impacto_ambiental',
    label: 'Manifestación impacto ambiental',
    category: 'tecnico',
    critical: false,
  },
  {
    id: 'atlas_riesgos',
    label: 'Zona fuera de riesgo crítico Atlas',
    category: 'tecnico',
    critical: true,
  },
  {
    id: 'factibilidad_servicios',
    label: 'Factibilidad de servicios (agua, drenaje, luz)',
    category: 'tecnico',
    critical: false,
  },
  { id: 'accesos_viales', label: 'Accesos viales resueltos', category: 'tecnico', critical: false },
  // Financieros
  { id: 'no_deudas_iva', label: 'Sin deudas IVA', category: 'financiero', critical: false },
  { id: 'no_deudas_isr', label: 'Sin deudas ISR', category: 'financiero', critical: false },
  {
    id: 'contrato_fideicomiso',
    label: 'Contrato fideicomiso (si aplica)',
    category: 'financiero',
    critical: false,
  },
  {
    id: 'seguro_caucion',
    label: 'Seguro de caución vigente',
    category: 'financiero',
    critical: false,
  },
  {
    id: 'poliza_responsabilidad',
    label: 'Póliza responsabilidad civil',
    category: 'financiero',
    critical: false,
  },
  {
    id: 'estados_financieros',
    label: 'Estados financieros auditados',
    category: 'financiero',
    critical: false,
  },
  {
    id: 'trust_dev',
    label: 'Trust Score H05 desarrollador ≥ 60',
    category: 'financiero',
    critical: false,
  },
] as const;

export type DDItemId = (typeof CHECKLIST_ITEMS)[number]['id'];
export type DDItemStatus = 'pass' | 'fail' | 'na' | 'pending';

export const methodology = {
  formula:
    'score = (#passed aplicables / #aplicables) × 100. Cualquier fail crítico legal → cap 40.',
  sources: ['audit_log', 'documentos', 'zone_scores:H03', 'zone_scores:H05'],
  dependencies: [],
  checklist: CHECKLIST_ITEMS.map((i) => ({ id: i.id, category: i.category, critical: i.critical })),
  references: [
    {
      name: 'Catálogo 03.8 §H15 Due Diligence',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#h15-due-diligence',
    },
    { name: 'Plan FASE 10 §10.B.12', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: { min_coverage_pct: 70, high_coverage_pct: 95 },
  sensitivity_analysis: [{ dimension_id: 'legal_critical', impact_pct_per_10pct_change: 10 }],
  critical_fail_cap: 40,
} as const;

export const reasoning_template =
  'Due Diligence: {pass_count}/{applicable_count} aprobados. Críticos fallidos: {critical_fails}. Score {score_value}.';

export interface DDChecklistEntry {
  readonly id: DDItemId | string;
  readonly status: DDItemStatus;
  readonly note?: string;
}

export interface H15Components extends Record<string, unknown> {
  readonly pass_count: number;
  readonly fail_count: number;
  readonly na_count: number;
  readonly pending_count: number;
  readonly applicable_count: number;
  readonly critical_fails: readonly string[];
  readonly by_category: Readonly<Record<DDCategory, { pass: number; fail: number; na: number }>>;
  readonly capped: boolean;
}

export interface H15RawInput {
  readonly items: readonly DDChecklistEntry[];
}

export interface H15ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H15Components;
}

const ITEM_MAP = new Map(CHECKLIST_ITEMS.map((i) => [i.id, i]));

export function computeH15DueDiligence(input: H15RawInput): H15ComputeResult {
  let pass = 0;
  let fail = 0;
  let na = 0;
  let pending = 0;
  const criticalFails: string[] = [];
  const byCategory: Record<DDCategory, { pass: number; fail: number; na: number }> = {
    legal: { pass: 0, fail: 0, na: 0 },
    tecnico: { pass: 0, fail: 0, na: 0 },
    financiero: { pass: 0, fail: 0, na: 0 },
  };

  for (const item of input.items) {
    const meta = ITEM_MAP.get(item.id as DDItemId);
    if (!meta) continue;
    switch (item.status) {
      case 'pass':
        pass++;
        byCategory[meta.category].pass++;
        break;
      case 'fail':
        fail++;
        byCategory[meta.category].fail++;
        if (meta.critical) criticalFails.push(item.id);
        break;
      case 'na':
        na++;
        byCategory[meta.category].na++;
        break;
      case 'pending':
        pending++;
        break;
    }
  }

  const applicable = pass + fail;
  if (applicable === 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        pass_count: 0,
        fail_count: 0,
        na_count: na,
        pending_count: pending,
        applicable_count: 0,
        critical_fails: [],
        by_category: byCategory,
        capped: false,
      },
    };
  }

  let score = Math.round((pass / applicable) * 100);
  const cappedByCritical = criticalFails.length > 0 && score > methodology.critical_fail_cap;
  if (cappedByCritical) score = methodology.critical_fail_cap;

  // Cov pct basado en pending vs total (20).
  const total = CHECKLIST_ITEMS.length;
  const reviewedPct = Math.round(((total - pending) / total) * 100);
  const confidence: Confidence =
    reviewedPct >= methodology.confidence_thresholds.high_coverage_pct
      ? 'high'
      : reviewedPct >= methodology.confidence_thresholds.min_coverage_pct
        ? 'medium'
        : 'low';

  return {
    value: score,
    confidence,
    components: {
      pass_count: pass,
      fail_count: fail,
      na_count: na,
      pending_count: pending,
      applicable_count: applicable,
      critical_fails: criticalFails,
      by_category: byCategory,
      capped: cappedByCritical,
    },
  };
}

export function getLabelKey(score: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h15.insufficient';
  if (score >= 90) return 'ie.score.h15.excelente';
  if (score >= 70) return 'ie.score.h15.aceptable';
  if (score >= 40) return 'ie.score.h15.observaciones';
  return 'ie.score.h15.bloqueante';
}

export const h15DueDiligenceCalculator: Calculator = {
  scoreId: 'H15',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence = Array.isArray(params.items) ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'prod path stub — invocar computeH15DueDiligence directo' },
      inputs_used: { periodDate: input.periodDate, projectId: input.projectId ?? null },
      confidence,
      citations: [
        { source: 'documentos', period: input.periodDate },
        { source: 'zone_scores:H03', period: input.periodDate },
        { source: 'zone_scores:H05', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'documentos', count: 0 },
          { name: 'zone_scores:H03', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { pass_count: 0, applicable_count: 0, critical_fails: 0 },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default h15DueDiligenceCalculator;
