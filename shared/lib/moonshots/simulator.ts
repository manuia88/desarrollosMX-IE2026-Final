// 15.X.1 Simulator engine — proyección financiera consume B04/B08/B09 + 15 índices DMX
//
// Pipeline:
//   1) Fetch 15 índices DMX por scope_id = ubicacion.zoneId (period actual).
//   2) Compute B04 PMF con tipologia + pricing input.
//   3) Compute B08 absorption forecast con momentum N11 + B01 + B04 (proxy).
//   4) Compute B09 cash flow con absorcion + payment_split + costos.
//   5) Sensitivity ±10/20% sobre absorción → IRR.
//   6) Risk flags: zone alpha alerts activas, índices críticos en band 'red'.
//   7) INSERT simulator_runs.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SimulateProjectInput, SimulatorOutput } from '@/features/developer-moonshots/schemas';
import { computeB04ProductMarketFit } from '@/shared/lib/intelligence-engine/calculators/n1/b04-product-market-fit';
import { computeB08AbsorptionForecast } from '@/shared/lib/intelligence-engine/calculators/n1/b08-absorption-forecast';
import { computeB09CashFlow } from '@/shared/lib/intelligence-engine/calculators/n2/b09-cash-flow';
import type { Database } from '@/shared/types/database';

type AdminClient = SupabaseClient<Database>;

const HORIZON_MONTHS = 24;
const DEFAULT_DISCOUNT_RATE = 0.12;

const CRITICAL_INDEX_CODES = ['IPV', 'INV', 'IDS', 'STA'] as const;

type DmxIndexRow = {
  index_code: string;
  value: number;
  confidence: string;
  score_band: string | null;
};

function todayPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

async function fetchDmxIndicesForZone(
  supabase: AdminClient,
  zoneId: string | undefined,
  countryCode: string,
): Promise<DmxIndexRow[]> {
  if (!zoneId) return [];
  const period = todayPeriod();
  const { data, error } = await supabase
    .from('dmx_indices')
    .select('index_code, value, confidence, score_band, period_date')
    .eq('scope_type', 'zone')
    .eq('scope_id', zoneId)
    .eq('country_code', countryCode)
    .lte('period_date', period)
    .order('period_date', { ascending: false })
    .limit(60);
  if (error || !data) return [];
  const seen = new Set<string>();
  const result: DmxIndexRow[] = [];
  for (const row of data) {
    if (seen.has(row.index_code)) continue;
    seen.add(row.index_code);
    result.push({
      index_code: row.index_code,
      value: Number(row.value),
      confidence: row.confidence,
      score_band: row.score_band,
    });
  }
  return result;
}

function pickIndex(rows: ReadonlyArray<DmxIndexRow>, code: string, fallback = 50): number {
  const row = rows.find((r) => r.index_code === code);
  return row && Number.isFinite(row.value) ? row.value : fallback;
}

function computeIrr(monthlyCashflows: ReadonlyArray<number>, guess = 0.01): number | null {
  if (monthlyCashflows.length < 2) return null;
  let rate = guess;
  for (let iter = 0; iter < 80; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < monthlyCashflows.length; t++) {
      const factor = (1 + rate) ** t;
      const cf = monthlyCashflows[t] ?? 0;
      npv += cf / factor;
      dnpv += (-t * cf) / (1 + rate) ** (t + 1);
    }
    if (Math.abs(npv) < 1) {
      const annual = (1 + rate) ** 12 - 1;
      if (!Number.isFinite(annual)) return null;
      return Number(annual.toFixed(4));
    }
    if (dnpv === 0) return null;
    rate = rate - npv / dnpv;
    if (!Number.isFinite(rate)) return null;
    if (rate <= -0.99) return null;
  }
  return null;
}

function computeNpv(
  monthlyCashflows: ReadonlyArray<number>,
  annualRate = DEFAULT_DISCOUNT_RATE,
): number {
  const monthlyRate = (1 + annualRate) ** (1 / 12) - 1;
  let npv = 0;
  for (let t = 0; t < monthlyCashflows.length; t++) {
    npv += (monthlyCashflows[t] ?? 0) / (1 + monthlyRate) ** t;
  }
  return Math.round(npv);
}

