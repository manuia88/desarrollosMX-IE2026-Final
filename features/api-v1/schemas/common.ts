// Shared Zod schemas for the public REST API v1.
// Single Source of Truth (regla 1 CLAUDE.md) — usado por input validation,
// response validation y OpenAPI generator.

import { z } from 'zod';
import { API_TIERS } from '../types';

export const apiTierSchema = z.enum(API_TIERS);

export const scopeTypeSchema = z.enum(['colonia', 'alcaldia', 'city', 'estado']);
export type ScopeType = z.infer<typeof scopeTypeSchema>;

export const indexCodeSchema = z.enum([
  'IPV',
  'IAB',
  'IDS',
  'IRE',
  'ICO',
  'MOM',
  'LIV',
  'FAM',
  'YNG',
  'GRN',
  'STR',
  'INV',
  'DEV',
  'GNT',
  'STA',
]);
export type IndexCode = z.infer<typeof indexCodeSchema>;

export const countryCodeSchema = z.enum(['MX', 'CO', 'AR', 'BR', 'US']);
export type CountryCode = z.infer<typeof countryCodeSchema>;

export const isoYearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'expected YYYY-MM');
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const paginationParamsSchema = z.object({
  limit: z.number().int().min(1).max(500).default(100),
  cursor: z.string().nullable().default(null),
});

export const apiKeyRawSchema = z
  .string()
  .min(16)
  .max(128)
  .regex(/^dmx_[a-f0-9]+$/i, 'expected dmx_<hex> format');

export const apiErrorBodySchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.unknown().optional(),
  tier: apiTierSchema.optional(),
  reset_at: z.string().optional(),
});
