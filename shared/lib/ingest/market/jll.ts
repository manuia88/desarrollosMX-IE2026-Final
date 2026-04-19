import type { IngestResult } from '../types';
import {
  type IngestMarketPdfOptions,
  ingestMarketPdfWithConfig,
  type MarketPublisherConfig,
} from './market-pdf-extractor';

// JLL México Pulse — CRE institutional trimestral. PDF admin upload.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.4 / §7.E.8

export const JLL_CONFIG: MarketPublisherConfig = {
  source: 'jll',
  displayName: 'JLL México Office Pulse',
  periodicity: 'quarterly',
  metrics: [
    {
      name: 'office_vacancy_rate',
      unit: 'pct',
      description: 'Vacancia oficinas clase A submercados CDMX',
    },
    {
      name: 'office_asking_rent_usd_m2',
      unit: 'usd_m2_month',
      description: 'Asking rent promedio oficinas clase A (USD/m² mes)',
    },
    {
      name: 'office_inventory_m2',
      unit: 'm2',
      description: 'Inventario total oficinas clase A mercado CDMX (m²)',
    },
    {
      name: 'office_under_construction_m2',
      unit: 'm2',
      description: 'Oficinas en construcción clase A (m²)',
    },
    {
      name: 'office_net_absorption_m2',
      unit: 'm2',
      description: 'Absorción neta trimestral oficinas (m²)',
    },
  ],
  estimatedCostUsd: 0.01,
};

export async function ingestJllPdf(
  pdfBuffer: Buffer,
  options: IngestMarketPdfOptions = {},
): Promise<IngestResult> {
  return await ingestMarketPdfWithConfig(pdfBuffer, JLL_CONFIG, options);
}