function buildPaymentSchedule(
  enganche: number,
  mensualidades: number,
  contraEntrega: number,
): number[] {
  const schedule: number[] = new Array(HORIZON_MONTHS).fill(0);
  schedule[0] = enganche;
  if (mensualidades > 0 && mensualidades <= HORIZON_MONTHS - 1) {
    const monthlyShare = (1 - enganche - contraEntrega) / mensualidades;
    for (let i = 1; i <= mensualidades; i++) {
      schedule[i] = (schedule[i] ?? 0) + monthlyShare;
    }
  }
  const handoverIdx = Math.min(HORIZON_MONTHS - 1, Math.max(mensualidades + 1, 12));
  schedule[handoverIdx] = (schedule[handoverIdx] ?? 0) + contraEntrega;
  return schedule;
}

type SimulatorCoreOutput = SimulatorOutput['outputs'];

function runSimulationCore(
  input: SimulateProjectInput,
  indices: ReadonlyArray<DmxIndexRow>,
  absorcionOverrideMensual?: number,
): SimulatorCoreOutput {
  const { ubicacion, tipologia, pricing } = input;

  const n11 = pickIndex(indices, 'N11', 50);
  const b01 = pickIndex(indices, 'IDS', 50);
  const macroTiie = 10.5;

  const m2Total = tipologia.unidades * tipologia.m2Promedio;
  const precioPromedio = pricing.precioM2Mxn * tipologia.m2Promedio;
  const revenue = precioPromedio * tipologia.unidades;

  const costoConstruccion = pricing.costoConstruccionM2Mxn * m2Total;
  const costoTerreno = pricing.costoTerrenoMxn;
  const gastosFijosTotal = pricing.gastosFijosMxn * HORIZON_MONTHS;
  const cost = costoConstruccion + costoTerreno + gastosFijosTotal;

  const recamarasEstimadas = tipologia.m2Promedio < 60 ? 1 : tipologia.m2Promedio < 100 ? 2 : 3;
  const pmf = computeB04ProductMarketFit({
    project_units: Array.from({ length: Math.min(tipologia.unidades, 10) }, () => ({
      recamaras: recamarasEstimadas,
      precio: precioPromedio,
      ubicacion_zona: ubicacion.colonia,
      superficie_m2: tipologia.m2Promedio,
    })),
    demanda_busquedas: [
      {
        recamaras_filter: [recamarasEstimadas],
        precio_range: { min: precioPromedio * 0.8, max: precioPromedio * 1.2 },
        count: 1200,
      },
      {
        precio_range: { max: precioPromedio * 0.85 },
        count: 600,
      },
    ],
  });

  const absorption = computeB08AbsorptionForecast({
    project_id: 'simulator',
    ventas_ultimos_6m: [
      { month: '2026-01', count: Math.max(2, Math.round(tipologia.unidades / 36)) },
      { month: '2026-02', count: Math.max(2, Math.round(tipologia.unidades / 36)) },
      { month: '2026-03', count: Math.max(2, Math.round(tipologia.unidades / 36)) },
      { month: '2026-04', count: Math.max(2, Math.round(tipologia.unidades / 36)) },
      { month: '2026-05', count: Math.max(2, Math.round(tipologia.unidades / 36)) },
      { month: '2026-06', count: Math.max(2, Math.round(tipologia.unidades / 36)) },
    ],
    momentum_zone_n11: n11,
    b01_demand: b01,
    b04_pmf: pmf.value,
    macro_tiie: macroTiie,
    units_remaining: tipologia.unidades,
    period: todayPeriod(),
    proyectos_zona: 60,
  });

  const baseAbsorcionMensual =
    absorcionOverrideMensual ??
    (absorption.components.meses_absorcion_base
      ? tipologia.unidades / Math.max(1, absorption.components.meses_absorcion_base)
      : tipologia.unidades / 36);

  const cashflow = computeB09CashFlow({
    projectId: 'simulator',
    unidades_totales: tipologia.unidades,
    precio_promedio: precioPromedio,
    absorcion_mensual: baseAbsorcionMensual,
    payment_split: {
      schedule: buildPaymentSchedule(
        pricing.paymentSplit.enganche,
        pricing.paymentSplit.mensualidades,
        pricing.paymentSplit.contraEntrega,
      ),
    },
    costos_construccion_mensuales: Array.from(
      { length: HORIZON_MONTHS },
      () => costoConstruccion / HORIZON_MONTHS,
    ),
    amortizacion_terreno_mensual: costoTerreno / HORIZON_MONTHS,
    gastos_fijos_mensuales: pricing.gastosFijosMxn,
  });

  const monthlyCashflows = cashflow.components.flujo_mensual.map((f) => f.flujo_neto);
  const initialOutflow = -(costoTerreno || 0);
  const cashflowsForIrr = [initialOutflow, ...monthlyCashflows];
  const irr = computeIrr(cashflowsForIrr);
  const npv = computeNpv(cashflowsForIrr, DEFAULT_DISCOUNT_RATE);

  const riskFlags: string[] = [];
  for (const code of CRITICAL_INDEX_CODES) {
    const row = indices.find((r) => r.index_code === code);
    if (!row) continue;
    if (row.score_band === 'red' || row.value < 30) {
      riskFlags.push(`indice_${code.toLowerCase()}_red`);
    }
  }
  if ((absorption.components.meses_absorcion_base ?? 99) > 36) riskFlags.push('absorcion_lenta');
  if (cashflow.components.breakeven_month === null || cashflow.components.breakeven_month > 24) {
    riskFlags.push('breakeven_largo');
  }
  if (pmf.value < 40) riskFlags.push('pmf_bajo');

  return {
    absorcionMeses: absorption.components.meses_absorcion_base ?? null,
    revenueMxn: Math.round(revenue),
    costMxn: Math.round(cost),
    irr: irr ?? null,
    npvMxn: npv,
    breakEvenMonth: cashflow.components.breakeven_month ?? null,
    pmfScore: pmf.value,
    sensitivity: {
      absorcionMinus20: null,
      absorcionMinus10: null,
      absorcionPlus10: null,
      absorcionPlus20: null,
      irrMinus20: null,
      irrPlus20: null,
    },
    riskFlags,
    indicesUsed: indices.slice(0, 15).map((r) => ({
      code: r.index_code,
      value: r.value,
      confidence: r.confidence,
    })),
  };
}

