// FASE 14.F.3 Sprint 2 BIBLIA — Multi-format router (Tarea 2.2).
// Genera 16:9 + 1:1 desde 9:16 ya assembled. Beat-sync optional via metadata.

import { TRPCError } from '@trpc/server';
import {
  applyBrandingOverlayInput,
  generateAdditionalFormatsInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

export const studioMultiFormatRouter = router({
  generateAdditionalFormats: studioProcedure
    .input(generateAdditionalFormatsInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: source } = await supabase
        .from('studio_video_outputs')
        .select('id, project_id, hook_variant, format, storage_url, duration_seconds, size_bytes')
        .eq('project_id', input.projectId)
        .eq('user_id', ctx.user.id)
        .eq('hook_variant', input.hookVariant)
        .eq('format', '9x16')
        .maybeSingle();
      if (!source) throw new TRPCError({ code: 'NOT_FOUND', message: 'source_9x16_not_found' });

      const { generateAllFormats } = await import(
        '@/features/dmx-studio/lib/assembler/multi-format'
      );

      try {
        const result = await generateAllFormats({
          projectId: input.projectId,
          userId: ctx.user.id,
          hookVariant: input.hookVariant,
          sourceStoragePath: source.storage_url,
          enableBeatSync: input.enableBeatSync,
        });
        return result;
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'dmx-studio.multi-format', op: 'generate' },
          extra: { projectId: input.projectId, hookVariant: input.hookVariant },
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'multi_format_failed',
        });
      }
    }),

  applyBrandingToggle: studioProcedure
    .input(applyBrandingOverlayInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { data: row, error } = await supabase
        .from('studio_video_outputs')
        .select('id')
        .eq('id', input.videoOutputId)
        .eq('project_id', input.projectId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });

      const { error: updateErr } = await supabase
        .from('studio_video_outputs')
        .update({ is_branded: input.branded })
        .eq('id', row.id);
      if (updateErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: updateErr });
      return { ok: true, branded: input.branded };
    }),
});
