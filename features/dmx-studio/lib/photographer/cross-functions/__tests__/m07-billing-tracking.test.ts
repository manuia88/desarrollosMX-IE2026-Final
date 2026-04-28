// F14.F.10 Sprint 9 BIBLIA — Tests m07-billing-tracking STUB.

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/photographer-clients-cross-feature', () => ({
  recordVideoSaleAsOperacion: vi.fn(),
}));

import { recordVideoSaleAsOperacion } from '@/shared/lib/photographer-clients-cross-feature';
import {
  isOperacionesExportEnabled,
  OPERACIONES_EXPORT_ENABLED,
  recordVideoSaleM07,
} from '../m07-billing-tracking';

describe('photographer/cross-functions/m07-billing-tracking (STUB ADR-018)', () => {
  it('recordVideoSaleM07 retorna NOT_IMPLEMENTED_H2 fallback studio_photographer_clients_only', async () => {
    vi.mocked(recordVideoSaleAsOperacion).mockResolvedValue({
      ok: false,
      reason: 'NOT_IMPLEMENTED_H2',
    });

    const result = await recordVideoSaleM07({
      photographerId: 'ph-1',
      clientId: 'cli-1',
      videoId: 'v-1',
      amount: 50,
      currency: 'USD',
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('NOT_IMPLEMENTED_H2');
    expect(result.fallback).toBe('studio_photographer_clients_only');
    expect(OPERACIONES_EXPORT_ENABLED).toBe(false);
    const check = isOperacionesExportEnabled();
    expect(check.enabled).toBe(false);
    expect(check.reason).toBe('STUB_ADR_018_H1_OPERACIONES_CHECK_NOT_ALTERED');
  });
});
