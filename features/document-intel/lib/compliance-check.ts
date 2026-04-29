// FASE 17.D Compliance Cross-Check orchestrator — runComplianceCheck
// Authority: ADR-062 + plan FASE_17_DOCUMENT_INTEL.md addendum v3
//
// Pipeline:
//   1. Query latest extracted document_jobs por proyecto
//   2. Si <2 docs extracted → skip (return early)
//   3. Build map<docType, extracted_data>
//   4. Para cada regla canon → si requires set ⊆ disponibles → check
//   5. Si finding → llama Claude Sonnet 4 para ai_recommendation natural
//   6. Idempotencia: delete existing por proyecto_id + check_code antes insert
//   7. Insert document_compliance_checks rows

import { runReasoningChat } from '@/features/document-intel/lib/anthropic-client';
import {
  COMPLIANCE_RULES,
  type ComplianceFinding,
  evaluateRule,
} from '@/features/document-intel/lib/compliance-rules';
import type { DocType } from '@/features/document-intel/schemas/validation';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Database, Json } from '@/shared/types/database';

type ComplianceInsert = Database['public']['Tables']['document_compliance_checks']['Insert'];

export interface RunComplianceCheckOptions {
  readonly proyectoId: string;
  readonly desarrolladoraId: string;
}

export interface RunComplianceCheckResult {
  readonly skipped: boolean;
  readonly reason?: string;
  readonly findings_count: number;
  readonly ai_calls_count: number;
  readonly ai_cost_usd: number;
}

interface JobWithExtraction {
  readonly job_id: string;
  readonly doc_type: DocType;
  readonly extracted_data: Record<string, unknown>;
}

export async function buildExtractedDataMap(
  proyectoId: string,
  desarrolladoraId: string,
): Promise<{
  docMap: Map<DocType, Record<string, unknown>>;
  sourceJobIdsByDocType: Map<DocType, string[]>;
  totalDocs: number;
}> {
  const supabase = createAdminClient();
  const { data: jobs, error: jobsErr } = await supabase
    .from('document_jobs')
    .select('id, doc_type, status, created_at')
    .eq('proyecto_id', proyectoId)
    .eq('desarrolladora_id', desarrolladoraId)
    .in('status', ['extracted', 'validated', 'approved'])
    .order('created_at', { ascending: false });

  if (jobsErr || !jobs) {
    return {
      docMap: new Map(),
      sourceJobIdsByDocType: new Map(),
      totalDocs: 0,
    };
  }

  const jobIds = jobs.map((j) => j.id);
  if (jobIds.length === 0) {
    return {
      docMap: new Map(),
      sourceJobIdsByDocType: new Map(),
      totalDocs: 0,
    };
  }

  const { data: extractions, error: extErr } = await supabase
    .from('document_extractions')
    .select('id, job_id, extracted_data, extraction_version, created_at')
    .in('job_id', jobIds)
    .order('extraction_version', { ascending: false });

  if (extErr || !extractions) {
    return {
      docMap: new Map(),
      sourceJobIdsByDocType: new Map(),
      totalDocs: 0,
    };
  }

  const latestByJob = new Map<string, JobWithExtraction>();
  const docTypeByJob = new Map<string, DocType>();
  for (const j of jobs) {
    docTypeByJob.set(j.id, j.doc_type as DocType);
  }
  for (const e of extractions) {
    if (latestByJob.has(e.job_id)) continue;
    const dt = docTypeByJob.get(e.job_id);
    if (!dt) continue;
    const data = e.extracted_data;
    const dataObj =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};
    latestByJob.set(e.job_id, {
      job_id: e.job_id,
      doc_type: dt,
      extracted_data: dataObj,
    });
  }

  const docMap = new Map<DocType, Record<string, unknown>>();
  const sourceJobIdsByDocType = new Map<DocType, string[]>();
  for (const item of latestByJob.values()) {
    if (!docMap.has(item.doc_type)) {
      docMap.set(item.doc_type, item.extracted_data);
    }
    const arr = sourceJobIdsByDocType.get(item.doc_type) ?? [];
    arr.push(item.job_id);
    sourceJobIdsByDocType.set(item.doc_type, arr);
  }

  return {
    docMap,
    sourceJobIdsByDocType,
    totalDocs: latestByJob.size,
  };
}

