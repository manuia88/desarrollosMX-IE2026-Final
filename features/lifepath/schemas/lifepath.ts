import { z } from 'zod';
import {
  FAMILY_STATES,
  HORIZON_OPTIONS,
  INCOME_RANGES,
  MOBILITY_PREFS,
  VIBE_PACES,
  WORK_MODES,
} from '../types';

// Zod schemas para LifePath 15 preguntas v1 SEED.
// SSOT: type inference desde estos schemas (regla CLAUDE.md).

const bounded10 = z.number().int().min(0).max(10);

export const lifepathAnswersSchema = z.object({
  family_state: z.enum(FAMILY_STATES),
  family_priority: bounded10,
  income_range: z.enum(INCOME_RANGES),
  budget_monthly_mxn: z.number().int().positive().max(10_000_000).nullable(),
  work_mode: z.enum(WORK_MODES),
  mobility_pref: z.enum(MOBILITY_PREFS),
  amenities_priority: bounded10,
  shopping_priority: bounded10,
  security_priority: bounded10,
  green_priority: bounded10,
  vibe_pace: z.enum(VIBE_PACES),
  vibe_nightlife: bounded10,
  vibe_walkable: bounded10,
  has_pet: z.boolean(),
  horizon: z.enum(HORIZON_OPTIONS),
});

export type LifePathAnswersInput = z.infer<typeof lifepathAnswersSchema>;

export const componentBreakdownSchema = z.object({
  familia: z.number().min(0).max(100),
  budget: z.number().min(0).max(100),
  movilidad: z.number().min(0).max(100),
  amenidades: z.number().min(0).max(100),
  seguridad: z.number().min(0).max(100),
  verde: z.number().min(0).max(100),
  vibe: z.number().min(0).max(100),
});

export const lifepathMatchSchema = z.object({
  colonia_id: z.string().uuid(),
  colonia_label: z.string().nullable(),
  score: z.number().min(0).max(100),
  components: componentBreakdownSchema,
  top_dmx_indices: z.array(z.object({ code: z.string(), value: z.number().min(0).max(100) })),
  shared_vibe_tags: z.array(z.string()),
});

export const saveProfileInputSchema = z.object({
  answers: lifepathAnswersSchema,
});

export const getMatchesInputSchema = z.object({
  topN: z.number().int().min(1).max(20).default(20),
});

export type SaveProfileInput = z.infer<typeof saveProfileInputSchema>;
export type GetMatchesInput = z.infer<typeof getMatchesInputSchema>;
export type LifePathMatchShape = z.infer<typeof lifepathMatchSchema>;
