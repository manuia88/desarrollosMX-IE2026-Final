import { z } from 'zod';

export const VALIDATION_SEVERITY = ['info', 'warning', 'error', 'critical'] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITY)[number];

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

export const QUALITY_SCORE = ['green', 'amber', 'red'] as const;
export type QualityScore = (typeof QUALITY_SCORE)[number];

export const validationRuleResultSchema = z.object({
  pass: z.boolean(),
  message: z.string().optional(),
  field: z.string().optional(),
  expected: z.string().optional(),
  actual: z.string().optional(),
});
export type ValidationRuleResult = z.infer<typeof validationRuleResultSchema>;

export const validationFindingSchema = z.object({
  rule_code: z.string().min(1),
  severity: z.enum(VALIDATION_SEVERITY),
  message: z.string().min(1),
  field_path: z.string().nullable(),
  expected_value: z.string().nullable(),
  actual_value: z.string().nullable(),
});
export type ValidationFinding = z.infer<typeof validationFindingSchema>;

export const validationRecordSchema = validationFindingSchema.extend({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  resolved_at: z.string().nullable(),
  resolved_by: z.string().uuid().nullable(),
  resolution_note: z.string().nullable(),
  created_at: z.string(),
});
export type ValidationRecord = z.infer<typeof validationRecordSchema>;

export const qualityScoreResultSchema = z.object({
  score: z.enum(QUALITY_SCORE),
  numeric: z.number().min(0).max(100),
});
export type QualityScoreResult = z.infer<typeof qualityScoreResultSchema>;

export const dedupeResultSchema = z.object({
  duplicate: z.boolean(),
  existingJobId: z.string().uuid().optional(),
});
export type DedupeResult = z.infer<typeof dedupeResultSchema>;
