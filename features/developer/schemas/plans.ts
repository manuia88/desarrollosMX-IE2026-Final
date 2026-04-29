import { z } from 'zod';

// FASE 15.H — Developer plans (4 tiers shipped seeds: dev_free/dev_starter/dev_pro/dev_enterprise)
export const DEV_PLAN_CODES = ['dev_free', 'dev_starter', 'dev_pro', 'dev_enterprise'] as const;
export const devPlanCodeEnum = z.enum(DEV_PLAN_CODES);
export type DevPlanCode = z.infer<typeof devPlanCodeEnum>;

export const planFeaturesSummary = z
  .object({
    api_access: z.boolean().optional(),
    bi_export: z.boolean().optional(),
    storage_gb: z.number().optional(),
    projects_max: z.number().optional(),
    studio_bundled: z.boolean().optional(),
    studio_tier: z.string().optional(),
    predictions_tab: z.boolean().optional(),
    competitive_intel: z.boolean().optional(),
    pricing_autopilot: z.boolean().optional(),
    drive_monitors_max: z.number().optional(),
    absorption_forecast: z.boolean().optional(),
    ai_extractions_month: z.number().optional(),
    custom_pricing: z.boolean().optional(),
  })
  .passthrough();
export type PlanFeaturesSummary = z.infer<typeof planFeaturesSummary>;

export const planRow = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  audience: z.string(),
  monthlyPriceMinor: z.number().int().nullable(),
  yearlyPriceMinor: z.number().int().nullable(),
  currency: z.string(),
  trialDays: z.number().int().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().nullable(),
  featuresSummary: planFeaturesSummary,
});
export type PlanRow = z.infer<typeof planRow>;

export const switchPlanInput = z.object({
  planCode: devPlanCodeEnum,
});
export type SwitchPlanInput = z.infer<typeof switchPlanInput>;
