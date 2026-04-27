import { cached } from '@/shared/lib/runtime-cache';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { getBanxicoMxnUsd } from './banxico';
import { getOpenExchangeRate } from './openexchangerates';

export type FxSource = 'banxico' | 'openexchangerates' | 'fallback';

export interface FxRateResult {
  readonly rate: number;
  readonly source: FxSource;
  readonly pair: string;
}

export interface GetFxRateOptions {
  readonly date?: Date;
  readonly skipCache?: boolean;
}

const HARDCODED_FALLBACK_USD_MXN = 17.5;
const TTL_SECONDS = 24 * 60 * 60;

function pairKey(from: string, to: string, date?: Date): string {
  const stamp = date ? date.toISOString().slice(0, 10) : 'latest';
  return `fx:${from}:${to}:${stamp}`;
}

function isMxnUsdPair(from: string, to: string): boolean {
  return (from === 'MXN' && to === 'USD') || (from === 'USD' && to === 'MXN');
}

async function tryBanxico(from: string, to: string, date?: Date): Promise<number | null> {
  if (!isMxnUsdPair(from, to)) return null;
  try {
    const usdMxn = await getBanxicoMxnUsd(date ? { date } : {});
    return from === 'USD' && to === 'MXN' ? usdMxn : 1 / usdMxn;
  } catch {
    return null;
  }
}

async function tryOer(from: string, to: string): Promise<number | null> {
  try {
    return await getOpenExchangeRate(from, to);
  } catch {
    return null;
  }
}

function fallbackRate(from: string, to: string): number | null {
  if (from === to) return 1;
  if (from === 'USD' && to === 'MXN') return HARDCODED_FALLBACK_USD_MXN;
  if (from === 'MXN' && to === 'USD') return 1 / HARDCODED_FALLBACK_USD_MXN;
  return null;
}

async function resolveRate(from: string, to: string, date?: Date): Promise<FxRateResult> {
  if (from === to) {
    return { rate: 1, source: 'banxico', pair: `${from}-${to}` };
  }

  const banxico = await tryBanxico(from, to, date);
  if (banxico !== null && banxico > 0) {
    return { rate: banxico, source: 'banxico', pair: `${from}-${to}` };
  }

  const oer = await tryOer(from, to);
  if (oer !== null && oer > 0) {
    return { rate: oer, source: 'openexchangerates', pair: `${from}-${to}` };
  }

  const fb = fallbackRate(from, to);
  if (fb !== null) {
    sentry.captureException(new Error(`fx_cascade_fallback_used:${from}-${to}`), {
      tags: { module: 'operaciones', provider: 'fallback' },
      extra: { from, to, hardcoded_rate: fb },
    });
    return { rate: fb, source: 'fallback', pair: `${from}-${to}` };
  }

  throw new Error(`fx_no_rate_available:${from}-${to}`);
}

export async function getFxRate(
  from: string,
  to: string,
  options: GetFxRateOptions = {},
): Promise<FxRateResult> {
  if (options.skipCache) {
    return resolveRate(from, to, options.date);
  }
  return cached(pairKey(from, to, options.date), TTL_SECONDS, [`fx:${from}`, `fx:${to}`], () =>
    resolveRate(from, to, options.date),
  );
}
