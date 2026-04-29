// FASE 17.STRIPE — Tests stripe-credits lib (Modo A canon — mocks Supabase admin).
// Cubre: checkout session creation (stub mode) + webhook event handling
// (idempotencia + grant credits + product_type filtering).

import type Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCreditsCheckoutSession,
  handleCreditsWebhookEvent,
} from '@/features/document-intel/lib/stripe-credits';

// ---- Mocks Supabase admin -----------------------------------------------------

interface MockBuilder {
  select: (cols: string) => MockBuilder;
  eq: (col: string, val: unknown) => MockBuilder;
  insert: (vals: unknown) => MockBuilder;
  update: (vals: unknown) => MockBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
}

interface MockState {
  existingTxByPaymentId?: { id: string } | null;
  creditsSnapshot?: {
    balance_usd: number;
    total_purchased_usd: number;
    packs_purchased_count: number;
  } | null;
  insertCalls: Array<{ table: string; values: unknown }>;
  updateCalls: Array<{ table: string; values: unknown }>;
  insertShouldError?: boolean;
}

let mockState: MockState;

function makeBuilder(table: string): MockBuilder {
  let mode: 'select' | 'insert' | 'update' = 'select';
  let lastFilter: { col: string; val: unknown } | null = null;

  const builder: MockBuilder = {
    select: () => {
      mode = 'select';
      return builder;
    },
    eq: (col, val) => {
      lastFilter = { col, val };
      return builder;
    },
    insert: (vals) => {
      mode = 'insert';
      mockState.insertCalls.push({ table, values: vals });
      return builder;
    },
    update: (vals) => {
      mode = 'update';
      mockState.updateCalls.push({ table, values: vals });
      return builder;
    },
    maybeSingle: async () => {
      if (table === 'ai_credit_transactions' && lastFilter?.col === 'stripe_payment_id') {
        return { data: mockState.existingTxByPaymentId ?? null, error: null };
      }
      if (table === 'dev_ai_credits' && mode === 'select') {
        return { data: mockState.creditsSnapshot ?? null, error: null };
      }
      return { data: null, error: null };
    },
    single: async () => {
      if (mode === 'insert' && mockState.insertShouldError) {
        return { data: null, error: { message: 'mock_insert_error' } };
      }
      return { data: { id: 'mock-id-1' }, error: null };
    },
  };
  return builder;
}

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => makeBuilder(table),
  }),
}));

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  },
}));

// ---- Tests -------------------------------------------------------------------

describe('createCreditsCheckoutSession', () => {
  beforeEach(() => {
    mockState = {
      insertCalls: [],
      updateCalls: [],
    };
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_AI_CREDITS_PACK_25;
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.example.com';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns stub session URL when STRIPE_SECRET_KEY missing', async () => {
    const result = await createCreditsCheckoutSession({
      userId: 'u1',
      userEmail: 'dev@test.com',
      desarrolladoraId: 'd1',
    });
    expect(result.stub).toBe(true);
    expect(result.sessionId).toMatch(/^cs_test_credits_stub_/);
    expect(result.url).toContain('credits_charged=true');
    expect(result.url).toContain('stub_session=');
  });

  it('returns stub URL when STRIPE_SECRET_KEY=sk_test_stub', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_stub';
    const result = await createCreditsCheckoutSession({
      userId: 'u1',
      userEmail: null,
      desarrolladoraId: 'd1',
    });
    expect(result.stub).toBe(true);
  });

  it('uses successPath override when provided in stub', async () => {
    const result = await createCreditsCheckoutSession({
      userId: 'u1',
      userEmail: null,
      desarrolladoraId: 'd1',
      successPath: '/custom/success',
    });
    expect(result.url).toContain('/custom/success');
  });
});

