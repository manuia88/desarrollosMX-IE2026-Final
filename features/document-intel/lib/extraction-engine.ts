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
import { consumeCredits } from '@/features/document-intel/lib/credits-engine';
import {
  getSystemPrompt,
  PROMPT_TEMPLATE_VERSION,
} from '@/features/document-intel/lib/system-prompts';
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

async function downloadPdfBase64(storagePath: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error || !data) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `pdf_not_found: ${error?.message ?? storagePath}`,
    });
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

function deriveQualityScore(confidence: number): 'green' | 'amber' | 'red' {
  if (confidence >= 0.85) return 'green';
  if (confidence >= 0.6) return 'amber';
  return 'red';
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

  await supabase
    .from('document_jobs')
    .update({ status: 'extracting', updated_at: new Date().toISOString() })
    .eq('id', jobId);

  try {
    const docTypeParsed = docTypeEnum.safeParse(typed.doc_type);
    if (!docTypeParsed.success) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `invalid_doc_type: ${typed.doc_type}`,
      });
    }
    const docType = docTypeParsed.data;
    const systemPrompt = getSystemPrompt(docType);
    const pdfBase64 = await downloadPdfBase64(typed.storage_path);

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

    const qualityScore = deriveQualityScore(result.confidence);
    const qualityNumeric = Number((result.confidence * 100).toFixed(2));

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
        quality_score: qualityScore,
        quality_score_numeric: qualityNumeric,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

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
