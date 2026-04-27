import { z } from 'zod';

export const STUDIO_PLAN_KEYS = ['pro', 'foto', 'agency'] as const;
export const studioPlanKeyEnum = z.enum(STUDIO_PLAN_KEYS);
export type StudioPlanKeySchema = z.infer<typeof studioPlanKeyEnum>;

export const STUDIO_SUBSCRIPTION_STATUS = [
  'incomplete',
  'active',
  'past_due',
  'canceled',
  'trialing',
  'unpaid',
  'paused',
] as const;
export const studioSubscriptionStatusEnum = z.enum(STUDIO_SUBSCRIPTION_STATUS);
export type StudioSubscriptionStatus = z.infer<typeof studioSubscriptionStatusEnum>;

export const STUDIO_WAITLIST_ROLE = [
  'asesor',
  'admin_desarrolladora',
  'broker',
  'photographer',
  'investor',
  'other',
] as const;
export const studioWaitlistRoleEnum = z.enum(STUDIO_WAITLIST_ROLE);

export const createStudioCheckoutInput = z.object({
  planKey: studioPlanKeyEnum,
  successPath: z.string().min(1).max(512).default('/studio/welcome'),
  cancelPath: z.string().min(1).max(512).default('/studio'),
});
export type CreateStudioCheckoutInput = z.infer<typeof createStudioCheckoutInput>;

export const studioPortalInput = z.object({
  returnPath: z.string().min(1).max(512).default('/studio/account'),
});
export type StudioPortalInput = z.infer<typeof studioPortalInput>;

export const joinStudioWaitlistInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(1).max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  role: studioWaitlistRoleEnum.default('asesor'),
  city: z.string().trim().max(160).optional(),
  countryCode: z.string().length(2).toUpperCase().default('MX'),
  utmSource: z.string().trim().max(80).optional(),
  utmMedium: z.string().trim().max(80).optional(),
  utmCampaign: z.string().trim().max(160).optional(),
});
export type JoinStudioWaitlistInput = z.infer<typeof joinStudioWaitlistInput>;

export const upsertStudioBrandKitInput = z.object({
  displayName: z.string().trim().min(1).max(160).optional(),
  tagline: z.string().trim().max(280).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  tone: z
    .enum(['professional', 'luxury', 'friendly', 'energetic', 'minimal', 'editorial'])
    .default('professional'),
  zones: z.array(z.string().min(1).max(120)).max(20).default([]),
  cities: z.array(z.string().min(1).max(120)).max(10).default([]),
  contactPhone: z.string().trim().max(40).optional(),
  contactEmail: z.string().trim().email().max(254).optional(),
});
export type UpsertStudioBrandKitInput = z.infer<typeof upsertStudioBrandKitInput>;

export const studioPublicGalleryBySlugInput = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
});

export const togglePublicGalleryInput = z.object({ active: z.boolean() });
