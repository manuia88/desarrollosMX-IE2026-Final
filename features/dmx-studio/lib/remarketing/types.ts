// F14.F.5 Sprint 4 Tarea 4.3 — DMX Studio remarketing automatico types canon.
// Single source of truth (Zod) para angles + statuses + payloads cron handler.

import { z } from 'zod';

export const REMARKETING_ANGLES = [
  'general',
  'cocina',
  'zona',
  'inversionista',
  'familiar',
  'lujo',
] as const;

export const RemarketingAngleSchema = z.enum(REMARKETING_ANGLES);
export type RemarketingAngle = z.infer<typeof RemarketingAngleSchema>;

export const REMARKETING_JOB_STATUSES = ['pending', 'generating', 'completed', 'failed'] as const;

export const RemarketingJobStatusSchema = z.enum(REMARKETING_JOB_STATUSES);
export type RemarketingJobStatus = z.infer<typeof RemarketingJobStatusSchema>;

export const ScanRemarketingOptionsSchema = z.object({
  staleAfterDays: z.number().int().min(1).max(365).default(14),
  perProjectCooldownDays: z.number().int().min(1).max(365).default(7),
  maxJobsPerRun: z.number().int().min(1).max(500).default(50),
  triggerPipeline: z.boolean().default(true),
});
export type ScanRemarketingOptions = z.infer<typeof ScanRemarketingOptionsSchema>;

export interface ScanRemarketingResult {
  readonly scannedCount: number;
  readonly jobsCreated: number;
  readonly errors: ReadonlyArray<{ projectId: string; reason: string }>;
}

export const ForceTriggerInputSchema = z.object({
  sourceProjectId: z.string().uuid(),
  angle: RemarketingAngleSchema.optional(),
});
export type ForceTriggerInput = z.infer<typeof ForceTriggerInputSchema>;

export const RemarketingJobIdInputSchema = z.object({
  jobId: z.string().uuid(),
});
export type RemarketingJobIdInput = z.infer<typeof RemarketingJobIdInputSchema>;
