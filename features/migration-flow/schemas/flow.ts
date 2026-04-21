import { z } from 'zod';

export const migrationScopeTypeSchema = z.enum(['colonia', 'alcaldia', 'city', 'estado']);
export const migrationDirectionSchema = z.enum(['inflow', 'outflow']);
export const migrationCountryCodeSchema = z.string().length(2).default('MX');
export const migrationIsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

// ------------- tRPC inputs -------------

export const getFlowsForZoneInput = z.object({
  zoneId: z.string().min(1).max(128),
  scopeType: migrationScopeTypeSchema.default('colonia'),
  direction: migrationDirectionSchema,
  country: migrationCountryCodeSchema,
  periodDate: migrationIsoDateSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type GetFlowsForZoneInput = z.infer<typeof getFlowsForZoneInput>;

export const getTopFlowsInput = z.object({
  country: migrationCountryCodeSchema,
  scopeType: migrationScopeTypeSchema.default('colonia'),
  limit: z.number().int().min(1).max(100).default(10),
  periodDate: migrationIsoDateSchema.optional(),
  incomeDecileMin: z.number().int().min(1).max(10).optional(),
  incomeDecileMax: z.number().int().min(1).max(10).optional(),
});
export type GetTopFlowsInput = z.infer<typeof getTopFlowsInput>;

export const getFlowMapInput = z.object({
  country: migrationCountryCodeSchema,
  scopeType: migrationScopeTypeSchema.default('colonia'),
  periodDate: migrationIsoDateSchema.optional(),
  limit: z.number().int().min(1).max(500).default(200),
  incomeDecileMin: z.number().int().min(1).max(10).optional(),
  incomeDecileMax: z.number().int().min(1).max(10).optional(),
});
export type GetFlowMapInput = z.infer<typeof getFlowMapInput>;

// ------------- Row schemas (parse BD output) -------------

export const migrationSourceMixSchema = z.object({
  rpp: z.number().min(0),
  inegi: z.number().min(0),
  ine: z.number().min(0),
  linkedin: z.number().min(0),
});

export const migrationFlowRowSchema = z.object({
  id: z.string(),
  origin_scope_type: migrationScopeTypeSchema,
  origin_scope_id: z.string(),
  dest_scope_type: migrationScopeTypeSchema,
  dest_scope_id: z.string(),
  country_code: z.string(),
  period_date: z.string(),
  volume: z.number().int().min(0),
  confidence: z.number().nullable(),
  source_mix: migrationSourceMixSchema,
  income_decile_origin: z.number().int().nullable(),
  income_decile_dest: z.number().int().nullable(),
  calculated_at: z.string(),
});

export const migrationFlowPublicRowSchema = migrationFlowRowSchema.omit({
  id: true,
  calculated_at: true,
});
