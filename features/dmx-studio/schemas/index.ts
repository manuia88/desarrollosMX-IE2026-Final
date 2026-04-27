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

export const STUDIO_BRAND_FONTS = ['outfit', 'dm_sans', 'inter', 'playfair'] as const;
export const studioBrandFontEnum = z.enum(STUDIO_BRAND_FONTS);
export type StudioBrandFont = z.infer<typeof studioBrandFontEnum>;

export const upsertStudioBrandKitInput = z.object({
  displayName: z.string().trim().min(1).max(160).optional(),
  tagline: z.string().trim().max(280).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  fontPreference: studioBrandFontEnum.default('outfit'),
  tone: z
    .enum(['professional', 'luxury', 'friendly', 'energetic', 'minimal', 'editorial'])
    .default('professional'),
  zones: z.array(z.string().min(1).max(120)).max(20).default([]),
  cities: z.array(z.string().min(1).max(120)).max(10).default([]),
  contactPhone: z.string().trim().max(40).optional(),
  contactEmail: z.string().trim().email().max(254).optional(),
  introText: z.string().trim().max(120).optional(),
  outroText: z.string().trim().max(120).optional(),
});
export type UpsertStudioBrandKitInput = z.infer<typeof upsertStudioBrandKitInput>;

export const uploadBrandLogoInput = z.object({
  fileName: z.string().trim().min(1).max(160),
  contentType: z
    .enum(['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg'])
    .default('image/png'),
  sizeBytes: z.number().int().positive().max(2_000_000),
});
export type UploadBrandLogoInput = z.infer<typeof uploadBrandLogoInput>;

export const previewBrandMockupInput = z.object({
  brandKitId: z.string().uuid().optional(),
});

export const studioPublicGalleryBySlugInput = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
});

export const togglePublicGalleryInput = z.object({ active: z.boolean() });

// ================================================================
// FASE 14.F.2 Sprint 1 — Onboarding + Voice Clone schemas
// ================================================================

export const onboardingStep1Input = z.object({
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(7).max(40),
  city: z.string().trim().min(1).max(160),
  zones: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
});
export type OnboardingStep1Input = z.infer<typeof onboardingStep1Input>;

export const onboardingStep2Input = z.object({
  voiceSampleStoragePath: z.string().trim().min(1).max(512),
  voiceLanguage: z.string().trim().min(2).max(10).default('es-MX'),
  voiceName: z.string().trim().min(1).max(80),
  consentSigned: z.boolean(),
});
export type OnboardingStep2Input = z.infer<typeof onboardingStep2Input>;

export const onboardingStep3Input = z.object({
  acknowledgedDisclosure: z.boolean(),
});

export const uploadVoiceSampleInput = z.object({
  fileName: z.string().trim().min(1).max(160),
  contentType: z.string().trim().min(1).max(80),
  durationSeconds: z.number().min(3).max(120).optional(),
});

// ================================================================
// FASE 14.F.2 Sprint 1 — Project lifecycle schemas
// ================================================================

export const STUDIO_STYLE_TEMPLATE_KEYS = [
  'modern_cinematic',
  'luxe_editorial',
  'family_friendly',
  'investor_pitch',
  'minimal_clean',
] as const;
export const studioStyleTemplateKeyEnum = z.enum(STUDIO_STYLE_TEMPLATE_KEYS);
export type StudioStyleTemplateKey = z.infer<typeof studioStyleTemplateKeyEnum>;

export const STUDIO_PROJECT_TYPES = [
  'standard',
  'series',
  'reel',
  'story',
  'portrait',
  'documentary',
  'remarketing',
] as const;
export const studioProjectTypeEnum = z.enum(STUDIO_PROJECT_TYPES);

export const STUDIO_SPACE_TYPES = [
  'sala',
  'cocina',
  'recamara',
  'bano',
  'fachada',
  'exterior',
  'plano',
  'terraza',
  'amenidad',
  'otro',
] as const;
export const studioSpaceTypeEnum = z.enum(STUDIO_SPACE_TYPES);

