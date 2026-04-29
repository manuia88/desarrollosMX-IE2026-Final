import { TRPCError } from '@trpc/server';
import {
  apiKeyCreateInput,
  apiKeyListInput,
  apiKeyRevokeInput,
  generateCommitteeReportInput,
  listCommitteeReportsInput,
  listSimulatorRunsInput,
  pipelineListInput,
  radarListAlertsInput,
  radarSubscribeInput,
  radarUnsubscribeInput,
  simulateProjectInput,
} from '@/features/developer-moonshots/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createApiKey, listApiKeys, revokeApiKey } from '@/shared/lib/moonshots/api-keys';
import { generateCommitteeReport } from '@/shared/lib/moonshots/committee-pdf';
import { listPipelineSnapshots } from '@/shared/lib/moonshots/pipeline-tracker';
import {
  listRecentAlertsForUser,
  listSubscriptions,
  subscribeRadar,
  unsubscribeRadar,
} from '@/shared/lib/moonshots/radar-dispatch';
import { simulateProject } from '@/shared/lib/moonshots/simulator';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const ALLOWED_DEV_ROLES = new Set(['admin_desarrolladora', 'superadmin', 'mb_admin']);

async function requireDevContext(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ desarrolladoraId: string | null; rol: string }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, rol, desarrolladora_id')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  if (!data || !ALLOWED_DEV_ROLES.has(data.rol)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'developer role required' });
  }
  return { desarrolladoraId: data.desarrolladora_id ?? null, rol: data.rol };
}

export const developerMoonshotsRouter = router({
  // ─── 15.X.1 Simulador ────────────────────────────────────────────
  simulateProject: authenticatedProcedure
    .input(simulateProjectInput)
    .mutation(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      try {
        return await simulateProject(supabase, input, ctx.user.id, desarrolladoraId);
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'simulator_failed',
        });
      }
    }),

  listSimulatorRuns: authenticatedProcedure
    .input(listSimulatorRunsInput)
    .query(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      await requireDevContext(supabase, ctx.user.id);
      const { data } = await supabase
        .from('simulator_runs')
        .select(
          'id, ubicacion_input, tipologia_input, output_irr, output_npv, output_absorcion_meses, output_pmf_score, created_at',
        )
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(input.limit);
      return (data ?? []).map((r) => ({
        id: r.id,
        ubicacion: r.ubicacion_input,
        tipologia: r.tipologia_input,
        outputIrr: r.output_irr ? Number(r.output_irr) : null,
        outputNpv: r.output_npv ? Number(r.output_npv) : null,
        outputAbsorcionMeses: r.output_absorcion_meses ? Number(r.output_absorcion_meses) : null,
        outputPmfScore: r.output_pmf_score,
        createdAt: r.created_at,
      }));
    }),

  // ─── 15.X.2 Radar Trend Genome ───────────────────────────────────
  subscribeRadar: authenticatedProcedure
    .input(radarSubscribeInput)
    .mutation(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      await requireDevContext(supabase, ctx.user.id);
      const result = await subscribeRadar(supabase, {
        userId: ctx.user.id,
        zoneId: input.zoneId,
        channel: input.channel,
        thresholdPct: input.thresholdPct,
        countryCode: 'MX',
      });
      if (!result.subscribed) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.reason });
      }
      return result;
    }),

  unsubscribeRadar: authenticatedProcedure
    .input(radarUnsubscribeInput)
    .mutation(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      await requireDevContext(supabase, ctx.user.id);
      const ok = await unsubscribeRadar(supabase, {
        userId: ctx.user.id,
        subscriptionId: input.subscriptionId,
      });
      return { ok };
    }),

  listRadarSubscriptions: authenticatedProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    await requireDevContext(supabase, ctx.user.id);
    return listSubscriptions(supabase, ctx.user.id);
  }),

  listRadarAlerts: authenticatedProcedure
    .input(radarListAlertsInput)
    .query(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      await requireDevContext(supabase, ctx.user.id);
      return listRecentAlertsForUser(supabase, ctx.user.id, input.limit);
    }),

  // ─── 15.X.3 Committee Report ─────────────────────────────────────
  generateCommitteeReport: authenticatedProcedure
    .input(generateCommitteeReportInput)
    .mutation(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      try {
        return await generateCommitteeReport(supabase, {
          userId: ctx.user.id,
          desarrolladoraId,
          ...(input.proyectoId ? { proyectoId: input.proyectoId } : {}),
          ...(input.feasibilityId ? { feasibilityId: input.feasibilityId } : {}),
          ...(input.simulatorRunId ? { simulatorRunId: input.simulatorRunId } : {}),
          thesisSummary: input.thesisSummary,
        });
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'committee_failed',
        });
      }
    }),

  listCommitteeReports: authenticatedProcedure
    .input(listCommitteeReportsInput)
    .query(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      await requireDevContext(supabase, ctx.user.id);
      const { data } = await supabase
        .from('committee_reports')
        .select('id, thesis_summary, pdf_url, cost_usd, created_at')
        .eq('user_id', ctx.user.id)
        .order('created_at', { ascending: false })
        .limit(input.limit);
      return (data ?? []).map((r) => ({
        id: r.id,
        thesisSummary: r.thesis_summary,
        pdfUrl: r.pdf_url,
        costUsd: r.cost_usd ? Number(r.cost_usd) : null,
        createdAt: r.created_at,
      }));
    }),

  // ─── 15.X.4 Pipeline Tracker ─────────────────────────────────────
  listPipelineSnapshots: authenticatedProcedure
    .input(pipelineListInput)
    .query(async ({ input, ctx }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await requireDevContext(supabase, ctx.user.id);
      if (!desarrolladoraId) return [];
      return listPipelineSnapshots(supabase, desarrolladoraId, input.rangeFromDays);
    }),

  // ─── 15.X.5 API Keys ─────────────────────────────────────────────
  createApiKey: authenticatedProcedure.input(apiKeyCreateInput).mutation(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    await requireDevContext(supabase, ctx.user.id);
    try {
      return await createApiKey(supabase, {
        profileId: ctx.user.id,
        name: input.name,
        scopes: input.scopes,
        ...(input.expiresAtIso ? { expiresAtIso: input.expiresAtIso } : {}),
      });
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'api_key_create_failed',
      });
    }
  }),

  listApiKeys: authenticatedProcedure.input(apiKeyListInput).query(async ({ ctx }) => {
    const supabase = createAdminClient();
    await requireDevContext(supabase, ctx.user.id);
    return listApiKeys(supabase, ctx.user.id);
  }),

  revokeApiKey: authenticatedProcedure.input(apiKeyRevokeInput).mutation(async ({ input, ctx }) => {
    const supabase = createAdminClient();
    await requireDevContext(supabase, ctx.user.id);
    const ok = await revokeApiKey(supabase, {
      profileId: ctx.user.id,
      keyId: input.keyId,
    });
    return { ok };
  }),
});
