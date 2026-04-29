import Papa from 'papaparse';
import type { ExportPayload, ExportResponse } from './types';

export function toCsv(payload: ExportPayload): ExportResponse {
  const rows = payload.rows.map((r) => ({ ...r }));
  const csv = Papa.unparse(rows.length > 0 ? rows : [{}], {
    header: true,
    quotes: true,
    skipEmptyLines: true,
  });
  return {
    contentType: 'text/csv; charset=utf-8',
    filename: `dmx-${payload.entity}-${payload.generatedAt.slice(0, 10)}.csv`,
    body: csv,
  };
}
