// DMX Studio dentro DMX único entorno (ADR-054). Stripe webhook dispatcher tests.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STUDIO_STRIPE_PRICE_FOTO_USD_67,
  STUDIO_STRIPE_PRICE_PRO_USD_47,
} from '@/features/dmx-studio/lib/stripe-products';

interface QueryResult {
  data: { id: string } | null;
  error: { message: string } | null;
}

const insertCalls: { table: string; row: Record<string, unknown> }[] = [];
const updateCalls: { table: string; row: Record<string, unknown>; eq: [string, unknown] }[] = [];

function buildAdmin(
  insertResult: QueryResult,
  updateResult: { error: { message: string } | null },
) {
  return {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        insertCalls.push({ table, row });
        return {
          select: () => ({
            single: () => Promise.resolve(insertResult),
          }),
          // for fire-and-forget audit_log inserts
          // biome-ignore lint/suspicious/noThenProperty: intentional thenable mock for fire-and-forget audit_log writes
          then: (resolve: (v: { data: null; error: null }) => unknown) =>
            Promise.resolve({ data: null, error: null }).then(resolve),
        };
      },
      update: (row: Record<string, unknown>) => ({
        eq: (col: string, value: unknown) => {
          updateCalls.push({ table, row, eq: [col, value] });
          return Promise.resolve(updateResult);
        },
      }),
    }),
  };
}

let adminMock = buildAdmin({ data: { id: 'sub-row-uuid' }, error: null }, { error: null });

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => adminMock,
}));

