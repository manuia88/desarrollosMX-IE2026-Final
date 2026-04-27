import { z } from 'zod';

export const LANDING_TEMPLATES = ['hero', 'grid', 'long-form', 'single-project'] as const;
export const landingTemplateEnum = z.enum(LANDING_TEMPLATES);
export type LandingTemplate = z.infer<typeof landingTemplateEnum>;

export const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const brandColorsSchema = z.object({
  primary: hexColor,
  accent: hexColor.optional(),
});
export type BrandColors = z.infer<typeof brandColorsSchema>;

export const landingCopySchema = z.object({
  headline: z.string().min(1).max(120),
  subheadline: z.string().max(240).optional(),
  cta: z.string().min(1).max(40),
});
export type LandingCopy = z.infer<typeof landingCopySchema>;

export const seoMetaSchema = z
  .object({
    title: z.string().max(70).optional(),
    description: z.string().max(160).optional(),
  })
  .optional();
export type SeoMeta = z.infer<typeof seoMetaSchema>;

export const slugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be kebab-case lowercase');

export const createLandingInput = z.object({
  countryCode: z.string().length(2).default('MX'),
  slug: slugSchema,
  template: landingTemplateEnum,
  projectIds: z.array(z.string().uuid()).min(1).max(20),
  brandColors: brandColorsSchema,
  copy: landingCopySchema,
  seoMeta: seoMetaSchema,
});
export type CreateLandingInput = z.infer<typeof createLandingInput>;

export const updateLandingInput = z.object({
  id: z.string().uuid(),
  template: landingTemplateEnum.optional(),
  projectIds: z.array(z.string().uuid()).min(1).max(20).optional(),
  brandColors: brandColorsSchema.optional(),
  copy: landingCopySchema.optional(),
  seoMeta: seoMetaSchema,
  isPublished: z.boolean().optional(),
});
export type UpdateLandingInput = z.infer<typeof updateLandingInput>;

export const listLandingsInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  isPublished: z.boolean().optional(),
});
export type ListLandingsInput = z.infer<typeof listLandingsInput>;

export const getLandingByIdInput = z.object({
  id: z.string().uuid(),
});
export type GetLandingByIdInput = z.infer<typeof getLandingByIdInput>;

export const deleteLandingInput = z.object({
  id: z.string().uuid(),
});
export type DeleteLandingInput = z.infer<typeof deleteLandingInput>;

export const getAnalyticsInput = z.object({
  landingId: z.string().uuid(),
  daysBack: z.number().int().min(1).max(365).default(30),
});
export type GetAnalyticsInput = z.infer<typeof getAnalyticsInput>;

export const LANDING_EVENT_TYPES = ['page_view', 'click_cta', 'lead_submit'] as const;
export const landingEventTypeEnum = z.enum(LANDING_EVENT_TYPES);
export type LandingEventType = z.infer<typeof landingEventTypeEnum>;

export const recordLandingEventInput = z.object({
  landingId: z.string().uuid(),
  eventType: landingEventTypeEnum,
  utmSource: z.string().max(80).optional(),
  utmMedium: z.string().max(80).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmContent: z.string().max(120).optional(),
  utmTerm: z.string().max(120).optional(),
  referer: z.string().max(500).optional(),
  countryCode: z.string().length(2).optional(),
});
export type RecordLandingEventInput = z.infer<typeof recordLandingEventInput>;
