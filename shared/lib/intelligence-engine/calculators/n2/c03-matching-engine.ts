// C03 Matching Engine — para una `busqueda`, devuelve top 10 proyectos match.
// Plan FASE 10 §10.A.11. Catálogo 03.8 §C03. Tier 2 (heuristic H1; Tier 4
// calibrado con feedback_registered en FASE 21+).
//
// FÓRMULA:
//   match_score = 0.35·filters_match + 0.25·zone_scores_fit + 0.25·project_scores_fit + 0.15·momentum
//
//   filters_match      = coincidencia [operacion, tipo_propiedad, recámaras, precio_min/max, colonia]
//                        cada filtro 0/1 normalizado * peso intra-filtros.
//   zone_scores_fit    = cosine_similarity(buyer_preferences_norm, zone_scores_vector_norm) · 100
//   project_scores_fit = G01 Full Score 2.0 cuando exista, fallback media N1 proyecto
//   momentum           = N11 zona (0-100)
//
// Sort: match_score DESC; tiebreak operacion_match > tipo_match > colonia_match > precio_cercano > recamaras_match.
//
// Output top 10: { projectId, score, rationale[], missing_filters[] }.
//
// Tier gate: requiere ≥1 proyecto candidato y filters no-vacío.
// Critical deps (D13): N11 (sin momentum zona no hay ranking discriminante).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  collectDepConfidences,
  type DepConfidence,
  propagateConfidence,
} from '../../confidence-propagation';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export const WEIGHTS = {
  filters_match: 0.35,
  zone_scores_fit: 0.25,
  project_scores_fit: 0.25,
  momentum: 0.15,
} as const;

export const FILTER_WEIGHTS = {
  operacion: 0.25,
  tipo_propiedad: 0.2,
  recamaras: 0.15,
  precio: 0.25,
  colonia: 0.15,
} as const;

export const TOP_N = 10;
export const CRITICAL_DEPS: readonly string[] = ['N11'] as const;

export const methodology = {
  formula:
    'match = 0.35·filters + 0.25·zone_fit(cosine) + 0.25·project_fit(G01/avg N1) + 0.15·N11_momentum',
  sources: ['busquedas', 'project_scores', 'zone_scores:N11', 'proyectos'],
  weights: WEIGHTS,
  dependencies: [
    { score_id: 'N11', weight: 0.15, role: 'momentum', critical: true },
    { score_id: 'G01', weight: 0.25, role: 'full_score_proyecto', critical: false },
  ],
  triggers_cascade: ['busqueda_match_recomputed'],
  references: [
    {
      name: 'Catálogo 03.8 §C03 Matching Engine',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#c03-matching-engine',
    },
    {
      name: 'Plan FASE 10 §10.A.11',
      url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md',
    },
  ],
  validity: { unit: 'days', value: 7 } as const,
  confidence_thresholds: {
    min_coverage_pct: 40,
    high_coverage_pct: 100,
  },
  sensitivity_analysis: [
    { dimension_id: 'filters_match', impact_pct_per_10pct_change: 3.5 },
    { dimension_id: 'zone_scores_fit', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'project_scores_fit', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'N11_momentum', impact_pct_per_10pct_change: 1.5 },
  ],
  tier_gate: {
    min_candidatos: 1,
  },
} as const;

export const reasoning_template =
  'Match {busqueda_id}: {top_count} proyectos (top={top_project_id} {top_score}). Filters match {top_filters_pct}%. Confianza {confidence}.';

export type OperacionTipo = 'venta' | 'renta' | 'preventa';
export type PropiedadTipo = 'departamento' | 'casa' | 'loft' | 'studio' | 'terreno' | 'comercial';

export interface C03BusquedaFilters {
  readonly operacion?: OperacionTipo;
  readonly tipo_propiedad?: PropiedadTipo;
  readonly recamaras?: number;
  readonly precio_min?: number;
  readonly precio_max?: number;
  readonly colonia?: string;
}

