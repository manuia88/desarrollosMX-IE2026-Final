// FASE 17.B Extraction engine — orquesta job_id → PDF → AI → persist + credits
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3
//
// Pipeline:
//   1. Lock job (status=extracting confirma)
//   2. Download PDF de bucket project-documents
//   3. Llama Anthropic con system prompt by doc_type
//   4. Persist document_extractions (extracted_data + citations)
//   5. Consume credits (markup 50%) → ai_credit_transactions
//   6. Update document_jobs (status=extracted, telemetry tokens/cost)
//   7. Sentry capture + status=error en cualquier fallo

import { TRPCError } from '@trpc/server';
import {
  ANTHROPIC_MODEL,
  type ExtractionTelemetry,
  runExtraction,
} from '@/features/document-intel/lib/anthropic-client';
import { runComplianceCheck } from '@/features/document-intel/lib/compliance-check';
import { consumeCredits } from '@/features/document-intel/lib/credits-engine';
import { generateAndPersistEmbeddings } from '@/features/document-intel/lib/embeddings-engine';
import {
  checkDuplicate,
  computePageHashes,
  diffPages,
  recordDocumentHash,
  sha256,
} from '@/features/document-intel/lib/hash-dedup';
import { computeQualityScoreFromRecords } from '@/features/document-intel/lib/quality-score';
import {
  getSystemPrompt,
  PROMPT_TEMPLATE_VERSION,
} from '@/features/document-intel/lib/system-prompts';
import { runValidation } from '@/features/document-intel/lib/validation-rules';
import { docTypeEnum } from '@/features/document-intel/schemas';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Database, Json } from '@/shared/types/database';

const STORAGE_BUCKET = 'project-documents';
type DocumentJobRow = Database['public']['Tables']['document_jobs']['Row'];

export interface ProcessJobOutcome {
  readonly job_id: string;
  readonly status: 'extracted' | 'error';
  readonly error?: string;
  readonly cost_usd?: number;
  readonly charged_usd?: number;
  readonly extraction_id?: string;
  readonly telemetry?: ExtractionTelemetry;
}

async function downloadPdfBuffer(storagePath: string): Promise<Buffer> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error || !data) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `pdf_not_found: ${error?.message ?? storagePath}`,
    });
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

interface DiffPagesContext {
  readonly previousJobId: string | null;
  readonly changedPages: number[];
  readonly allSame: boolean;
}

async function detectPreviousVersionDiff(opts: {
  readonly desarrolladoraId: string;
  readonly jobId: string;
  readonly originalFilename: string | null;
  readonly currentPageHashes: ReadonlyArray<string>;
}): Promise<DiffPagesContext> {
  if (!opts.originalFilename) {
    return { previousJobId: null, changedPages: [], allSame: false };
  }
  const supabase = createAdminClient();
  const { data: candidates } = await supabase
    .from('document_jobs')
    .select('id, original_filename, status, created_at')
    .eq('desarrolladora_id', opts.desarrolladoraId)
    .eq('original_filename', opts.originalFilename)
    .neq('id', opts.jobId)
    .in('status', ['extracted', 'validated', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1);

  const prev = candidates?.[0];
  if (!prev) {
    return { previousJobId: null, changedPages: [], allSame: false };
  }

  try {
    const changed = await diffPages({
      currentHashes: opts.currentPageHashes,
      previousJobId: prev.id,
    });
    return {
      previousJobId: prev.id,
      changedPages: changed,
      allSame: changed.length === 0,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'document-intel', stage: 'diffPages', job_id: opts.jobId },
    });
    return { previousJobId: prev.id, changedPages: [], allSame: false };
  }
}

interface PostExtractionHookOptions {
  readonly jobId: string;
  readonly desarrolladoraId: string;
  readonly proyectoId: string | null;
  readonly docType: string;
  readonly fileName: string;
  readonly visibility: string;
  readonly extractedData: Record<string, unknown>;
}

