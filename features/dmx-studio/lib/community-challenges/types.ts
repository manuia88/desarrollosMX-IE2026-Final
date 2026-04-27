// F14.F.5 Sprint 4 UPGRADE 6 LATERAL — DMX Studio community challenges (Strava Segments).
// Owned por sub-agent 5. Zod schemas single source of truth para tipos challenge.

import { z } from 'zod';

export const CHALLENGE_TYPE_VALUES = [
  'reels_count',
  'platform_focus',
  'style_focus',
  'theme_focus',
] as const;

export const ChallengeTypeSchema = z.enum(CHALLENGE_TYPE_VALUES);
export type ChallengeType = z.infer<typeof ChallengeTypeSchema>;

export const ChallengeInputSchema = z.object({
  challenge_type: ChallengeTypeSchema,
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(500),
  target_value: z.string().min(1).max(120),
  reward_xp: z.number().int().min(0).max(10000),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_active: z.boolean().default(true),
});
export type ChallengeInput = z.infer<typeof ChallengeInputSchema>;

export interface ChallengeDTO {
  readonly id: string;
  readonly challengeType: ChallengeType;
  readonly title: string;
  readonly description: string;
  readonly targetValue: string;
  readonly rewardXp: number;
  readonly weekStart: string;
  readonly isActive: boolean;
  readonly participantsCount: number;
  readonly completersCount: number;
  readonly createdAt: string;
}

export interface ParticipationDTO {
  readonly id: string;
  readonly challengeId: string;
  readonly userId: string;
  readonly projectId: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
}

export interface LeaderboardRowDTO {
  readonly participationId: string;
  readonly userId: string;
  readonly projectId: string | null;
  readonly completedAt: string;
}
