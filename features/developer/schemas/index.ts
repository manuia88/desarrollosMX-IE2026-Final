import { z } from 'zod';

export const TRUST_LEVEL = ['bronze', 'silver', 'gold', 'platinum'] as const;
export const trustLevelEnum = z.enum(TRUST_LEVEL);
export type TrustLevel = z.infer<typeof trustLevelEnum>;

export const dashboardInput = z
  .object({
    rangeFrom: z.string().date().optional(),
    rangeTo: z.string().date().optional(),
  })
  .optional()
  .default({});
export type DashboardInput = z.infer<typeof dashboardInput>;

export const trustScoreInput = z.object({}).optional().default({});
export type TrustScoreInput = z.infer<typeof trustScoreInput>;

export const inventorySnapshotInput = z.object({}).optional().default({});
export type InventorySnapshotInput = z.infer<typeof inventorySnapshotInput>;

export const pendientesInput = z.object({}).optional().default({});
export type PendientesInput = z.infer<typeof pendientesInput>;

export const kpisInput = z
  .object({
    rangeFrom: z.string().date().optional(),
    rangeTo: z.string().date().optional(),
  })
  .optional()
  .default({});
export type KpisInput = z.infer<typeof kpisInput>;

export const morningBriefingDevInput = z
  .object({
    forceRegenerate: z.boolean().optional().default(false),
  })
  .optional()
  .default({ forceRegenerate: false });
export type MorningBriefingDevInput = z.infer<typeof morningBriefingDevInput>;

// FASE 15 v3 onyx-benchmarked — B.2 Unit-level demand heatmap (M11 APPEND v3)
export const unitDemandHeatmapInput = z.object({
  proyectoId: z.string().uuid(),
});
export type UnitDemandHeatmapInput = z.infer<typeof unitDemandHeatmapInput>;

// FASE 15.A.1 — Layout developer group
export const listMyProjectsInput = z.object({}).optional().default({});
export type ListMyProjectsInput = z.infer<typeof listMyProjectsInput>;

export const myProjectItem = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  status: z.string(),
  units_total: z.number().int().nullable(),
  units_available: z.number().int().nullable(),
});
export type MyProjectItem = z.infer<typeof myProjectItem>;

// FASE 15.A.2 — Weekly highlights (M10 polish)
export const weeklyHighlightsInput = z.object({}).optional().default({});
export type WeeklyHighlightsInput = z.infer<typeof weeklyHighlightsInput>;

export const weeklyHighlightItem = z.object({
  project_id: z.string().uuid(),
  project_nombre: z.string(),
  score_type: z.string(),
  score_label: z.string().nullable(),
  score_value: z.number().nullable(),
  trend_direction: z.string().nullable(),
  trend_vs_previous: z.number().nullable(),
  period_date: z.string(),
});
export type WeeklyHighlightItem = z.infer<typeof weeklyHighlightItem>;

// FASE 15.A.4 — Site Selection AI con CF.3 Atlas
export const siteSelectionAIInput = z.object({
  query: z.string().min(10).max(500),
});
export type SiteSelectionAIInput = z.infer<typeof siteSelectionAIInput>;

export const siteSelectionResultZone = z.object({
  zoneId: z.string().nullable(),
  colonia: z.string(),
  ciudad: z.string(),
  fitScore: z.number().int().min(0).max(100),
  rationale: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});
export type SiteSelectionResultZone = z.infer<typeof siteSelectionResultZone>;

export const siteSelectionAIResult = z.object({
  queryId: z.string().uuid(),
  zones: z.array(siteSelectionResultZone),
  narrative: z.string(),
  costUsd: z.number(),
  durationMs: z.number().int(),
  isPlaceholder: z.boolean(),
});
export type SiteSelectionAIResult = z.infer<typeof siteSelectionAIResult>;

export const siteSelectionHistoryInput = z
  .object({
    limit: z.number().int().min(1).max(50).default(10),
  })
  .optional()
  .default({ limit: 10 });
export type SiteSelectionHistoryInput = z.infer<typeof siteSelectionHistoryInput>;

export const demandColorEnum = z.enum(['red', 'amber', 'green']);
export type DemandColor = z.infer<typeof demandColorEnum>;

export const unitDemandHeatmapItem = z.object({
  unitId: z.string().uuid(),
  numero: z.string(),
  demandScore: z.number().int().min(0).max(100),
  color: demandColorEnum,
  signals: z.record(z.string(), z.unknown()).nullable(),
});
export type UnitDemandHeatmapItem = z.infer<typeof unitDemandHeatmapItem>;

export * from './inventario';
