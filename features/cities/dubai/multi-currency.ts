// FASE 14.1 — Dubai multi-currency (ADR-059 §Step 5).
// AED ↔ USD peg fixed UAE Central Bank (1 USD = 3.6725 AED desde 1997).
// USD ↔ MXN via FX cascade canon F14.B.1 (shared/lib/currency/fx.ts).
// Fallback hardcoded 17.5 MXN/USD si fx_rates unavailable + log warning.

import { convert } from '@/shared/lib/currency/fx';

export const AED_USD_PEG = 3.6725 as const;
export const FALLBACK_USD_MXN_RATE = 17.5 as const;

export interface DubaiPricing {
  readonly usd: number;
  readonly aed: number;
  readonly mxn: number;
}

/**
 * getDubaiPricing: convierte amount USD → {usd, aed, mxn}.
 * - AED via peg fixed 3.6725 (constante UAE Central Bank).
 * - MXN via fx cascade canon F14.B.1; fallback 17.5 si unavailable.
 */
export async function getDubaiPricing(amountUsd: number): Promise<DubaiPricing> {
  const aed = amountUsd * AED_USD_PEG;

  let mxn: number;
  try {
    const converted = await convert(amountUsd, 'USD', 'MXN');
    if (converted === null) {
      console.warn(
        '[dubai/multi-currency] fx cascade USD→MXN unavailable, using fallback',
        FALLBACK_USD_MXN_RATE,
      );
      mxn = amountUsd * FALLBACK_USD_MXN_RATE;
    } else {
      mxn = converted;
    }
  } catch (err) {
    console.warn(
      '[dubai/multi-currency] fx cascade error, using fallback',
      FALLBACK_USD_MXN_RATE,
      err,
    );
    mxn = amountUsd * FALLBACK_USD_MXN_RATE;
  }

  return { usd: amountUsd, aed, mxn };
}