export interface C03ProyectoCandidato {
  readonly projectId: string;
  readonly operacion?: OperacionTipo;
  readonly tipo_propiedad?: PropiedadTipo;
  readonly recamaras?: number;
  readonly precio?: number;
  readonly colonia?: string;
  readonly zone_scores_vector?: Readonly<Record<string, number>>; // F01, F08, N08, etc. 0-100
  readonly project_scores_avg?: number; // fallback media N1
  readonly g01_full_score?: number; // si existe
  readonly n11_momentum?: number; // 0-100
}

export interface C03RawInput {
  readonly busquedaId: string;
  readonly filters: C03BusquedaFilters;
  readonly buyer_preferences_vector?: Readonly<Record<string, number>>; // 0-100 keys alineadas a zone_scores
  readonly candidatos: readonly C03ProyectoCandidato[];
  readonly deps?: readonly DepConfidence[];
}

export interface C03MatchEntry {
  readonly projectId: string;
  readonly score: number;
  readonly rationale: readonly string[];
  readonly missing_filters: readonly string[];
  readonly components: {
    readonly filters_match: number;
    readonly zone_scores_fit: number;
    readonly project_scores_fit: number;
    readonly momentum: number;
  };
}

export interface C03Components extends Record<string, unknown> {
  readonly busquedaId: string;
  readonly top: readonly C03MatchEntry[];
  readonly candidatos_count: number;
  readonly coverage_pct: number;
  readonly missing_dimensions: readonly string[];
  readonly capped_by: readonly string[];
  readonly cap_reason: string | null;
  readonly gated: boolean;
  readonly gate_reason: string | null;
}

export interface C03ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: C03Components;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function normalizeText(s: string | undefined): string {
  return (s ?? '').toLowerCase().trim();
}

