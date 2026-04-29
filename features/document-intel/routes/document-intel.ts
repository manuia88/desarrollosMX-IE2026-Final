// FASE 17 Document Intelligence — tRPC router (sesión 17.A.UI).
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3.
//
// Sesión 17.A.UI shipped:
//   - addDriveMonitor / listMyDriveMonitors / deleteDriveMonitor (Drive monitor link público)
//   - getMyCreditsBalance (saldo IA + tx recientes)
// Sesión 17.B (CC-A.1) extiende con extraction/ingest procedures (createJob, processJobNow, etc.)
// en su propia rama paralela; merge final lo realiza PM.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { parseDriveFolderId, pollFolder } from '@/features/document-intel/lib/drive-monitor';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

const monitorTypeSchema = z.enum(['marketing_folder', 'legal_folder']);

const addDriveMonitorInput = z.object({
  drive_folder_url: z.string().url(),
  monitor_type: monitorTypeSchema,
  proyecto_id: z.string().uuid().optional(),
  folder_label: z.string().min(1).max(120).optional(),
});

const deleteDriveMonitorInput = z.object({
  id: z.string().uuid(),
});

async function requireDesarrolladoraId(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<string> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('desarrolladora_id')
    .eq('id', userId)
    .maybeSingle();
  if (error || !profile?.desarrolladora_id) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'profile_missing_desarrolladora',
    });
  }
  return profile.desarrolladora_id;
}

export const documentIntelRouter = router({
  ping: authenticatedProcedure.query(() => ({
    ok: true,
    feature: 'document-intel',
    phase: 'F17.A.UI',
    stub: false,
    message: 'F17.A.UI shipped — saldo IA + Drive monitor procedures activas',
  })),

  addDriveMonitor: authenticatedProcedure
    .input(addDriveMonitorInput)
    .mutation(async ({ ctx, input }) => {
      const folderId = parseDriveFolderId(input.drive_folder_url);
      if (!folderId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'invalid_drive_folder_url',
        });
      }

      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      try {
        await pollFolder(folderId);
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'document-intel', stage: 'addDriveMonitor.pollFolder' },
        });
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'drive_folder_not_accessible',
        });
      }

      const nowIso = new Date().toISOString();
      const { data: inserted, error } = await admin
        .from('drive_monitors')
        .insert({
          desarrolladora_id: desarrolladoraId,
          monitor_type: input.monitor_type,
          drive_folder_id: folderId,
          drive_folder_url: input.drive_folder_url,
          proyecto_id: input.proyecto_id ?? null,
          folder_label: input.folder_label ?? null,
          is_active: true,
          next_poll_at: nowIso,
          created_by: ctx.user.id,
        })
        .select('id, drive_folder_id, monitor_type, folder_label, is_active, next_poll_at')
        .maybeSingle();

      if (error) {
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'drive_folder_already_monitored',
          });
        }
        sentry.captureException(error, {
          tags: { feature: 'document-intel', stage: 'addDriveMonitor.insert' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'insert_failed' });
      }

      return { ok: true, monitor: inserted };
    }),

  listMyDriveMonitors: authenticatedProcedure.query(async ({ ctx }) => {
    const admin = createAdminClient();
    const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

    const { data, error } = await admin
      .from('drive_monitors')
      .select(
        'id, drive_folder_id, drive_folder_url, monitor_type, folder_label, proyecto_id, is_active, last_polled_at, last_polled_files_count, next_poll_at, failure_count, last_failure_message, created_at',
      )
      .eq('desarrolladora_id', desarrolladoraId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'list_failed' });
    }
    return data ?? [];
  }),

  deleteDriveMonitor: authenticatedProcedure
    .input(deleteDriveMonitorInput)
    .mutation(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      const { data: existing, error: lookupErr } = await admin
        .from('drive_monitors')
        .select('id, desarrolladora_id')
        .eq('id', input.id)
        .maybeSingle();

      if (lookupErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'lookup_failed' });
      }
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'monitor_not_found' });
      }
      if (existing.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'not_your_monitor' });
      }

      const { error: deleteErr } = await admin.from('drive_monitors').delete().eq('id', input.id);

      if (deleteErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'delete_failed' });
      }
      return { ok: true };
    }),

  getMyCreditsBalance: authenticatedProcedure.query(async ({ ctx }) => {
    const admin = createAdminClient();
    const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

    const { data: credits } = await admin
      .from('dev_ai_credits')
      .select(
        'balance_usd, total_purchased_usd, total_consumed_usd, packs_purchased_count, last_purchase_at, last_consumption_at',
      )
      .eq('desarrolladora_id', desarrolladoraId)
      .maybeSingle();

    const { data: txs } = await admin
      .from('ai_credit_transactions')
      .select('id, type, amount_usd, balance_after_usd, description, created_at')
      .eq('desarrolladora_id', desarrolladoraId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      desarrolladora_id: desarrolladoraId,
      balance_usd: Number(credits?.balance_usd ?? 0),
      total_purchased_usd: Number(credits?.total_purchased_usd ?? 0),
      total_consumed_usd: Number(credits?.total_consumed_usd ?? 0),
      packs_purchased_count: credits?.packs_purchased_count ?? 0,
      last_purchase_at: credits?.last_purchase_at ?? null,
      last_consumption_at: credits?.last_consumption_at ?? null,
      recent_transactions: txs ?? [],
    };
  }),
});
