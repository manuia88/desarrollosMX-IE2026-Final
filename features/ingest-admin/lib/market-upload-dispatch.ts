// Dispatcher admin uploads de reports mercado (Cushman/CBRE/Tinsa/JLL/Softec).
// Separado de upload-dispatch.ts (macro) para aislar dominio + UX (dropdown
// distinto). Usado por /api/admin/ingest/market/upload.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.E.4 / §7.E.8

import { ingestCbrePdf } from '@/shared/lib/ingest/market/cbre';
import { ingestCushmanPdf } from '@/shared/lib/ingest/market/cushman';
import { ingestJllPdf } from '@/shared/lib/ingest/market/jll';
import { ingestSoftecPdf } from '@/shared/lib/ingest/market/softec';
import { ingestTinsaPdf } from '@/shared/lib/ingest/market/tinsa';
import type { IngestResult } from '@/shared/lib/ingest/types';

export const MARKET_UPLOAD_SOURCES = ['cushman', 'cbre', 'tinsa', 'jll', 'softec'] as const;
export type MarketUploadSource = (typeof MARKET_UPLOAD_SOURCES)[number];

export interface MarketUploadDispatchInput {
  source: MarketUploadSource;
  buffer: Buffer;
  uploadedByProfileId: string;
}

export const MARKET_SOURCE_LABELS: Record<MarketUploadSource, string> = {
  cushman: 'Cushman & Wakefield — MarketBeat (PDF trimestral)',
  cbre: 'CBRE — MarketView México (PDF trimestral)',
  tinsa: 'Tinsa — IMIE residencial México (PDF trimestral)',
  jll: 'JLL — Office Pulse México (PDF trimestral)',
  softec: 'Softec — Residencial México (PDF trimestral)',
};

export const MARKET_ACCEPTED_MIME: Record<MarketUploadSource, readonly string[]> = {
  cushman: ['application/pdf'],
  cbre: ['application/pdf'],
  tinsa: ['application/pdf'],
  jll: ['application/pdf'],
  softec: ['application/pdf'],
};

export function isMarketUploadSource(value: string): value is MarketUploadSource {
  return (MARKET_UPLOAD_SOURCES as readonly string[]).includes(value);
}

export async function dispatchMarketUpload(
  input: MarketUploadDispatchInput,
): Promise<IngestResult> {
  const triggeredBy = `admin:upload:market:${input.uploadedByProfileId}`;
  switch (input.source) {
    case 'cushman':
      return await ingestCushmanPdf(input.buffer, { triggeredBy });
    case 'cbre':
      return await ingestCbrePdf(input.buffer, { triggeredBy });
    case 'tinsa':
      return await ingestTinsaPdf(input.buffer, { triggeredBy });
    case 'jll':
      return await ingestJllPdf(input.buffer, { triggeredBy });
    case 'softec':
      return await ingestSoftecPdf(input.buffer, { triggeredBy });
  }
}
