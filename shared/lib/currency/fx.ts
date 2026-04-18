import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

export type FXRate = { base: string; quote: string; rate: number; fetched_at: string };

export const FX_BASE = 'USD';
export const FX_CACHE_TTL_MS = 10 * 60 * 1000;

export async function getLatestRate(base: string, quote: string): Promise<number | null> {
  if (base === quote) return 1;
  const supabase = await createClient();
  const { data } = await supabase
    .from('fx_rates')
    .select('rate')
    .eq('base', base)
    .eq('quote', quote)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.rate ?? null;
}

export async function convert(amount: number, from: string, to: string): Promise<number | null> {
  if (from === to) return amount;

  const direct = await getLatestRate(from, to);
  if (direct !== null) return amount * direct;

  if (from !== FX_BASE && to !== FX_BASE) {
    const fromBase = await getLatestRate(FX_BASE, from);
    const toBase = await getLatestRate(FX_BASE, to);
    if (fromBase && toBase) {
      const amountUsd = amount / fromBase;
      return amountUsd * toBase;
    }
  }

  const inverse = await getLatestRate(to, from);
  if (inverse && inverse > 0) return amount / inverse;

  return null;
}

type OXRResponse = {
  base: string;
  timestamp: number;
  rates: Record<string, number>;
};

export async function fetchAndStoreRates(): Promise<{ inserted: number; source: string }> {
  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if (!appId || appId === 'placeholder') {
    throw new Error('OPEN_EXCHANGE_RATES_APP_ID missing');
  }

  const res = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${appId}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`openexchangerates ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as OXRResponse;

  const admin = createAdminClient();
  const { data: currencies } = await admin.from('currencies').select('code').eq('is_active', true);
  const activeCodes = new Set((currencies ?? []).map((c) => c.code));

  const rows = Object.entries(data.rates)
    .filter(([code]) => activeCodes.has(code))
    .map(([quote, rate]) => ({ base: data.base, quote, rate, source: 'openexchangerates' }));

  if (rows.length === 0) return { inserted: 0, source: 'openexchangerates' };

  const { error } = await admin.from('fx_rates').insert(rows);
  if (error) throw error;

  return { inserted: rows.length, source: 'openexchangerates' };
}