async function runPostExtractionHooks(opts: PostExtractionHookOptions): Promise<void> {
  const visibility: 'dev_only' | 'public_derived' =
    opts.visibility === 'public_derived' ? 'public_derived' : 'dev_only';

  try {
    await generateAndPersistEmbeddings({
      jobId: opts.jobId,
      desarrolladoraId: opts.desarrolladoraId,
      proyectoId: opts.proyectoId,
      visibility,
      extractedData: opts.extractedData,
      docType: opts.docType,
      fileName: opts.fileName,
    });
  } catch (err) {
    sentry.captureException(err, {
      tags: {
        feature: 'document-intel',
        stage: 'post_extraction.embeddings',
        job_id: opts.jobId,
      },
    });
  }

  if (!opts.proyectoId) return;

  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from('document_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('proyecto_id', opts.proyectoId)
      .eq('desarrolladora_id', opts.desarrolladoraId)
      .in('status', ['extracted', 'validated', 'approved']);

    if ((count ?? 0) >= 2) {
      await runComplianceCheck({
        proyectoId: opts.proyectoId,
        desarrolladoraId: opts.desarrolladoraId,
      });
    }
  } catch (err) {
    sentry.captureException(err, {
      tags: {
        feature: 'document-intel',
        stage: 'post_extraction.compliance',
        job_id: opts.jobId,
        proyecto_id: opts.proyectoId,
      },
    });
  }
}

