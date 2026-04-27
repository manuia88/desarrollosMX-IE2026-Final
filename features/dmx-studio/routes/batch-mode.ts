// F14.F.5 Sprint 4 — DMX Studio batch mode A/B 3 estilos (Agency only).
// Owned por sub-agent 3. Procedures: createBatch + getBatchProjects.
//
// STUB ADR-018 — activar L-NEW-BATCH-MODE-PIPELINE-REAL: H1 marca cada child
// como status='draft' + meta.batch_pending=true sin disparar pipeline real.
// Activar trigger pipeline cuando founder OK consumo créditos reales.

import { TRPCError } from '@trpc/server';
import { createBatchAB } from '@/features/dmx-studio/lib/batch-mode';
import {
  batchModeInputSchema,
  getBatchProjectsInputSchema,
} from '@/features/dmx-studio/lib/batch-mode/types';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

export const studioBatchModeRouter = router({
  createBatch: studioProcedure.input(batchModeInputSchema).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    try {
      const result = await createBatchAB(supabase, input.projectId, ctx.user.id, input.styles);
      return {
        ok: true as const,
        parentProjectId: result.parentProjectId,
        batchProjectIds: result.batchProjectIds,
        count: result.batchProjectIds.length,
      };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.batch-mode', op: 'createBatch' },
        extra: { projectId: input.projectId },
      });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'batch_create_failed',
      });
    }
  }),

  getBatchProjects: studioProcedure
    .input(getBatchProjectsInputSchema)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();

      const { data: parent, error: parentErr } = await supabase
        .from('studio_video_projects')
        .select('id, title, meta')
        .eq('id', input.parentProjectId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();

      if (parentErr) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: parentErr.message,
          cause: parentErr,
        });
      }
      if (!parent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'parent_project_not_found' });
      }

      const { data: rows, error: childrenErr } = await supabase
        .from('studio_video_projects')
        .select('id, title, status, meta, created_at')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: true });

      if (childrenErr) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: childrenErr.message,
          cause: childrenErr,
        });
      }

      const children = (rows ?? []).filter((row) => {
        const meta = row.meta as Record<string, unknown> | null;
        return meta?.parent_project_id === input.parentProjectId;
      });

      return {
        parentProjectId: input.parentProjectId,
        parentTitle: (parent as { title: string }).title,
        children: children.map((row) => {
          const meta = (row.meta as Record<string, unknown> | null) ?? {};
          return {
            id: row.id,
            title: row.title,
            status: row.status,
            batchVariant: (meta.batch_variant as string | undefined) ?? null,
            batchPending: Boolean(meta.batch_pending),
            createdAt: row.created_at,
          };
        }),
      };
    }),
});