export const createStudioProjectInput = z.object({
  title: z.string().trim().min(3).max(180),
  projectType: studioProjectTypeEnum.default('standard'),
  description: z.string().trim().max(2000).optional(),
  styleTemplateKey: studioStyleTemplateKeyEnum.default('modern_cinematic'),
  voiceCloneId: z.string().uuid().nullable().optional(),
  proyectoId: z.string().uuid().nullable().optional(),
  unidadId: z.string().uuid().nullable().optional(),
  captacionId: z.string().uuid().nullable().optional(),
  propertyData: z
    .object({
      price: z.number().nonnegative().nullable().optional(),
      currency: z.string().length(3).optional(),
      areaM2: z.number().positive().nullable().optional(),
      bedrooms: z.number().int().nonnegative().nullable().optional(),
      bathrooms: z.number().nonnegative().nullable().optional(),
      parking: z.number().int().nonnegative().nullable().optional(),
      zone: z.string().trim().max(120).optional(),
      amenities: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    })
    .optional(),
});
export type CreateStudioProjectInput = z.infer<typeof createStudioProjectInput>;

export const uploadProjectAssetInput = z.object({
  projectId: z.string().uuid(),
  storagePath: z.string().trim().min(1).max(512),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1).max(80),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  orderIndex: z.number().int().nonnegative().default(0),
});

export const reorderProjectAssetsInput = z.object({
  projectId: z.string().uuid(),
  assetOrder: z.array(z.string().uuid()).min(1).max(30),
});

export const generateDirectorBriefInput = z.object({
  projectId: z.string().uuid(),
});

export const generateVideoInput = z.object({
  projectId: z.string().uuid(),
});

export const projectStatusInput = z.object({
  projectId: z.string().uuid(),
});

export const selectHookVariantInput = z.object({
  projectId: z.string().uuid(),
  hookVariant: z.enum(['hook_a', 'hook_b', 'hook_c']),
});

export const submitProjectFeedbackInput = z.object({
  projectId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  selectedHook: z.enum(['hook_a', 'hook_b', 'hook_c']).optional(),
  preferredFormat: z.enum(['9x16', '1x1', '16x9']).optional(),
  comments: z.string().trim().max(2000).optional(),
  wouldRecommend: z.boolean().optional(),
});

export const projectByIdInput = z.object({
  projectId: z.string().uuid(),
});

export const listProjectsInput = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
  status: z
    .enum(['draft', 'scripting', 'rendering', 'rendered', 'published', 'archived', 'failed'])
    .optional(),
});

// ================================================================
// FASE 14.F.3 Sprint 2 — Library, Usage, Multi-format schemas
// ================================================================

export const STUDIO_LIBRARY_DATE_RANGES = ['7d', '30d', '90d', 'all'] as const;
export const studioLibraryDateRangeEnum = z.enum(STUDIO_LIBRARY_DATE_RANGES);
export type StudioLibraryDateRange = z.infer<typeof studioLibraryDateRangeEnum>;

export const STUDIO_VIDEO_FORMATS = ['9x16', '1x1', '16x9'] as const;
export const studioVideoFormatEnum = z.enum(STUDIO_VIDEO_FORMATS);
export type StudioVideoFormatSchema = z.infer<typeof studioVideoFormatEnum>;

export const listLibraryInput = z.object({
  limit: z.number().int().min(1).max(50).default(24),
  cursor: z.string().uuid().optional(),
  projectType: studioProjectTypeEnum.optional(),
  format: studioVideoFormatEnum.optional(),
  dateRange: studioLibraryDateRangeEnum.default('all'),
  search: z.string().trim().max(120).optional(),
});
export type ListLibraryInput = z.infer<typeof listLibraryInput>;

export const bulkLibraryActionInput = z.object({
  videoOutputIds: z.array(z.string().uuid()).min(1).max(50),
});
export type BulkLibraryActionInput = z.infer<typeof bulkLibraryActionInput>;

export const deleteLibraryVideoInput = z.object({
  videoOutputId: z.string().uuid(),
});

export const usageHistoryInput = z.object({
  monthsBack: z.number().int().min(1).max(12).default(6),
});
export type UsageHistoryInput = z.infer<typeof usageHistoryInput>;

export const generateAdditionalFormatsInput = z.object({
  projectId: z.string().uuid(),
  hookVariant: z.enum(['hook_a', 'hook_b', 'hook_c']),
  enableBeatSync: z.boolean().default(false),
});
export type GenerateAdditionalFormatsInput = z.infer<typeof generateAdditionalFormatsInput>;

export const applyBrandingOverlayInput = z.object({
  projectId: z.string().uuid(),
  videoOutputId: z.string().uuid(),
  branded: z.boolean(),
});
export type ApplyBrandingOverlayInput = z.infer<typeof applyBrandingOverlayInput>;
