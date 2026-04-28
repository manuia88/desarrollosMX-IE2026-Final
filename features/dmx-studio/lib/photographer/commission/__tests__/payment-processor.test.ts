// F14.F.10 Sprint 9 BIBLIA — Tests payment-processor STUB ADR-018.

import { describe, expect, it } from 'vitest';
import {
  COMMISSION_AUTO_PAYMENT_ENABLED,
  calculateMonthlyPayment,
  isAutoPaymentEnabled,
} from '../payment-processor';

describe('photographer/commission/payment-processor (STUB ADR-018)', () => {
  it('calculateMonthlyPayment lanza NOT_IMPLEMENTED_H2_MANUAL_PROCESS', async () => {
    await expect(calculateMonthlyPayment('ph-1', { month: '2026-04' })).rejects.toThrow(
      'NOT_IMPLEMENTED_H2_MANUAL_PROCESS',
    );

    expect(COMMISSION_AUTO_PAYMENT_ENABLED).toBe(false);
    const check = isAutoPaymentEnabled();
    expect(check.enabled).toBe(false);
    expect(check.reason).toBe('STUB_ADR_018_H1_MANUAL_PROCESS');
  });
});
