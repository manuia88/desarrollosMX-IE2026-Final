import { z } from 'zod';

export const ATTRIBUTION_MODELS = ['linear', 'time_decay', 'position_based', 'last_touch'] as const;
export const RECOMMENDED_ACTIONS = ['continue', 'pause', 'scale', 'optimize'] as const;
export const CAMPAIGN_TIPOS = ['launch', 'promo', 'evento', 'branding'] as const;
export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled'] as const;
export const CHANNELS = [
  'meta_ads',
  'google_ads',
  'email',
  'whatsapp',
  'landing',
  'portales',
] as const;
export const CREATIVE_VARIANTS = [
  'postCuadrado',
  'postLargo',
  'story',
  'videoStory',
  'video',
] as const;

export const listCampaignsInput = z
  .object({
    status: z.enum(CAMPAIGN_STATUSES).optional(),
    proyectoId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .default({ limit: 50 });

export const createCampaignInput = z
  .object({
    nombre: z.string().min(2).max(140),
    tipo: z.enum(CAMPAIGN_TIPOS),
    proyectoIds: z.array(z.string().uuid()).min(1).max(20),
    presupuestoMxn: z.number().nonnegative(),
    startDate: z.string().date(),
    endDate: z.string().date(),
    canales: z.array(z.enum(CHANNELS)).min(1),
    creatives: z
      .array(
        z.object({
          variant: z.enum(CREATIVE_VARIANTS),
          url: z.string().url(),
          aiGenerated: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(20),
    utmSource: z.string().min(1).max(50),
    utmMedium: z.string().min(1).max(50),
    utmCampaign: z.string().min(1).max(80),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'endDate debe ser >= startDate',
    path: ['endDate'],
  });

export const updateCampaignInput = z.object({
  campaignId: z.string().uuid(),
  patch: z
    .object({
      nombre: z.string().min(2).max(140).optional(),
      presupuestoMxn: z.number().nonnegative().optional(),
      endDate: z.string().date().optional(),
      canales: z.array(z.enum(CHANNELS)).min(1).optional(),
    })
    .refine((p) => Object.keys(p).length > 0, { message: 'patch vacío' }),
});

export const campaignIdInput = z.object({ campaignId: z.string().uuid() });

export const getCampaignAnalyticsInput = z.object({
  campaignId: z.string().uuid(),
  channel: z.enum(CHANNELS).optional(),
  rangeDays: z.number().int().min(1).max(365).default(30),
});

export const getAttributionReportInput = z.object({
  campaignId: z.string().uuid(),
  model: z.enum(ATTRIBUTION_MODELS).default('linear'),
});

export const getOptimizerRecommendationsInput = z
  .object({
    rangeDays: z.number().int().min(1).max(90).default(7),
    limit: z.number().int().min(1).max(50).default(10),
  })
  .default({ rangeDays: 7, limit: 10 });

export const applyOptimizerActionInput = z.object({
  campaignId: z.string().uuid(),
  action: z.enum(RECOMMENDED_ACTIONS),
});

export const requestStudioVideoJobInput = z.object({
  proyectoId: z.string().uuid(),
  type: z.enum(['project', 'prototype']),
  unidadId: z.string().uuid().optional(),
});

export type ListCampaignsInput = z.infer<typeof listCampaignsInput>;
export type CreateCampaignInput = z.infer<typeof createCampaignInput>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignInput>;
export type CampaignIdInput = z.infer<typeof campaignIdInput>;
export type GetCampaignAnalyticsInput = z.infer<typeof getCampaignAnalyticsInput>;
export type GetAttributionReportInput = z.infer<typeof getAttributionReportInput>;
export type GetOptimizerRecommendationsInput = z.infer<typeof getOptimizerRecommendationsInput>;
export type ApplyOptimizerActionInput = z.infer<typeof applyOptimizerActionInput>;
export type RequestStudioVideoJobInput = z.infer<typeof requestStudioVideoJobInput>;
export type AttributionModel = (typeof ATTRIBUTION_MODELS)[number];
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];
export type Channel = (typeof CHANNELS)[number];
