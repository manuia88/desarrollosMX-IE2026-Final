import { sentry } from '@/shared/lib/telemetry/sentry';

const BANXICO_BASE = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series';
const SERIES_USD_MXN_FIX = 'SF43718';

export interface BanxicoFetchOptions {
  readonly date?: Date;
  readonly fetchImpl?: typeof fetch;
}

interface BanxicoApiDato {
  readonly fecha: string;
  readonly dato: string;
}

interface BanxicoApiSeries {
  readonly idSerie: string;
  readonly titulo: string;
  readonly datos?: readonly BanxicoApiDato[];
}

interface BanxicoApiPayload {
  readonly bmx: { readonly series: readonly BanxicoApiSeries[] };
}

function formatBanxicoDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDato(dato: string | null | undefined): number | null {
  if (dato == null) return null;
  const t = String(dato).trim();
  if (t === '' || t === 'N/E' || t === 'NE' || t.toUpperCase() === 'ND') return null;
  const v = Number.parseFloat(t.replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
}

export async function getBanxicoMxnUsd(options: BanxicoFetchOptions = {}): Promise<number> {
  const token = process.env.BANXICO_TOKEN;
  if (!token) throw new Error('missing_env: BANXICO_TOKEN');

  const doFetch = options.fetchImpl ?? fetch;
  const suffix = options.date
    ? `/datos/${formatBanxicoDate(options.date)}/${formatBanxicoDate(options.date)}`
    : '/datos/oportuno';
  const url = `${BANXICO_BASE}/${SERIES_USD_MXN_FIX}${suffix}`;

  try {
    const res = await doFetch(url, {
      headers: {
        'Bmx-Token': token,
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`banxico_http_${res.status}`);
    }
    const payload = (await res.json()) as BanxicoApiPayload;
    const series = payload?.bmx?.series ?? [];
    const target = series.find((s) => s.idSerie === SERIES_USD_MXN_FIX);
    const datos = target?.datos ?? [];
    const last = datos.length > 0 ? datos[datos.length - 1] : undefined;
    const value = parseDato(last?.dato);
    if (value == null || value <= 0) {
      throw new Error('banxico_invalid_value');
    }
    return value;
  } catch (err) {
    sentry.captureException(err, {
      tags: { module: 'operaciones', provider: 'banxico' },
      extra: { series: SERIES_USD_MXN_FIX },
    });
    throw err;
  }
}
