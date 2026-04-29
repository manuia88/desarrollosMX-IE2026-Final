import type { ExportPayload, ExportResponse } from './types';

// Looker Studio Community Connector JSON shape: schema + data array.
export function toLooker(payload: ExportPayload): ExportResponse {
  const sample = payload.rows[0] ?? {};
  const schema = Object.keys(sample).map((name) => ({
    name,
    label: name,
    dataType: typeof sample[name] === 'number' ? 'NUMBER' : 'STRING',
    semantics: { conceptType: typeof sample[name] === 'number' ? 'METRIC' : 'DIMENSION' },
  }));
  const body = JSON.stringify(
    {
      schema,
      rows: payload.rows.map((row) => ({ values: Object.values(row) })),
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
    filename: `dmx-looker-${payload.entity}-${payload.generatedAt.slice(0, 10)}.json`,
    body,
  };
}
