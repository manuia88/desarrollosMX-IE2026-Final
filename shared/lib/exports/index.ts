import { toCsv } from './csv';
import { toLooker } from './looker';
import { toPowerBi } from './powerbi';
import { toTableau } from './tableau';
import type { ExportFormat, ExportPayload, ExportResponse } from './types';
import { toXlsx } from './xlsx';

export * from './types';

export function formatExport(format: ExportFormat, payload: ExportPayload): ExportResponse {
  switch (format) {
    case 'csv':
      return toCsv(payload);
    case 'xlsx':
      return toXlsx(payload);
    case 'powerbi':
      return toPowerBi(payload);
    case 'tableau':
      return toTableau(payload);
    case 'looker':
      return toLooker(payload);
  }
}
