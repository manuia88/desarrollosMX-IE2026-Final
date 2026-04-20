// B04 Product-Market Fit — score N1 dev que cruza demanda (búsquedas + feedback)
// vs inventario del proyecto para detectar mismatch de recámaras/precio/ubicación.
// Plan FASE 09 MÓDULO 9.C.3. Catálogo 03.8 §B04.
//
// Fórmula:
//   match%     = unidades_match / total_unidades
//     match = recámaras ∈ demanda.filter
//           AND precio   ∈ demanda.precio_range
//           AND ubicación match demanda.filter (o sin filter)
//   intensity = demanda_total_count / inventario_total
//   score     = clamp(match_pct × 100 × log10(intensity + 1), 0, 100)
//
// components:
//   unidades_match_pct          → % del inventario que calza con algún bucket demanda
//   demanda_no_satisfecha[]     → buckets con count demanda > unidades_match
//   oportunidades_ajuste_producto[] → frases sugeridas tipo "Crear mix 2rec",
//                                    "Precio más accesible <$3M"
//
// Tier 3 (no tier gate data-volume formal — si no hay demanda data o proyecto
// sin unidades, degrada a insufficient_data con oportunidades=[] ).
// Category: dev → persist en project_scores.
//
// D9 fallback graceful: si demanda vacía → score=0, confidence=insufficient_data,
// components.oportunidades_ajuste_producto=[] pero unidades_match_pct sigue
// siendo útil (=0 porque no hay demanda para matchear).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula:
    'match_pct = unidades_match / total_unidades; intensity = demanda_total / inventario_total; score = clamp(match_pct · 100 · log10(intensity+1), 0, 100).',
  sources: ['busquedas', 'project_units', 'feedback_registered'],
  weights: { match_pct: 1.0, intensity_log10: 1.0 },
  dependencies: [] as const,
  references: [
    {
      name: 'Catálogo 03.8 §B04 Product-Market Fit',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#b04-product-market-fit',
    },
    {
      name: 'Plan FASE 09 §9.C.3',
      url: 'docs/02_PLAN_MAESTRO/FASE_09_IE_SCORES_N1.md',
    },
  ],
  validity: { unit: 'days', value: 30 } as const,
  confidence_thresholds: {
    high_demanda: 100,
    medium_demanda: 20,
    low_demanda: 1,
  },
} as const;

export const reasoning_template =
  'Product-Market Fit de proyecto {project_id} obtiene {score_value}. Match {unidades_match_pct}% del inventario ({unidades_match}/{total_unidades}) calza con {demanda_total_count} búsquedas. Top gap: {top_gap}. Confianza {confidence}.';

export type PmfBucket = 'excelente' | 'bueno' | 'regular' | 'mal_fit' | 'insufficient';

export interface B04ProjectUnit {
  readonly recamaras: number;
  readonly precio: number;
  readonly ubicacion_zona: string;
  readonly superficie_m2: number;
}

export interface B04DemandaPrecioRange {
  readonly min?: number;
  readonly max?: number;
}

export interface B04DemandaBusqueda {
  readonly recamaras_filter?: readonly number[]; // ej. [2,3] → OR de recámaras aceptadas
  readonly precio_range?: B04DemandaPrecioRange;
  readonly ubicacion_filter?: readonly string[]; // zonas aceptadas; undefined = any
  readonly count: number;
}

export interface B04RawInput {
  readonly project_units: readonly B04ProjectUnit[];
  readonly demanda_busquedas: readonly B04DemandaBusqueda[];
}

export interface B04DemandaGap {
  readonly criteria: string; // ej. "2rec $2.5M-$3.5M zona=Del Valle"
  readonly count: number;
}

export interface B04Components extends Record<string, unknown> {
  readonly unidades_match_pct: number;
  readonly unidades_match: number;
  readonly total_unidades: number;
  readonly demanda_total_count: number;
  readonly intensity: number;
  readonly demanda_no_satisfecha: readonly B04DemandaGap[];
  readonly oportunidades_ajuste_producto: readonly string[];
  readonly bucket: PmfBucket;
}

export interface B04ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: B04Components;
}

function precioInRange(precio: number, range?: B04DemandaPrecioRange): boolean {
  if (!range) return true;
  if (range.min !== undefined && precio < range.min) return false;
  if (range.max !== undefined && precio > range.max) return false;
  return true;
}

