import { z } from 'zod';

export const AVATAR_VARIANT_STYLES = ['formal', 'casual', 'branded'] as const;
export const avatarVariantStyleEnum = z.enum(AVATAR_VARIANT_STYLES);
export type AvatarVariantStyle = z.infer<typeof avatarVariantStyleEnum>;

export const startAvatarOnboardingInput = z.object({
  photoStoragePath: z.string().min(1).max(512),
  voiceSampleStoragePath: z.string().min(1).max(512),
  linkedVoiceCloneId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
});
export type StartAvatarOnboardingInput = z.infer<typeof startAvatarOnboardingInput>;

export const avatarStatusInput = z.object({
  avatarId: z.string().uuid(),
});

export const generateAvatarVariantsInput = z.object({
  avatarId: z.string().uuid(),
  styles: z.array(avatarVariantStyleEnum).min(1).max(3),
});
export type GenerateAvatarVariantsInput = z.infer<typeof generateAvatarVariantsInput>;

export const setDefaultAvatarVariantInput = z.object({
  variantId: z.string().uuid(),
});

export const deleteAvatarInput = z.object({
  avatarId: z.string().uuid(),
});

export const REFERRAL_INTEREST_TYPES = ['comprar', 'vender', 'rentar', 'asesoria', 'otro'] as const;
export const referralInterestTypeEnum = z.enum(REFERRAL_INTEREST_TYPES);

export const REFERRAL_SOURCES = [
  'studio_gallery',
  'studio_video_share',
  'studio_zone_heatmap',
] as const;
export const referralSourceEnum = z.enum(REFERRAL_SOURCES);

export const submitReferralFormInput = z.object({
  asesorSlug: z.string().min(1).max(120),
  source: referralSourceEnum.default('studio_gallery'),
  sourceVideoId: z.string().uuid().optional(),
  submittedName: z.string().trim().min(1).max(160),
  submittedEmail: z.string().trim().toLowerCase().email().max(254),
  submittedPhone: z.string().trim().max(40).optional(),
  submittedMessage: z.string().trim().max(2000).optional(),
  submittedInterestType: referralInterestTypeEnum.optional(),
});
export type SubmitReferralFormInput = z.infer<typeof submitReferralFormInput>;

export const recordGalleryViewInput = z.object({
  asesorSlug: z.string().min(1).max(120),
  videoId: z.string().uuid().optional(),
  referer: z.string().max(2048).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(180).optional(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  deviceType: z.enum(['desktop', 'mobile', 'tablet', 'bot', 'unknown']).default('unknown'),
});
export type RecordGalleryViewInput = z.infer<typeof recordGalleryViewInput>;

export const analyticsRangeInput = z.object({
  monthsBack: z.number().int().min(1).max(24).default(1),
});

export const analyticsPerVideoInput = z.object({
  videoId: z.string().uuid(),
});

export const exportAnalyticsPdfInput = analyticsRangeInput;

export const generateZoneVideoInput = z.object({
  zoneId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
});
export type GenerateZoneVideoInput = z.infer<typeof generateZoneVideoInput>;

export const galleryStatsInput = z.object({
  asesorSlug: z.string().min(1).max(120),
  videoId: z.string().uuid().optional(),
});

export const galleryAnalyticsRangeInput = analyticsRangeInput;
