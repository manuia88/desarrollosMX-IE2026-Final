// FASE 17.B Credits engine — saldo IA por desarrolladora
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3
//
// Markup canon: 50% sobre costo Anthropic real → cargo a la desarrolladora.
// ENFORCE_AI_CREDIT_BALANCE=true bloquea si balance < charged (production).
// ENFORCE_AI_CREDIT_BALANCE=false permite balance negativo (H1 testing default).

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

const MARKUP_FACTOR = 1.5;

export function applyMarkup(rawCostUsd: number): number {
  return Number((rawCostUsd * MARKUP_FACTOR).toFixed(4));
}

function isEnforced(): boolean {
  return process.env.ENFORCE_AI_CREDIT_BALANCE === 'true';
}

interface ConsumeArgs {
  readonly desarrolladora_id: string;
  readonly raw_cost_usd: number;
  readonly job_id: string;
  readonly description?: string;
}

export interface ConsumeResult {
  readonly charged_usd: number;
  readonly balance_after_usd: number;
  readonly transaction_id: string;
}

interface CreditsSnapshot {
  balance_usd: number;
  total_consumed_usd: number;
  total_purchased_usd: number;
  packs_purchased_count: number;
}

async function ensureCreditsRow(
  supabase: AdminClient,
  desarrolladoraId: string,
): Promise<CreditsSnapshot> {
  const { data, error } = await supabase
    .from('dev_ai_credits')
    .select('balance_usd, total_consumed_usd, total_purchased_usd, packs_purchased_count')
    .eq('desarrolladora_id', desarrolladoraId)
    .maybeSingle();
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (data) {
    return {
      balance_usd: Number(data.balance_usd),
      total_consumed_usd: Number(data.total_consumed_usd ?? 0),
      total_purchased_usd: Number(data.total_purchased_usd ?? 0),
      packs_purchased_count: Number(data.packs_purchased_count ?? 0),
    };
  }

  const { error: insertErr } = await supabase
    .from('dev_ai_credits')
    .insert({ desarrolladora_id: desarrolladoraId, balance_usd: 0 });
  if (insertErr && insertErr.code !== '23505') {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertErr.message });
  }
  return {
    balance_usd: 0,
    total_consumed_usd: 0,
    total_purchased_usd: 0,
    packs_purchased_count: 0,
  };
}

export async function consumeCredits(args: ConsumeArgs): Promise<ConsumeResult> {
  const charged = applyMarkup(args.raw_cost_usd);
  const supabase = createAdminClient();

  const snapshot = await ensureCreditsRow(supabase, args.desarrolladora_id);

  if (isEnforced() && snapshot.balance_usd < charged) {
    throw new TRPCError({
      code: 'PAYMENT_REQUIRED',
      message: 'insufficient_ai_credits',
    });
  }

  const newBalance = Number((snapshot.balance_usd - charged).toFixed(4));
  const newTotalConsumed = Number((snapshot.total_consumed_usd + charged).toFixed(4));
  const nowIso = new Date().toISOString();

  const { error: updErr } = await supabase
    .from('dev_ai_credits')
    .update({
      balance_usd: newBalance,
      total_consumed_usd: newTotalConsumed,
      last_consumption_at: nowIso,
      updated_at: nowIso,
    })
    .eq('desarrolladora_id', args.desarrolladora_id);

  if (updErr) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updErr.message });
  }

  const { data: tx, error: txErr } = await supabase
    .from('ai_credit_transactions')
    .insert({
      desarrolladora_id: args.desarrolladora_id,
      type: 'consumption',
      amount_usd: -charged,
      balance_after_usd: newBalance,
      related_job_id: args.job_id,
      description: args.description ?? `Document AI extraction job ${args.job_id}`,
    })
    .select('id')
    .single();

  if (txErr || !tx) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: txErr?.message ?? 'tx_insert_failed',
    });
  }

  return {
    charged_usd: charged,
    balance_after_usd: newBalance,
    transaction_id: tx.id,
  };
}

interface GrantArgs {
  readonly desarrolladora_id: string;
  readonly amount_usd: number;
  readonly granted_by: string;
  readonly description?: string;
}

export async function grantCredits(args: GrantArgs): Promise<ConsumeResult> {
  if (args.amount_usd <= 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'amount_must_be_positive' });
  }
  const supabase = createAdminClient();
  const snapshot = await ensureCreditsRow(supabase, args.desarrolladora_id);
  const newBalance = Number((snapshot.balance_usd + args.amount_usd).toFixed(4));
  const newTotalPurchased = Number((snapshot.total_purchased_usd + args.amount_usd).toFixed(4));
  const nowIso = new Date().toISOString();

  const { error: updErr } = await supabase
    .from('dev_ai_credits')
    .update({
      balance_usd: newBalance,
      total_purchased_usd: newTotalPurchased,
      last_purchase_at: nowIso,
      updated_at: nowIso,
    })
    .eq('desarrolladora_id', args.desarrolladora_id);

  if (updErr) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updErr.message });
  }

  const { data: tx, error: txErr } = await supabase
    .from('ai_credit_transactions')
    .insert({
      desarrolladora_id: args.desarrolladora_id,
      type: 'grant_admin',
      amount_usd: args.amount_usd,
      balance_after_usd: newBalance,
      granted_by: args.granted_by,
      description: args.description ?? 'Admin grant',
    })
    .select('id')
    .single();

  if (txErr || !tx) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: txErr?.message ?? 'tx_insert_failed',
    });
  }

  return {
    charged_usd: args.amount_usd,
    balance_after_usd: newBalance,
    transaction_id: tx.id,
  };
}

export async function getBalance(desarrolladoraId: string): Promise<{
  balance_usd: number;
  last_consumption_at: string | null;
  last_purchase_at: string | null;
}> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('dev_ai_credits')
    .select('balance_usd, last_consumption_at, last_purchase_at')
    .eq('desarrolladora_id', desarrolladoraId)
    .maybeSingle();
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (!data) return { balance_usd: 0, last_consumption_at: null, last_purchase_at: null };
  return {
    balance_usd: Number(data.balance_usd),
    last_consumption_at: data.last_consumption_at,
    last_purchase_at: data.last_purchase_at,
  };
}
