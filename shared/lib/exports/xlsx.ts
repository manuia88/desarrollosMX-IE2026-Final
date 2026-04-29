import * as XLSX from 'xlsx';
import type { ExportPayload, ExportResponse } from './types';

export function toXlsx(payload: ExportPayload): ExportResponse {
  const rows = payload.rows;
  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? [...rows] : [{}]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, payload.entity);
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      [`Source: ${payload.source}`],
      [`Generated: ${payload.generatedAt}`],
      [`Range: ${payload.rangeFrom ?? '*'} → ${payload.rangeTo ?? '*'}`],
    ],
    { origin: -1 },
  );
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `dmx-${payload.entity}-${payload.generatedAt.slice(0, 10)}.xlsx`,
    body: new Uint8Array(buffer),
  };
}
