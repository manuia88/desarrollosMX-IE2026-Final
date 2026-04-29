import { computeB09CashFlow } from '@/shared/lib/intelligence-engine/calculators/n2/b09-cash-flow';
import type { UpgDisclosure } from './types';

export interface FeasibilityProgram {
  readonly tipo: 'departamentos' | 'casas' | 'mixto' | 'comercial';
  readonly unitsTotal: number;
  readonly precioPromedioMxn: number;
  readonly costoTotalEstimateMxn: number;
  readonly constructionMonths: number;
  readonly absorcionMensual: number;
  readonly discountRateAnnual: number;
  readonly amortizacionTerrenoMensual: number;
  readonly gastosFijosMensuales: number;
}

export interface FeasibilityScenarioMetric {
  readonly irr5y: number;
  readonly irr10y: number;
  readonly npvMxn: number;
  readonly breakEvenMonth: number | null;
}

export interface FeasibilityEngineResult {
  readonly base: FeasibilityScenarioMetric;
  readonly cashFlow5y: ReadonlyArray<{
    readonly month: number;
    readonly ingresos: number;
    readonly egresos: number;
    readonly cumulative: number;
  }>;
  readonly sensitivity: {
    readonly priceUp10: FeasibilityScenarioMetric;
    readonly priceDown10: FeasibilityScenarioMetric;
    readonly priceUp20: FeasibilityScenarioMetric;
    readonly priceDown20: FeasibilityScenarioMetric;
    readonly costUp10: FeasibilityScenarioMetric;
  };
  readonly pmfScore: number;
  readonly recommendation: 'go' | 'go_with_caveats' | 'no_go';
  readonly disclosure: UpgDisclosure;
}

function buildPaymentSplit(months: number): readonly number[] {
  const horizon = Math.max(months, 24);
  const schedule = new Array<number>(horizon).fill(0);
  schedule[0] = 0.2;
  const finalIdx = Math.min(horizon - 1, Math.floor(months * 0.75));
  schedule[finalIdx] = 0.8;
  return schedule;
}

function npv(cashFlow: readonly number[], rateMonthly: number): number {
  let acc = 0;
  for (let i = 0; i < cashFlow.length; i++) {
    const cf = cashFlow[i] ?? 0;
    acc += cf / (1 + rateMonthly) ** i;
  }
  return acc;
}

function irrBisection(cashFlow: readonly number[]): number {
  let lo = -0.99;
  let hi = 1;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const v = npv(cashFlow, mid);
    if (Math.abs(v) < 1) return mid;
    const vLo = npv(cashFlow, lo);
    if (vLo * v < 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function runScenario(
  program: FeasibilityProgram,
  priceMultiplier: number,
  costMultiplier: number,
): FeasibilityScenarioMetric {
  const horizon = 60;
  const adjustedPrice = program.precioPromedioMxn * priceMultiplier;
  const adjustedCost = program.costoTotalEstimateMxn * costMultiplier;
  const costMensual = adjustedCost / Math.max(program.constructionMonths, 1);

  const costos = new Array<number>(horizon).fill(0);
  for (let m = 0; m < Math.min(program.constructionMonths, horizon); m++) {
    costos[m] = costMensual;
  }

  const compute = computeB09CashFlow({
    projectId: 'feasibility-engine',
    unidades_totales: program.unitsTotal,
    precio_promedio: adjustedPrice,
    absorcion_mensual: program.absorcionMensual,
    payment_split: { schedule: buildPaymentSplit(program.constructionMonths) },
    costos_construccion_mensuales: costos,
    amortizacion_terreno_mensual: program.amortizacionTerrenoMensual,
    gastos_fijos_mensuales: program.gastosFijosMensuales,
  });

  const flows = compute.components.flujo_mensual.map((f) => f.flujo_neto);
  const ratesMonthly = (1 + program.discountRateAnnual / 100) ** (1 / 12) - 1;
  const npvMxn = npv(flows, ratesMonthly);

  const irrMonthly5 = irrBisection(flows.slice(0, Math.min(60, flows.length)));
  const irrMonthly10 = flows.length >= 120 ? irrBisection(flows.slice(0, 120)) : irrMonthly5;

  return {
    irr5y: Number((((1 + irrMonthly5) ** 12 - 1) * 100).toFixed(2)),
    irr10y: Number((((1 + irrMonthly10) ** 12 - 1) * 100).toFixed(2)),
    npvMxn: Number(npvMxn.toFixed(0)),
    breakEvenMonth: compute.components.breakeven_month,
  };
}

export function runFeasibilityEngine(program: FeasibilityProgram): FeasibilityEngineResult {
  const base = runScenario(program, 1, 1);
  const sensitivity = {
    priceUp10: runScenario(program, 1.1, 1),
    priceDown10: runScenario(program, 0.9, 1),
    priceUp20: runScenario(program, 1.2, 1),
    priceDown20: runScenario(program, 0.8, 1),
    costUp10: runScenario(program, 1, 1.1),
  };

  const horizon = 60;
  const fullCompute = computeB09CashFlow({
    projectId: 'feasibility-engine',
    unidades_totales: program.unitsTotal,
    precio_promedio: program.precioPromedioMxn,
    absorcion_mensual: program.absorcionMensual,
    payment_split: { schedule: buildPaymentSplit(program.constructionMonths) },
    costos_construccion_mensuales: new Array<number>(horizon)
      .fill(0)
      .map((_, m) =>
        m < program.constructionMonths
          ? program.costoTotalEstimateMxn / Math.max(program.constructionMonths, 1)
          : 0,
      ),
    amortizacion_terreno_mensual: program.amortizacionTerrenoMensual,
    gastos_fijos_mensuales: program.gastosFijosMensuales,
  });

  const cashFlow5y = fullCompute.components.flujo_mensual.slice(0, 60).map((f) => ({
    month: f.month,
    ingresos: f.ingresos,
    egresos: f.egresos,
    cumulative: f.cumulative,
  }));

  const pmfScore = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        50 +
          base.irr5y * 1.5 +
          (base.npvMxn > 0 ? 10 : -20) -
          (sensitivity.costUp10.npvMxn < 0 ? 15 : 0),
      ),
    ),
  );

  const recommendation: FeasibilityEngineResult['recommendation'] =
    base.irr5y >= 18 && base.npvMxn > 0 && sensitivity.priceDown10.npvMxn > 0
      ? 'go'
      : base.irr5y >= 12 && base.npvMxn > 0
        ? 'go_with_caveats'
        : 'no_go';

  return {
    base,
    cashFlow5y,
    sensitivity,
    pmfScore,
    recommendation,
    disclosure: 'mixed',
  };
}
