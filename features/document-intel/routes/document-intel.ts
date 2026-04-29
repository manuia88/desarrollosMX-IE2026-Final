import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { runComplianceCheck } from '@/features/document-intel/lib/compliance-check';
import { grantCredits } from '@/features/document-intel/lib/credits-engine';
import { parseDriveFolderId, pollFolder } from '@/features/document-intel/lib/drive-monitor';
import { processJob } from '@/features/document-intel/lib/extraction-engine';
import { createCreditsCheckoutSession } from '@/features/document-intel/lib/stripe-credits';
import {
  AI_CREDITS_PACK_25,
  isAiCreditsPack25PriceConfigured,
} from '@/features/document-intel/lib/stripe-credits-products';
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
import { generateEmbedding } from '@/shared/lib/openai/embeddings';
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

  createJob: authenticatedProcedure.input(createJobInput).mutation(async ({ ctx, input }) => {
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
    if (data.desarrolladora_id !== desarrolladoraId && !ADMIN_ROLES.has(ctx.profile?.rol ?? '')) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
    }
    return data;
  }),

  listMyJobs: authenticatedProcedure.input(listMyJobsInput).query(async ({ ctx, input }) => {
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
      if (job.desarrolladora_id !== desarrolladoraId && !ADMIN_ROLES.has(ctx.profile?.rol ?? '')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
      }
      if (job.status !== 'uploaded' && job.status !== 'ocr_done' && job.status !== 'error') {
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
      if (job.desarrolladora_id !== desarrolladoraId && !ADMIN_ROLES.has(ctx.profile?.rol ?? '')) {
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
        'id, type, amount_usd, balance_after_usd, related_job_id, stripe_payment_id, description, created_at',
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
      pack_available: isAiCreditsPack25PriceConfigured(),
      pack_price_usd: AI_CREDITS_PACK_25.priceUsd,
      pack_credits_added_usd: AI_CREDITS_PACK_25.creditsAddedUsd,
    };
  }),

  createCreditsCheckoutSession: authenticatedProcedure
    .input(
      z.object({
        success_path: z.string().min(1).max(500).optional(),
        cancel_path: z.string().min(1).max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isAiCreditsPack25PriceConfigured()) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'ai_credits_pack_price_not_configured',
        });
      }

      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      try {
        const result = await createCreditsCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          desarrolladoraId,
          ...(input.success_path ? { successPath: input.success_path } : {}),
          ...(input.cancel_path ? { cancelPath: input.cancel_path } : {}),
        });
        return result;
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'document-intel', op: 'credits-checkout' },
          extra: { user_id: ctx.user.id, desarrolladora_id: desarrolladoraId },
        });
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'checkout_session_failed',
        });
      }
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
          'id, rule_code, severity, field_path, message, expected_value, actual_value, resolved_at, resolved_by, resolution_note, created_at',
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
      const ownerDevId = (
        validation as unknown as {
          document_jobs?: { desarrolladora_id?: string };
        }
      ).document_jobs?.desarrolladora_id;
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

  getProjectComplianceChecks: authenticatedProcedure
    .input(z.object({ proyecto_id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      const { data: project, error: projErr } = await admin
        .from('proyectos')
        .select('id, desarrolladora_id')
        .eq('id', input.proyecto_id)
        .maybeSingle();
      if (projErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: projErr.message });
      }
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'project_not_found' });
      }
      if (
        project.desarrolladora_id !== desarrolladoraId &&
        !ADMIN_ROLES.has(ctx.profile?.rol ?? '')
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
      }

      const SEVERITY_RANK: Record<string, number> = {
        critical: 0,
        warning: 1,
        info: 2,
      };

      const { data, error } = await admin
        .from('document_compliance_checks')
        .select(
          'id, check_code, severity, finding, source_job_ids, conflicting_data, ai_recommendation, resolved_at, resolved_by, resolution_note, created_at',
        )
        .eq('proyecto_id', input.proyecto_id)
        .order('created_at', { ascending: false });
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      const rows = data ?? [];
      return [...rows].sort((a, b) => {
        const ar = a.resolved_at !== null ? 1 : 0;
        const br = b.resolved_at !== null ? 1 : 0;
        if (ar !== br) return ar - br;
        const sa = SEVERITY_RANK[a.severity] ?? 99;
        const sb = SEVERITY_RANK[b.severity] ?? 99;
        return sa - sb;
      });
    }),

  runComplianceCheckManual: authenticatedProcedure
    .input(z.object({ proyecto_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      const { data: project, error: projErr } = await admin
        .from('proyectos')
        .select('id, desarrolladora_id')
        .eq('id', input.proyecto_id)
        .maybeSingle();
      if (projErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: projErr.message });
      }
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'project_not_found' });
      }
      if (
        project.desarrolladora_id !== desarrolladoraId &&
        !ADMIN_ROLES.has(ctx.profile?.rol ?? '')
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
      }

      try {
        const result = await runComplianceCheck({
          proyectoId: input.proyecto_id,
          desarrolladoraId,
        });
        return { ok: true, ...result };
      } catch (err) {
        sentry.captureException(err, {
          tags: { feature: 'document-intel', stage: 'runComplianceCheckManual' },
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'compliance_check_failed',
        });
      }
    }),

  resolveComplianceCheck: authenticatedProcedure
    .input(
      z.object({
        check_id: z.string().uuid(),
        note: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      const { data: check, error: lookupErr } = await admin
        .from('document_compliance_checks')
        .select('id, desarrolladora_id, resolved_at')
        .eq('id', input.check_id)
        .maybeSingle();
      if (lookupErr) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: lookupErr.message });
      }
      if (!check) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'check_not_found' });
      }
      if (
        check.desarrolladora_id !== desarrolladoraId &&
        !ADMIN_ROLES.has(ctx.profile?.rol ?? '')
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'cross_dev_access_denied' });
      }
      if (check.resolved_at !== null) {
        throw new TRPCError({ code: 'CONFLICT', message: 'already_resolved' });
      }

      const { error } = await admin
        .from('document_compliance_checks')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: ctx.user.id,
          resolution_note: input.note,
        })
        .eq('id', input.check_id);
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
      return { ok: true };
    }),

  searchDocuments: authenticatedProcedure
    .input(
      z.object({
        query: z.string().min(3).max(500),
        proyecto_id: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const admin = createAdminClient();
      const desarrolladoraId = await requireDesarrolladoraId(admin, ctx.user.id);

      const { embedding, telemetry } = await generateEmbedding(input.query);

      let queryBuilder = admin
        .from('document_embeddings')
        .select('id, job_id, proyecto_id, chunk_index, chunk_text, metadata, created_at, embedding')
        .eq('desarrolladora_id', desarrolladoraId)
        .eq('visibility', 'dev_only');

      if (input.proyecto_id) {
        queryBuilder = queryBuilder.eq('proyecto_id', input.proyecto_id);
      }

      const { data: rows, error } = await queryBuilder.limit(500);
      if (error) {
        sentry.captureException(error, {
          tags: { feature: 'document-intel', stage: 'searchDocuments.query' },
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      const queryArr = embedding;
      const queryNorm = Math.sqrt(queryArr.reduce((s, v) => s + v * v, 0)) || 1;

      const scored = (rows ?? []).flatMap((r) => {
        if (!r.embedding) return [];
        let candidateVec: number[];
        try {
          candidateVec = JSON.parse(r.embedding) as number[];
        } catch {
          return [];
        }
        if (!Array.isArray(candidateVec) || candidateVec.length !== queryArr.length) return [];
        let dot = 0;
        let normB = 0;
        for (let i = 0; i < queryArr.length; i += 1) {
          const a = queryArr[i] ?? 0;
          const b = candidateVec[i] ?? 0;
          dot += a * b;
          normB += b * b;
        }
        const denom = queryNorm * (Math.sqrt(normB) || 1);
        const similarity = denom === 0 ? 0 : dot / denom;
        return [{ row: r, similarity }];
      });

      const filtered = scored
        .filter((s) => s.similarity >= 0.7)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, input.limit);

      const jobIds = [...new Set(filtered.map((s) => s.row.job_id))];
      const jobMetaById = new Map<string, { original_filename: string | null; doc_type: string }>();
      if (jobIds.length > 0) {
        const { data: jobs } = await admin
          .from('document_jobs')
          .select('id, original_filename, doc_type')
          .in('id', jobIds);
        for (const j of jobs ?? []) {
          jobMetaById.set(j.id, {
            original_filename: j.original_filename,
            doc_type: j.doc_type,
          });
        }
      }

      return {
        query_tokens: telemetry.tokens_used,
        query_cost_usd: telemetry.cost_usd,
        results: filtered.map((s) => {
          const meta = jobMetaById.get(s.row.job_id);
          return {
            id: s.row.id,
            job_id: s.row.job_id,
            chunk_index: s.row.chunk_index,
            chunk_text: s.row.chunk_text,
            similarity: Number(s.similarity.toFixed(4)),
            doc_type: meta?.doc_type ?? null,
            original_filename: meta?.original_filename ?? null,
            created_at: s.row.created_at,
          };
        }),
      };
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
