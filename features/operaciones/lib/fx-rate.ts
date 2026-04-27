import { convert, getLatestRate } from '@/shared/lib/currency/fx';

const HARDCODED_FALLBACK_RATES: Record<string, number> = {
  'USD-MXN': 17.05,
  'MXN-USD': 1 / 17.05,
};

export type GetFxRateResult = {
  rate: number;
  source: 'live' | 'fallback';
  pair: string;
};

export async function getFxRateForOperacion(from: string, to: string): Promise<GetFxRateResult> {
  if (from === to) return { rate: 1, source: 'live', pair: `${from}-${to}` };

  const live = await getLatestRate(from, to);
  if (live !== null && live > 0) {
    return { rate: live, source: 'live', pair: `${from}-${to}` };
  }

  const fallbackKey = `${from}-${to}`;
  const fallback = HARDCODED_FALLBACK_RATES[fallbackKey];
  if (fallback !== undefined) {
    return { rate: fallback, source: 'fallback', pair: fallbackKey };
  }

  throw new Error(`No FX rate available for ${from}->${to} (no live, no fallback)`);
}

export async function convertForOperacion(
  amount: number,
  from: string,
  to: string,
): Promise<{ amount: number; source: 'live' | 'fallback'; rate: number }> {
  if (from === to) return { amount, source: 'live', rate: 1 };

  const live = await convert(amount, from, to);
  if (live !== null && Number.isFinite(live)) {
    const rate = live / amount;
    return { amount: live, source: 'live', rate };
  }

  const fallbackKey = `${from}-${to}`;
  const fallback = HARDCODED_FALLBACK_RATES[fallbackKey];
  if (fallback !== undefined) {
    return { amount: amount * fallback, source: 'fallback', rate: fallback };
  }

  throw new Error(`No FX conversion available for ${from}->${to}`);
}
