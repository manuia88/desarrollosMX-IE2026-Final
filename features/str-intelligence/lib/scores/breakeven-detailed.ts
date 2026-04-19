// Breakeven detallado (FASE 07b / BLOQUE 7b.L).
//
// Extiende str-viability con:
//   - Financiamiento hipotecario (downpayment + loan amortization).
//   - Cash-on-cash return y1..y5 (returns sobre equity invertido).
//   - Stress test: escenarios -10% ocupación / -10% ADR / +200bps tasa.
//
// La "tasa hipotecaria" viene en producción de macro_series (Banxico SF43878
// — tasa hipotecaria promedio). En inputs se pasa como loan_rate_annual para
// permitir sensitivity analysis y pruebas deterministas.

export interface BreakevenFinancingInput {
  readonly downpayment_pct: number; // 0..1
  readonly loan_rate_annual: number; // 0..1 (decimal).
  readonly loan_term_years: number; // e.g. 20.
}

export interface BreakevenInput {
  readonly property_price_minor: number;
  readonly annual_gross_revenue_minor: number;
  readonly annual_operating_costs_minor: number;
  readonly financing: BreakevenFinancingInput;
  readonly sample_months: number;
}

export interface BreakevenScenario {
  readonly label: string;
  readonly breakeven_months: number;
  readonly cash_on_cash_y1: number;
  readonly annual_net_after_debt_minor: number;
}

export interface BreakevenResult {
  readonly base: BreakevenScenario;
  readonly stress: {
    readonly occupancy_minus_10: BreakevenScenario;
    readonly adr_minus_10: BreakevenScenario;
    readonly rate_plus_200bps: BreakevenScenario;
  };
  readonly financing_summary: {
    readonly downpayment_minor: number;
    readonly loan_principal_minor: number;
    readonly monthly_payment_minor: number;
    readonly annual_debt_service_minor: number;
  };
  readonly cash_on_cash_y1_y5: readonly number[];
  readonly confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
}

function monthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (annualRate === 0) return principal / (termYears * 12);
  const r = annualRate / 12;
  const n = termYears * 12;
  return (principal * (r * (1 + r) ** n)) / ((1 + r) ** n - 1);
}

function buildScenario(
  label: string,
  grossRevenue: number,
  operatingCosts: number,
  downpayment: number,
  annualDebtService: number,
): BreakevenScenario {
  const netOperatingIncome = grossRevenue - operatingCosts;
  const netAfterDebt = netOperatingIncome - annualDebtService;
  const cashOnCashY1 = downpayment > 0 ? netAfterDebt / downpayment : 0;
  const monthlyNet = netAfterDebt / 12;
  const breakeven = monthlyNet > 0 ? downpayment / monthlyNet : Number.POSITIVE_INFINITY;
  return {
    label,
    breakeven_months: Number.isFinite(breakeven) ? Math.round(breakeven * 100) / 100 : breakeven,
    cash_on_cash_y1: Math.round(cashOnCashY1 * 10000) / 10000,
    annual_net_after_debt_minor: Math.round(netAfterDebt),
  };
}

export function computeBreakevenDetailed(input: BreakevenInput): BreakevenResult {
  const {
    property_price_minor,
    annual_gross_revenue_minor,
    annual_operating_costs_minor,
    financing,
  } = input;

  const downpayment = Math.round(property_price_minor * financing.downpayment_pct);
  const loanPrincipal = property_price_minor - downpayment;
  const monthlyPay = monthlyPayment(
    loanPrincipal,
    financing.loan_rate_annual,
    financing.loan_term_years,
  );
  const annualDebtService = Math.round(monthlyPay * 12);

  const base = buildScenario(
    'base',
    annual_gross_revenue_minor,
    annual_operating_costs_minor,
    downpayment,
    annualDebtService,
  );

  const stressOcc = buildScenario(
    'occupancy_-10pct',
    Math.round(annual_gross_revenue_minor * 0.9),
    annual_operating_costs_minor,
    downpayment,
    annualDebtService,
  );

  const stressAdr = buildScenario(
    'adr_-10pct',
    Math.round(annual_gross_revenue_minor * 0.9),
    annual_operating_costs_minor,
    downpayment,
    annualDebtService,
  );

  const rateBump = 0.02; // +200bps
  const monthlyPayStressed = monthlyPayment(
    loanPrincipal,
    financing.loan_rate_annual + rateBump,
    financing.loan_term_years,
  );
  const annualDebtStressed = Math.round(monthlyPayStressed * 12);

  const stressRate = buildScenario(
    'rate_+200bps',
    annual_gross_revenue_minor,
    annual_operating_costs_minor,
    downpayment,
    annualDebtStressed,
  );

  // Cash-on-cash y1..y5: asumimos flat NOI (no inflation) para el MVP.
  // Futuros refinamientos: introducir growth rate + inflation adjustments.
  const baseNet = annual_gross_revenue_minor - annual_operating_costs_minor - annualDebtService;
  const cashOnCash: number[] = [];
  for (let year = 1; year <= 5; year += 1) {
    const cumulativeNet = baseNet * year;
    cashOnCash.push(
      downpayment > 0 ? Math.round((cumulativeNet / downpayment) * 10000) / 10000 : 0,
    );
  }

  const confidence: BreakevenResult['confidence'] = (() => {
    if (input.sample_months === 0) return 'insufficient_data';
    if (input.sample_months >= 12) return 'high';
    if (input.sample_months >= 6) return 'medium';
    return 'low';
  })();

  return {
    base,
    stress: {
      occupancy_minus_10: stressOcc,
      adr_minus_10: stressAdr,
      rate_plus_200bps: stressRate,
    },
    financing_summary: {
      downpayment_minor: downpayment,
      loan_principal_minor: loanPrincipal,
      monthly_payment_minor: Math.round(monthlyPay),
      annual_debt_service_minor: annualDebtService,
    },
    cash_on_cash_y1_y5: cashOnCash,
    confidence,
  };
}
