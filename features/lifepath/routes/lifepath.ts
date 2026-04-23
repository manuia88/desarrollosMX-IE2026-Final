import { TRPCError } from '@trpc/server';
import {
  getMatchesInputSchema,
  lifepathAnswersSchema,
  saveProfileInputSchema,
} from '@/features/lifepath/schemas/lifepath';
import type {
  FamilyState,
  IncomeRange,
  LifePathAnswers,
  LifePathMatch,
  LifePathProfileRow,
  WorkMode,
} from '@/features/lifepath/types';
import {
  ANSWERS_VERSION,
  FAMILY_STATES,
  INCOME_RANGES,
  METHODOLOGY_HEURISTIC,
  WORK_MODES,
} from '@/features/lifepath/types';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { computeLifePathMatches } from '@/shared/lib/intelligence-engine/lifepath/matching-engine';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Json } from '@/shared/types/database';

function asFamilyState(value: unknown): FamilyState | null {
  return typeof value === 'string' && (FAMILY_STATES as readonly string[]).includes(value)
    ? (value as FamilyState)
    : null;
}

function asIncomeRange(value: unknown): IncomeRange | null {
  return typeof value === 'string' && (INCOME_RANGES as readonly string[]).includes(value)
    ? (value as IncomeRange)
    : null;
}

function asWorkMode(value: unknown): WorkMode | null {
  return typeof value === 'string' && (WORK_MODES as readonly string[]).includes(value)
    ? (value as WorkMode)
    : null;
}

function coerceMatches(raw: unknown): readonly LifePathMatch[] {
  if (!Array.isArray(raw)) return [];
  return raw as readonly LifePathMatch[];
}

export const lifepathRouter = router({
  saveProfile: authenticatedProcedure
    .input(saveProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const answers = input.answers;

      // Compute matches server-side (admin client para bypass RLS sobre colonias públicas).
      const admin = createAdminClient() as unknown as Parameters<
        typeof computeLifePathMatches
      >[0]['supabase'];
      const matches = await computeLifePathMatches({
        answers,
        supabase: admin,
        topN: 20,
      });

      const denorm = {
        family_state: answers.family_state,
        income_range: answers.income_range,
        work_mode: answers.work_mode,
      };

      const { data: inserted, error } = await ctx.supabase
        .from('lifepath_user_profiles')
        .upsert(
          {
            user_id: userId,
            preferences: answers as unknown as Json,
            matches: matches as unknown as Json,
            answers_version: ANSWERS_VERSION,
            methodology: METHODOLOGY_HEURISTIC,
            family_state: denorm.family_state,
            income_range: denorm.income_range,
            work_mode: denorm.work_mode,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single();

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return {
        saved: true,
        matches_count: matches.length,
        profile_id: inserted?.user_id ?? userId,
      };
    }),

  getMyProfile: authenticatedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const { data, error } = await ctx.supabase
      .from('lifepath_user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    if (!data) return null;

    const parsed = lifepathAnswersSchema.safeParse(data.preferences);
    const preferences: LifePathAnswers | null = parsed.success ? parsed.data : null;

    const profile: LifePathProfileRow = {
      user_id: data.user_id,
      preferences: preferences ?? ({} as LifePathAnswers),
      matches: coerceMatches(data.matches),
      answers_version: data.answers_version,
      methodology: data.methodology,
      created_at: data.created_at,
      updated_at: data.updated_at,
      income_range: asIncomeRange(data.income_range),
      family_state: asFamilyState(data.family_state),
      work_mode: asWorkMode(data.work_mode),
    };
    return profile;
  }),

  computeMatchesOnly: authenticatedProcedure
    .input(getMatchesInputSchema.extend({ answers: lifepathAnswersSchema }))
    .mutation(async ({ input }) => {
      const admin = createAdminClient() as unknown as Parameters<
        typeof computeLifePathMatches
      >[0]['supabase'];
      const matches = await computeLifePathMatches({
        answers: input.answers,
        supabase: admin,
        topN: input.topN,
      });
      return { matches };
    }),
});