// Cosine similarity inline (no extern lib). Keys comunes del intersect.
export function cosineSimilarity(
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>,
): number {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  if (keys.size === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const k of keys) {
    const av = a[k] ?? 0;
    const bv = b[k] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

interface FiltersResult {
  readonly score: number; // 0-100
  readonly rationale: readonly string[];
  readonly missing: readonly string[];
  readonly matches: {
    readonly operacion: boolean;
    readonly tipo: boolean;
    readonly colonia: boolean;
    readonly precio: boolean;
    readonly recamaras: boolean;
    readonly precioDistance: number; // absoluto, para tiebreak
  };
}

function computeFiltersMatch(
  filters: C03BusquedaFilters,
  proy: C03ProyectoCandidato,
): FiltersResult {
  const rationale: string[] = [];
  const missing: string[] = [];
  let score = 0;
  let totalWeight = 0;

  // operacion
  let operacionMatch = false;
  if (filters.operacion !== undefined) {
    totalWeight += FILTER_WEIGHTS.operacion;
    if (proy.operacion === filters.operacion) {
      score += FILTER_WEIGHTS.operacion;
      operacionMatch = true;
      rationale.push(`operación=${filters.operacion}`);
    } else if (proy.operacion !== undefined) {
      missing.push(`operacion:${filters.operacion}≠${proy.operacion}`);
    } else {
      missing.push('operacion');
    }
  }

  // tipo_propiedad
  let tipoMatch = false;
  if (filters.tipo_propiedad !== undefined) {
    totalWeight += FILTER_WEIGHTS.tipo_propiedad;
    if (proy.tipo_propiedad === filters.tipo_propiedad) {
      score += FILTER_WEIGHTS.tipo_propiedad;
      tipoMatch = true;
      rationale.push(`tipo=${filters.tipo_propiedad}`);
    } else if (proy.tipo_propiedad !== undefined) {
      missing.push(`tipo_propiedad:${filters.tipo_propiedad}≠${proy.tipo_propiedad}`);
    } else {
      missing.push('tipo_propiedad');
    }
  }

  // recámaras
  let recamarasMatch = false;
  if (filters.recamaras !== undefined) {
    totalWeight += FILTER_WEIGHTS.recamaras;
    if (proy.recamaras === filters.recamaras) {
      score += FILTER_WEIGHTS.recamaras;
      recamarasMatch = true;
      rationale.push(`${filters.recamaras} rec`);
    } else if (proy.recamaras !== undefined && Math.abs(proy.recamaras - filters.recamaras) <= 1) {
      // tolerancia 1 recámara → 50% del peso
      score += FILTER_WEIGHTS.recamaras * 0.5;
      rationale.push(`${proy.recamaras} rec (~${filters.recamaras})`);
    } else if (proy.recamaras !== undefined) {
      missing.push(`recamaras:${filters.recamaras}≠${proy.recamaras}`);
    } else {
      missing.push('recamaras');
    }
  }

  // precio dentro de rango
  let precioMatch = false;
  let precioDistance = 0;
  const hasPrecioFilter = filters.precio_min !== undefined || filters.precio_max !== undefined;
  if (hasPrecioFilter) {
    totalWeight += FILTER_WEIGHTS.precio;
    if (proy.precio !== undefined && Number.isFinite(proy.precio)) {
      const precio = proy.precio;
      const min = filters.precio_min ?? 0;
      const max = filters.precio_max ?? Number.POSITIVE_INFINITY;
      if (precio >= min && precio <= max) {
        score += FILTER_WEIGHTS.precio;
        precioMatch = true;
        rationale.push('precio en rango');
      } else {
        // outside range — distancia relativa al nearest boundary
        const bound = precio < min ? min : max === Number.POSITIVE_INFINITY ? min : max;
        precioDistance = Math.abs(precio - bound);
        const refRange = Math.max(1, (max === Number.POSITIVE_INFINITY ? min : max - min) || min);
        const proximityPct = Math.max(0, 1 - precioDistance / refRange);
        score += FILTER_WEIGHTS.precio * proximityPct * 0.5;
        missing.push(`precio_fuera_rango:${precio}`);
      }
    } else {
      missing.push('precio');
    }
  }

  // colonia
  let coloniaMatch = false;
  if (filters.colonia !== undefined) {
    totalWeight += FILTER_WEIGHTS.colonia;
    const filtroColonia = normalizeText(filters.colonia);
    const proyColonia = normalizeText(proy.colonia);
    if (proyColonia.length > 0 && proyColonia === filtroColonia) {
      score += FILTER_WEIGHTS.colonia;
      coloniaMatch = true;
      rationale.push(`colonia=${filters.colonia}`);
    } else if (proyColonia.length > 0) {
      missing.push(`colonia:${filters.colonia}≠${proy.colonia}`);
    } else {
      missing.push('colonia');
    }
  }

  const normalized = totalWeight > 0 ? (score / totalWeight) * 100 : 0;

  return {
    score: clamp100(normalized),
    rationale,
    missing,
    matches: {
      operacion: operacionMatch,
      tipo: tipoMatch,
      colonia: coloniaMatch,
      precio: precioMatch,
      recamaras: recamarasMatch,
      precioDistance,
    },
  };
}

function computeZoneFit(
  preferences: Readonly<Record<string, number>> | undefined,
  zoneVec: Readonly<Record<string, number>> | undefined,
): number {
  if (!preferences || !zoneVec) return 0;
  const prefKeys = Object.keys(preferences);
  const zoneKeys = Object.keys(zoneVec);
  if (prefKeys.length === 0 || zoneKeys.length === 0) return 0;
  // Normalizar ambos (magnitud unitaria no requerida — cosine la absorbe).
  return clamp100(cosineSimilarity(preferences, zoneVec) * 100);
}

function computeProjectFit(proy: C03ProyectoCandidato): number {
  if (proy.g01_full_score !== undefined && Number.isFinite(proy.g01_full_score)) {
    return clamp100(proy.g01_full_score);
  }
  if (proy.project_scores_avg !== undefined && Number.isFinite(proy.project_scores_avg)) {
    return clamp100(proy.project_scores_avg);
  }
  return 50; // fallback neutro
}

function computeMomentum(proy: C03ProyectoCandidato): number | null {
  if (proy.n11_momentum === undefined || !Number.isFinite(proy.n11_momentum)) return null;
  return clamp100(proy.n11_momentum);
}

interface RankedEntry extends C03MatchEntry {
  readonly _tiebreak: {
    readonly operacion: number;
    readonly tipo: number;
    readonly colonia: number;
    readonly precioDistance: number;
    readonly recamaras: number;
  };
}

export function computeC03MatchingEngine(input: C03RawInput): C03ComputeResult {
  const candidatos = input.candidatos;
  const missing: string[] = [];

  const filtersEmpty = Object.values(input.filters).every((v) => v === undefined);
  if (filtersEmpty) missing.push('filters_vacio');

  const candidatos_count = candidatos.length;

  // Coverage: % candidatos con al menos N11 + algo de filter match.
  const withN11 = candidatos.filter((c) => c.n11_momentum !== undefined).length;
  const coverage_pct = candidatos_count === 0 ? 0 : Math.round((withN11 / candidatos_count) * 100);

  const deps = input.deps ?? [];
  const { critical, supporting } = collectDepConfidences(deps, CRITICAL_DEPS);
  const propagation = propagateConfidence({
    critical,
    supporting,
    coverage_pct,
    min_coverage_pct: methodology.confidence_thresholds.min_coverage_pct,
    high_coverage_pct: methodology.confidence_thresholds.high_coverage_pct,
  });

  // Tier gate: sin candidatos o filters vacío → insufficient.
  if (candidatos_count === 0 || filtersEmpty) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        busquedaId: input.busquedaId,
        top: [],
        candidatos_count,
        coverage_pct,
        missing_dimensions: missing,
        capped_by: [],
        cap_reason: 'tier_gate_no_input',
        gated: true,
        gate_reason:
          candidatos_count === 0
            ? 'Sin proyectos candidatos que rankear.'
            : 'Filtros de búsqueda vacíos.',
      },
    };
  }

  // Critical dep N11 insufficient → propagate.
  if (propagation.confidence === 'insufficient_data' && deps.length > 0) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        busquedaId: input.busquedaId,
        top: [],
        candidatos_count,
        coverage_pct,
        missing_dimensions: ['N11'],
        capped_by: propagation.capped_by,
        cap_reason: propagation.cap_reason,
        gated: true,
        gate_reason: propagation.cap_reason,
      },
    };
  }

  const ranked: RankedEntry[] = [];
  for (const c of candidatos) {
    const filters = computeFiltersMatch(input.filters, c);
    const zoneFit = computeZoneFit(input.buyer_preferences_vector, c.zone_scores_vector);
    const projectFit = computeProjectFit(c);
    const momentumRaw = computeMomentum(c);
    const momentum = momentumRaw ?? 0;

    const score =
      filters.score * WEIGHTS.filters_match +
      zoneFit * WEIGHTS.zone_scores_fit +
      projectFit * WEIGHTS.project_scores_fit +
      momentum * WEIGHTS.momentum;

    const scoreRounded = Math.round(clamp100(score));

    const rationale = [...filters.rationale];
    if (zoneFit >= 60) rationale.push(`zona fit ${Math.round(zoneFit)}`);
    if (projectFit >= 60) rationale.push(`proyecto fit ${Math.round(projectFit)}`);
    if (momentum >= 60) rationale.push(`momentum ${Math.round(momentum)}`);

    ranked.push({
      projectId: c.projectId,
      score: scoreRounded,
      rationale,
      missing_filters: filters.missing,
      components: {
        filters_match: Number(filters.score.toFixed(1)),
        zone_scores_fit: Number(zoneFit.toFixed(1)),
        project_scores_fit: Number(projectFit.toFixed(1)),
        momentum: Number(momentum.toFixed(1)),
      },
      _tiebreak: {
        operacion: filters.matches.operacion ? 1 : 0,
        tipo: filters.matches.tipo ? 1 : 0,
        colonia: filters.matches.colonia ? 1 : 0,
        precioDistance: filters.matches.precioDistance,
        recamaras: filters.matches.recamaras ? 1 : 0,
      },
    });
  }

  // Sort: score DESC; tiebreak operacion > tipo > colonia > precio_cercano (ASC distance) > recamaras.
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b._tiebreak.operacion !== a._tiebreak.operacion)
      return b._tiebreak.operacion - a._tiebreak.operacion;
    if (b._tiebreak.tipo !== a._tiebreak.tipo) return b._tiebreak.tipo - a._tiebreak.tipo;
    if (b._tiebreak.colonia !== a._tiebreak.colonia)
      return b._tiebreak.colonia - a._tiebreak.colonia;
    if (a._tiebreak.precioDistance !== b._tiebreak.precioDistance)
      return a._tiebreak.precioDistance - b._tiebreak.precioDistance;
    return b._tiebreak.recamaras - a._tiebreak.recamaras;
  });

  const top = ranked.slice(0, TOP_N).map<C03MatchEntry>((r) => ({
    projectId: r.projectId,
    score: r.score,
    rationale: r.rationale,
    missing_filters: r.missing_filters,
    components: r.components,
  }));

  // score_value C03 = score del top #1 (representa "qué tan buena está la búsqueda").
  const score_value = top.length > 0 ? (top[0]?.score ?? 0) : 0;

  let confidence: Confidence =
    deps.length > 0
      ? propagation.confidence
      : coverage_pct >= methodology.confidence_thresholds.high_coverage_pct
        ? 'high'
        : coverage_pct >= methodology.confidence_thresholds.min_coverage_pct
          ? 'medium'
          : 'low';

  if (confidence === 'insufficient_data' && score_value > 0) confidence = 'low';

  return {
    value: score_value,
    confidence,
    components: {
      busquedaId: input.busquedaId,
      top,
      candidatos_count,
      coverage_pct,
      missing_dimensions: missing,
      capped_by: propagation.capped_by,
      cap_reason: propagation.cap_reason,
      gated: false,
      gate_reason: null,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.c03.insufficient';
  if (value >= 80) return 'ie.score.c03.match_excelente';
  if (value >= 60) return 'ie.score.c03.match_bueno';
  if (value >= 40) return 'ie.score.c03.match_parcial';
  return 'ie.score.c03.match_pobre';
}

export const c03MatchingEngineCalculator: Calculator = {
  scoreId: 'C03',
  version,
  tier: 2,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const confidence: Confidence = 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        busquedaId: input.params?.busquedaId ?? 'desconocida',
        top: [],
        candidatos_count: 0,
        gated: true,
        gate_reason:
          'C03 requiere busqueda filters + candidatos + N11 desde DB. Use computeC03MatchingEngine(input) en tests.',
      },
      inputs_used: {
        periodDate: input.periodDate,
        busquedaId: (input.params?.busquedaId as string | undefined) ?? null,
      },
      confidence,
      citations: [
        { source: 'busquedas', period: input.periodDate },
        { source: 'project_scores', period: input.periodDate },
        { source: 'zone_scores:N11', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'busquedas', count: 0 },
          { name: 'project_scores', count: 0 },
          { name: 'zone_scores:N11', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: {
        busqueda_id: (input.params?.busquedaId as string | undefined) ?? 'desconocida',
        top_count: 0,
        top_project_id: 'n/a',
        top_score: 0,
        top_filters_pct: 0,
      },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default c03MatchingEngineCalculator;