beforeEach(async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_stub');
  vi.resetModules();
  insertCalls.length = 0;
  updateCalls.length = 0;
  adminMock = buildAdmin({ data: { id: 'sub-row-uuid' }, error: null }, { error: null });
  const mod = await import('@/features/dmx-studio/lib/stripe/client');
  mod.__resetStripeClientForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('handleStripeWebhook checkout.session.completed', () => {
  it('inserts studio_subscriptions row with plan_key derived from session metadata', async () => {
    const event = {
      id: 'evt_test_001',
      object: 'event',
      type: 'checkout.session.completed',
      created: 1735689600,
      data: {
        object: {
          id: 'cs_test_xxx',
          object: 'checkout.session',
          url: 'https://checkout.stripe.com/c/pay/cs_test_xxx',
          customer: 'cus_test_001',
          subscription: 'sub_test_001',
          mode: 'subscription',
          status: 'complete',
          metadata: { user_id: 'user-uuid-A', plan_key: 'pro' },
          success_url: 'https://example.com/welcome',
          cancel_url: 'https://example.com/cancel',
        },
      },
    };
    const { handleStripeWebhook } = await import('@/features/dmx-studio/lib/stripe/webhook');
    const result = await handleStripeWebhook({
      rawBody: JSON.stringify(event),
      signature: '',
      secret: '',
    });
    expect(result.ok).toBe(true);
    expect(result.handled).toBe(true);
    expect(result.subscriptionId).toBe('sub_test_001');

    const subInsert = insertCalls.find((c) => c.table === 'studio_subscriptions');
    expect(subInsert).toBeDefined();
    expect(subInsert?.row.plan_key).toBe('pro');
    expect(subInsert?.row.stripe_subscription_id).toBe('sub_test_001');
    expect(subInsert?.row.stripe_customer_id).toBe('cus_test_001');
    expect(subInsert?.row.stripe_price_id).toBe(STUDIO_STRIPE_PRICE_PRO_USD_47);
    expect(subInsert?.row.status).toBe('active');
    expect(subInsert?.row.videos_per_month_limit).toBe(5);

    const auditInsert = insertCalls.find((c) => c.table === 'audit_log');
    expect(auditInsert).toBeDefined();
    expect(auditInsert?.row.action).toBe('studio.subscription.created');
  });

  it('uses foto plan price when plan_key=foto', async () => {
    const event = {
      id: 'evt_test_002',
      object: 'event',
      type: 'checkout.session.completed',
      created: 1735689600,
      data: {
        object: {
          id: 'cs_test_yyy',
          object: 'checkout.session',
          url: 'https://checkout.stripe.com/c/pay/cs_test_yyy',
          customer: 'cus_test_002',
          subscription: 'sub_test_002',
          mode: 'subscription',
          status: 'complete',
          metadata: { user_id: 'user-uuid-B', plan_key: 'foto' },
          success_url: 'https://example.com/welcome',
          cancel_url: 'https://example.com/cancel',
        },
      },
    };
    const { handleStripeWebhook } = await import('@/features/dmx-studio/lib/stripe/webhook');
    const result = await handleStripeWebhook({
      rawBody: JSON.stringify(event),
      signature: '',
      secret: '',
    });
    expect(result.ok).toBe(true);
    const subInsert = insertCalls.find((c) => c.table === 'studio_subscriptions');
    expect(subInsert?.row.stripe_price_id).toBe(STUDIO_STRIPE_PRICE_FOTO_USD_67);
    expect(subInsert?.row.videos_per_month_limit).toBe(50);
  });
});

describe('handleStripeWebhook customer.subscription.updated', () => {
  it('updates status by stripe_subscription_id', async () => {
    const event = {
      id: 'evt_test_003',
      object: 'event',
      type: 'customer.subscription.updated',
      created: 1735689600,
      data: {
        object: {
          id: 'sub_test_001',
          object: 'subscription',
          customer: 'cus_test_001',
          status: 'past_due',
          current_period_start: 1735689600,
          current_period_end: 1738281600,
          cancel_at_period_end: false,
          items: { data: [] },
          metadata: {},
        },
      },
    };
    const { handleStripeWebhook } = await import('@/features/dmx-studio/lib/stripe/webhook');
    const result = await handleStripeWebhook({
      rawBody: JSON.stringify(event),
      signature: '',
      secret: '',
    });
    expect(result.ok).toBe(true);
    expect(result.handled).toBe(true);
    expect(result.subscriptionId).toBe('sub_test_001');

    const subUpdate = updateCalls.find((c) => c.table === 'studio_subscriptions');
    expect(subUpdate).toBeDefined();
    expect(subUpdate?.row.status).toBe('past_due');
    expect(subUpdate?.eq).toEqual(['stripe_subscription_id', 'sub_test_001']);
  });
});

describe('handleStripeWebhook invoice.payment_failed', () => {
  it('sets status=past_due on the matching subscription', async () => {
    const event = {
      id: 'evt_test_004',
      object: 'event',
      type: 'invoice.payment_failed',
      created: 1735689600,
      data: {
        object: {
          id: 'in_test_001',
          object: 'invoice',
          customer: 'cus_test_001',
          subscription: 'sub_test_001',
          status: 'open',
          attempt_count: 2,
        },
      },
    };
    const { handleStripeWebhook } = await import('@/features/dmx-studio/lib/stripe/webhook');
    const result = await handleStripeWebhook({
      rawBody: JSON.stringify(event),
      signature: '',
      secret: '',
    });
    expect(result.ok).toBe(true);
    expect(result.handled).toBe(true);

    const subUpdate = updateCalls.find((c) => c.table === 'studio_subscriptions');
    expect(subUpdate?.row.status).toBe('past_due');
    expect(subUpdate?.eq).toEqual(['stripe_subscription_id', 'sub_test_001']);
  });
});

describe('handleStripeWebhook signature verification', () => {
  it('rejects payload when secret set and signature invalid', async () => {
    const event = {
      id: 'evt_test_005',
      object: 'event',
      type: 'checkout.session.completed',
      created: 1735689600,
      data: { object: {} },
    };
    const { handleStripeWebhook } = await import('@/features/dmx-studio/lib/stripe/webhook');
    const result = await handleStripeWebhook({
      rawBody: JSON.stringify(event),
      signature: 'deadbeef',
      secret: 'whsec_test_studio',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid signature/);
  });
});
