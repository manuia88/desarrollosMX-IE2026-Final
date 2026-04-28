// DMX Studio dentro DMX único entorno (ADR-054). Stripe checkout wrapper unit tests.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

const fromMock = vi.fn();

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}));

function buildSelectChain<T>(result: QueryResult<T>) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

beforeEach(async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_stub');
  vi.resetModules();
  fromMock.mockReset();
  const mod = await import('@/features/dmx-studio/lib/stripe/client');
  mod.__resetStripeClientForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createStudioCheckoutSession (stub mode)', () => {
  it('returns mock checkout URL with cs_test_ session id when no existing customer', async () => {
    fromMock.mockReturnValueOnce(buildSelectChain({ data: null, error: null }));
    const { createStudioCheckoutSession } = await import(
      '@/features/dmx-studio/lib/stripe/checkout'
    );
    const result = await createStudioCheckoutSession({
      userId: 'user-uuid-1',
      userEmail: 'asesor@example.com',
      planKey: 'founder',
      successUrl: '/studio/welcome',
      cancelUrl: '/studio',
    });
    expect(result.sessionId).toMatch(/^cs_test_/);
    expect(result.customerId).toMatch(/^cus_test_/);
    expect(result.url).toContain('checkout.stripe.com');
    expect(result.priceId).toBe('price_1TR55ACdtMsDaBnLUwlPAeEo');
  });

  it('reuses stripe_customer_id from latest subscription row when present', async () => {
    const existingCustomerId = 'cus_test_existing0001234';
    fromMock.mockReturnValueOnce(
      buildSelectChain({ data: { stripe_customer_id: existingCustomerId }, error: null }),
    );
    const { createStudioCheckoutSession } = await import(
      '@/features/dmx-studio/lib/stripe/checkout'
    );
    const result = await createStudioCheckoutSession({
      userId: 'user-uuid-2',
      userEmail: 'asesor2@example.com',
      planKey: 'pro',
      successUrl: '/studio/welcome',
      cancelUrl: '/studio',
    });
    expect(result.customerId).toBe(existingCustomerId);
    expect(result.priceId).toBe('price_1TR56BCdtMsDaBnLNa7X2WU4');
  });

  it('throws when supabase select fails', async () => {
    fromMock.mockReturnValueOnce(
      buildSelectChain({ data: null, error: { message: 'rls_violation' } }),
    );
    const { createStudioCheckoutSession } = await import(
      '@/features/dmx-studio/lib/stripe/checkout'
    );
    await expect(
      createStudioCheckoutSession({
        userId: 'user-uuid-3',
        userEmail: null,
        planKey: 'agency',
        successUrl: '/studio/welcome',
        cancelUrl: '/studio',
      }),
    ).rejects.toThrow(/rls_violation/);
  });
});

describe('getOrCreateCustomer (stub mode)', () => {
  it('creates a new cus_test_ customer when no row exists', async () => {
    fromMock.mockReturnValueOnce(buildSelectChain({ data: null, error: null }));
    const { getOrCreateCustomer } = await import('@/features/dmx-studio/lib/stripe/checkout');
    const customer = await getOrCreateCustomer({
      userId: 'user-uuid-4',
      userEmail: 'newby@example.com',
    });
    expect(customer.id).toMatch(/^cus_test_/);
    expect(customer.email).toBe('newby@example.com');
    expect(customer.metadata.user_id).toBe('user-uuid-4');
  });
});
