import { z } from 'zod';

const scoreCodeSchema = z
  .string()
  .min(2)
  .max(12)
  .regex(/^[A-Z][A-Z0-9]+$/, 'score_code must be uppercase alphanumeric (e.g. F08, N01, A12)');

const countryCodeSchema = z
  .string()
  .length(2)
  .regex(/^[A-Z]{2}$/);

export const ieScoresListInput = z.object({
  zone_id: z.string().uuid(),
  score_codes: z.array(scoreCodeSchema).min(1).max(32).optional(),
  country_code: countryCodeSchema.default('MX'),
  period_date: z.string().date().optional(),
});
export type IEScoresListInput = z.infer<typeof ieScoresListInput>;

export const ieScoresGetByZoneInput = z.object({
  zone_id: z.string().uuid(),
  country_code: countryCodeSchema.default('MX'),
  period_date: z.string().date().optional(),
  levels: z.array(z.number().int().min(0).max(5)).optional(),
});
export type IEScoresGetByZoneInput = z.infer<typeof ieScoresGetByZoneInput>;

export const ieScoresGetDependenciesInput = z.object({
  score_id: scoreCodeSchema,
});
export type IEScoresGetDependenciesInput = z.infer<typeof ieScoresGetDependenciesInput>;

export const ieScoresGetHistoryInput = z.object({
  zone_id: z.string().uuid(),
  score_code: scoreCodeSchema,
  country_code: countryCodeSchema.default('MX'),
  from: z.string().date(),
  to: z.string().date(),
});
export type IEScoresGetHistoryInput = z.infer<typeof ieScoresGetHistoryInput>;
