// A10 Lifestyle Match — 6 perfiles de comprador con pesos distintos sobre
// F/N scores. Plan FASE 10 §10.B.4. Catálogo 03.8 §A10. Tier 3.
// Categoría comprador.
//
// D30 FASE 10 SESIÓN 2/3: PPD Capa 3 integration. behavioral_signals del
// user (≥10) calibra dynamically los weights per dimension, reemplazando el
// default del perfil. Fallback a defaults si <10 signals.
// ADR-021 §2.3 behavioral inference engine.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';
import { computeValidUntil } from '../persist';

export const version = '1.0.0';

export type LifestyleProfile =
  | 'quiet'
  | 'nightlife'
  | 'family'
  | 'fitness'
  | 'remote_worker'
  | 'investor';

// Pesos default per perfil (plan §10.B.4).
export const DEFAULT_PROFILE_WEIGHTS: Record<LifestyleProfile, Record<string, number>> = {
  quiet: { N04: 0.25, F01: 0.2, ruido: 0.15, N08: 0.1, H07: 0.15, N09_inv: 0.15 },
  nightlife: { N09: 0.35, N08: 0.2, F02: 0.15, F03: 0.1, gastronomico: 0.2 },
  family: { H01: 0.3, F01: 0.2, parques: 0.15, H02: 0.15, F02: 0.1, N04: 0.1 },
  fitness: { gyms: 0.25, parques: 0.25, N08: 0.2, ciclovias: 0.15, F04: 0.15 },
  remote_worker: {
    coworks: 0.25,
    cafes: 0.2,
    N08: 0.15,
    F02: 0.1,
    H02: 0.1,
    N09: 0.1,
    H07: 0.1,
  },
  investor: { N11: 0.3, F09: 0.25, A04: 0.2, A12: 0.15, B08: 0.1 },
};

// D30 — 6 dimensions 6D (ADR-021 §2.3). behavioral_signals mapea a estas
// dimensiones. Usuario con signals >=10 tiene inference rich → calibrate.
export type PPDDimension =
  | 'emotional'
  | 'tecnico'
  | 'urbano'
  | 'financiero'
  | 'espacial'
  | 'inversion';

export interface BehavioralInferredPreferences {
  readonly emotional: { value: number; confidence: number };
  readonly tecnico: { value: number; confidence: number };
  readonly urbano: { value: number; confidence: number };
  readonly financiero: { value: number; confidence: number };
  readonly espacial: { value: number; confidence: number };
  readonly inversion: { value: number; confidence: number };
  readonly total_signals: number;
}

export const PPD_SIGNALS_THRESHOLD = 10;

export const methodology = {
  formula:
    'match = Σ(weight_perfil × dimension_zona). D30: weights override con inferred_preferences si total_signals ≥ 10.',
  sources: [
    'zone_scores:F01',
    'zone_scores:N04',
    'zone_scores:N08',
    'zone_scores:N09',
    'zone_scores:H01',
    'zone_scores:H02',
    'zone_scores:F09',
    'zone_scores:N11',
    'behavioral_signals',
  ],
  profiles: ['quiet', 'nightlife', 'family', 'fitness', 'remote_worker', 'investor'],
  dependencies: [
    { score_id: 'F01', weight: 0.2, role: 'safety_baseline', critical: false },
    { score_id: 'N08', weight: 0.2, role: 'walkability', critical: false },
    { score_id: 'H01', weight: 0.15, role: 'schools', critical: false },
  ],
  references: [
    {
      name: 'Catálogo 03.8 §A10 Lifestyle Match',
      url: 'docs/03_CATALOGOS/03.8_CATALOGO_SCORES_IE.md#a10-lifestyle-match',
    },
    { name: 'Plan FASE 10 §10.B.4', url: 'docs/02_PLAN_MAESTRO/FASE_10_IE_SCORES_N2_N3.md' },
    {
      name: 'ADR-021 §2.3 PPD Capa 3',
      url: 'docs/01_DECISIONES_ARQUITECTONICAS/ADR-021_PROGRESSIVE_PREFERENCE_DISCOVERY.md',
    },
  ],
  validity: { unit: 'days', value: 14 } as const,
  confidence_thresholds: { min_coverage_pct: 50, high_coverage_pct: 100 },
  sensitivity_analysis: [
    { dimension_id: 'F01', impact_pct_per_10pct_change: 2.0 },
    { dimension_id: 'N08', impact_pct_per_10pct_change: 2.5 },
    { dimension_id: 'H01', impact_pct_per_10pct_change: 2.0 },
  ],
  ppd_signals_threshold: PPD_SIGNALS_THRESHOLD,
} as const;

