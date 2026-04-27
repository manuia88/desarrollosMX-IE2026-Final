// F14.F.5 Sprint 4 UPGRADE 8 LATERAL — DMX Studio AI coach diario.
// Owned por sub-agent 5. Zod schemas single source of truth para tipos coach session.

import { z } from 'zod';

export const MOOD_VALUES = ['energized', 'focused', 'tired', 'overwhelmed', 'neutral'] as const;

export const MoodSchema = z.enum(MOOD_VALUES);
export type Mood = z.infer<typeof MoodSchema>;

export const CoachSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood_detected: MoodSchema,
  suggested_action: z.string().min(1).max(500),
  user_response: z.string().max(2000).nullable(),
  completed: z.boolean(),
  dismissed: z.boolean(),
  created_at: z.string(),
});
export type CoachSession = z.infer<typeof CoachSessionSchema>;

export interface CoachSessionDTO {
  readonly id: string;
  readonly userId: string;
  readonly sessionDate: string;
  readonly moodDetected: Mood;
  readonly suggestedAction: string;
  readonly userResponse: string | null;
  readonly completed: boolean;
  readonly dismissed: boolean;
  readonly createdAt: string;
}

export interface UserMetricsContext {
  readonly streakCurrentDays: number;
  readonly videosThisMonth: number;
  readonly videosRemaining: number;
}
