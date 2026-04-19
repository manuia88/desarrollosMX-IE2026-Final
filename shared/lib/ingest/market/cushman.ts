import type { IngestResult } from '../types';
import {
  type IngestMarketPdfOptions,
  ingestMarketPdfWithConfig,
  type MarketPublisherConfig,
} from './market-pdf-extractor';

// Cushman & Wakefield MarketBeat México — CRE trimestral. PDF admin upload
// (sin API pública). Métricas clase-A CDMX: oficinas industriales/retail.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.4 / §7.E.8

export const CUSHMAN_CONFIG: MarketPublisherConfig = {
  source: 'cushman',
  displayName: 'Cushman & Wakefield MarketBeat',
  periodicity: 'quarterly',
  metrics: [
    {
      name: 'office_vacancy_rate',
      unit: 'pct',
      description: 'Tasa de vacancia oficinas clase A, mercado total CDMX',
    },
    {
      name: 'office_asking_rent_usd_m2',
      unit: 'usd_m2_month',
      description: 'Asking rent promedio oficinas clase A (USD/m² mes)',
    },
    {
      name: 'office_cap_rate',
      unit: 'pct',
      description: 'Cap rate promedio inversión oficinas clase A',
    },
    {
      name: 'industrial_vacancy_rate',
      unit: 'pct',
      description: 'Tasa de vacancia naves industriales mercado total',
    },
    {
      name: 'retail_vacancy_rate',
      unit: 'pct',
      description: 'Tasa de vacancia retail centros comerciales prime',
    },
  ],
  estimatedCostUsd: 0.01,
};

export async function ingestCushmanPdf(
  pdfBuffer: Buffer,
  options: IngestMarketPdfOptions = {},
): Promise<IngestResult> {
  return await ingestMarketPdfWithConfig(pdfBuffer, CUSHMAN_CONFIG, options);
}
