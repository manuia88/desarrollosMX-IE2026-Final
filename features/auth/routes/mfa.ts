import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { mfaBackupCodeInputSchema, mfaVerifyInputSchema } from '../schemas/mfa';

export const mfaRouter = router({
  enrollStart: authenticatedProcedure.mutation(async ({ ctx }) => {
    const { data, error } = await ctx.supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator',
    });
    if (error || !data) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message });
    }
    return {
      factor_id: data.id,
      qr_code: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  }),

  enrollVerify: authenticatedProcedure
    .input(mfaVerifyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { error: verifyError } = await ctx.supabase.auth.mfa.verify({
        factorId: input.factor_id,
        challengeId: input.challenge_id,
        code: input.code,
      });
      if (verifyError) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: verifyError.message });
      }

      const { error: markError } = await ctx.supabase.rpc('mfa_mark_enabled');
      if (markError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: markError.message });
      }

      const { data: codes, error: codesError } = await ctx.supabase.rpc(
        'mfa_regenerate_backup_codes',
      );
      if (codesError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: codesError.message });
      }
      return { backup_codes: codes as string[] };
    }),

  challengeStart: authenticatedProcedure
    .input(mfaVerifyInputSchema.pick({ factor_id: true }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.auth.mfa.challenge({
        factorId: input.factor_id,
      });
      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message });
      }
      return { challenge_id: data.id };
    }),

  challengeVerify: authenticatedProcedure
    .input(mfaVerifyInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.auth.mfa.verify({
        factorId: input.factor_id,
        challengeId: input.challenge_id,
        code: input.code,
      });
      if (error) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: error.message });
      }
      return { ok: true };
    }),

  consumeBackupCode: authenticatedProcedure
    .input(mfaBackupCodeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.rpc('mfa_consume_backup_code', {
        p_code: input.code.toUpperCase(),
      });
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      if (!data) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'invalid_backup_code' });
      }
      return { ok: true };
    }),

  regenerateBackupCodes: authenticatedProcedure.mutation(async ({ ctx }) => {
    const { data, error } = await ctx.supabase.rpc('mfa_regenerate_backup_codes');
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    return { backup_codes: data as string[] };
  }),
});
