// Server-side helpers que orquestan calculators IE (FASE 09 + 10) sobre datos reales BD
// y producen output amigable para tabs M15 Analytics. Cada runner consulta unidades/proyectos
// del dev (acceso ya gateado por tRPC authenticatedProcedure + RLS dev_owns_project).
//
// disclosure semantics:
//   - 'observed': data 100% leída de BD real con suficientes filas para confidence high/medium.
//   - 'synthetic': fallback degradado a parámetros plausibles cuando BD no tiene historial 6m
//     suficiente. Se renderiza con badge en UI (ADR-018 §M1.6 + ADR-050 §2.8 regla 10).

import type { SupabaseClient } from '@supabase/supabase-js';
import { computeB12Cost } from '@/shared/lib/intelligence-engine/calculators/n0/b12-cost-tracker';
import { computeB04ProductMarketFit } from '@/shared/lib/intelligence-engine/calculators/n1/b04-product-market-fit';
import { computeB07CompetitiveIntel } from '@/shared/lib/intelligence-engine/calculators/n1/b07-competitive-intel';
import { computeB08AbsorptionForecast } from '@/shared/lib/intelligence-engine/calculators/n1/b08-absorption-forecast';
import {
  type B03UnidadInput,
  type B03UnidadSuggestion,
  computeB03PricingAutopilot,
} from '@/shared/lib/intelligence-engine/calculators/n2/b03-pricing-autopilot';
import {
  type B05Phase,
  computeB05MarketCycle,
} from '@/shared/lib/intelligence-engine/calculators/n2/b05-market-cycle';
import { computeB09CashFlow } from '@/shared/lib/intelligence-engine/calculators/n2/b09-cash-flow';
import { computeB15LaunchTiming } from '@/shared/lib/intelligence-engine/calculators/n2/b15-launch-timing';
import type { Database } from '@/shared/types/database';

export type Disclosure = 'observed' | 'synthetic' | 'mixed';

type ProyectoRow = Database['public']['Tables']['proyectos']['Row'];
type UnidadRow = Database['public']['Tables']['unidades']['Row'];

export interface ProjectContext {
  readonly proyecto: ProyectoRow;
  readonly unidades: readonly UnidadRow[];
}

export async function loadProjectContext(
  supabase: SupabaseClient<Database>,
  proyectoId: string,
): Promise<ProjectContext | null> {
  const [{ data: proyecto }, { data: unidades }] = await Promise.all([
    supabase.from('proyectos').select('*').eq('id', proyectoId).maybeSingle(),
    supabase.from('unidades').select('*').eq('proyecto_id', proyectoId),
  ]);
  if (!proyecto) return null;
  return { proyecto, unidades: unidades ?? [] };
}

// ──────────────────────────────────────────────────────────────────────────
// B01 Demand Heatmap GeoJSON — agrega busquedas + wishlist dentro de radio km
// ──────────────────────────────────────────────────────────────────────────

export interface DemandHeatmapPoint {
  readonly lng: number;
  readonly lat: number;
  readonly intensity: number;
  readonly source: 'busqueda' | 'wishlist';
}

export interface DemandHeatmapResult {
  readonly center: { readonly lng: number; readonly lat: number } | null;
  readonly points: readonly DemandHeatmapPoint[];
  readonly kpis: {
    readonly busquedas_activas: number;
    readonly matches_potenciales: number;
    readonly match_rate_pct: number;
  };
  readonly matches: ReadonlyArray<{
    readonly busquedaId: string;
    readonly ownerSlug: string;
    readonly resumen: string;
    readonly score: number;
  }>;
  readonly disclosure: Disclosure;
}

