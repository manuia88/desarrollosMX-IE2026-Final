// FASE 15.H.3 B.5 — BI Export real
// Formatters comparten input shape para garantizar consistencia entre tools.

export const EXPORT_FORMATS = ['powerbi', 'tableau', 'looker', 'csv', 'xlsx'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_ENTITIES = ['units', 'leads', 'operations', 'campaigns', 'all'] as const;
export type ExportEntity = (typeof EXPORT_ENTITIES)[number];

export type ExportRow = Readonly<Record<string, string | number | boolean | null>>;

export type ExportPayload = {
  readonly entity: ExportEntity;
  readonly rangeFrom: string | null;
  readonly rangeTo: string | null;
  readonly generatedAt: string;
  readonly source: 'v_bi_export_developer' | 'placeholder';
  readonly rows: ReadonlyArray<ExportRow>;
};

export type ExportResponse = {
  readonly contentType: string;
  readonly filename: string;
  readonly body: string | Uint8Array;
};
