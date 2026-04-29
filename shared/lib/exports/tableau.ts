import type { ExportPayload, ExportResponse } from './types';

// Tableau Web Data Connector (WDC) JSON shape:
// { tables: [{ id, alias, columns: [{id, dataType}], rows: [...] }] }
export function toTableau(payload: ExportPayload): ExportResponse {
  const sample = payload.rows[0] ?? {};
  const columns = Object.keys(sample).map((id) => ({
    id,
    alias: id,
    dataType: typeof sample[id] === 'number' ? 'float' : 'string',
  }));
  const tableId = `dmx_${payload.entity}`;
  const body = JSON.stringify(
    {
      tables: [
        {
          id: tableId,
          alias: `DMX ${payload.entity}`,
          columns,
          rows: payload.rows,
        },
      ],
      meta: {
        source: payload.source,
        generatedAt: payload.generatedAt,
        rangeFrom: payload.rangeFrom,
        rangeTo: payload.rangeTo,
      },
    },
    null,
    2,
  );
  return {
    contentType: 'application/json; charset=utf-8',
    filename: `dmx-tableau-${payload.entity}-${payload.generatedAt.slice(0, 10)}.json`,
    body,
  };
}
