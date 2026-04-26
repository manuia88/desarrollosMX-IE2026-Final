import { z } from 'zod';

export const dealStageSlugEnum = z.enum([
  'lead',
  'qualified',
  'showing',
  'offer',
  'contract',
  'closed_won',
  'closed_lost',
]);
export type DealStageSlug = z.infer<typeof dealStageSlugEnum>;

export const dealStageSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  order_index: z.number().int().min(0),
  label_es: z.string().min(1),
  label_en: z.string().min(1),
  is_terminal: z.boolean(),
  is_won: z.boolean(),
  created_at: z.string(),
});
export type DealStage = z.infer<typeof dealStageSchema>;

export const TERMINAL_STAGES: ReadonlyArray<DealStageSlug> = ['closed_won', 'closed_lost'];