export async function processJob(jobId: string): Promise<ProcessJobOutcome> {
  const supabase = createAdminClient();

  const { data: job, error: jobErr } = await supabase
    .from('document_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (jobErr || !job) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: jobErr?.message ?? 'job_not_found',
    });
  }

  const typed = job as DocumentJobRow;

  if (typed.status === 'extracted' || typed.status === 'approved' || typed.status === 'validated') {
    return { job_id: jobId, status: 'extracted' };
  }

  try {
    const docTypeParsed = docTypeEnum.safeParse(typed.doc_type);
    if (!docTypeParsed.success) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `invalid_doc_type: ${typed.doc_type}`,
      });
    }
    const docType = docTypeParsed.data;

    const pdfBuffer = await downloadPdfBuffer(typed.storage_path);
    const fileHash = sha256(pdfBuffer);
    const dupResult = await checkDuplicate({
      desarrolladoraId: typed.desarrolladora_id,
      fileBuffer: pdfBuffer,
    });
    if (dupResult.duplicate && dupResult.existingJobId && dupResult.existingJobId !== jobId) {
      await supabase
        .from('document_jobs')
        .update({
          status: 'extracted',
          duplicate_of_job_id: dupResult.existingJobId,
          ai_cost_usd: 0,
          charged_credits_usd: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return { job_id: jobId, status: 'extracted', cost_usd: 0, charged_usd: 0 };
    }

    const currentPageHashes = computePageHashes({ fileBuffer: pdfBuffer });
    const diffPagesContext = await detectPreviousVersionDiff({
      desarrolladoraId: typed.desarrolladora_id,
      jobId,
      originalFilename: typed.original_filename,
      currentPageHashes,
    });

    await supabase
      .from('document_jobs')
      .update({ status: 'extracting', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    const systemPrompt = getSystemPrompt(docType);
    const pdfBase64 = pdfBuffer.toString('base64');

    const { result, telemetry } = await runExtraction({
      systemPrompt,
      pdfBase64,
    });

    const { data: existingVersions } = await supabase
      .from('document_extractions')
      .select('extraction_version')
      .eq('job_id', jobId)
      .order('extraction_version', { ascending: false })
      .limit(1);
    const lastVersion = existingVersions?.[0]?.extraction_version;
    const nextVersion = typeof lastVersion === 'number' ? lastVersion + 1 : 1;

    const { data: extraction, error: extErr } = await supabase
      .from('document_extractions')
      .insert({
        job_id: jobId,
        extraction_version: nextVersion,
        extracted_data: result.extracted_data as unknown as Json,
        citations: result.citations as unknown as Json,
        confidence_score: result.confidence,
        extraction_engine: ANTHROPIC_MODEL,
        prompt_template_version: PROMPT_TEMPLATE_VERSION,
      })
      .select('id')
      .single();

    if (extErr || !extraction) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: extErr?.message ?? 'extraction_insert_failed',
      });
    }

    const credits = await consumeCredits({
      desarrolladora_id: typed.desarrolladora_id,
      raw_cost_usd: telemetry.cost_usd,
      job_id: jobId,
      description: `AI extraction ${docType} job ${jobId}`,
    });

    const findings = runValidation({
      docType,
      extracted: result.extracted_data,
    });
    const validationRecords = findings.map((f) => ({
      job_id: jobId,
      rule_code: f.rule_code,
      severity: f.severity,
      field_path: f.field_path,
      message: f.message,
      expected_value: f.expected_value,
      actual_value: f.actual_value,
    }));
    if (validationRecords.length > 0) {
      const { error: validationErr } = await supabase
        .from('document_validations')
        .insert(validationRecords);
      if (validationErr) {
        sentry.captureException(validationErr, {
          tags: { feature: 'document-intel', stage: 'persist_validations', job_id: jobId },
        });
      }
    }

    const qualityResult = computeQualityScoreFromRecords(
      findings.map((f) => ({
        id: '',
        job_id: jobId,
        rule_code: f.rule_code,
        severity: f.severity,
        message: f.message,
        field_path: f.field_path,
        expected_value: f.expected_value,
        actual_value: f.actual_value,
        resolved_at: null,
        resolved_by: null,
        resolution_note: null,
        created_at: new Date().toISOString(),
      })),
    );

    const hashResult = await recordDocumentHash({
      desarrolladoraId: typed.desarrolladora_id,
      jobId,
      fileHash,
      pageHashes: currentPageHashes,
    });
    if (!hashResult.ok) {
      sentry.captureException(new Error(hashResult.error ?? 'record_hash_failed'), {
        tags: { feature: 'document-intel', stage: 'record_hash', job_id: jobId },
      });
    }

    if (diffPagesContext.previousJobId) {
      console.info('[document-intel] diff_pages_detected', {
        job_id: jobId,
        previous_job_id: diffPagesContext.previousJobId,
        changed_pages: diffPagesContext.changedPages,
        all_same: diffPagesContext.allSame,
      });
    }

    await supabase
      .from('document_jobs')
      .update({
        status: 'extracted',
        ai_model: telemetry.model,
        ai_tokens_input: telemetry.tokens_input,
        ai_tokens_output: telemetry.tokens_output,
        ai_tokens_cache_read: telemetry.tokens_cache_read,
        ai_cost_usd: telemetry.cost_usd,
        charged_credits_usd: credits.charged_usd,
        quality_score: qualityResult.score,
        quality_score_numeric: qualityResult.numeric,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    void runPostExtractionHooks({
      jobId,
      desarrolladoraId: typed.desarrolladora_id,
      proyectoId: typed.proyecto_id,
      docType,
      fileName: typed.original_filename ?? jobId,
      visibility: typed.visibility,
      extractedData: result.extracted_data,
    });

    return {
      job_id: jobId,
      status: 'extracted',
      cost_usd: telemetry.cost_usd,
      charged_usd: credits.charged_usd,
      extraction_id: extraction.id,
      telemetry,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, {
      tags: { feature: 'document-intel', stage: 'extraction', job_id: jobId },
    });

    await supabase
      .from('document_jobs')
      .update({
        status: 'error',
        error_message: message.slice(0, 1000),
        retry_count: (typed.retry_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    return { job_id: jobId, status: 'error', error: message };
  }
}
