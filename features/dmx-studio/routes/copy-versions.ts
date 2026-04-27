import { TRPCError } from '@trpc/server';
import {
  compareCopyVersionsInput,
  listCopyVersionsInput,
  rollbackCopyVersionInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

export const studioCopyVersionsRouter = router({
  list: studioProcedure.input(listCopyVersionsInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: output } = await supabase
      .from('studio_copy_outputs')
      .select('id')
      .eq('id', input.copyOutputId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!output) throw new TRPCError({ code: 'NOT_FOUND' });
    const { data, error } = await supabase
      .from('studio_copy_versions')
      .select('*')
      .eq('copy_output_id', input.copyOutputId)
      .order('version_number', { ascending: false })
      .limit(input.limit);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return data ?? [];
  }),

  rollback: studioProcedure.input(rollbackCopyVersionInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: output } = await supabase
      .from('studio_copy_outputs')
      .select('id')
      .eq('id', input.copyOutputId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!output) throw new TRPCError({ code: 'NOT_FOUND' });

    const { data: version } = await supabase
      .from('studio_copy_versions')
      .select('id, content')
      .eq('id', input.versionId)
      .eq('copy_output_id', input.copyOutputId)
      .maybeSingle();
    if (!version) throw new TRPCError({ code: 'NOT_FOUND' });

    await supabase
      .from('studio_copy_versions')
      .update({ is_current: false })
      .eq('copy_output_id', input.copyOutputId);
    await supabase
      .from('studio_copy_versions')
      .update({ is_current: true })
      .eq('id', input.versionId);
    await supabase
      .from('studio_copy_outputs')
      .update({ content: version.content, selected_by_user: true })
      .eq('id', input.copyOutputId);

    return { ok: true };
  }),

  compare: studioProcedure.input(compareCopyVersionsInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: versions, error } = await supabase
      .from('studio_copy_versions')
      .select('id, copy_output_id, content, tone, version_number, regenerated_at, is_current')
      .in('id', [input.versionIdA, input.versionIdB]);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    if (!versions || versions.length !== 2) throw new TRPCError({ code: 'NOT_FOUND' });

    const outputIds = [...new Set(versions.map((v) => v.copy_output_id))];
    const { data: outputs } = await supabase
      .from('studio_copy_outputs')
      .select('id, user_id')
      .in('id', outputIds);
    const allOwned = (outputs ?? []).every((o) => o.user_id === ctx.user.id);
    if (!allOwned) throw new TRPCError({ code: 'FORBIDDEN' });

    return { versions };
  }),
});
