import { z } from 'zod';
import { CITATION_TYPES, INDEX_CODES } from '@/shared/types/scores';

export const scopeTypeSchema = z.enum(['colonia', 'alcaldia', 'city', 'estado']);
export const indexCodeSchema = z.enum(INDEX_CODES);
export const citationTypeSchema = z.enum(CITATION_TYPES);

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const citationSchema = z.object({
  ref_id: z.string().min(1).max(200),
  type: citationTypeSchema,
  label: z.string().min(1).max(200),
  value: z.union([z.string(), z.number(), z.null()]),
  source: z.string().min(1).max(200),
  href: z.string().max(500).nullable().optional(),
  as_of: z.string().max(40).nullable().optional(),
});

// tRPC input: read an explanation (generate-on-miss).
export const getCausalExplanationInput = z.object({
  scoreId: z.string().min(1).max(128),
  indexCode: indexCodeSchema,
  scopeType: scopeTypeSchema,
  scopeId: z.string().min(1).max(128),
  periodDate: isoDateSchema.optional(),
});
export type GetCausalExplanationInput = z.infer<typeof getCausalExplanationInput>;

// tRPC mutation input: force regenerate (authenticated only).
export const regenerateCausalExplanationInput = getCausalExplanationInput.extend({
  scoreId: z.string().min(1).max(128),
});
export type RegenerateCausalExplanationInput = z.infer<typeof regenerateCausalExplanationInput>;

// Raw LLM JSON output (before citation validation).
export const llmOutputSchema = z.object({
  explanation_md: z.string().min(40).max(4000),
  citations: z.array(citationSchema).min(1).max(20),
});
export type LLMOutputParsed = z.infer<typeof llmOutputSchema>;
