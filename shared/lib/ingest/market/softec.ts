import type { IngestResult } from '../types';
import {
  type IngestMarketPdfOptions,
  ingestMarketPdfWithConfig,
  type MarketPublisherConfig,
} from './market-pdf-extractor';

// Softec — consultoría residencial MX, reports trimestrales. Muy útil para
// H1 DesarrollosMX (residencial primary is Softec territory).
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.4 / §7.E.8

export const SOFTEC_CONFIG: MarketPublisherConfig = {
  source: 'softec',
  displayName: 'Softec Residencial México',
  periodicity: 'quarterly',
  metrics: [
    {
      name: 'residential_inventory_units',
      unit: 'units',
      description: 'Inventario residencial nuevo disponible (unidades)',
    },
    {
      name: 'residential_absorption_units',
      unit: 'units_quarter',
      description: 'Unidades residenciales vendidas en el trimestre',
    },
    {
      name: 'residential_avg_price_mxn',
      unit: 'mxn',
      description: 'Precio promedio ponderado vivienda residencial nueva (MXN)',
    },
    {
      name: 'residential_avg_area_m2',
      unit: 'm2',
      description: 'Superficie promedio construida vivienda residencial (m²)',
    },
    {
      name: 'months_of_inventory',
      unit: 'months',
      description: 'Meses de inventario estimado al ritmo de absorción actual',
    },
  ],
  estimatedCostUsd: 0.01,
};

export async function ingestSoftecPdf(
  pdfBuffer: Buffer,
  options: IngestMarketPdfOptions = {},
): Promise<IngestResult> {
  return await ingestMarketPdfWithConfig(pdfBuffer, SOFTEC_CONFIG, options);
}
