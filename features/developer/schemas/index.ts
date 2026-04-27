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