const AI_RECOMMENDATION_SYSTEM_PROMPT = `Eres un asistente especializado en validación cruzada de documentos inmobiliarios para desarrolladoras LATAM. Recibes un finding técnico y datos en conflicto entre 2-3 documentos del mismo proyecto. Tu trabajo:
- Explicar al desarrollador en 2-3 oraciones qué pasó.
- Sugerir 1 acción concreta para resolverlo.
- Tono: profesional, directo, sin alarma innecesaria, español neutro.
- NO inventes datos. NO repitas el finding literal. Usa los snippets como contexto.`;

export async function generateAIRecommendation(
  finding: ComplianceFinding,
): Promise<{ text: string; cost_usd: number } | null> {
  try {
    const userMessage = [
      `Finding: ${finding.finding}`,
      `Severidad: ${finding.severity}`,
      `Documentos involucrados: ${finding.source_doc_types.join(', ')}`,
      `Datos en conflicto:`,
      JSON.stringify(finding.conflicting_data, null, 2),
    ].join('\n');

    const { text, telemetry } = await runReasoningChat({
      systemPrompt: AI_RECOMMENDATION_SYSTEM_PROMPT,
      userMessage,
      maxTokens: 400,
    });

    const cleaned = text.trim();
    if (cleaned.length === 0) return null;
    return { text: cleaned, cost_usd: telemetry.cost_usd };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'document-intel', stage: 'compliance.ai_recommendation' },
      extra: { check_code: finding.check_code },
    });
    return null;
  }
}

export async function runComplianceCheck(
  opts: RunComplianceCheckOptions,
): Promise<RunComplianceCheckResult> {
  const supabase = createAdminClient();
  const { docMap, sourceJobIdsByDocType, totalDocs } = await buildExtractedDataMap(
    opts.proyectoId,
    opts.desarrolladoraId,
  );

  if (totalDocs < 2) {
    return {
      skipped: true,
      reason: `insufficient_docs:${totalDocs}`,
      findings_count: 0,
      ai_calls_count: 0,
      ai_cost_usd: 0,
    };
  }

  const findings: ComplianceFinding[] = [];
  for (const rule of COMPLIANCE_RULES) {
    const finding = evaluateRule(rule, docMap);
    if (finding) findings.push(finding);
  }

  // Idempotencia: delete previous compliance checks NO resueltas para este proyecto + check_codes detectados.
  const allRuleCodes = COMPLIANCE_RULES.map((r) => r.code);
  const { error: deleteErr } = await supabase
    .from('document_compliance_checks')
    .delete()
    .eq('proyecto_id', opts.proyectoId)
    .eq('desarrolladora_id', opts.desarrolladoraId)
    .is('resolved_at', null)
    .in('check_code', allRuleCodes);
  if (deleteErr) {
    sentry.captureException(deleteErr, {
      tags: {
        feature: 'document-intel',
        stage: 'compliance.delete_previous',
        proyecto_id: opts.proyectoId,
      },
    });
  }

  if (findings.length === 0) {
    return {
      skipped: false,
      findings_count: 0,
      ai_calls_count: 0,
      ai_cost_usd: 0,
    };
  }

  let aiCalls = 0;
  let aiCost = 0;
  const rows: ComplianceInsert[] = [];
  for (const finding of findings) {
    const sourceIds: string[] = [];
    for (const dt of finding.source_doc_types) {
      const ids = sourceJobIdsByDocType.get(dt);
      if (ids) sourceIds.push(...ids);
    }
    const recommendation = await generateAIRecommendation(finding);
    if (recommendation) {
      aiCalls += 1;
      aiCost += recommendation.cost_usd;
    }
    rows.push({
      proyecto_id: opts.proyectoId,
      desarrolladora_id: opts.desarrolladoraId,
      check_code: finding.check_code,
      severity: finding.severity,
      finding: finding.finding,
      source_job_ids: sourceIds,
      conflicting_data: finding.conflicting_data as unknown as Json,
      ai_recommendation: recommendation?.text ?? null,
    });
  }

  const { error: insertErr } = await supabase.from('document_compliance_checks').insert(rows);
  if (insertErr) {
    sentry.captureException(insertErr, {
      tags: {
        feature: 'document-intel',
        stage: 'compliance.insert',
        proyecto_id: opts.proyectoId,
      },
    });
    throw new Error(`compliance_insert_failed: ${insertErr.message}`);
  }

  return {
    skipped: false,
    findings_count: findings.length,
    ai_calls_count: aiCalls,
    ai_cost_usd: Number(aiCost.toFixed(6)),
  };
}
