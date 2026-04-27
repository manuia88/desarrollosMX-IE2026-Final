import { sentry } from '@/shared/lib/telemetry/sentry';

const OER_LATEST_URL = 'https://openexchangerates.org/api/latest.json';

export interface OerFetchOptions {
  readonly fetchImpl?: typeof fetch;
}

interface OerLatestResponse {
  readonly base: string;
  readonly timestamp: number;
  readonly rates: Record<string, number>;
}

export async function getOpenExchangeRate(
  from: string,
  to: string,
  options: OerFetchOptions = {},
): Promise<number> {
  if (from === to) return 1;

  const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if (!appId || appId === 'placeholder') {
    throw new Error('missing_env: OPEN_EXCHANGE_RATES_APP_ID');
  }

  const doFetch = options.fetchImpl ?? fetch;
  const url = `${OER_LATEST_URL}?app_id=${appId}`;

  try {
    const res = await doFetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`oer_http_${res.status}`);
    }
    const data = (await res.json()) as OerLatestResponse;
    const rates = data.rates ?? {};
    const base = data.base ?? 'USD';

    if (from === base) {
      const direct = rates[to];
      if (typeof direct !== 'number' || direct <= 0) {
        throw new Error(`oer_missing_rate:${to}`);
      }
      return direct;
    }

    if (to === base) {
      const inverse = rates[from];
      if (typeof inverse !== 'number' || inverse <= 0) {
        throw new Error(`oer_missing_rate:${from}`);
      }
      return 1 / inverse;
    }

    const fromBase = rates[from];
    const toBase = rates[to];
    if (typeof fromBase !== 'number' || fromBase <= 0) {
      throw new Error(`oer_missing_rate:${from}`);
    }
    if (typeof toBase !== 'number' || toBase <= 0) {
      throw new Error(`oer_missing_rate:${to}`);
    }
    return toBase / fromBase;
  } catch (err) {
    sentry.captureException(err, {
      tags: { module: 'operaciones', provider: 'openexchangerates' },
      extra: { from, to },
    });
    throw err;
  }
}
