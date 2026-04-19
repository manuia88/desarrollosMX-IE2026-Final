import { ingestBbvaPdf } from '../macro/bbva-research';
import { ingestCnbvCsv } from '../macro/cnbv';
import { ingestFovisssteXlsx } from '../macro/fovissste';
import { ingestInfonavitCsv } from '../macro/infonavit';
import { ingestShfXlsx } from '../macro/shf';
import type { AutoFetchConfig, DiscoveryDeps, DiscoveryResult } from './auto-fetcher';

// Configs por portal con estrategia de discovery. Prioridad HTTP + regex sobre
// Playwright — sólo escalar a browser si el portal requiere JS render o
// anti-bot. Si el portal cambia estructura → discovery devuelve null y
// autofetch marca discovery_failed; admin upload UI (/admin/ingest/upload)
// queda como fallback plan B.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.M

type Discoverer = (url: string, deps: DiscoveryDeps) => Promise<DiscoveryResult | null>;

// Helper genérico: descarga HTML, aplica regex para encontrar primer match
// (por orden en el DOM). Intenta HEAD sobre el resultado para recuperar ETag.
export function regexDiscoverer(fileLinkPattern: RegExp, baseUrl?: string): Discoverer {
  return async (url, deps) => {
    const res = await deps.fetchImpl(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`discovery_http_${res.status}`);
    const html = await res.text();
    const match = fileLinkPattern.exec(html);
    if (!match?.[0]) return null;
    const rawHref = match[1] ?? match[0];
    const fileUrl = toAbsoluteUrl(rawHref, baseUrl ?? url);
    let etag: string | undefined;
    try {
      const head = await deps.fetchImpl(fileUrl, { method: 'HEAD', redirect: 'follow' });
      etag = head.headers.get('etag') ?? undefined;
    } catch {
      /* HEAD puede no estar permitido — no bloquea, sólo omite ETag */
    }
    const result: DiscoveryResult = { fileUrl };
    if (etag) result.etag = etag;
    return result;
  };
}

function toAbsoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

// Patterns deliberadamente laxos (match primer link PDF/XLSX/CSV en HTML).
// Si el portal cambia mucho, el discovery devuelve null y se ejecuta el
// fallback admin upload. No intentamos ser resilientes a rediseños mayores.

export const BBVA_RESEARCH_CONFIG: AutoFetchConfig = {
  source: 'bbva_research',
  countryCode: 'MX',
  discoveryUrl:
    'https://www.bbvaresearch.com/publicaciones/situacion-inmobiliaria-mexico-segundo-semestre-2025/',
  contentType: 'application/pdf',
  discover: regexDiscoverer(/href="([^"]+situacion-inmobiliaria[^"]+\.pdf)"/i),
  async ingestBuffer(buffer, triggeredBy) {
    return await ingestBbvaPdf(buffer, { triggeredBy });
  },
};

export const INFONAVIT_CONFIG: AutoFetchConfig = {
  source: 'infonavit',
  countryCode: 'MX',
  discoveryUrl: 'https://portalmx.infonavit.org.mx/wps/portal/infonavitmx/mx2/datos-abiertos',
  contentType: 'text/csv',
  discover: regexDiscoverer(/href="([^"]+creditos[^"]*\.csv)"/i),
  async ingestBuffer(buffer, triggeredBy) {
    return await ingestInfonavitCsv(buffer.toString('utf8'), { triggeredBy });
  },
};

export const CNBV_CONFIG: AutoFetchConfig = {
  source: 'cnbv',
  countryCode: 'MX',
  discoveryUrl:
    'https://portafolioinfo.cnbv.gob.mx/Paginas/Contenidos.aspx?ID=40&Contenido=Cartera%20Vivienda',
  contentType: 'text/csv',
  discover: regexDiscoverer(/href="([^"]+cartera[^"]*\.csv)"/i),
  async ingestBuffer(buffer, triggeredBy) {
    return await ingestCnbvCsv(buffer.toString('utf8'), { triggeredBy });
  },
};

export const FOVISSSTE_CONFIG: AutoFetchConfig = {
  source: 'fovissste',
  countryCode: 'MX',
  discoveryUrl:
    'https://www.fovissste.gob.mx/es/FOVISSSTE/Estadisticas_e_Informacion_Financiera_y_Actuarial',
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  discover: regexDiscoverer(/href="([^"]+informe[^"]*\.xlsx)"/i),
  async ingestBuffer(buffer, triggeredBy) {
    return await ingestFovisssteXlsx(buffer, { triggeredBy });
  },
};

export const SHF_CONFIG: AutoFetchConfig = {
  source: 'shf',
  countryCode: 'MX',
  discoveryUrl: 'https://www.gob.mx/shf/documentos/indice-shf-de-precios-de-la-vivienda',
  contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  discover: regexDiscoverer(/href="([^"]+IPV[^"]*\.xlsx)"/i),
  async ingestBuffer(buffer, triggeredBy) {
    return await ingestShfXlsx(buffer, { triggeredBy });
  },
};

export const AUTOFETCH_CONFIGS = {
  bbva_research: BBVA_RESEARCH_CONFIG,
  infonavit: INFONAVIT_CONFIG,
  cnbv: CNBV_CONFIG,
  fovissste: FOVISSSTE_CONFIG,
  shf: SHF_CONFIG,
} as const;

export type AutoFetchSource = keyof typeof AUTOFETCH_CONFIGS;

export const AUTOFETCH_SOURCES: readonly AutoFetchSource[] = [
  'bbva_research',
  'infonavit',
  'cnbv',
  'fovissste',
  'shf',
] as const;

export function isAutoFetchSource(value: string): value is AutoFetchSource {
  return (AUTOFETCH_SOURCES as readonly string[]).includes(value);
}
