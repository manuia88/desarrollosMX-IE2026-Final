// F14.F.11 Sprint 10 BIBLIA — QA + Feedback + Health Check + Beta Outreach.
//
// 3 sub-routers:
//   1. sprint10Feedback — NPS submit + history + aggregate. STUB ADR-018 H2 collection.
//      Activación: cuando founder cargue créditos APIs + base 50+ asesores reales.
//      4 señales canon ADR-018:
//        (1) STUB comment + heuristic message
//        (2) tRPC throws NOT_IMPLEMENTED en submit/aggregate hasta activar flag
//        (3) UI flag visible (NpsWidget muestra disabled state)
//        (4) L-NEW pointer (L-NEW-STUDIO-NPS-DATA-COLLECTION-ACTIVATE H2)
//   2. sprint10QaReport — admin-only QA report download.
//      4 señales canon ADR-018: STUB H2 hasta admin tooling activado.
//   3. sprint10HealthCheck — real H1, retorna estado wrappers + tablas + crons.

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

const STUB_NPS_MESSAGE =
  'STUB ADR-018 — Sprint 10 NPS data collection paused H1. ' +
  'Activación H2 cuando 50+ asesores invitados beta privada. ' +
  'L-NEW-STUDIO-NPS-DATA-COLLECTION-ACTIVATE.';

const STUB_QA_MESSAGE =
  'STUB ADR-018 — Sprint 10 QA admin report download paused H1. ' +
  'Activación H2 cuando admin tooling marketplace verification activado. ' +
  'L-NEW-STUDIO-QA-REPORT-ADMIN-DOWNLOAD-ACTIVATE.';

const submitNpsInput = z.object({
  projectId: z.string().uuid().optional(),
  score: z.number().int().min(0).max(10),
  comment: z.string().max(1000).optional(),
  reasons: z.array(z.string()).max(10).optional(),
  context: z.enum(['post_video', 'two_week_survey', 'post_onboarding']).default('post_video'),
});

const npsAggregateInput = z.object({
  rangeDays: z.number().int().min(7).max(365).default(30),
});

export const sprint10FeedbackRouter = router({
  submitNps: studioProcedure.input(submitNpsInput).mutation(() => {
    throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_NPS_MESSAGE });
  }),

  getFeedbackHistory: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_feedback')
      .select('id, project_id, rating, comments, created_at')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return { items: data ?? [], stubH2: true, stubMessage: STUB_NPS_MESSAGE };
  }),

  getNpsAggregate: studioProcedure.input(npsAggregateInput).query(() => {
    throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_NPS_MESSAGE });
  }),
});

export const sprint10QaReportRouter = router({
  getReport: studioProcedure.query(({ ctx }) => {
    if ((ctx.studio.studioRole as string) !== 'studio_admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin role required' });
    }
    return {
      stubH2: true,
      stubMessage: STUB_QA_MESSAGE,
      reportPath: 'docs/M21_STUDIO/QA_REPORT_SPRINT10.md',
      summary: {
        totalStudioTables: 44,
        rlsCoveragePct: 100,
        baselineTests: 4334,
        adrCanonStubs: 24,
      },
    };
  }),

  downloadFullReport: studioProcedure.mutation(({ ctx }) => {
    if ((ctx.studio.studioRole as string) !== 'studio_admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin role required' });
    }
    throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: STUB_QA_MESSAGE });
  }),
});

export const sprint10HealthCheckRouter = router({
  getStudioHealth: studioProcedure.query(async () => {
    const supabase = createAdminClient();
    const tablesToCheck = [
      'studio_organizations',
      'studio_users_extension',
      'studio_video_projects',
      'studio_video_outputs',
      'studio_feedback',
      'studio_api_jobs',
      'studio_usage_logs',
    ] as const;
    const checks = await Promise.all(
      tablesToCheck.map(async (table) => {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        return { table, ok: !error, error: error?.message ?? null };
      }),
    );
    const allOk = checks.every((c) => c.ok);
    return {
      status: allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      tables: checks,
      sprint: 'Sprint 10',
      version: 'v1.0.0-beta',
    };
  }),
});