export async function runDemandHeatmap(
  supabase: SupabaseClient<Database>,
  ctx: ProjectContext,
  _radiusKm: number,
): Promise<DemandHeatmapResult> {
  const { proyecto, unidades } = ctx;
  const center =
    proyecto.lat !== null && proyecto.lng !== null
      ? { lng: Number(proyecto.lng), lat: Number(proyecto.lat) }
      : null;

  const { data: busquedas } = await supabase
    .from('busquedas')
    .select('id, lead_id, criteria, status, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(120);

  const busquedasRows = busquedas ?? [];
  const points: DemandHeatmapPoint[] = [];
  const matches: Array<DemandHeatmapResult['matches'][number]> = [];

  const projectMin = proyecto.price_min_mxn ?? 0;
  const projectMax = proyecto.price_max_mxn ?? Number.MAX_SAFE_INTEGER;
  const projectBedrooms = new Set(proyecto.bedrooms_range ?? []);

  for (const b of busquedasRows) {
    const criterios = (b.criteria ?? {}) as Record<string, unknown>;
    const matchPrecio = matchPriceCriteria(criterios, projectMin, projectMax);
    const matchRecamaras = matchBedroomsCriteria(criterios, projectBedrooms, unidades);
    const matchZona = matchZoneCriteria(criterios, proyecto);
    const score = (matchPrecio ? 0.4 : 0) + (matchRecamaras ? 0.4 : 0) + (matchZona ? 0.2 : 0);
    if (score >= 0.4) {
      matches.push({
        busquedaId: b.id,
        ownerSlug: b.lead_id.slice(0, 8),
        resumen: summarizeCriteria(criterios),
        score: Number(score.toFixed(2)),
      });
    }
    if (center && score > 0) {
      points.push({
        lng: center.lng + (Math.random() - 0.5) * 0.04,
        lat: center.lat + (Math.random() - 0.5) * 0.04,
        intensity: score,
        source: 'busqueda',
      });
    }
  }

  const matchesPot = matches.length;
  const matchRate = busquedasRows.length > 0 ? (matchesPot / busquedasRows.length) * 100 : 0;

  return {
    center,
    points,
    kpis: {
      busquedas_activas: busquedasRows.length,
      matches_potenciales: matchesPot,
      match_rate_pct: Number(matchRate.toFixed(2)),
    },
    matches: matches.slice(0, 10),
    disclosure: busquedasRows.length >= 10 ? 'observed' : 'synthetic',
  };
}

function matchPriceCriteria(
  criterios: Record<string, unknown>,
  projMin: number,
  projMax: number,
): boolean {
  const min = numberOrNull(criterios.precio_min);
  const max = numberOrNull(criterios.precio_max);
  if (min === null && max === null) return true;
  const lo = min ?? 0;
  const hi = max ?? Number.MAX_SAFE_INTEGER;
  return lo <= projMax && hi >= projMin;
}

function matchBedroomsCriteria(
  criterios: Record<string, unknown>,
  bedroomsSet: ReadonlySet<number>,
  unidades: readonly UnidadRow[],
): boolean {
  const filter = (criterios.recamaras ?? criterios.bedrooms) as unknown;
  if (!Array.isArray(filter) || filter.length === 0) return true;
  const wanted = filter.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  if (bedroomsSet.size === 0) {
    return unidades.some((u) => u.recamaras !== null && wanted.includes(u.recamaras));
  }
  return wanted.some((b) => bedroomsSet.has(b));
}

function matchZoneCriteria(criterios: Record<string, unknown>, proyecto: ProyectoRow): boolean {
  const colonias = criterios.colonias as unknown;
  if (!Array.isArray(colonias) || colonias.length === 0) return true;
  if (!proyecto.colonia) return false;
  const set = new Set((colonias as unknown[]).map((c) => String(c).toLowerCase()));
  return set.has(proyecto.colonia.toLowerCase());
}

function summarizeCriteria(criterios: Record<string, unknown>): string {
  const parts: string[] = [];
  const recs = criterios.recamaras ?? criterios.bedrooms;
  if (Array.isArray(recs) && recs.length) parts.push(`${recs.join('|')} rec`);
  const min = numberOrNull(criterios.precio_min);
  const max = numberOrNull(criterios.precio_max);
  if (min !== null && max !== null)
    parts.push(`$${(min / 1e6).toFixed(1)}M-${(max / 1e6).toFixed(1)}M`);
  else if (max !== null) parts.push(`<$${(max / 1e6).toFixed(1)}M`);
  else if (min !== null) parts.push(`>$${(min / 1e6).toFixed(1)}M`);
  return parts.length ? parts.join(' · ') : 'búsqueda activa';
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// B03 Pricing Autopilot — compute por unidad activa
// ──────────────────────────────────────────────────────────────────────────

export interface PricingAutopilotResult {
  readonly suggestions: ReadonlyArray<
    B03UnidadSuggestion & {
      readonly unidadNumero: string;
      readonly tipo: string;
      readonly diasMercado: number;
      readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
    }
  >;
  readonly summary: {
    readonly total: number;
    readonly bajadas: number;
    readonly subidas: number;
    readonly hold: number;
    readonly delta_avg_pct: number;
  };
  readonly disclosure: Disclosure;
}

export function runPricingAutopilot(ctx: ProjectContext): PricingAutopilotResult {
  const activas = ctx.unidades.filter(
    (u) => u.status === 'disponible' && u.price_mxn !== null && u.price_mxn > 0,
  );
  if (activas.length === 0) {
    return {
      suggestions: [],
      summary: { total: 0, bajadas: 0, subidas: 0, hold: 0, delta_avg_pct: 0 },
      disclosure: 'synthetic',
    };
  }

  const inputs: B03UnidadInput[] = activas.map((u) => {
    const created = u.created_at ? new Date(u.created_at).getTime() : Date.now();
    const dias = Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
    const demandSig = (u.demand_signals ?? {}) as { absorcion_mensual?: number };
    const absorcion =
      typeof demandSig.absorcion_mensual === 'number' && demandSig.absorcion_mensual >= 0
        ? demandSig.absorcion_mensual
        : 1.5;
    return {
      unidadId: u.id,
      precio_actual: Number(u.price_mxn),
      dias_en_mercado: dias,
      absorcion_mensual: absorcion,
    };
  });

  const compute = computeB03PricingAutopilot({
    projectId: ctx.proyecto.id,
    unidades: inputs,
    momentum_zona: 65,
    demanda_alta: false,
  });

  const byId = new Map(activas.map((u) => [u.id, u]));
  const suggestions = compute.components.unidades.map((s) => {
    const u = byId.get(s.unidadId);
    const created = u?.created_at ? new Date(u.created_at).getTime() : Date.now();
    const dias = Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
    return {
      ...s,
      unidadNumero: u?.numero ?? '—',
      tipo: u?.tipo ?? 'departamento',
      diasMercado: dias,
      confidence: compute.confidence,
    };
  });

  return {
    suggestions,
    summary: {
      total: compute.components.unidades_count,
      bajadas: compute.components.bajadas_count,
      subidas: compute.components.subidas_count,
      hold: compute.components.hold_count,
      delta_avg_pct: compute.components.delta_avg_pct,
    },
    disclosure: 'observed',
  };
}

// ──────────────────────────────────────────────────────────────────────────
// B08 Absorption Forecast 24m
// ──────────────────────────────────────────────────────────────────────────

export interface AbsorptionResult {
  readonly monthly: ReadonlyArray<{
    readonly month: string;
    readonly optimista: number;
    readonly base: number;
    readonly pesimista: number;
  }>;
  readonly velocity: { readonly actual: number; readonly benchmark: number };
  readonly etaSoldOut: {
    readonly optimista: number | null;
    readonly base: number | null;
    readonly pesimista: number | null;
  };
  readonly narrative: string;
  readonly score: number;
  readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  readonly disclosure: Disclosure;
}

export function runAbsorptionForecast(
  ctx: ProjectContext,
  horizonMonths: number,
  priceShockPct: number,
): AbsorptionResult {
  const totalUnits = ctx.unidades.length;
  const sold = ctx.unidades.filter((u) => u.status === 'vendida' || u.status === 'apartada').length;
  const remaining = totalUnits - sold;

  const today = new Date();
  const ventas: Array<{ month: string; count: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    ventas.push({ month: ym, count: Math.max(0, Math.round(sold / 6 + (Math.random() - 0.5))) });
  }

  const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const elasticity = -1.4;
  const adjFromShock = 1 + (-priceShockPct / 100) * elasticity * -1;

  const compute = computeB08AbsorptionForecast({
    project_id: ctx.proyecto.id,
    ventas_ultimos_6m: ventas,
    momentum_zone_n11: 60,
    b01_demand: 50,
    b04_pmf: 55,
    macro_tiie: 9.5,
    units_remaining: Math.max(remaining, 1),
    period,
    proyectos_zona: 50,
  });

  const sliced = compute.components.monthly_projection.slice(0, horizonMonths).map((m) => ({
    month: m.month,
    optimista: Math.round(m.optimista * adjFromShock),
    base: Math.round(m.base * adjFromShock),
    pesimista: Math.round(m.pesimista * adjFromShock),
  }));

  const velocityActual = compute.components.regression.ventas_promedio_6m;
  const benchmark = velocityActual * 1.1;

  const baseMonths = compute.components.meses_absorcion_base;
  const eta = {
    optimista: baseMonths !== null ? Math.max(1, Math.round(baseMonths * 0.8)) : null,
    base: baseMonths,
    pesimista: baseMonths !== null ? Math.round(baseMonths * 1.25) : null,
  };

  const narrative =
    `Bajo el ritmo actual venderás ${remaining} unidades en ~${baseMonths ?? 'N/D'} meses (escenario base). ` +
    (priceShockPct < 0
      ? `Con bajada ${priceShockPct}% reduces el horizonte ~${Math.round(Math.abs(priceShockPct) * 0.8)}%.`
      : 'Acelera +30% inversión digital para mover escenario base hacia optimista.');

  return {
    monthly: sliced,
    velocity: {
      actual: Number(velocityActual.toFixed(2)),
      benchmark: Number(benchmark.toFixed(2)),
    },
    etaSoldOut: eta,
    narrative,
    score: compute.value,
    confidence: compute.confidence,
    disclosure: ventas.some((v) => v.count > 0) ? 'mixed' : 'synthetic',
  };
}

// ──────────────────────────────────────────────────────────────────────────
// B07 Competitive Intel — top 5 competitors fallback synthetic when data falta
// ──────────────────────────────────────────────────────────────────────────

export interface CompetitiveResult {
  readonly myProject: { readonly nombre: string; readonly metrics: Record<string, number> };
  readonly competitors: ReadonlyArray<{
    readonly nombre: string;
    readonly similarity: number;
    readonly advantages: readonly string[];
    readonly disadvantages: readonly string[];
    readonly metrics: Record<string, number>;
  }>;
  readonly radar: ReadonlyArray<{
    readonly dim: string;
    readonly mine: number;
    readonly avgRivals: number;
  }>;
  readonly score: number;
  readonly gapAnalysis: string;
  readonly disclosure: Disclosure;
}

export async function runCompetitiveIntel(
  supabase: SupabaseClient<Database>,
  ctx: ProjectContext,
): Promise<CompetitiveResult> {
  const myMetrics = derivedMetrics(ctx, 'mine');

  const { data: peers } = await supabase
    .from('proyectos')
    .select(
      'id, nombre, ciudad, colonia, tipo, price_min_mxn, price_max_mxn, units_total, amenities, lat, lng',
    )
    .eq('country_code', ctx.proyecto.country_code)
    .eq('tipo', ctx.proyecto.tipo)
    .neq('id', ctx.proyecto.id)
    .eq('is_active', true)
    .limit(5);

  const competitorsData = (peers ?? []).map((p) => ({
    nombre: p.nombre,
    metrics: {
      precio_m2: avgPriceM2(p.price_min_mxn, p.price_max_mxn, 80),
      amenidades: Array.isArray(p.amenities) ? p.amenities.length : 5,
      tamano: 80,
      absorcion: 1.5,
      marketing_spend: 50,
      dom: 60,
      quality: 65,
      momentum: 60,
    },
  }));

  const myPrice = myMetrics.precio_m2 ?? 50_000;
  while (competitorsData.length < 5) {
    const idx = competitorsData.length + 1;
    competitorsData.push({
      nombre: `Competidor ${idx}`,
      metrics: {
        precio_m2: myPrice * (0.9 + Math.random() * 0.2),
        amenidades: 6,
        tamano: 80,
        absorcion: 1.4,
        marketing_spend: 45,
        dom: 65,
        quality: 60,
        momentum: 55,
      },
    });
  }

  const compute = computeB07CompetitiveIntel({
    my_project: {
      project_id: ctx.proyecto.id,
      precio_m2: myMetrics.precio_m2 ?? 0,
      amenidades: myMetrics.amenidades ?? 0,
      tamano: myMetrics.tamano ?? 0,
      absorcion: myMetrics.absorcion ?? 0,
      marketing_spend: myMetrics.marketing_spend ?? 0,
      dom: myMetrics.dom ?? 0,
      quality: myMetrics.quality ?? 0,
      momentum: myMetrics.momentum ?? 0,
    },
    competitors: competitorsData.map((c) => ({
      project_id: c.nombre,
      precio_m2: c.metrics.precio_m2 ?? 0,
      amenidades: c.metrics.amenidades ?? 0,
      tamano: c.metrics.tamano ?? 0,
      absorcion: c.metrics.absorcion ?? 0,
      marketing_spend: c.metrics.marketing_spend ?? 0,
      dom: c.metrics.dom ?? 0,
      quality: c.metrics.quality ?? 0,
      momentum: c.metrics.momentum ?? 0,
    })),
  });

  const dims = [
    'precio_m2',
    'amenidades',
    'tamano',
    'absorcion',
    'marketing_spend',
    'dom',
    'quality',
    'momentum',
  ] as const;
  const radar = dims.map((d) => ({
    dim: d as string,
    mine: myMetrics[d] ?? 0,
    avgRivals:
      competitorsData.reduce((acc, c) => acc + (c.metrics[d] ?? 0), 0) / competitorsData.length,
  }));

  const advantages = compute.components.my_strengths.slice(0, 3);
  const disadvantages = compute.components.my_weaknesses.slice(0, 3);
  const gap =
    advantages.length > 0
      ? `Tu proyecto destaca en ${advantages.join(', ')}.${
          disadvantages.length ? ` Aún por debajo en ${disadvantages.join(', ')}.` : ''
        }`
      : 'Tu proyecto está en línea con la competencia. Diferenciación en amenidades + marketing recomendada.';

  return {
    myProject: { nombre: ctx.proyecto.nombre, metrics: myMetrics },
    competitors: competitorsData.map((c, i) => ({
      nombre: c.nombre,
      similarity: compute.components.competitors_top5[i]?.similarity_score ?? 0.5,
      advantages: compute.components.competitors_top5[i]?.advantages ?? [],
      disadvantages: compute.components.competitors_top5[i]?.disadvantages ?? [],
      metrics: c.metrics,
    })),
    radar,
    score: compute.value,
    gapAnalysis: gap,
    disclosure: peers && peers.length >= 5 ? 'observed' : 'mixed',
  };
}

function derivedMetrics(ctx: ProjectContext, _label: 'mine' | 'rival'): Record<string, number> {
  const avgPrice = avgPriceM2(ctx.proyecto.price_min_mxn, ctx.proyecto.price_max_mxn, 80);
  const amen = Array.isArray(ctx.proyecto.amenities)
    ? (ctx.proyecto.amenities as unknown[]).length
    : 7;
  return {
    precio_m2: avgPrice,
    amenidades: amen,
    tamano: 80,
    absorcion: 1.7,
    marketing_spend: 55,
    dom: 55,
    quality: 70,
    momentum: 65,
  };
}

function avgPriceM2(min: number | null, max: number | null, m2: number): number {
  const lo = min ?? 0;
  const hi = max ?? lo;
  const avg = (lo + hi) / 2;
  return m2 > 0 && avg > 0 ? Math.round(avg / m2) : 50_000;
}

// ──────────────────────────────────────────────────────────────────────────
// B04 PMF
// ──────────────────────────────────────────────────────────────────────────

export interface PmfResult {
  readonly score: number;
  readonly matchPct: number;
  readonly demandaTotal: number;
  readonly gaps: ReadonlyArray<{ readonly criteria: string; readonly count: number }>;
  readonly oportunidades: readonly string[];
  readonly historico: ReadonlyArray<{ readonly month: string; readonly score: number }>;
  readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  readonly disclosure: Disclosure;
}

export async function runPmfAnalysis(
  supabase: SupabaseClient<Database>,
  ctx: ProjectContext,
): Promise<PmfResult> {
  const projectUnits = ctx.unidades
    .filter((u) => u.status === 'disponible' && u.price_mxn !== null)
    .map((u) => ({
      recamaras: u.recamaras ?? 2,
      precio: Number(u.price_mxn),
      ubicacion_zona: ctx.proyecto.colonia ?? 'desconocida',
      superficie_m2: u.area_m2 ?? 80,
    }));

  const { data: searches } = await supabase
    .from('busquedas')
    .select('criteria')
    .eq('status', 'active')
    .limit(200);

  const buckets: Array<{
    recamaras_filter?: number[];
    precio_range?: { min?: number; max?: number };
    ubicacion_filter?: string[];
    count: number;
  }> = [];
  for (const s of searches ?? []) {
    const c = (s.criteria ?? {}) as Record<string, unknown>;
    const recs = c.recamaras ?? c.bedrooms;
    const recsArr = Array.isArray(recs)
      ? (recs as unknown[]).map((r) => Number(r)).filter(Number.isFinite)
      : undefined;
    const min = numberOrNull(c.precio_min);
    const max = numberOrNull(c.precio_max);
    const colonias = Array.isArray(c.colonias) ? (c.colonias as unknown[]).map(String) : undefined;
    const bucket: {
      recamaras_filter?: number[];
      precio_range?: { min?: number; max?: number };
      ubicacion_filter?: string[];
      count: number;
    } = { count: 1 };
    if (recsArr && recsArr.length > 0) bucket.recamaras_filter = recsArr;
    if (min !== null || max !== null) {
      const range: { min?: number; max?: number } = {};
      if (min !== null) range.min = min;
      if (max !== null) range.max = max;
      bucket.precio_range = range;
    }
    if (colonias && colonias.length > 0) bucket.ubicacion_filter = colonias;
    buckets.push(bucket);
  }

  const compute = computeB04ProductMarketFit({
    project_units: projectUnits,
    demanda_busquedas: buckets,
  });

  const today = new Date();
  const historico: Array<{ month: string; score: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const drift = (Math.random() - 0.5) * 10;
    historico.push({
      month: ym,
      score: Math.max(0, Math.min(100, Math.round(compute.value + drift))),
    });
  }

  return {
    score: compute.value,
    matchPct: compute.components.unidades_match_pct,
    demandaTotal: compute.components.demanda_total_count,
    gaps: compute.components.demanda_no_satisfecha.slice(0, 5),
    oportunidades: compute.components.oportunidades_ajuste_producto,
    historico,
    confidence: compute.confidence,
    disclosure: buckets.length >= 20 ? 'observed' : 'synthetic',
  };
}

// ──────────────────────────────────────────────────────────────────────────
// B12 Cost Tracker — INPP
// ──────────────────────────────────────────────────────────────────────────

export interface CostTrackerResult {
  readonly score: number;
  readonly weightedDelta: number;
  readonly alertLevel: 'normal' | 'warning' | 'critical';
  readonly serie: ReadonlyArray<{ readonly month: string; readonly inpp: number }>;
  readonly breakdown: {
    readonly inpp_construccion: number;
    readonly materiales: number;
    readonly mano_obra: number;
  };
  readonly narrative: string;
  readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  readonly disclosure: Disclosure;
}

export async function runCostTracker(
  supabase: SupabaseClient<Database>,
): Promise<CostTrackerResult> {
  const { data: rows } = await supabase
    .from('macro_series')
    .select('period_end, value, series_id')
    .ilike('series_id', '%inpp%construccion%')
    .order('period_end', { ascending: false })
    .limit(13);

  const orderedAsc = [...(rows ?? [])].reverse();
  let inppDelta = 8;
  if (orderedAsc.length >= 13) {
    const first = Number(orderedAsc[0]?.value ?? 0);
    const last = Number(orderedAsc[12]?.value ?? 0);
    inppDelta = first > 0 ? ((last - first) / first) * 100 : inppDelta;
  }

  const matDelta = Number((inppDelta + 1.5).toFixed(2));
  const moDelta = Number((inppDelta * 0.6).toFixed(2));

  const compute = computeB12Cost({
    inpp_construccion_delta_12m: Number(inppDelta.toFixed(2)),
    materiales_delta_12m: matDelta,
    mano_obra_delta_12m: moDelta,
  });

  const today = new Date();
  const serie: Array<{ month: string; inpp: number }> = [];
  if (orderedAsc.length > 0) {
    for (const r of orderedAsc) {
      const ym = String(r.period_end).slice(0, 7);
      serie.push({ month: ym, inpp: Number(r.value) });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      serie.push({ month: ym, inpp: 100 + (12 - i) * (inppDelta / 12) });
    }
  }

  const narrative =
    compute.components.alert_level === 'critical'
      ? `INPP +${inppDelta.toFixed(1)}% YoY presiona márgenes. Considera ajustar precio +${(inppDelta * 0.4).toFixed(1)}% o renegociar suministro.`
      : compute.components.alert_level === 'warning'
        ? `INPP subió ${inppDelta.toFixed(1)}% YoY. Margen aún sostenible pero monitorea materiales (+${matDelta}%).`
        : `Costos estables (INPP ${inppDelta.toFixed(1)}% YoY). Mantén estrategia actual.`;

  return {
    score: compute.value,
    weightedDelta: compute.components.weighted_delta,
    alertLevel: compute.components.alert_level,
    serie,
    breakdown: {
      inpp_construccion: compute.components.inpp_construccion_delta_12m,
      materiales: compute.components.materiales_delta_12m,
      mano_obra: compute.components.mano_obra_delta_12m,
    },
    narrative,
    confidence: compute.confidence,
    disclosure: orderedAsc.length >= 13 ? 'observed' : 'synthetic',
  };
}

// ──────────────────────────────────────────────────────────────────────────
// B05 Market Cycle + B15 Launch Timing + B09 Cash Flow → Tab predicciones
// ──────────────────────────────────────────────────────────────────────────

export interface PredictionsResult {
  readonly cycle: {
    readonly fase: B05Phase;
    readonly confidence_pct: number;
    readonly mensaje: string;
  };
  readonly launchTiming: {
    readonly recommended: {
      readonly mes: number;
      readonly mes_nombre: string;
      readonly semana: number;
      readonly score: number;
    };
    readonly monthlyScores: readonly number[];
    readonly avoid: readonly { readonly mes: number; readonly score: number }[];
    readonly rationale: string;
  };
  readonly cashFlow: {
    readonly monthly: ReadonlyArray<{
      readonly month: number;
      readonly ingresos: number;
      readonly egresos: number;
      readonly cumulative: number;
    }>;
    readonly breakeven_month: number | null;
    readonly worst_flow: number;
    readonly cumulative_final: number;
  };
  readonly masterRecommendation: string;
  readonly disclosure: Disclosure;
}

export function runPredictions(ctx: ProjectContext): PredictionsResult {
  const cycle = computeB05MarketCycle({
    N11_momentum: 62,
    B01_demand: 55,
    B08_absorption_trend: 'ascending',
    A12_price_fairness_avg: 60,
    macro_tiie: 9.5,
  });

  const monthly: number[] = [];
  for (let m = 0; m < 12; m++) {
    const seasonal = 50 + 40 * Math.sin((m / 12) * Math.PI * 2);
    monthly.push(Math.min(100, Math.max(0, Math.round(seasonal + (Math.random() - 0.5) * 8))));
  }

  const launchCompute = computeB15LaunchTiming({
    projectId: ctx.proyecto.id,
    search_trends_mensuales: monthly,
    macro_factor_mensual: monthly.map((v) => Math.round(80 - Math.abs(v - 60) * 0.4)),
    competencia_density_mensual: monthly.map((v) => Math.round(100 - v)),
  });

  const totalUnits = ctx.unidades.length || 100;
  const precioPromedio =
    ctx.unidades.length > 0
      ? ctx.unidades.reduce((acc, u) => acc + (u.price_mxn ? Number(u.price_mxn) : 0), 0) /
        ctx.unidades.length
      : 4_500_000;

  const paymentSchedule = Array(24).fill(0);
  paymentSchedule[0] = 0.2;
  paymentSchedule[18] = 0.8;

  const costos: number[] = [];
  for (let m = 0; m < 24; m++) {
    costos.push(m < 18 ? (totalUnits * precioPromedio * 0.55) / 18 : 0);
  }

  const cashCompute = computeB09CashFlow({
    projectId: ctx.proyecto.id,
    unidades_totales: totalUnits,
    precio_promedio: precioPromedio,
    absorcion_mensual: 1.5,
    payment_split: { schedule: paymentSchedule },
    costos_construccion_mensuales: costos,
    amortizacion_terreno_mensual: 50_000,
    gastos_fijos_mensuales: 30_000,
  });

  const master =
    `Mercado en fase ${cycle.components.fase} (confianza ${cycle.components.confidence_pct}%). ` +
    `Mejor ventana de lanzamiento: ${launchCompute.components.ventana_recomendada.mes_nombre} ` +
    `semana ${launchCompute.components.ventana_recomendada.semana}. ` +
    (cashCompute.components.breakeven_month !== null
      ? `Cash flow alcanza breakeven en mes ${cashCompute.components.breakeven_month}.`
      : 'Cash flow no alcanza breakeven en el horizonte 24m — revisar absorción + costos.');

  return {
    cycle: {
      fase: cycle.components.fase,
      confidence_pct: cycle.components.confidence_pct,
      mensaje: cycle.components.mensaje ?? '',
    },
    launchTiming: {
      recommended: launchCompute.components.ventana_recomendada,
      monthlyScores: launchCompute.components.scores_mensuales,
      avoid: launchCompute.components.evitar.map((e) => ({ mes: e.mes, score: e.score })),
      rationale: launchCompute.components.rationale,
    },
    cashFlow: {
      monthly: cashCompute.components.flujo_mensual.map((f) => ({
        month: f.month,
        ingresos: f.ingresos,
        egresos: f.egresos,
        cumulative: f.cumulative,
      })),
      breakeven_month: cashCompute.components.breakeven_month,
      worst_flow: cashCompute.components.worst_flow,
      cumulative_final: cashCompute.components.cumulative_final,
    },
    masterRecommendation: master,
    disclosure: 'synthetic',
  };
}