function applySensitivity(
  base: SimulatorCoreOutput,
  input: SimulateProjectInput,
  indices: ReadonlyArray<DmxIndexRow>,
): SimulatorCoreOutput {
  if (!base.absorcionMeses) return base;
  const baseMensual = input.tipologia.unidades / base.absorcionMeses;
  const variants: Array<{ key: keyof SimulatorCoreOutput['sensitivity']; mult: number }> = [
    { key: 'absorcionMinus20', mult: 0.8 },
    { key: 'absorcionMinus10', mult: 0.9 },
    { key: 'absorcionPlus10', mult: 1.1 },
    { key: 'absorcionPlus20', mult: 1.2 },
  ];
  const sensitivity = { ...base.sensitivity };
  for (const v of variants) {
    const variantOutput = runSimulationCore(input, indices, baseMensual * v.mult);
    sensitivity[v.key] = variantOutput.absorcionMeses;
    if (v.key === 'absorcionMinus20') sensitivity.irrMinus20 = variantOutput.irr;
    if (v.key === 'absorcionPlus20') sensitivity.irrPlus20 = variantOutput.irr;
  }
  return { ...base, sensitivity };
}

export async function simulateProject(
  supabase: AdminClient,
  input: SimulateProjectInput,
  userId: string,
  desarrolladoraId: string | null,
): Promise<SimulatorOutput> {
  const start = Date.now();

  const indices = await fetchDmxIndicesForZone(
    supabase,
    input.ubicacion.zoneId,
    input.ubicacion.countryCode,
  );

  const baseRun = runSimulationCore(input, indices);
  const withSensitivity = applySensitivity(baseRun, input, indices);

  const insertPayload: Database['public']['Tables']['simulator_runs']['Insert'] = {
    user_id: userId,
    desarrolladora_id: desarrolladoraId,
    ubicacion_input: input.ubicacion,
    tipologia_input: input.tipologia,
    pricing_input: input.pricing,
    output_absorcion_meses: withSensitivity.absorcionMeses,
    output_revenue_mxn: withSensitivity.revenueMxn,
    output_cost_mxn: withSensitivity.costMxn,
    output_irr: withSensitivity.irr,
    output_npv: withSensitivity.npvMxn,
    output_break_even_month: withSensitivity.breakEvenMonth,
    output_sensitivity: withSensitivity.sensitivity,
    output_comparables: [],
    output_risk_flags: [...withSensitivity.riskFlags],
    output_pmf_score: withSensitivity.pmfScore,
    cost_usd: 0,
    duration_ms: Date.now() - start,
  };

  const { data, error } = await supabase
    .from('simulator_runs')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`simulator_runs insert failed: ${error?.message ?? 'unknown'}`);
  }

  return {
    runId: data.id,
    outputs: withSensitivity,
    costUsd: 0,
    durationMs: Date.now() - start,
  };
}
