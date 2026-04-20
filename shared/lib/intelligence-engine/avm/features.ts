// AVM MVP I01 — Feature engineering 47 variables, 12 fuentes.
// Ref: FASE_08 §BLOQUE 8.D.1 + 03.8 §I01.
//
// Estructura (47 features total):
//   12 propiedad      — sup_construida_m2, sup_terreno_m2, recamaras, banos,
//                       medio_banos, estacionamientos, edad_anos, piso,
//                       amenidades_count, tipo_depto, tipo_casa, tipo_townhouse
//                       (studio = reference, dummy coding para evitar colineal).
//   10 score-derivados — F01, F02, F03, F08, N01, N02, N08, N11, H01, H02
//                        (lookups zone_scores cuando live; 0 + missing_fields si no).
//   9  comparables    — precio_m2 mediana/p25/p75 zona 12m, p50 6m, ventas_12m,
//                       dias_mercado_avg, absorcion_pct, ratio_lista_cierre,
//                       num_comparables_disponibles (market_prices_secondary +
//                       operaciones).
//   8  macro_series   — TIIE28, tasa_hipotecaria_avg, INPC, INPP_construccion,
//                       tipo_cambio_fix, infonavit_vsm, shf_ipv_cdmx, bbva_oferta.
//   8  condiciones    — roof_garden, orientacion_sur (vs N=ref), vista_parque,
//                       amenidades_premium_count, anos_escritura,
//                       estado_conservacion_score 1-5, seguridad_interna,
//                       mascotas_ok.
//
// Falta data fuente → feature = 0 + missing_fields[] tracked.
// Normalización z-score con params en avm/normalization-params.json.
// Determinismo: mismo input → mismo vector (snapshot-testable).

import type { SupabaseClient } from '@supabase/supabase-js';
import normalizationParams from './normalization-params.json' with { type: 'json' };
import type { AvmFeatureVector, AvmPropertyInput, EstadoConservacion } from './types';

export const FEATURE_NAMES = [
  // 12 propiedad
  'sup_construida_m2',
  'sup_terreno_m2',
  'recamaras',
  'banos',
  'medio_banos',
  'estacionamientos',
  'edad_anos',
  'piso',
  'amenidades_count',
  'tipo_depto',
  'tipo_casa',
  'tipo_townhouse',
  // 10 score-derivados zona
  'f01_safety',
  'f02_transit',
  'f03_ecosystem',
  'f08_lqi',
  'n01_ecosystem_diversity',
  'n02_employment_access',
  'n08_walkability',
  'n11_momentum',
  'h01_school',
  'h02_health',
  // 9 comparables
  'precio_m2_mediana_zona_12m',
  'precio_m2_p25',
  'precio_m2_p75',
  'precio_m2_p50_6m',
  'ventas_12m',
  'dias_en_mercado_avg',
  'absorcion_pct',
  'ratio_lista_cierre',
  'num_comparables_disponibles',
  // 8 macro_series
  'tiie28',
  'tasa_hipotecaria_avg',
  'inpc',
  'inpp_construccion',
  'tipo_cambio_fix',
  'infonavit_vsm',
  'shf_ipv_cdmx',
  'bbva_oferta',
  // 8 condiciones
  'roof_garden',
  'orientacion_sur',
  'vista_parque',
  'amenidades_premium_count',
  'anos_escritura',
  'estado_conservacion_score',
  'seguridad_interna',
  'mascotas_ok',
] as const;

export const FEATURE_VECTOR_LENGTH = FEATURE_NAMES.length;

const ESTADO_SCORE: Record<EstadoConservacion, number> = {
  obra_gris: 1,
  regular: 2,
  bueno: 3,
  excelente: 4,
  nuevo: 5,
};

const ZONE_SCORE_TYPES: readonly string[] = [
  'F01',
  'F02',
  'F03',
  'F08',
  'N01',
  'N02',
  'N08',
  'N11',
  'H01',
  'H02',
];

interface ZoneScoreRow {
  readonly score_type: string;
  readonly score_value: number;
}

interface MacroSeriesRow {
  readonly serie: string;
  readonly value: number;
}

interface MarketAggregatesRow {
  readonly precio_m2_mediana_zona_12m: number | null;
  readonly precio_m2_p25: number | null;
  readonly precio_m2_p75: number | null;
  readonly precio_m2_p50_6m: number | null;
  readonly ventas_12m: number | null;
  readonly dias_en_mercado_avg: number | null;
  readonly absorcion_pct: number | null;
  readonly ratio_lista_cierre: number | null;
  readonly num_comparables_disponibles: number | null;
}

export interface BuildFeatureVectorContext {
  readonly supabase?: SupabaseClient;
  readonly zoneId?: string;
  readonly periodDate?: string;
  readonly zoneScoresOverride?: Readonly<Record<string, number>>;
  readonly marketAggregatesOverride?: Readonly<Partial<MarketAggregatesRow>>;
  readonly macroSeriesOverride?: Readonly<Record<string, number>>;
}

