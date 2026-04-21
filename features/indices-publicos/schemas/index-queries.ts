import { z } from 'zod';
import {
  COUNTRY_CODES,
  INDEX_CODES,
  PERIOD_TYPES,
  SCOPE_TYPES,
} from '../lib/index-registry-helpers';

export const indexCodeSchema = z.enum(INDEX_CODES);
export const scopeTypeSchema = z.enum(SCOPE_TYPES);
export const periodTypeSchema = z.enum(PERIOD_TYPES);
export const countryCodeSchema = z.enum(COUNTRY_CODES);

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const getRankingInput = z.object({
  indexCode: indexCodeSchema,
  scopeType: scopeTypeSchema.default('colonia'),
  countryCode: countryCodeSchema.default('MX'),
  periodDate: isoDateSchema.optional(),
  periodType: periodTypeSchema.default('monthly'),
  limit: z.number().int().min(1).max(500).default(100),
});
export type GetRankingInput = z.infer<typeof getRankingInput>;

export const getIndexDetailInput = z.object({
  indexCode: indexCodeSchema,
  scopeType: scopeTypeSchema,
  scopeId: z.string().min(1).max(128),
  countryCode: countryCodeSchema.default('MX'),
  periodDate: isoDateSchema.optional(),
});
export type GetIndexDetailInput = z.infer<typeof getIndexDetailInput>;

export const getMoversInput = z.object({
  countryCode: countryCodeSchema.default('MX'),
  scopeType: scopeTypeSchema.default('colonia'),
  periodDate: isoDateSchema.optional(),
  direction: z.enum(['up', 'down']).default('up'),
  limit: z.number().int().min(1).max(50).default(8),
});
export type GetMoversInput = z.infer<typeof getMoversInput>;

export const getBacktestInput = z.object({
  indexCode: indexCodeSchema,
  scopeType: scopeTypeSchema.default('colonia'),
  scopeIds: z.array(z.string().min(1).max(128)).min(1).max(4),
  countryCode: countryCodeSchema.default('MX'),
  from: isoDateSchema,
  to: isoDateSchema,
});
export type GetBacktestInput = z.infer<typeof getBacktestInput>;

export const getMethodologyInput = z.object({
  indexCode: indexCodeSchema.optional(),
});
export type GetMethodologyInput = z.infer<typeof getMethodologyInput>;

export const getAvailablePeriodsInput = z.object({
  indexCode: indexCodeSchema.optional(),
  countryCode: countryCodeSchema.default('MX'),
  periodType: periodTypeSchema.default('monthly'),
  limit: z.number().int().min(1).max(36).default(12),
});
export type GetAvailablePeriodsInput = z.infer<typeof getAvailablePeriodsInput>;
