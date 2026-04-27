// F14.F.5 Sprint 4 — DMX Studio Batch Mode Zod schemas (Single Source of Truth).
// Drives tRPC input validation + form contracts for createBatch / getBatchProjects.

import { z } from 'zod';
import { BATCH_STYLE_KEYS } from './style-overrides';

export const batchStyleSchema = z.enum(BATCH_STYLE_KEYS);
export type BatchStyle = z.infer<typeof batchStyleSchema>;

export const batchModeInputSchema = z.object({
  projectId: z.string().uuid(),
  styles: z.array(batchStyleSchema).min(1).max(3).optional(),
});
export type BatchModeInput = z.infer<typeof batchModeInputSchema>;

export const getBatchProjectsInputSchema = z.object({
  parentProjectId: z.string().uuid(),
});
export type GetBatchProjectsInput = z.infer<typeof getBatchProjectsInputSchema>;

export interface BatchModeResult {
  readonly batchProjectIds: ReadonlyArray<string>;
  readonly parentProjectId: string;
}