function castFrom(supabase: SupabaseClient, table: string) {
  return (supabase as unknown as SupabaseClient<Record<string, unknown>>).from(table as never);
}

async function fetchZoneScores(
  supabase: SupabaseClient,
  zoneId: string,
  periodDate: string,
): Promise<Record<string, number>> {
  try {
    const { data, error } = await castFrom(supabase, 'zone_scores')
      .select('score_type, score_value')
      .eq('zone_id', zoneId)
      .eq('period_date', periodDate)
      .in('score_type', ZONE_SCORE_TYPES as unknown as string[]);
    if (error || !data) return {};
    const rows = data as unknown as readonly ZoneScoreRow[];
    const out: Record<string, number> = {};
    for (const row of rows) {
      if (typeof row.score_value === 'number') {
        out[row.score_type] = row.score_value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function fetchMacroSeries(supabase: SupabaseClient): Promise<Record<string, number>> {
  try {
    const { data, error } = await castFrom(supabase, 'macro_series')
      .select('serie, value')
      .in('serie', [
        'tiie28',
        'tasa_hipotecaria_avg',
        'inpc',
        'inpp_construccion',
        'tipo_cambio_fix',
        'infonavit_vsm',
        'shf_ipv_cdmx',
        'bbva_oferta',
      ])
      .order('period_date', { ascending: false })
      .limit(50);
    if (error || !data) return {};
    const rows = data as unknown as readonly MacroSeriesRow[];
    const out: Record<string, number> = {};
    for (const row of rows) {
      if (typeof row.value === 'number' && !(row.serie in out)) {
        out[row.serie] = row.value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function fetchMarketAggregates(
  supabase: SupabaseClient,
  zoneId: string,
): Promise<Partial<MarketAggregatesRow>> {
  try {
    const { data, error } = await castFrom(supabase, 'zone_market_aggregates')
      .select(
        'precio_m2_mediana_zona_12m, precio_m2_p25, precio_m2_p75, precio_m2_p50_6m, ventas_12m, dias_en_mercado_avg, absorcion_pct, ratio_lista_cierre, num_comparables_disponibles',
      )
      .eq('zone_id', zoneId)
      .maybeSingle();
    if (error || !data) return {};
    return data as unknown as Partial<MarketAggregatesRow>;
  } catch {
    return {};
  }
}

function getParam(name: string): { mean: number; std: number } {
  const table = (
    normalizationParams as {
      params: Record<string, { mean: number; std: number }>;
    }
  ).params;
  const p = table[name];
  if (!p) return { mean: 0, std: 1 };
  return p;
}

function zscore(name: string, value: number): number {
  const { mean, std } = getParam(name);
  if (std === 0) return 0;
  return Number(((value - mean) / std).toFixed(4));
}

// Build feature vector para una propiedad. Determinístico:
// mismo input + mismo context → mismo vector.
export async function buildFeatureVector(
  property: AvmPropertyInput,
  context: BuildFeatureVectorContext = {},
): Promise<AvmFeatureVector> {
  const missing: string[] = [];

  // Score zona: override > supabase lookup > missing.
  let zoneScores: Record<string, number> = context.zoneScoresOverride
    ? { ...context.zoneScoresOverride }
    : {};
  if (
    Object.keys(zoneScores).length === 0 &&
    context.supabase &&
    context.zoneId &&
    context.periodDate
  ) {
    zoneScores = await fetchZoneScores(context.supabase, context.zoneId, context.periodDate);
  }

  // Macro series: override > supabase > missing.
  let macro: Record<string, number> = context.macroSeriesOverride
    ? { ...context.macroSeriesOverride }
    : {};
  if (Object.keys(macro).length === 0 && context.supabase) {
    macro = await fetchMacroSeries(context.supabase);
  }

  // Market aggregates: override > supabase > missing.
  let market: Partial<MarketAggregatesRow> = context.marketAggregatesOverride
    ? { ...context.marketAggregatesOverride }
    : {};
  if (Object.keys(market).length === 0 && context.supabase && context.zoneId) {
    market = await fetchMarketAggregates(context.supabase, context.zoneId);
  }

  const c = property.condiciones ?? {};
  const supTerreno = property.sup_terreno_m2 ?? property.sup_m2;
  const medioBanos = property.medio_banos ?? 0;
  const estacionamientos = property.estacionamientos ?? 0;
  const edad = property.edad_anos ?? 0;
  const piso = property.piso ?? 1;
  const amenidadesCount = property.amenidades.length;
  const amenidadesPremium = c.amenidades_premium_count ?? 0;
  const anosEscritura = c.anos_escritura ?? edad;
  const estadoScore = ESTADO_SCORE[property.estado_conservacion];

  function gather(name: string, record: Record<string, number>): number {
    if (name in record) return record[name] as number;
    missing.push(name);
    return 0;
  }

  function gatherMarket<K extends keyof MarketAggregatesRow>(name: string, key: K): number {
    const v = market[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    missing.push(name);
    return 0;
  }

  // Helper para features booleanos/ordinales: solo zscore, nunca null.
  const raw: Record<string, number> = {
    sup_construida_m2: property.sup_m2,
    sup_terreno_m2: supTerreno,
    recamaras: property.recamaras,
    banos: property.banos,
    medio_banos: medioBanos,
    estacionamientos,
    edad_anos: edad,
    piso,
    amenidades_count: amenidadesCount,
    tipo_depto: property.tipo_propiedad === 'depto' ? 1 : 0,
    tipo_casa: property.tipo_propiedad === 'casa' ? 1 : 0,
    tipo_townhouse: property.tipo_propiedad === 'townhouse' ? 1 : 0,

    f01_safety: gather('f01_safety', renameZone(zoneScores, 'F01')),
    f02_transit: gather('f02_transit', renameZone(zoneScores, 'F02')),
    f03_ecosystem: gather('f03_ecosystem', renameZone(zoneScores, 'F03')),
    f08_lqi: gather('f08_lqi', renameZone(zoneScores, 'F08')),
    n01_ecosystem_diversity: gather('n01_ecosystem_diversity', renameZone(zoneScores, 'N01')),
    n02_employment_access: gather('n02_employment_access', renameZone(zoneScores, 'N02')),
    n08_walkability: gather('n08_walkability', renameZone(zoneScores, 'N08')),
    n11_momentum: gather('n11_momentum', renameZone(zoneScores, 'N11')),
    h01_school: gather('h01_school', renameZone(zoneScores, 'H01')),
    h02_health: gather('h02_health', renameZone(zoneScores, 'H02')),

    precio_m2_mediana_zona_12m: gatherMarket(
      'precio_m2_mediana_zona_12m',
      'precio_m2_mediana_zona_12m',
    ),
    precio_m2_p25: gatherMarket('precio_m2_p25', 'precio_m2_p25'),
    precio_m2_p75: gatherMarket('precio_m2_p75', 'precio_m2_p75'),
    precio_m2_p50_6m: gatherMarket('precio_m2_p50_6m', 'precio_m2_p50_6m'),
    ventas_12m: gatherMarket('ventas_12m', 'ventas_12m'),
    dias_en_mercado_avg: gatherMarket('dias_en_mercado_avg', 'dias_en_mercado_avg'),
    absorcion_pct: gatherMarket('absorcion_pct', 'absorcion_pct'),
    ratio_lista_cierre: gatherMarket('ratio_lista_cierre', 'ratio_lista_cierre'),
    num_comparables_disponibles: gatherMarket(
      'num_comparables_disponibles',
      'num_comparables_disponibles',
    ),

    tiie28: gather('tiie28', macro),
    tasa_hipotecaria_avg: gather('tasa_hipotecaria_avg', macro),
    inpc: gather('inpc', macro),
    inpp_construccion: gather('inpp_construccion', macro),
    tipo_cambio_fix: gather('tipo_cambio_fix', macro),
    infonavit_vsm: gather('infonavit_vsm', macro),
    shf_ipv_cdmx: gather('shf_ipv_cdmx', macro),
    bbva_oferta: gather('bbva_oferta', macro),

    roof_garden: c.roof_garden ? 1 : 0,
    orientacion_sur: c.orientacion === 'S' ? 1 : 0,
    vista_parque: c.vista_parque ? 1 : 0,
    amenidades_premium_count: amenidadesPremium,
    anos_escritura: anosEscritura,
    estado_conservacion_score: estadoScore,
    seguridad_interna: c.seguridad_interna ? 1 : 0,
    mascotas_ok: c.mascotas_ok ? 1 : 0,
  };

  const values = FEATURE_NAMES.map((name) => zscore(name, raw[name] ?? 0));

  return {
    values,
    missing_fields: missing.sort(),
    feature_names: FEATURE_NAMES,
  };
}

// Rename F01 → f01_safety mapping en objeto temporal para gather().
// Permite que gather() use un único lookup key sin duplicar lógica.
function renameZone(zoneScores: Record<string, number>, upper: string): Record<string, number> {
  const map: Record<string, string> = {
    F01: 'f01_safety',
    F02: 'f02_transit',
    F03: 'f03_ecosystem',
    F08: 'f08_lqi',
    N01: 'n01_ecosystem_diversity',
    N02: 'n02_employment_access',
    N08: 'n08_walkability',
    N11: 'n11_momentum',
    H01: 'h01_school',
    H02: 'h02_health',
  };
  const key = map[upper];
  if (!key) return {};
  if (upper in zoneScores) return { [key]: zoneScores[upper] as number };
  if (key in zoneScores) return { [key]: zoneScores[key] as number };
  return {};
}