export const reasoning_template =
  'Lifestyle Match {profile} zona {zone_id}: {score_value}/100. Top dimensions: {top_dimensions}. PPD signals {total_signals}.';

export interface A10Components extends Record<string, unknown> {
  readonly profile: LifestyleProfile;
  readonly weights_used: Readonly<Record<string, number>>;
  readonly zone_dimensions: Readonly<Record<string, number | null>>;
  readonly personalized_weights: Readonly<Record<PPDDimension, number>> | null;
  readonly ppd_signals_used: number;
  readonly ppd_calibrated: boolean;
  readonly top_dimensions: readonly string[];
  readonly missing_dimensions: readonly string[];
  readonly coverage_pct: number;
}

export interface A10RawInput {
  readonly profile: LifestyleProfile;
  readonly zone_dimensions: Readonly<Record<string, number | null>>;
  readonly behavioral_preferences?: BehavioralInferredPreferences | null;
}

export interface A10ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: A10Components;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

// D30 — calibra weights del perfil con inferred_preferences. La lógica:
// multiplica el peso del perfil por (1 + delta) donde delta deriva del
// confidence promedio de la dimensión behavioral cercana. Normaliza a Σ=1.
function personalizeWeights(
  defaultWeights: Readonly<Record<string, number>>,
  prefs: BehavioralInferredPreferences,
): { weights: Record<string, number>; personalized: Record<PPDDimension, number> } {
  // Proyección sobre 6D ADR-021: emocional/tecnico/urbano/financiero/espacial/inversion.
  // Se deriva un factor per dimensión: (confidence × value). Luego se escala el
  // peso default usando la dimensión PPD más cercana al score.
  const dimFactor: Record<PPDDimension, number> = {
    emotional: prefs.emotional.value * prefs.emotional.confidence,
    tecnico: prefs.tecnico.value * prefs.tecnico.confidence,
    urbano: prefs.urbano.value * prefs.urbano.confidence,
    financiero: prefs.financiero.value * prefs.financiero.confidence,
    espacial: prefs.espacial.value * prefs.espacial.confidence,
    inversion: prefs.inversion.value * prefs.inversion.confidence,
  };

  // Mapping heurístico score → PPD dimension.
  const scoreToPPD: Record<string, PPDDimension> = {
    F01: 'emotional',
    F02: 'urbano',
    F03: 'urbano',
    F04: 'emotional',
    F09: 'financiero',
    H01: 'espacial',
    H02: 'tecnico',
    H07: 'emotional',
    N04: 'emotional',
    N08: 'urbano',
    N09: 'urbano',
    N09_inv: 'emotional',
    N11: 'inversion',
    A04: 'inversion',
    A12: 'financiero',
    B08: 'inversion',
    ruido: 'emotional',
    gastronomico: 'urbano',
    parques: 'emotional',
    gyms: 'espacial',
    ciclovias: 'urbano',
    coworks: 'tecnico',
    cafes: 'urbano',
  };

  const rawWeights: Record<string, number> = {};
  for (const [k, w] of Object.entries(defaultWeights)) {
    const ppd = scoreToPPD[k] ?? 'urbano';
    const factor = dimFactor[ppd];
    rawWeights[k] = w * (0.5 + Math.min(1, Math.max(0, factor)));
  }
  const sum = Object.values(rawWeights).reduce((s, v) => s + v, 0);
  const normalized: Record<string, number> = {};
  if (sum > 0) {
    for (const [k, v] of Object.entries(rawWeights)) normalized[k] = v / sum;
  } else {
    for (const [k, v] of Object.entries(defaultWeights)) normalized[k] = v;
  }

  // Normalizar el vector 6D PPD para UI.
  const ppdSum = Object.values(dimFactor).reduce((s, v) => s + v, 0);
  const personalized = {} as Record<PPDDimension, number>;
  if (ppdSum > 0) {
    for (const [k, v] of Object.entries(dimFactor)) personalized[k as PPDDimension] = v / ppdSum;
  } else {
    personalized.emotional = 1 / 6;
    personalized.tecnico = 1 / 6;
    personalized.urbano = 1 / 6;
    personalized.financiero = 1 / 6;
    personalized.espacial = 1 / 6;
    personalized.inversion = 1 / 6;
  }

  return { weights: normalized, personalized };
}

