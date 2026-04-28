import { z } from 'zod';

export const projectIdInput = z.object({
  proyectoId: z.string().uuid(),
});
export type ProjectIdInput = z.infer<typeof projectIdInput>;

export const demandHeatmapInput = z.object({
  proyectoId: z.string().uuid(),
  radiusKm: z.number().positive().max(20).default(3),
});
export type DemandHeatmapInput = z.infer<typeof demandHeatmapInput>;

export const pricingApplyInput = z.object({
  unidadId: z.string().uuid(),
  suggestedPriceMxn: z.number().positive(),
});
export type PricingApplyInput = z.infer<typeof pricingApplyInput>;

export const dynamicPricingListInput = z.object({
  proyectoId: z.string().uuid(),
  unappliedOnly: z.boolean().default(true),
});
export type DynamicPricingListInput = z.infer<typeof dynamicPricingListInput>;

export const absorptionForecastInput = z.object({
  proyectoId: z.string().uuid(),
  horizonMonths: z.number().int().min(6).max(24).default(24),
  priceShockPct: z.number().min(-15).max(15).default(0),
});
export type AbsorptionForecastInput = z.infer<typeof absorptionForecastInput>;

export const competitorMonitorCreateInput = z.object({
  myProyectoId: z.string().uuid(),
  competitorProyectoId: z.string().uuid().nullable().optional(),
  competitorExternalName: z.string().min(2).max(120).nullable().optional(),
  competitorExternalUrl: z.string().url().nullable().optional(),
  metricsTracked: z
    .array(z.enum(['price', 'inventory', 'avance', 'ads']))
    .default(['price', 'inventory', 'avance', 'ads']),
});
export type CompetitorMonitorCreateInput = z.infer<typeof competitorMonitorCreateInput>;

export const competitorMonitorListInput = z.object({
  myProyectoId: z.string().uuid(),
});
export type CompetitorMonitorListInput = z.infer<typeof competitorMonitorListInput>;

export const competitorAlertListInput = z.object({
  myProyectoId: z.string().uuid(),
  unreadOnly: z.boolean().default(false),
});
export type CompetitorAlertListInput = z.infer<typeof competitorAlertListInput>;

export const competitorAlertMarkReadInput = z.object({
  alertId: z.string().uuid(),
});
export type CompetitorAlertMarkReadInput = z.infer<typeof competitorAlertMarkReadInput>;

export const competitorMonitorDeleteInput = z.object({
  monitorId: z.string().uuid(),
});
export type CompetitorMonitorDeleteInput = z.infer<typeof competitorMonitorDeleteInput>;

export const projectsListInput = z.object({}).optional().default({});
export type ProjectsListInput = z.infer<typeof projectsListInput>;
