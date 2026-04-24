// Worker IE — consume score_recalculation_queue (vercel.json crons).
// FASE 08 / BLOQUE 8.A / MÓDULO 8.A.4
//
// Auth: Authorization: Bearer ${CRON_SECRET} — patrón actual Vercel crons.
// Vercel inyecta este header automáticamente cuando CRON_SECRET está
// configurado como env var. Dev local: mismo header con valor local.
// Ref: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs

import { NextResponse } from 'next/server';
import { runScore } from '@/shared/lib/intelligence-engine/calculators/run-score';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const maxDuration = 300;

interface ClaimedJob {
  id: string;
  score_id: string;
  entity_type: 'zone' | 'project' | 'user' | 'market';
  entity_id: string;
  country_code: string;
  triggered_by: string;
  priority: number;
  batch_mode: boolean;
  attempts: number;
  scheduled_for: string;
}

function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const received = request.headers.get('authorization');
  return received === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const batchSize = 50;

  const { data: claimed, error: claimError } = await supabase.rpc('claim_pending_score_jobs', {
    p_limit: batchSize,
  });

  if (claimError) {
    return NextResponse.json(
      { ok: false, error: claimError.message, processed: 0, done: 0, errors: 0 },
      { status: 500 },
    );
  }

  const jobs = (claimed ?? []) as ClaimedJob[];
  let done = 0;
  let errors = 0;
  let skipped = 0;

  for (const job of jobs) {
    try {
      const input = {
        countryCode: job.country_code,
        periodDate: new Date().toISOString().slice(0, 10),
        ...(job.entity_type === 'zone' ? { zoneId: job.entity_id } : {}),
        ...(job.entity_type === 'project' ? { projectId: job.entity_id } : {}),
        ...(job.entity_type === 'user' ? { userId: job.entity_id } : {}),
      };
      const result = await runScore(job.score_id, input, supabase);

      if (result.kind === 'ok') {
        await supabase.rpc('finalize_score_job', {
          p_id: job.id,
          p_success: true,
        });
        done += 1;
      } else if (result.kind === 'gated') {
        // Gated no cuenta como error — marcamos done (score no calculable por tier).
        await supabase.rpc('finalize_score_job', {
          p_id: job.id,
          p_success: true,
        });
        skipped += 1;
      } else if (result.kind === 'tenant_violation') {
        // D33 — tenant scope violation: score requiere tenant_id no provisto
        // o tenant desconocido. Marcamos como error con detalle para debug.
        await supabase.rpc('finalize_score_job', {
          p_id: job.id,
          p_success: false,
          p_error: `tenant_violation:${result.violation.reason}`,
        });
        errors += 1;
      } else {
        await supabase.rpc('finalize_score_job', {
          p_id: job.id,
          p_success: false,
          p_error: result.error,
        });
        errors += 1;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'worker_unexpected_error';
      await supabase.rpc('finalize_score_job', {
        p_id: job.id,
        p_success: false,
        p_error: msg,
      });
      errors += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: jobs.length,
    done,
    errors,
    skipped,
  });
}
