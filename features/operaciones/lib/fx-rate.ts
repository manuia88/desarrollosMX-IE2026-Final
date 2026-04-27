import { type FxRateResult, getFxRate } from './fx/cascade';

export type GetFxRateResult = {
  rate: number;
  source: 'live' | 'fallback';
  pair: string;
};

function toLegacySource(source: FxRateResult['source']): 'live' | 'fallback' {
  return source === 'fallback' ? 'fallback' : 'live';
}

export async function getFxRateForOperacion(from: string, to: string): Promise<GetFxRateResult> {
  if (from === to) return { rate: 1, source: 'live', pair: `${from}-${to}` };

  const result = await getFxRate(from, to);
  return {
    rate: result.rate,
    source: toLegacySource(result.source),
    pair: result.pair,
  };
}

export async function convertForOperacion(
  amount: number,
  from: string,
  to: string,
): Promise<{ amount: number; source: 'live' | 'fallback'; rate: number }> {
  if (from === to) return { amount, source: 'live', rate: 1 };

  const result = await getFxRate(from, to);
  return {
    amount: amount * result.rate,
    source: toLegacySource(result.source),
    rate: result.rate,
  };
}