function recamarasMatch(recamaras: number, filter?: readonly number[]): boolean {
  if (!filter || filter.length === 0) return true;
  return filter.includes(recamaras);
}

function ubicacionMatch(zona: string, filter?: readonly string[]): boolean {
  if (!filter || filter.length === 0) return true;
  return filter.includes(zona);
}

function formatDemandaCriteria(d: B04DemandaBusqueda): string {
  const parts: string[] = [];
  if (d.recamaras_filter && d.recamaras_filter.length > 0) {
    parts.push(`${d.recamaras_filter.join('|')}rec`);
  }
  if (d.precio_range) {
    const { min, max } = d.precio_range;
    if (min !== undefined && max !== undefined) {
      parts.push(`$${(min / 1_000_000).toFixed(1)}M-$${(max / 1_000_000).toFixed(1)}M`);
    } else if (min !== undefined) {
      parts.push(`>$${(min / 1_000_000).toFixed(1)}M`);
    } else if (max !== undefined) {
      parts.push(`<$${(max / 1_000_000).toFixed(1)}M`);
    }
  }
  if (d.ubicacion_filter && d.ubicacion_filter.length > 0) {
    parts.push(`zona=${d.ubicacion_filter.join(',')}`);
  }
  return parts.length > 0 ? parts.join(' ') : 'cualquier criterio';
}

function detectOportunidades(
  project_units: readonly B04ProjectUnit[],
  demanda_busquedas: readonly B04DemandaBusqueda[],
): string[] {
  const ops: string[] = [];

  // Heurística 1: demanda por recámaras vs inventario.
  const inventarioRec = new Map<number, number>();
  for (const u of project_units) {
    inventarioRec.set(u.recamaras, (inventarioRec.get(u.recamaras) ?? 0) + 1);
  }
  const demandaRec = new Map<number, number>();
  for (const d of demanda_busquedas) {
    if (!d.recamaras_filter || d.recamaras_filter.length === 0) continue;
    for (const r of d.recamaras_filter) {
      demandaRec.set(r, (demandaRec.get(r) ?? 0) + d.count);
    }
  }
  for (const [rec, count] of demandaRec) {
    const inv = inventarioRec.get(rec) ?? 0;
    if (count > inv * 2 && inv < project_units.length * 0.3) {
      ops.push(`Crear mix ${rec}rec`);
    }
  }

  // Heurística 2: demanda por rango precio bajo.
  let demandaPrecioBajo = 0;
  for (const d of demanda_busquedas) {
    if (d.precio_range?.max !== undefined && d.precio_range.max <= 3_000_000) {
      demandaPrecioBajo += d.count;
    }
  }
  const unidadesPrecioBajo = project_units.filter((u) => u.precio <= 3_000_000).length;
  if (
    demandaPrecioBajo > unidadesPrecioBajo * 3 &&
    unidadesPrecioBajo < project_units.length * 0.3
  ) {
    ops.push('Precio más accesible <$3M');
  }

  // Heurística 3: demanda por rango precio alto (premium).
  let demandaPrecioAlto = 0;
  for (const d of demanda_busquedas) {
    if (d.precio_range?.min !== undefined && d.precio_range.min >= 6_000_000) {
      demandaPrecioAlto += d.count;
    }
  }
  const unidadesPrecioAlto = project_units.filter((u) => u.precio >= 6_000_000).length;
  if (
    demandaPrecioAlto > unidadesPrecioAlto * 3 &&
    unidadesPrecioAlto < project_units.length * 0.3
  ) {
    ops.push('Agregar tier premium >$6M');
  }

  return ops;
}

function bucketFor(value: number, demanda_total: number): PmfBucket {
  if (demanda_total === 0) return 'insufficient';
  if (value >= 75) return 'excelente';
  if (value >= 50) return 'bueno';
  if (value >= 25) return 'regular';
  return 'mal_fit';
}

function confidenceFor(demanda_total: number, total_unidades: number): Confidence {
  if (total_unidades === 0 || demanda_total === 0) return 'insufficient_data';
  if (demanda_total >= methodology.confidence_thresholds.high_demanda) return 'high';
  if (demanda_total >= methodology.confidence_thresholds.medium_demanda) return 'medium';
  if (demanda_total >= methodology.confidence_thresholds.low_demanda) return 'low';
  return 'insufficient_data';
}

