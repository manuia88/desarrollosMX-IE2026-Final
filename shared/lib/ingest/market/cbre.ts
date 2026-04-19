import type { IngestResult } from '../types';
import {
  type IngestMarketPdfOptions,
  ingestMarketPdfWithConfig,
  type MarketPublisherConfig,
} from './market-pdf-extractor';

// CBRE México MarketView — CRE trimestral. PDF admin upload (sin API pública).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.4 / §7.E.8

export const CBRE_CONFIG: MarketPublisherConfig = {
  source: 'cbre',
  displayName: 'CBRE MarketView México',
  periodicity: 'quarterly',
  metrics: [
    {
      name: 'office_vacancy_rate',
      unit: 'pct',
      description: 'Tasa vacancia oficinas clase A+B mercado CDMX',
    },
    {
      name: 'office_asking_rent_usd_m2',
      unit: 'usd_m2_month',
      description: 'Asking rent promedio ponderado oficinas (USD/m² mes)',
    },
    {
      name: 'office_net_absorption_m2',
      unit: 'm2',
      description: 'Absorción neta trimestral oficinas (m²)',
    },
    {
      name: 'industrial_asking_rent_usd_m2',
      unit: 'usd_m2_month',
      description: 'Asking rent naves industriales clase A (USD/m² mes)',
    },
    {
      name: 'industrial_vacancy_rate',
      unit: 'pct',
      description: 'Tasa vacancia naves industriales prime',
    },
  ],
  estimatedCostUsd: 0.01,
};

export async function ingestCbrePdf(
  pdfBuffer: Buffer,
  options: IngestMarketPdfOptions = {},
): Promise<IngestResult> {
  return await ingestMarketPdfWithConfig(pdfBuffer, CBRE_CONFIG, options);
}
