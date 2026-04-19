import type { IngestResult } from '../types';
import {
  type IngestMarketPdfOptions,
  ingestMarketPdfWithConfig,
  type MarketPublisherConfig,
} from './market-pdf-extractor';

// Tinsa México — valuación residencial institucional. Reports trimestrales
// IMIE (Índice Mercado Inmobiliario Español/Mexicano) + IPV local.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.4 / §7.E.8

export const TINSA_CONFIG: MarketPublisherConfig = {
  source: 'tinsa',
  displayName: 'Tinsa México IMIE',
  periodicity: 'quarterly',
  metrics: [
    {
      name: 'residential_price_index',
      unit: 'index_base_100',
      description: 'Índice de precios vivienda nueva residencial Tinsa (base=100)',
    },
    {
      name: 'residential_price_yoy',
      unit: 'pct_yoy',
      description: 'Variación anual precio vivienda residencial (% YoY)',
    },
    {
      name: 'residential_price_per_m2_mxn',
      unit: 'mxn_m2',
      description: 'Precio promedio ponderado por m² vivienda (MXN/m²)',
    },
    {
      name: 'valuation_count_quarterly',
      unit: 'units',
      description: 'Número de valuaciones trimestrales procesadas por Tinsa',
    },
  ],
  estimatedCostUsd: 0.01,
};

export async function ingestTinsaPdf(
  pdfBuffer: Buffer,
  options: IngestMarketPdfOptions = {},
): Promise<IngestResult> {
  return await ingestMarketPdfWithConfig(pdfBuffer, TINSA_CONFIG, options);
}
