// F14.F.8 Sprint 7 BIBLIA Tareas 7.3+7.4 — Analytics dashboard + Per video + PDF export (Upgrade 4).

import { TRPCError } from '@trpc/server';
import { generateAnalyticsReport } from '@/features/dmx-studio/lib/pdf-export';
import {
  analyticsPerVideoInput,
  analyticsRangeInput,
  exportAnalyticsPdfInput,
} from '@/features/dmx-studio/schemas';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { studioProcedure } from './_studio-procedure';

export const studioSprint7AnalyticsRouter = router({
  getOverview: studioProcedure.input(analyticsRangeInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const since = new Date();
    since.setMonth(since.getMonth() - input.monthsBack);

    const { data: projects } = await supabase
      .from('studio_video_projects')
      .select('id, status, created_at')
      .eq('user_id', ctx.user.id)
      .gte('created_at', since.toISOString());

    const { data: outputs } = await supabase
      .from('studio_video_outputs')
      .select('id, format, hook_variant, render_cost_usd, created_at')
      .eq('user_id', ctx.user.id)
      .gte('created_at', since.toISOString());

    const { data: feedbacks } = await supabase
      .from('studio_feedback')
      .select('rating, selected_hook, preferred_format')
      .eq('user_id', ctx.user.id)
      .gte('created_at', since.toISOString());

    const { data: usage } = await supabase
      .from('studio_usage_logs')
      .select('cost_usd, metric_type, created_at')
      .eq('user_id', ctx.user.id)
      .gte('created_at', since.toISOString());

    const { data: referrals } = await supabase
      .from('studio_referral_form_submissions')
      .select('id, lead_created_id')
      .eq('asesor_user_id', ctx.user.id)
      .gte('submitted_at', since.toISOString());

    const totalProjects = projects?.length ?? 0;
    const totalRendered = outputs?.length ?? 0;
    const totalCostsUsd = (usage ?? []).reduce((acc, row) => acc + Number(row.cost_usd ?? 0), 0);
    const ratings = (feedbacks ?? []).map((f) => Number(f.rating ?? 0)).filter((n) => n > 0);
    const avgRating =
      ratings.length === 0 ? null : ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const totalReferrals = referrals?.length ?? 0;
    const referralsWithLead = (referrals ?? []).filter((r) => r.lead_created_id).length;
    const conversionRatePct = totalReferrals === 0 ? 0 : (referralsWithLead / totalReferrals) * 100;

    const hookCounts = new Map<string, number>();
    for (const f of feedbacks ?? []) {
      const hook = f.selected_hook;
      if (hook) hookCounts.set(hook, (hookCounts.get(hook) ?? 0) + 1);
    }
    const formatCounts = new Map<string, number>();
    for (const o of outputs ?? []) {
      const fmt = o.format;
      if (fmt) formatCounts.set(fmt, (formatCounts.get(fmt) ?? 0) + 1);
    }

    return {
      totalProjects,
      totalRendered,
      totalCostsUsd: Number(totalCostsUsd.toFixed(2)),
      avgRating,
      totalReferrals,
      referralsWithLead,
      conversionRatePct: Number(conversionRatePct.toFixed(1)),
      hookBreakdown: Array.from(hookCounts.entries()).map(([hook, count]) => ({ hook, count })),
      formatBreakdown: Array.from(formatCounts.entries()).map(([format, count]) => ({
        format,
        count,
      })),
    };
  }),

  getByVideo: studioProcedure.input(analyticsPerVideoInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const { data: video } = await supabase
      .from('studio_video_outputs')
      .select('id, project_id, hook_variant, format, render_cost_usd, created_at')
      .eq('id', input.videoId)
      .eq('user_id', ctx.user.id)
      .maybeSingle();
    if (!video) throw new TRPCError({ code: 'NOT_FOUND' });

    const { data: views } = await supabase
      .from('studio_gallery_views_log')
      .select('id, created_at, country_code, device_type')
      .eq('video_id', input.videoId);

    const { data: feedback } = await supabase
      .from('studio_feedback')
      .select('rating, comments')
      .eq('user_id', ctx.user.id)
      .eq('selected_output_id', input.videoId)
      .maybeSingle();

    return {
      video,
      viewsCount: views?.length ?? 0,
      viewsByCountry: aggregate(views ?? [], 'country_code'),
      viewsByDevice: aggregate(views ?? [], 'device_type'),
      feedback,
    };
  }),

  getCostsBreakdown: studioProcedure.input(analyticsRangeInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const since = new Date();
    since.setMonth(since.getMonth() - input.monthsBack);
    const { data, error } = await supabase
      .from('studio_usage_logs')
      .select('metric_type, cost_usd, created_at')
      .eq('user_id', ctx.user.id)
      .gte('created_at', since.toISOString());
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    const byProvider = aggregateNumeric(data ?? [], 'metric_type', 'cost_usd');
    return { byProvider };
  }),

  exportPdf: studioProcedure.input(exportAnalyticsPdfInput).mutation(async ({ ctx, input }) => {
    try {
      const buffer = await generateAnalyticsReport({
        userId: ctx.user.id,
        monthsBack: input.monthsBack,
      });
      return {
        ok: true,
        contentType: 'application/pdf',
        sizeBytes: buffer.byteLength,
        base64: Buffer.from(buffer).toString('base64'),
      };
    } catch (err) {
      sentry.captureException(err, { tags: { feature: 'dmx-studio.analytics.pdf' } });
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: err });
    }
  }),
});

function aggregate(
  rows: ReadonlyArray<Record<string, unknown>>,
  key: string,
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = String(row[key] ?? 'unknown');
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

function aggregateNumeric(
  rows: ReadonlyArray<Record<string, unknown>>,
  groupKey: string,
  numKey: string,
): Array<{ name: string; total: number }> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const name = String(row[groupKey] ?? 'unknown');
    const num = Number(row[numKey] ?? 0);
    totals.set(name, (totals.get(name) ?? 0) + num);
  }
  return Array.from(totals.entries()).map(([name, total]) => ({
    name,
    total: Number(total.toFixed(4)),
  }));
}
