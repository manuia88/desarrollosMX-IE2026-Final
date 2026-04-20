/**
 * B02 Margin Pressure — presión sobre el margen del desarrollador por cruce
 * entre precio unitario real y costo construcción INPP (viene de B12).
 * Plan FASE 09 §9.C.2. Catálogo 03.8 §B02.
 *
 * FÓRMULA CORRECTA (rewrite v1 — NO repetir bug del repo viejo):
 *
 *   precio_m2_real = precio_unidad_total / m2_totales_unidad
 *   // m2_totales_unidad = construccion + terreno + roof_garden + balcon
 *   // (todos los m2 vendibles, NO solo construcción)
 *
 *   costo_m2_real = costo_construccion_m2_inpp
 *   // viene de INPP Construcción ajustado por tipo de proyecto (B12)
 *
 *   margen_m2     = precio_m2_real - costo_m2_real
 *   margen_pct    = margen_m2 / precio_m2_real
 *
 *   pressure_score = 100 - clamp((zona_p50 - margen_pct) / zona_p50 × 100, 0, 100)
 *   // 100 = margen sano sin presión; 0 = margen colapsado / negativo.
 *   // Si margen_pct >= zona_p50 → score 100 (sin presión).
 *
 * BUG HISTÓRICO (repo viejo, register-all.ts:82):
 *   - Usaba precio_total / superficie_m2 (solo construccion_m2) → inflaba
 *     precio_m2 artificialmente cuando la unidad tenía terreno / roof_garden.
 *   - Resultado: todos los proyectos parecían tener margen sano falso;
 *     pressure_score siempre cercano a 100 aunque el proyecto estuviera
 *     al borde de la pérdida real.
 *   - Ejemplo: $5M total / 100 m² construcción = $50,000/m² (INFLADO).
 *     Correcto: $5M / 170 m² totales = $29,411/m² (real).
 *   - Diferencia: 70% sobreestimación del precio_m2 → falso diagnóstico.
 *
 * DEFENSA ETERNA: `components.precio_m2_buggy_viejo` expone la cifra que
 * hubiera calculado la fórmula incorrecta, documentando el bug en cada run
 * para que cualquier auditoría lo detecte. Tests de regresión en
 * `__tests__/b02-margin-pressure-regression.test.ts` garantizan no retroceso.
 *
 * Tier 2 (requiere INPP data 12m desde macro_series + proyecto con unidades).
 * Category: dev → persist en project_scores.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula:
    'precio_m2_real = precio_total / (construccion + terreno + roof_garden + balcon); margen_pct = (precio_m2_real − costo_construccion_m2_inpp) / precio_m2_real; pressure = 100 − clamp((zona_p50 − margen_pct) / zona_p50 × 100, 0, 100).',
  bug_historico: {
    fuente: 'repo_viejo:register-all.ts:82',
    formula_incorrecta: 'precio_total / construccion_m2 (solo construcción)',
    consecuencia: 'precio_m2 inflado → pressure_score falsamente alto',
    defensa: 'components.precio_m2_buggy_viejo expuesto para auditoría',
  },
  sources: ['projects', 'unidades', 'prototipos', 'macro_series:inpp_construccion'],
  dependencies: [{ score_id: 'B12', role: 'costo_construccion_m2_inpp' }],
  references: [
    {
      name: 'Catálogo 03.8 §B02 Margin Pressure',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b02-margin-pressure',
    },
    {
      name: 'Plan FASE 09 §9.C.2',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  tier: 2,
  confidence_thresholds: {
    min_m2_totales: 20, // < 20 m² totales → input inválido, insufficient
    min_costo_inpp: 1, // costo > 0 requerido
    min_zona_p50: 0.01, // 1% mínimo para evitar division by zero
  },
} as const;

export const reasoning_template =
  'Margen de {project_id}: precio $/m² real {precio_m2_real} sobre {m2_totales} m² totales vs costo INPP {costo_m2_inpp}. Margen {margen_pct_str} (m² = {margen_m2}). Presión {score_value} vs zona p50 {zona_p50_str}. Confianza {confidence}.';

export type MarginPressureBucket =
  | 'sana'
  | 'moderada'
  | 'alta_presion'
  | 'critica'
  | 'insufficient';

export interface B02Components extends Record<string, unknown> {
  readonly margen_pct: number; // fracción 0-1 (ej 0.25 = 25%)
  readonly margen_m2: number; // MXN/m²
  readonly precio_m2_real: number; // MXN/m² (fórmula correcta)
  readonly precio_m2_buggy_viejo: number; // MXN/m² (fórmula bug — documentado)
  readonly costo_m2_inpp: number; // MXN/m²
  readonly m2_totales: number;
  readonly zona_margen_p50_pct: number; // fracción 0-1
  readonly presion_inpp_12m: number; // puntos score pressure_score
  readonly bucket: MarginPressureBucket;
}

export interface B02RawInput {
  readonly precio_total_unidad: number;
  readonly construccion_m2: number;
  readonly terreno_m2: number;
  readonly roof_garden_m2: number;
  readonly balcon_m2: number;
  readonly costo_construccion_m2_inpp: number;
  readonly zona_margen_p50_pct: number; // fracción 0-1 (ej 0.20 = 20%)
}

export interface B02ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B02Components;
}

function bucketFor(score: number, confidence: Confidence): MarginPressureBucket {
  if (confidence === 'insufficient_data') return 'insufficient';
  // score 100 = margen sano; score 0 = colapsado.
  if (score >= 80) return 'sana';
  if (score >= 50) return 'moderada';
  if (score >= 20) return 'alta_presion';
  return 'critica';
}

function detectConfidence(input: B02RawInput, m2_totales: number): Confidence {
  const thresholds = methodology.confidence_thresholds;
  if (!Number.isFinite(input.precio_total_unidad) || input.precio_total_unidad <= 0) {
    return 'insufficient_data';
  }
  if (!Number.isFinite(m2_totales) || m2_totales < thresholds.min_m2_totales) {
    return 'insufficient_data';
  }
  if (
    !Number.isFinite(input.costo_construccion_m2_inpp) ||
    input.costo_construccion_m2_inpp < thresholds.min_costo_inpp
  ) {
    return 'insufficient_data';
  }
  if (
    !Number.isFinite(input.zona_margen_p50_pct) ||
    input.zona_margen_p50_pct < thresholds.min_zona_p50
  ) {
    // Sin benchmark zona → low confidence (cálculo directo sin normalización).
    return 'low';
  }
  // Con todos los inputs válidos — confianza alta; se degrada a medium si
  // margen_pct extremo (ej negativo) por posible error de input.
  const precio_m2 = input.precio_total_unidad / m2_totales;
  const margen_pct = (precio_m2 - input.costo_construccion_m2_inpp) / precio_m2;
  if (margen_pct < -0.5 || margen_pct > 0.9) return 'medium';
  return 'high';
}

export function computeB02MarginPressure(input: B02RawInput): B02ComputeResult {
  const construccion = Math.max(0, input.construccion_m2);
  const terreno = Math.max(0, input.terreno_m2);
  const roof = Math.max(0, input.roof_garden_m2);
  const balcon = Math.max(0, input.balcon_m2);

  // FÓRMULA CORRECTA: suma todos los m² vendibles.
  const m2_totales = construccion + terreno + roof + balcon;

  const confidence = detectConfidence(input, m2_totales);

  if (confidence === 'insufficient_data' || m2_totales <= 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        margen_pct: 0,
        margen_m2: 0,
        precio_m2_real: 0,
        // Expuesto aún en insufficient para defensa eterna — si
        // construccion_m2 > 0 se puede mostrar la cifra incorrecta.
        precio_m2_buggy_viejo:
          construccion > 0 && input.precio_total_unidad > 0
            ? Number((input.precio_total_unidad / construccion).toFixed(2))
            : 0,
        costo_m2_inpp: input.costo_construccion_m2_inpp,
        m2_totales,
        zona_margen_p50_pct: input.zona_margen_p50_pct,
        presion_inpp_12m: 0,
        bucket: 'insufficient',
      },
    };
  }

  const precio_m2_real = input.precio_total_unidad / m2_totales;

  // BUG HISTÓRICO — expuesto explícitamente en cada run como defensa eterna.
  // Si construccion_m2 = 0 (caso edge terreno puro), reportamos 0 para no
  // dividir por cero; la defensa sigue visible porque el campo está presente.
  const precio_m2_buggy_viejo = construccion > 0 ? input.precio_total_unidad / construccion : 0;

  const costo_m2 = input.costo_construccion_m2_inpp;
  const margen_m2 = precio_m2_real - costo_m2;
  const margen_pct = precio_m2_real > 0 ? margen_m2 / precio_m2_real : 0;

  const zona_p50 = input.zona_margen_p50_pct;
  // pressure_score = 100 − clamp((zona_p50 − margen_pct) / zona_p50 × 100, 0, 100)
  // Si margen_pct >= zona_p50 → gap <=0 → clamp 0 → score=100 (sin presión).
  // Si margen_pct << zona_p50 → gap grande → clamp 100 → score=0 (alta presión).
  let presion_inpp_12m = 0;
  let value = 100;
  if (zona_p50 > 0) {
    const gap = (zona_p50 - margen_pct) / zona_p50;
    const gap_clamped = Math.max(0, Math.min(1, gap));
    presion_inpp_12m = Number((gap_clamped * 100).toFixed(2));
    value = Math.max(0, Math.min(100, Math.round(100 - gap_clamped * 100)));
  } else {
    // Sin benchmark zona → score directo de margen_pct (0-100 lineal sobre 0-30%).
    const linear = Math.max(0, Math.min(100, margen_pct * 100 * (100 / 30)));
    presion_inpp_12m = Number((100 - linear).toFixed(2));
    value = Math.max(0, Math.min(100, Math.round(linear)));
  }

  const bucket = bucketFor(value, confidence);

  return {
    value,
    confidence,
    components: {
      margen_pct: Number(margen_pct.toFixed(4)),
      margen_m2: Number(margen_m2.toFixed(2)),
      precio_m2_real: Number(precio_m2_real.toFixed(2)),
      precio_m2_buggy_viejo: Number(precio_m2_buggy_viejo.toFixed(2)),
      costo_m2_inpp: Number(costo_m2.toFixed(2)),
      m2_totales,
      zona_margen_p50_pct: zona_p50,
      presion_inpp_12m,
      bucket,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b02.insufficient';
  if (value >= 80) return 'ie.score.b02.margen_sano';
  if (value >= 50) return 'ie.score.b02.presion_moderada';
  if (value >= 20) return 'ie.score.b02.presion_alta';
  return 'ie.score.b02.margen_critico';
}

export const b02MarginPressureCalculator: Calculator = {
  scoreId: 'B02',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date().toISOString();
    const projectId = input.projectId;
    if (!projectId) {
      return {
        score_value: 0,
        score_label: getLabelKey(0, 'insufficient_data'),
        components: {
          reason: 'B02 requiere projectId para fetch unidades + macro_series.',
        },
        inputs_used: { periodDate: input.periodDate, projectId: null },
        confidence: 'insufficient_data',
        citations: [],
        provenance: {
          sources: [{ name: 'projects', count: 0 }],
          computed_at,
          calculator_version: version,
        },
        template_vars: { project_id: 'desconocido' },
      };
    }

    // Prod-path FASE 09 session 2: query `projects + unidades + prototipos`
    // + macro_series inpp_construccion 12m + zone_scores B12 para costo_m2.
    // Tests invocan computeB02MarginPressure() directo con fixture data.
    const confidence: Confidence = 'insufficient_data';
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'projects/unidades/macro_series no aggregated for project+period',
        note: 'Use computeB02MarginPressure(rawInput) con fixture data para tests.',
      },
      inputs_used: { periodDate: input.periodDate, projectId },
      confidence,
      citations: [
        { source: 'projects', period: input.periodDate },
        { source: 'unidades', period: input.periodDate },
        { source: 'macro_series:inpp_construccion', period: 'last 12m' },
      ],
      provenance: {
        sources: [
          { name: 'projects', count: 0 },
          { name: 'unidades', count: 0 },
          { name: 'macro_series', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: { project_id: projectId },
    };
  },
};

export default b02MarginPressureCalculator;
