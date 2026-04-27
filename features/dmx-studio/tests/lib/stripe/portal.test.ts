// DMX Studio dentro DMX único entorno (ADR-054). Stripe portal wrapper unit tests.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_stub');
  vi.resetModules();
  const mod = await import('@/features/dmx-studio/lib/stripe/client');
  mod.__resetStripeClientForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createPortalSession (stub mode)', () => {
  it('returns billing.stripe.com URL with bps_test_ session id', async () => {
    const { createPortalSession } = await import('@/features/dmx-studio/lib/stripe/portal');
    const result = await createPortalSession({
      customerId: 'cus_test_known001',
      returnUrl: '/studio/account',
    });
    expect(result.url).toContain('billing.stripe.com');
    expect(result.sessionId).toMatch(/^bps_test_/);
  });

  it('throws when customerId is empty', async () => {
    const { createPortalSession } = await import('@/features/dmx-studio/lib/stripe/portal');
    await expect(
      createPortalSession({ customerId: '', returnUrl: '/studio/account' }),
    ).rejects.toThrow(/customerId required/);
  });
});