export function computeB04ProductMarketFit(input: B04RawInput): B04ComputeResult {
  const { project_units, demanda_busquedas } = input;
  const total_unidades = project_units.length;
  const demanda_total_count = demanda_busquedas.reduce((acc, d) => acc + d.count, 0);

  if (total_unidades === 0 || demanda_total_count === 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        unidades_match_pct: 0,
        unidades_match: 0,
        total_unidades,
        demanda_total_count,
        intensity: 0,
        demanda_no_satisfecha: [],
        oportunidades_ajuste_producto: [],
        bucket: 'insufficient',
      },
    };
  }

  // Unidades match: al menos 1 bucket demanda cubre la unidad.
  let unidades_match = 0;
  for (const u of project_units) {
    const matches = demanda_busquedas.some(
      (d) =>
        recamarasMatch(u.recamaras, d.recamaras_filter) &&
        precioInRange(u.precio, d.precio_range) &&
        ubicacionMatch(u.ubicacion_zona, d.ubicacion_filter),
    );
    if (matches) unidades_match += 1;
  }

  const match_pct = unidades_match / total_unidades;
  const intensity = demanda_total_count / total_unidades;

  // score = clamp(match_pct × 100 × log10(intensity + 1), 0, 100)
  const raw = match_pct * 100 * Math.log10(intensity + 1);
  const value = Math.max(0, Math.min(100, Math.round(raw)));

  // Gaps: buckets demanda con count > inventario_match_bucket × 2.
  const gaps: B04DemandaGap[] = [];
  for (const d of demanda_busquedas) {
    const inventarioBucket = project_units.filter(
      (u) =>
        recamarasMatch(u.recamaras, d.recamaras_filter) &&
        precioInRange(u.precio, d.precio_range) &&
        ubicacionMatch(u.ubicacion_zona, d.ubicacion_filter),
    ).length;
    // demanda > 2× oferta bucket → gap.
    if (d.count > Math.max(1, inventarioBucket * 2)) {
      gaps.push({ criteria: formatDemandaCriteria(d), count: d.count });
    }
  }
  const gaps_sorted = gaps.sort((a, b) => b.count - a.count).slice(0, 5);

  const oportunidades = detectOportunidades(project_units, demanda_busquedas);

  return {
    value,
    confidence: confidenceFor(demanda_total_count, total_unidades),
    components: {
      unidades_match_pct: Number((match_pct * 100).toFixed(2)),
      unidades_match,
      total_unidades,
      demanda_total_count,
      intensity: Number(intensity.toFixed(4)),
      demanda_no_satisfecha: gaps_sorted,
      oportunidades_ajuste_producto: oportunidades,
      bucket: bucketFor(value, demanda_total_count),
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.b04.insufficient';
  if (value >= 75) return 'ie.score.b04.excelente';
  if (value >= 50) return 'ie.score.b04.bueno';
  if (value >= 25) return 'ie.score.b04.regular';
  return 'ie.score.b04.mal_fit';
}

export const b04ProductMarketFitCalculator: Calculator = {
  scoreId: 'B04',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    // Prod path: query project_units + busquedas (search_logs) del projectId.
    // H1 degrada a insufficient_data si projectId ausente o tablas vacías.
    // Tests invocan computeB04ProductMarketFit(rawInput) con fixture data.
    const computed_at = new Date().toISOString();
    const projectId = input.projectId;
    const confidence: Confidence = 'insufficient_data';
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: projectId
          ? 'B04 requiere project_units + busquedas persistidos. Use computeB04ProductMarketFit(rawInput) en tests.'
          : 'B04 requiere projectId para fetch unidades + demanda.',
        unidades_match_pct: 0,
        unidades_match: 0,
        total_unidades: 0,
        demanda_total_count: 0,
        intensity: 0,
        demanda_no_satisfecha: [],
        oportunidades_ajuste_producto: [],
        bucket: 'insufficient' as PmfBucket,
      },
      inputs_used: { periodDate: input.periodDate, projectId: projectId ?? null },
      confidence,
      citations: [
        { source: 'busquedas', period: input.periodDate },
        { source: 'project_units', period: input.periodDate },
        { source: 'feedback_registered', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'busquedas', count: 0 },
          { name: 'project_units', count: 0 },
        ],
        computed_at,
        calculator_version: version,
      },
      template_vars: {
        project_id: projectId ?? 'desconocido',
        unidades_match_pct: 0,
        unidades_match: 0,
        total_unidades: 0,
        demanda_total_count: 0,
        top_gap: 'n/a',
      },
    };
  },
};

export default b04ProductMarketFitCalculator;