describe('handleCreditsWebhookEvent', () => {
  beforeEach(() => {
    mockState = {
      insertCalls: [],
      updateCalls: [],
    };
  });

  it('skips non-credits events (returns ok handled=false)', async () => {
    const event = {
      id: 'evt_studio_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { product_type: 'studio_subscription' },
          payment_intent: 'pi_studio_1',
        },
      },
    } as unknown as Stripe.Event;

    const result = await handleCreditsWebhookEvent(event);
    expect(result.ok).toBe(true);
    expect(result.handled).toBe(false);
    expect(mockState.insertCalls).toHaveLength(0);
  });

  it('skips event types that are neither completed nor succeeded', async () => {
    const event = {
      id: 'evt_x',
      type: 'invoice.paid',
      data: { object: { metadata: { product_type: 'ai_credits_pack' } } },
    } as unknown as Stripe.Event;

    const result = await handleCreditsWebhookEvent(event);
    expect(result.handled).toBe(false);
  });

  it('grants credits + persists transaction on checkout.session.completed', async () => {
    mockState.creditsSnapshot = {
      balance_usd: 0,
      total_purchased_usd: 0,
      packs_purchased_count: 0,
    };

    const event = {
      id: 'evt_credits_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          payment_intent: 'pi_test_1',
          metadata: {
            product_type: 'ai_credits_pack',
            pack_key: 'pack_25_usd',
            desarrolladora_id: 'd1',
            user_id: 'u1',
            credits_added_usd: '25',
          },
        },
      },
    } as unknown as Stripe.Event;

    const result = await handleCreditsWebhookEvent(event);
    expect(result.ok).toBe(true);
    expect(result.handled).toBe(true);
    expect(result.amountUsd).toBe(25);
    expect(result.stripePaymentId).toBe('pi_test_1');

    const tx = mockState.insertCalls.find((c) => c.table === 'ai_credit_transactions');
    expect(tx).toBeDefined();
    expect((tx?.values as Record<string, unknown>).type).toBe('purchase');
    expect((tx?.values as Record<string, unknown>).amount_usd).toBe(25);
    expect((tx?.values as Record<string, unknown>).stripe_payment_id).toBe('pi_test_1');
  });

  it('idempotent skip when stripe_payment_id already exists', async () => {
    mockState.existingTxByPaymentId = { id: 'existing-tx-1' };

    const event = {
      id: 'evt_credits_dup',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_dup',
          payment_intent: 'pi_test_dup',
          metadata: {
            product_type: 'ai_credits_pack',
            desarrolladora_id: 'd1',
            user_id: 'u1',
            credits_added_usd: '25',
          },
        },
      },
    } as unknown as Stripe.Event;

    const result = await handleCreditsWebhookEvent(event);
    expect(result.ok).toBe(true);
    expect(result.handled).toBe(true);
    expect(result.idempotentSkip).toBe(true);

    const insertedTx = mockState.insertCalls.find((c) => c.table === 'ai_credit_transactions');
    expect(insertedTx).toBeUndefined();
  });

  it('returns error when desarrolladora_id missing from metadata', async () => {
    const event = {
      id: 'evt_bad',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_bad',
          payment_intent: 'pi_bad',
          metadata: {
            product_type: 'ai_credits_pack',
            credits_added_usd: '25',
          },
        },
      },
    } as unknown as Stripe.Event;

    const result = await handleCreditsWebhookEvent(event);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing_desarrolladora_id');
  });

  it('handles payment_intent.succeeded event (alternative trigger)', async () => {
    mockState.creditsSnapshot = {
      balance_usd: 50,
      total_purchased_usd: 50,
      packs_purchased_count: 2,
    };

    const event = {
      id: 'evt_pi_2',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_2',
          metadata: {
            product_type: 'ai_credits_pack',
            desarrolladora_id: 'd1',
            user_id: 'u1',
            credits_added_usd: '25',
          },
        },
      },
    } as unknown as Stripe.Event;

    const result = await handleCreditsWebhookEvent(event);
    expect(result.ok).toBe(true);
    expect(result.handled).toBe(true);
    expect(result.amountUsd).toBe(25);
    expect(result.stripePaymentId).toBe('pi_test_2');
  });
});
