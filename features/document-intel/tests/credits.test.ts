// FASE 17.B — Tests credits-engine (markup 50% + ENFORCE flag + grant)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import {
  applyMarkup,
  consumeCredits,
  getBalance,
  grantCredits,
} from '@/features/document-intel/lib/credits-engine';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface BalanceState {
  balance_usd: number;
  total_consumed_usd: number;
  total_purchased_usd: number;
  packs_purchased_count: number;
  last_consumption_at: string | null;
  last_purchase_at: string | null;
}

function buildSupabaseStub(initialState: BalanceState) {
  const state = { ...initialState };
  const txInserts: Array<Record<string, unknown>> = [];

  const fromMock = vi.fn((table: string) => {
    if (table === 'dev_ai_credits') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { ...state }, error: null }),
          })),
        })),
        update: vi.fn((patch: Partial<BalanceState>) => {
          Object.assign(state, patch);
          return { eq: vi.fn().mockResolvedValue({ error: null }) };
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    if (table === 'ai_credit_transactions') {
      return {
        insert: vi.fn((payload: Record<string, unknown>) => {
          txInserts.push(payload);
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: `tx-${txInserts.length}` },
                error: null,
              }),
            })),
          };
        }),
      };
    }
    return {};
  });

  return { stub: { from: fromMock }, state, txInserts };
}

describe('applyMarkup', () => {
  it('multiplies by 1.5 with 4 decimal precision', () => {
    expect(applyMarkup(0.01)).toBe(0.015);
    // 0.0019 * 1.5 = 0.00285 → toFixed(4) → 0.0029
    expect(applyMarkup(0.0019)).toBe(0.0029);
    expect(applyMarkup(1)).toBe(1.5);
  });
});

describe('consumeCredits — H1 ENFORCE_AI_CREDIT_BALANCE=false', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ENFORCE_AI_CREDIT_BALANCE;
  });

  it('charges balance and inserts consumption transaction', async () => {
    const { stub, state, txInserts } = buildSupabaseStub({
      balance_usd: 25,
      total_consumed_usd: 0,
      total_purchased_usd: 25,
      packs_purchased_count: 1,
      last_consumption_at: null,
      last_purchase_at: '2026-04-01',
    });
    vi.mocked(createAdminClient).mockReturnValue(stub as never);

    const result = await consumeCredits({
      desarrolladora_id: 'dev-1',
      raw_cost_usd: 0.02,
      job_id: 'job-1',
    });

    expect(result.charged_usd).toBeCloseTo(0.03, 4);
    expect(state.balance_usd).toBeCloseTo(24.97, 4);
    expect(state.total_consumed_usd).toBeCloseTo(0.03, 4);
    expect(txInserts).toHaveLength(1);
    const tx = txInserts[0];
    if (!tx) throw new Error('tx not inserted');
    expect(tx.type).toBe('consumption');
    expect(tx.amount_usd).toBeCloseTo(-0.03, 4);
  });

  it('allows balance to go negative when ENFORCE is off', async () => {
    const { stub, state } = buildSupabaseStub({
      balance_usd: 0,
      total_consumed_usd: 0,
      total_purchased_usd: 0,
      packs_purchased_count: 0,
      last_consumption_at: null,
      last_purchase_at: null,
    });
    vi.mocked(createAdminClient).mockReturnValue(stub as never);

    await consumeCredits({ desarrolladora_id: 'dev-1', raw_cost_usd: 0.5, job_id: 'job-1' });
    expect(state.balance_usd).toBeLessThan(0);
  });
});

describe('consumeCredits — production ENFORCE=true', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENFORCE_AI_CREDIT_BALANCE = 'true';
  });
  afterEach(() => {
    delete process.env.ENFORCE_AI_CREDIT_BALANCE;
  });

  it('throws PAYMENT_REQUIRED when balance is insufficient', async () => {
    const { stub } = buildSupabaseStub({
      balance_usd: 0.01,
      total_consumed_usd: 0,
      total_purchased_usd: 0.01,
      packs_purchased_count: 0,
      last_consumption_at: null,
      last_purchase_at: null,
    });
    vi.mocked(createAdminClient).mockReturnValue(stub as never);

    await expect(
      consumeCredits({ desarrolladora_id: 'dev-1', raw_cost_usd: 0.5, job_id: 'job-1' }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_REQUIRED',
      message: 'insufficient_ai_credits',
    });
  });

  it('charges normally when balance covers the markup cost', async () => {
    const { stub, state } = buildSupabaseStub({
      balance_usd: 1,
      total_consumed_usd: 0,
      total_purchased_usd: 1,
      packs_purchased_count: 0,
      last_consumption_at: null,
      last_purchase_at: null,
    });
    vi.mocked(createAdminClient).mockReturnValue(stub as never);

    const r = await consumeCredits({
      desarrolladora_id: 'dev-1',
      raw_cost_usd: 0.1,
      job_id: 'job-2',
    });
    expect(r.charged_usd).toBe(0.15);
    expect(state.balance_usd).toBeCloseTo(0.85, 4);
  });
});

describe('grantCredits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('increments balance and total_purchased', async () => {
    const { stub, state, txInserts } = buildSupabaseStub({
      balance_usd: 5,
      total_consumed_usd: 0,
      total_purchased_usd: 5,
      packs_purchased_count: 0,
      last_consumption_at: null,
      last_purchase_at: null,
    });
    vi.mocked(createAdminClient).mockReturnValue(stub as never);

    const r = await grantCredits({
      desarrolladora_id: 'dev-1',
      amount_usd: 25,
      granted_by: 'admin-1',
      description: 'Pack inicial',
    });

    expect(r.balance_after_usd).toBeCloseTo(30, 4);
    expect(state.total_purchased_usd).toBeCloseTo(30, 4);
    const tx = txInserts[0];
    if (!tx) throw new Error('tx not inserted');
    expect(tx.type).toBe('grant_admin');
    expect(tx.amount_usd).toBe(25);
  });

  it('rejects non-positive amounts', async () => {
    await expect(
      grantCredits({ desarrolladora_id: 'd', amount_usd: 0, granted_by: 'a' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      grantCredits({ desarrolladora_id: 'd', amount_usd: -5, granted_by: 'a' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

describe('getBalance', () => {
  it('returns 0 when row is missing', async () => {
    const stub = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    };
    vi.mocked(createAdminClient).mockReturnValue(stub as never);
    const r = await getBalance('unknown-dev');
    expect(r.balance_usd).toBe(0);
    expect(r.last_consumption_at).toBeNull();
  });
});
