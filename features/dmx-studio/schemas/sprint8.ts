// F14.F.9 Sprint 8 BIBLIA — schemas Modo Serie/Documental.
import { z } from 'zod';

export const SERIES_NARRATIVE_PHASES = [
  'planificacion',
  'construccion',
  'acabados',
  'amenidades',
  'entrega',
  'custom',
] as const;
export const seriesNarrativePhaseEnum = z.enum(SERIES_NARRATIVE_PHASES);
export type SeriesNarrativePhase = z.infer<typeof seriesNarrativePhaseEnum>;

export const SERIES_EPISODE_STATUS = [
  'pending',
  'recommended',
  'in_progress',
  'published',
  'archived',
] as const;
export const seriesEpisodeStatusEnum = z.enum(SERIES_EPISODE_STATUS);

export const SERIES_TEMPLATE_CATEGORIES = ['residencial', 'comercial', 'mixto', 'custom'] as const;
export const seriesTemplateCategoryEnum = z.enum(SERIES_TEMPLATE_CATEGORIES);

export const SERIES_GUEST_ROLES = [
  'arquitecto',
  'contratista',
  'cliente',
  'inversionista',
] as const;
export const seriesGuestRoleEnum = z.enum(SERIES_GUEST_ROLES);

export const SERIES_MULTI_CAMERA_ANGLES = [
  'wide',
  'medium',
  'close_up',
  'drone_aerial',
  'detail',
] as const;
export const seriesMultiCameraAngleEnum = z.enum(SERIES_MULTI_CAMERA_ANGLES);

export const createSeriesInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  totalEpisodes: z.number().int().min(1).max(20).optional(),
  templateId: z.string().uuid().optional(),
  desarrolloId: z.string().uuid().optional(),
  enableAutoProgress: z.boolean().default(false),
});
export type CreateSeriesInput = z.infer<typeof createSeriesInput>;

export const updateSeriesInput = z.object({
  seriesId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(['draft', 'in_production', 'published', 'archived']).optional(),
  autoProgressEnabled: z.boolean().optional(),
});

export const seriesIdInput = z.object({
  seriesId: z.string().uuid(),
});

export const addEpisodeInput = z.object({
  seriesId: z.string().uuid(),
  episodeNumber: z.number().int().positive().max(20),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  narrativePhase: seriesNarrativePhaseEnum.optional(),
});

export const updateEpisodeInput = z.object({
  episodeId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  status: seriesEpisodeStatusEnum.optional(),
  realProgressPct: z.number().min(0).max(100).optional(),
  shootRecommendedDate: z.string().date().optional(),
  shootCompletedDate: z.string().date().optional(),
});

export const generateNarrativeArcInput = z.object({
  seriesId: z.string().uuid(),
  episodesCount: z.number().int().min(2).max(20),
});

export const generateConsistentEpisodeInput = z.object({
  seriesId: z.string().uuid(),
  episodeId: z.string().uuid(),
});

export const generateThemeTrackInput = z.object({
  seriesId: z.string().uuid(),
  mood: z.string().trim().min(1).max(80).optional(),
});

export const generateEpisodeMusicVariationInput = z.object({
  seriesId: z.string().uuid(),
  episodeNumber: z.number().int().positive(),
  phase: z.enum(['intro', 'desarrollo', 'climax', 'cierre']),
});

export const generateMultiAngleClipInput = z.object({
  assetId: z.string().uuid(),
  angles: z.array(seriesMultiCameraAngleEnum).min(2).max(5),
});

export const enableAutoProgressInput = z.object({
  seriesId: z.string().uuid(),
  enabled: z.boolean(),
});

export const checkProgressTriggersInput = z.object({
  manual: z.boolean().default(false),
});

export const inviteGuestToEpisodeInput = z.object({
  episodeId: z.string().uuid(),
  guestType: seriesGuestRoleEnum,
  guestName: z.string().trim().min(1).max(160),
  photoStoragePath: z.string().min(1).max(512),
  voiceSampleStoragePath: z.string().min(1).max(512),
});

export const generateTitleCardInput = z.object({
  episodeId: z.string().uuid(),
});

export const publishSeriesPubliclyInput = z.object({
  seriesId: z.string().uuid(),
  publicSlug: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'kebab-case lowercase alfanumerico'),
});

export const publicSeriesBySlugInput = z.object({
  asesorSlug: z.string().min(1).max(120),
  serieSlug: z.string().min(1).max(120),
});

export const recordSeriesViewInput = z.object({
  asesorSlug: z.string().min(1).max(120),
  serieSlug: z.string().min(1).max(120),
  episodeId: z.string().uuid().optional(),
  referer: z.string().max(2048).optional(),
});

export const exportSeriesToCampaignInput = z.object({
  seriesId: z.string().uuid(),
  campaignId: z.string().uuid(),
  episodeIds: z.array(z.string().uuid()).min(1),
});

export const listTemplatesByCategoryInput = z.object({
  category: seriesTemplateCategoryEnum.optional(),
});

export const buildVisualRefsInput = z.object({
  seriesId: z.string().uuid(),
});
