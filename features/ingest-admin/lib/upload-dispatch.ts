// Dispatcher para admin uploads — mapea source string a ingest function +
// formato esperado del archivo. Usado por /api/admin/ingest/upload.
//
// Refs: docs/02_PLAN_MAESTRO/FASE_07_INGESTA_DATOS.md §7.H

import { ingestBbvaPdf } from '@/shared/lib/ingest/macro/bbva-research';
import { ingestCnbvCsv } from '@/shared/lib/ingest/macro/cnbv';
import { ingestFovisssteXlsx, ingestFovisstePdf } from '@/shared/lib/ingest/macro/fovissste';
import { ingestInfonavitCsv } from '@/shared/lib/ingest/macro/infonavit';
import { ingestShfXlsx } from '@/shared/lib/ingest/macro/shf';
import type { IngestResult } from '@/shared/lib/ingest/types';

export const ADMIN_UPLOAD_SOURCES = [
  'shf',
  'bbva_research',
  'cnbv',
  'infonavit',
  'fovissste_xlsx',
  'fovissste_pdf',
] as const;
export type AdminUploadSource = (typeof ADMIN_UPLOAD_SOURCES)[number];

export interface UploadDispatchInput {
  source: AdminUploadSource;
  buffer: Buffer;
  uploadedByProfileId: string;
}

export const SOURCE_LABELS: Record<AdminUploadSource, string> = {
  shf: 'SHF — IPV trimestral (XLSX)',
  bbva_research: 'BBVA Research — Situación Inmobiliaria (PDF)',
  cnbv: 'CNBV — Cartera hipotecaria mensual (CSV)',
  infonavit: 'Infonavit — Créditos otorgados (CSV)',
  fovissste_xlsx: 'FOVISSSTE — XLSX trimestral',
  fovissste_pdf: 'FOVISSSTE — Informe PDF trimestral',
};

export const ACCEPTED_MIME: Record<AdminUploadSource, readonly string[]> = {
  shf: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  bbva_research: ['application/pdf'],
  cnbv: ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'],
  infonavit: ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'],
  fovissste_xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  fovissste_pdf: ['application/pdf'],
};

export function isAdminUploadSource(value: string): value is AdminUploadSource {
  return (ADMIN_UPLOAD_SOURCES as readonly string[]).includes(value);
}

export async function dispatchAdminUpload(input: UploadDispatchInput): Promise<IngestResult> {
  const triggeredBy = `admin:upload:${input.uploadedByProfileId}`;
  switch (input.source) {
    case 'shf':
      return await ingestShfXlsx(input.buffer, { triggeredBy });
    case 'bbva_research':
      return await ingestBbvaPdf(input.buffer, { triggeredBy });
    case 'cnbv':
      return await ingestCnbvCsv(input.buffer.toString('utf8'), { triggeredBy });
    case 'infonavit':
      return await ingestInfonavitCsv(input.buffer.toString('utf8'), { triggeredBy });
    case 'fovissste_xlsx':
      return await ingestFovisssteXlsx(input.buffer, { triggeredBy });
    case 'fovissste_pdf':
      return await ingestFovisstePdf(input.buffer, { triggeredBy });
  }
}
