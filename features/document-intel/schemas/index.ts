// FASE 17.B Document Intelligence — Zod schemas (Single Source of Truth)
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3

import { z } from 'zod';

export const DOC_TYPE = [
  'planos_arquitectonicos',
  'memoria_descriptiva',
  'escritura',
  'permiso_seduvi',
  'carta_credito_construccion',
  'estudio_suelo',
  'factibilidad_federal',
  'licencia_construccion',
  'aviso_terminacion',
  'constancia_uso_suelo',
  'predial',
  'plano_loteo',
  'poder_notarial',
  'contrato_compra_venta',
  'constancia_situacion_fiscal',
  'acta_constitutiva',
  'lista_precios',
  'brochure',
  'foto_render',
  'plano_comercial',
  'otro',
] as const;
export type DocType = (typeof DOC_TYPE)[number];

export const docTypeEnum = z.enum(DOC_TYPE);

export const visibilityEnum = z.enum(['dev_only', 'asesor_visible', 'public_derived']);
export type Visibility = z.infer<typeof visibilityEnum>;

export const jobStatusEnum = z.enum([
  'uploaded',
  'ocr_processing',
  'ocr_done',
  'extracting',
  'extracted',
  'validating',
  'validated',
  'approved',
  'rejected',
  'error',
  'duplicate_skipped',
]);
export type JobStatus = z.infer<typeof jobStatusEnum>;

export const qualityScoreEnum = z.enum(['green', 'amber', 'red']);

export const citationSchema = z.object({
  field: z.string().min(1),
  page: z.number().int().min(1).nullable(),
  paragraph: z.number().int().min(1).nullable(),
  snippet: z.string().min(1).nullable(),
});
export type Citation = z.infer<typeof citationSchema>;

export const extractionResultSchema = z.object({
  extracted_data: z.record(z.string(), z.unknown()),
  citations: z.array(citationSchema),
  confidence: z.number().min(0).max(1),
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export const createJobInput = z.object({
  doc_type: docTypeEnum,
  proyecto_id: z.string().uuid().optional(),
  unidad_id: z.string().uuid().optional(),
  storage_path: z.string().min(1),
  original_filename: z.string().min(1),
  file_size_bytes: z.number().int().min(0),
  mime_type: z.string().min(1),
  page_count: z.number().int().min(1).optional(),
  drive_source_file_id: z.string().optional(),
  visibility: visibilityEnum.default('dev_only'),
});
export type CreateJobInput = z.infer<typeof createJobInput>;

export const getJobInput = z.object({ id: z.string().uuid() });
export type GetJobInput = z.infer<typeof getJobInput>;

export const listMyJobsInput = z.object({
  proyecto_id: z.string().uuid().optional(),
  status: jobStatusEnum.optional(),
  doc_type: docTypeEnum.optional(),
  limit: z.number().int().min(1).max(200).default(50),
});
export type ListMyJobsInput = z.infer<typeof listMyJobsInput>;

export const requestExtractionInput = z.object({ jobId: z.string().uuid() });
export type RequestExtractionInput = z.infer<typeof requestExtractionInput>;

export const getExtractedDataInput = z.object({ jobId: z.string().uuid() });
export type GetExtractedDataInput = z.infer<typeof getExtractedDataInput>;

export const adminGrantCreditsInput = z.object({
  desarrolladora_id: z.string().uuid(),
  amount_usd: z.number().min(0).max(10_000),
  description: z.string().min(1).max(500).optional(),
});
export type AdminGrantCreditsInput = z.infer<typeof adminGrantCreditsInput>;
