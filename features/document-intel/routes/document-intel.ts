import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { grantCredits } from '@/features/document-intel/lib/credits-engine';
import { parseDriveFolderId, pollFolder } from '@/features/document-intel/lib/drive-monitor';
import { processJob } from '@/features/document-intel/lib/extraction-engine';
import {
  adminGrantCreditsInput,
  createJobInput,
  docTypeEnum,
  getExtractedDataInput,
  getJobInput,
  listMyJobsInput,
  requestExtractionInput,
} from '@/features/document-intel/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

const ADMIN_ROLES: ReadonlySet<string> = new Set(['superadmin', 'mb_admin']);

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

  createJob: authenticatedProcedure
    .input(createJobInput)
    .mutation(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      const { data, error } = await admin
        .from('document_jobs')
        .insert({
          desarrolladora_id: desarrolladoraId,
          uploaded_by: ctx.user.id,
          doc_type: input.doc_type,
          proyecto_id: input.proyecto_id ?? null,
          unidad_id: input.unidad_id ?? null,
          storage_path: input.storage_path,
          original_filename: input.original_filename,
          file_size_bytes: input.file_size_bytes,
          mime_type: input.mime_type,
          page_count: input.page_count ?? null,
          drive_source_file_id: input.drive_source_file_id ?? null,
          visibility: input.visibility,
          status: 'uploaded',
        })
        .select('id, status, doc_type, visibility, created_at')
        .single();

      if (error || !data) {
        sentry.captureException(error ?? new Error('createJob_insert_null'), {
          tags: { feature: 'document-intel', stage: 'createJob.insert' },
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'job_insert_failed',
        });
      }

      return data;
    }),

  getJob: authenticatedProcedure.input(getJobInput).query(async ({ ctx, input }) => {
    const admin = createAdminClient();
    const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

    const { data, error } = await admin
      .from('document_jobs')
      .select('*')
      .eq('id', input.id)
      .maybeSingle();
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    if (!data) throw new TRPCError({ code: 'NOT_FOUND', message: 'job_not_found' });
    if (
      data.desarrolladora_id !== desarrolladoraId &&
      !ADMIN_ROLES.has(ctx.profile?.rol ?? '')
    ) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
    }
    return data;
  }),

  listMyJobs: authenticatedProcedure
    .input(listMyJobsInput)
    .query(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      let query = admin
        .from('document_jobs')
        .select(
          'id, doc_type, status, visibility, original_filename, file_size_bytes, page_count, quality_score, ai_cost_usd, charged_credits_usd, created_at, updated_at, proyecto_id',
        )
        .eq('desarrolladora_id', desarrolladoraId)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (input.proyecto_id) query = query.eq('proyecto_id', input.proyecto_id);
      if (input.status) query = query.eq('status', input.status);
      if (input.doc_type) query = query.eq('doc_type', input.doc_type);

      const { data, error } = await query;
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  requestExtraction: authenticatedProcedure
    .input(requestExtractionInput)
    .mutation(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      const { data: job, error } = await admin
        .from('document_jobs')
        .select('id, status, desarrolladora_id')
        .eq('id', input.jobId)
        .maybeSingle();
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'job_not_found' });
      if (
        job.desarrolladora_id !== desarrolladoraId &&
        !ADMIN_ROLES.has(ctx.profile?.rol ?? '')
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
      }
      if (
        job.status !== 'uploaded' &&
        job.status !== 'ocr_done' &&
        job.status !== 'error'
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `cannot_extract_from_status:${job.status}`,
        });
      }

      const { error: updErr } = await admin
        .from('document_jobs')
        .update({ status: 'extracting', updated_at: new Date().toISOString() })
        .eq('id', input.jobId);
      if (updErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updErr.message });
      }

      return { id: input.jobId, status: 'extracting' as const, queued: true };
    }),

  getExtractedData: authenticatedProcedure
    .input(getExtractedDataInput)
    .query(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      const { data: job, error: jobErr } = await admin
        .from('document_jobs')
        .select('id, desarrolladora_id, doc_type, status, quality_score')
        .eq('id', input.jobId)
        .maybeSingle();
      if (jobErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: jobErr.message });
      }
      if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'job_not_found' });
      if (
        job.desarrolladora_id !== desarrolladoraId &&
        !ADMIN_ROLES.has(ctx.profile?.rol ?? '')
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
      }

      const { data: extractions, error: extErr } = await admin
        .from('document_extractions')
        .select(
          'id, extraction_version, extracted_data, citations, confidence_score, extraction_engine, prompt_template_version, created_at',
        )
        .eq('job_id', input.jobId)
        .order('extraction_version', { ascending: false })
        .limit(1);

      if (extErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: extErr.message });
      }

      return {
        job: {
          id: job.id,
          doc_type: job.doc_type,
          status: job.status,
          quality_score: job.quality_score,
        },
        extraction: extractions?.[0] ?? null,
      };
    }),

  processJobNow: authenticatedProcedure
    .input(requestExtractionInput)
    .mutation(async ({ ctx, input }) => {
      if (!ADMIN_ROLES.has(ctx.profile?.rol ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'admin_only' });
      }
      return processJob(input.jobId);
    }),

  adminGrantCredits: authenticatedProcedure
    .input(adminGrantCreditsInput)
    .mutation(async ({ ctx, input }) => {
      if (!ADMIN_ROLES.has(ctx.profile?.rol ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'admin_only' });
      }
      return grantCredits({
        desarrolladora_id: input.desarrolladora_id,
        amount_usd: input.amount_usd,
        granted_by: ctx.user.id,
        ...(input.description ? { description: input.description } : {}),
      });
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
      .select(
        'id, type, amount_usd, balance_after_usd, related_job_id, description, created_at',
      )
      .eq('desarrolladora_id', desarrolladoraId)
      .order('created_at', { ascending: false })
      .limit(20);

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

  getJobValidations: authenticatedProcedure
    .input(z.object({ job_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);
      const { data: job } = await admin
        .from('document_jobs')
        .select('desarrolladora_id')
        .eq('id', input.job_id)
        .maybeSingle();
      if (!job || job.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
      }
      const { data, error } = await admin
        .from('document_validations')
        .select(
          'id, rule_code, severity, field_path, message, expected, actual, resolved_at, resolved_by, resolution_note, created_at',
        )
        .eq('job_id', input.job_id)
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return data ?? [];
    }),

  resolveValidation: authenticatedProcedure
    .input(
      z.object({
        validation_id: z.string().uuid(),
        note: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      const { data: validation, error: lookupErr } = await admin
        .from('document_validations')
        .select('id, job_id, document_jobs!inner(desarrolladora_id)')
        .eq('id', input.validation_id)
        .maybeSingle();
      if (lookupErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: lookupErr.message });
      }
      if (!validation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'validation_not_found' });
      }
      const ownerDevId = (validation as unknown as {
        document_jobs?: { desarrolladora_id?: string };
      }).document_jobs?.desarrolladora_id;
      if (ownerDevId !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
      }

      const { error } = await admin
        .from('document_validations')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: ctx.user.id,
          resolution_note: input.note,
        })
        .eq('id', input.validation_id);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { ok: true };
    }),

  getJobDuplicateInfo: authenticatedProcedure
    .input(z.object({ job_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);
      const { data: job } = await admin
        .from('document_jobs')
        .select('desarrolladora_id, duplicate_of_job_id')
        .eq('id', input.job_id)
        .maybeSingle();
      if (!job || job.desarrolladora_id !== desarrolladoraId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
      }
      if (!job.duplicate_of_job_id) {
        return { isDuplicate: false as const };
      }
      const { data: original } = await admin
        .from('document_jobs')
        .select('id, original_filename, created_at')
        .eq('id', job.duplicate_of_job_id)
        .maybeSingle();
      return { isDuplicate: true as const, original };
    }),

  uploadDocumentToStorage: authenticatedProcedure
    .input(
      z.object({
        file_name: z.string().min(1).max(255),
        doc_type: docTypeEnum,
        proyecto_id: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);
      const safeName = input.file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${desarrolladoraId}/${Date.now()}_${safeName}`;
      const { data: signed, error } = await admin.storage
        .from('project-documents')
        .createSignedUploadUrl(storagePath);
      if (error || !signed) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'signed_url_failed',
        });
      }
      return {
        signed_url: signed.signedUrl,
        storage_path: storagePath,
        token: signed.token,
      };
    }),
});