export function computeA10LifestyleMatch(input: A10RawInput): A10ComputeResult {
  const defaultWeights = DEFAULT_PROFILE_WEIGHTS[input.profile];
  if (!defaultWeights) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        profile: input.profile,
        weights_used: {},
        zone_dimensions: {},
        personalized_weights: null,
        ppd_signals_used: 0,
        ppd_calibrated: false,
        top_dimensions: [],
        missing_dimensions: [],
        coverage_pct: 0,
      },
    };
  }

  let weights: Record<string, number> = { ...defaultWeights };
  let personalized: Record<PPDDimension, number> | null = null;
  let ppd_calibrated = false;
  const ppd_signals_used = input.behavioral_preferences?.total_signals ?? 0;

  if (input.behavioral_preferences && ppd_signals_used >= methodology.ppd_signals_threshold) {
    const p = personalizeWeights(defaultWeights, input.behavioral_preferences);
    weights = p.weights;
    personalized = p.personalized;
    ppd_calibrated = true;
  }

  const missing: string[] = [];
  let weighted_sum = 0;
  let weight_sum_used = 0;
  const contributions: Array<{ key: string; pts: number }> = [];

  for (const [key, w] of Object.entries(weights)) {
    const raw = input.zone_dimensions[key];
    if (raw === null || raw === undefined || !Number.isFinite(raw)) {
      missing.push(key);
      continue;
    }
    weighted_sum += raw * w;
    weight_sum_used += w;
    contributions.push({ key, pts: raw * w });
  }

  const total_dims = Object.keys(defaultWeights).length;
  const available = total_dims - missing.length;
  const coverage_pct = Math.round((available / total_dims) * 100);

  if (coverage_pct < methodology.confidence_thresholds.min_coverage_pct) {
    return {
      value: 0,
      confidence: 'insufficient_data',
      components: {
        profile: input.profile,
        weights_used: weights,
        zone_dimensions: input.zone_dimensions,
        personalized_weights: personalized,
        ppd_signals_used,
        ppd_calibrated,
        top_dimensions: [],
        missing_dimensions: missing,
        coverage_pct,
      },
    };
  }

  // Normalizar por pesos realmente usados (evita penalizar por missing).
  const normalized = weight_sum_used > 0 ? weighted_sum / weight_sum_used : 0;
  const value = Math.round(clamp100(normalized));

  const top_dimensions = contributions
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3)
    .map((c) => c.key);

  const confidence: Confidence =
    coverage_pct >= methodology.confidence_thresholds.high_coverage_pct ? 'high' : 'medium';

  return {
    value,
    confidence,
    components: {
      profile: input.profile,
      weights_used: weights,
      zone_dimensions: input.zone_dimensions,
      personalized_weights: personalized,
      ppd_signals_used,
      ppd_calibrated,
      top_dimensions,
      missing_dimensions: missing,
      coverage_pct,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.a10.insufficient';
  if (value >= 80) return 'ie.score.a10.match_excelente';
  if (value >= 60) return 'ie.score.a10.match_bueno';
  if (value >= 40) return 'ie.score.a10.match_regular';
  return 'ie.score.a10.match_pobre';
}

export const a10LifestyleMatchCalculator: Calculator = {
  scoreId: 'A10',
  version,
  tier: 3,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const computed_at = new Date();
    const params = (input.params ?? {}) as Record<string, unknown>;
    const confidence: Confidence =
      typeof params.profile === 'string' ? 'medium' : 'insufficient_data';

    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: {
        reason: 'prod path stub — invocar computeA10LifestyleMatch directo',
      },
      inputs_used: { periodDate: input.periodDate, userId: input.userId ?? null },
      confidence,
      citations: [
        { source: 'zone_scores:F01', period: input.periodDate },
        { source: 'zone_scores:N08', period: input.periodDate },
        { source: 'zone_scores:H01', period: input.periodDate },
        { source: 'behavioral_signals', period: input.periodDate },
      ],
      provenance: {
        sources: [
          { name: 'zone_scores:F01', count: 0 },
          { name: 'zone_scores:N08', count: 0 },
          { name: 'behavioral_signals', count: 0 },
        ],
        computed_at: computed_at.toISOString(),
        calculator_version: version,
      },
      template_vars: { profile: 'desconocido', zone_id: input.zoneId ?? 'desconocido' },
      valid_until: computeValidUntil(computed_at, methodology.validity),
    };
  },
};

export default a10LifestyleMatchCalculator;
