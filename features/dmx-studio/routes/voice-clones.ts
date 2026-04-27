import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

export const studioVoiceClonesRouter = router({
  get: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_voice_clones')
      .select('id, name, status, language, created_at, elevenlabs_voice_id')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),

  getStatus: studioProcedure
    .input(z.object({ voiceCloneId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('studio_voice_clones')
        .select('id, name, status, elevenlabs_voice_id, language')
        .eq('id', input.voiceCloneId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
      return data;
    }),
});
