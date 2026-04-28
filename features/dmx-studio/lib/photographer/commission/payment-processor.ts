// F14.F.10 Sprint 9 BIBLIA — Commission payment processor STUB.
// STUB ADR-018 — H1 manual founder process (ACH/Wire), automate H2.
//
// 4 señales STUB:
//   1. Comentario header explícito "STUB ADR-018 — H1 manual founder process (ACH/Wire), automate H2".
//   2. throw NOT_IMPLEMENTED_H2_MANUAL_PROCESS desde calculateMonthlyPayment auto-pay function.
//   3. _README.md adyacente documenta H1 manual process (founder ejecuta SQL queries, paga ACH/Wire,
//      registra payment manual fuera de este módulo).
//   4. UI condicional flag commission_auto_payment_enabled (false H1 hardcoded canon).
//
// Activar H2 cuando:
//   - Founder valida volumen mensual >$5K USD justifica integración Stripe Connect/Wise/etc.
//   - Schema studio_commission_payouts tabla creada (audit_rls_allowlist + RLS ON).
//   - Compliance review (1099-NEC US, RFC MX, etc.).

/** Hardcoded H1 canon: auto-payment disabled hasta H2 founder approval. */
export const COMMISSION_AUTO_PAYMENT_ENABLED = false as const;

export interface MonthlyPaymentRange {
  readonly month: string;
}

export interface MonthlyPaymentResult {
  readonly photographerId: string;
  readonly month: string;
  readonly totalCommissionUsd: number;
  readonly payoutId: string;
}

/**
 * STUB ADR-018 — H1 manual founder process (ACH/Wire), automate H2.
 * Auto-payment está deshabilitado en H1 (COMMISSION_AUTO_PAYMENT_ENABLED=false).
 * Founder ejecuta queries SQL manuales (ver _README.md) + procesa pago ACH/Wire externo.
 *
 * @throws Error con mensaje 'NOT_IMPLEMENTED_H2_MANUAL_PROCESS' siempre.
 */
export async function calculateMonthlyPayment(
  _photographerId: string,
  _range: MonthlyPaymentRange,
): Promise<MonthlyPaymentResult> {
  // STUB ADR-018 — H1 manual founder process (ACH/Wire), automate H2.
  // Activar cuando schema studio_commission_payouts exista + compliance approval.
  throw new Error(
    'NOT_IMPLEMENTED_H2_MANUAL_PROCESS: Commission auto-payment deshabilitado en H1. ' +
      'Founder procesa pagos ACH/Wire manualmente. Ver features/dmx-studio/lib/photographer/commission/_README.md',
  );
}

export interface AutoPaymentEnabledCheck {
  readonly enabled: false;
  readonly reason: 'STUB_ADR_018_H1_MANUAL_PROCESS';
}

/** Check sincrónico para UI conditional rendering — H1 always returns disabled. */
export function isAutoPaymentEnabled(): AutoPaymentEnabledCheck {
  return {
    enabled: COMMISSION_AUTO_PAYMENT_ENABLED,
    reason: 'STUB_ADR_018_H1_MANUAL_PROCESS',
  };
}
