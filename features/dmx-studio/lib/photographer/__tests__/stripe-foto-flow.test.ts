// F14.F.10 Sprint 9 BIBLIA — Stripe Foto plan checkout wrapper unit tests (Modo A).
// 3 tests: customer metadata propagation, success URL canon, foto plan price ID lock.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const checkoutMock = vi.fn();

vi.mock('@/features/dmx-studio/lib/stripe/checkout', () => ({
  createStudioCheckoutSession: checkoutMock,
}));

const updateMock = vi.fn().mockReturnThis();
const eqMock = vi.fn().mockResolvedValue({ data: null, error: null });
const fromMock = vi.fn(() => ({
  update: updateMock,
  eq: eqMock,
}));

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

beforeEach(() => {
  checkoutMock.mockReset();
  updateMock.mockClear();
  eqMock.mockClear();
  fromMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('createPhotoCheckoutSession', () => {
  it('locks priceId to STUDIO_STRIPE_PRICE_FOTO_USD_67 and forwards to createStudioCheckoutSession', async () => {
    const { STUDIO_STRIPE_PRICE_FOTO_USD_67 } = await import(
      '@/features/dmx-studio/lib/stripe-products'
    );
    checkoutMock.mockResolvedValueOnce({
      url: 'https://checkout.stripe.com/c/pay/cs_test_xyz',
      sessionId: 'cs_test_xyz',
      customerId: 'cus_test_abc',
      priceId: STUDIO_STRIPE_PRICE_FOTO_USD_67,
    });

    const { createPhotoCheckoutSession } = await import('../stripe-foto-flow');
    const result = await createPhotoCheckoutSession({
      userId: 'user-uuid-foto-1',
      userEmail: 'foto@example.com',
    });

    expect(checkoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid-foto-1',
        userEmail: 'foto@example.com',
        planKey: 'foto',
      }),
    );
    expect(result.priceId).toBe(STUDIO_STRIPE_PRICE_FOTO_USD_67);
    expect(result.url).toContain('checkout.stripe.com');
  });

  it('uses canon success path /studio-app/photographer/onboarding-success when not provided', async () => {
    const { STUDIO_STRIPE_PRICE_FOTO_USD_67 } = await import(
      '@/features/dmx-studio/lib/stripe-products'
    );
    checkoutMock.mockResolvedValueOnce({
      url: 'https://checkout.stripe.com/c/pay/cs_test_2',
      sessionId: 'cs_test_2',
      customerId: 'cus_test_2',
      priceId: STUDIO_STRIPE_PRICE_FOTO_USD_67,
    });

    const { createPhotoCheckoutSession, PHOTOGRAPHER_DEFAULT_SUCCESS_PATH } = await import(
      '../stripe-foto-flow'
    );
    await createPhotoCheckoutSession({
      userId: 'user-uuid-foto-2',
      userEmail: null,
    });

    const calledWith = checkoutMock.mock.calls[0]?.[0] as { successUrl?: string };
    expect(calledWith.successUrl).toBe(PHOTOGRAPHER_DEFAULT_SUCCESS_PATH);
    expect(PHOTOGRAPHER_DEFAULT_SUCCESS_PATH).toBe('/studio-app/photographer/onboarding-success');
  });

  it('throws price_mismatch when underlying wrapper returns wrong priceId (canon defense)', async () => {
    checkoutMock.mockResolvedValueOnce({
      url: 'https://checkout.stripe.com/c/pay/wrong',
      sessionId: 'cs_test_wrong',
      customerId: 'cus_test_wrong',
      priceId: 'price_wrong_pro',
    });

    const { createPhotoCheckoutSession } = await import('../stripe-foto-flow');
    await expect(
      createPhotoCheckoutSession({
        userId: 'user-uuid-foto-3',
        userEmail: 'fail@example.com',
      }),
    ).rejects.toThrow(/expected priceId/);
  });
});
