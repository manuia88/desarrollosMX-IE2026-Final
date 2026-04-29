import type { ExportPayload, ExportResponse } from './types';

// Power BI ingest-friendly JSON: array of records con metadatos de schema.
// Compatible con `Get Data → Web` (Power Query M).
export function toPowerBi(payload: ExportPayload): ExportResponse {
  const sample = payload.rows[0] ?? {};
  const fields = Object.keys(sample).map((name) => ({
    name,
    dataType: typeof sample[name] === 'number' ? 'number' : 'string',
  }));
  const body = JSON.stringify(
    {
      schema: {
        entity: payload.entity,
        fields,
        source: payload.source,
        generatedAt: payload.generatedAt,
        rangeFrom: payload.rangeFrom,
        rangeTo: payload.rangeTo,
      },
      data: payload.rows,
    },
    null,
    2,
  );
  return {
    contentType: 'application/json; charset=utf-8',
    filename: `dmx-powerbi-${payload.entity}-${payload.generatedAt.slice(0, 10)}.json`,
    body,
  };
}
