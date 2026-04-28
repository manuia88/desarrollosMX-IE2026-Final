// F14.F.8 Sprint 7 BIBLIA Upgrade 4 — Analytics PDF export (gamification).
// Reporte mensual descargable usando @react-pdf/renderer (already in dependencies).

import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface GenerateAnalyticsReportInput {
  readonly userId: string;
  readonly monthsBack: number;
}

export interface AnalyticsReportData {
  readonly userName: string;
  readonly periodLabel: string;
  readonly totalProjects: number;
  readonly totalRendered: number;
  readonly totalCostsUsd: number;
  readonly totalReferrals: number;
  readonly viewsTotal: number;
  readonly avgRating: number | null;
  readonly hookBreakdown: ReadonlyArray<{ hook: string; count: number }>;
  readonly formatBreakdown: ReadonlyArray<{ format: string; count: number }>;
}

export async function buildAnalyticsReportData(
  input: GenerateAnalyticsReportInput,
): Promise<AnalyticsReportData> {
  const supabase = createAdminClient();
  const since = new Date();
  since.setMonth(since.getMonth() - input.monthsBack);

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', input.userId)
    .maybeSingle();

  const { data: projects } = await supabase
    .from('studio_video_projects')
    .select('id')
    .eq('user_id', input.userId)
    .gte('created_at', since.toISOString());

  const { data: outputs } = await supabase
    .from('studio_video_outputs')
    .select('id, format')
    .eq('user_id', input.userId)
    .gte('created_at', since.toISOString());

  const { data: feedbacksForHooks } = await supabase
    .from('studio_feedback')
    .select('selected_hook')
    .eq('user_id', input.userId)
    .gte('created_at', since.toISOString());

  const { data: usage } = await supabase
    .from('studio_usage_logs')
    .select('cost_usd')
    .eq('user_id', input.userId)
    .gte('created_at', since.toISOString());

  const { count: referrals } = await supabase
    .from('studio_referral_form_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('asesor_user_id', input.userId)
    .gte('submitted_at', since.toISOString());

  const { count: viewsTotal } = await supabase
    .from('studio_gallery_views_log')
    .select('id', { count: 'exact', head: true })
    .eq('asesor_user_id', input.userId)
    .gte('created_at', since.toISOString());

  const { data: feedbacks } = await supabase
    .from('studio_feedback')
    .select('rating')
    .eq('user_id', input.userId)
    .gte('created_at', since.toISOString());

  const totalCostsUsd = (usage ?? []).reduce((acc, row) => acc + Number(row.cost_usd ?? 0), 0);
  const ratings = (feedbacks ?? []).map((f) => Number(f.rating ?? 0)).filter((n) => n > 0);
  const avgRating =
    ratings.length === 0
      ? null
      : Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2));

  const hookCounts = aggregate(feedbacksForHooks ?? [], 'selected_hook');
  const formatCounts = aggregate(outputs ?? [], 'format');

  return {
    userName: (
      (profile as { display_name?: string } | null)?.display_name ?? 'Asesor DMX'
    ).toString(),
    periodLabel: `${input.monthsBack} mes(es) hasta ${new Date().toISOString().slice(0, 10)}`,
    totalProjects: projects?.length ?? 0,
    totalRendered: outputs?.length ?? 0,
    totalCostsUsd: Number(totalCostsUsd.toFixed(2)),
    totalReferrals: referrals ?? 0,
    viewsTotal: viewsTotal ?? 0,
    avgRating,
    hookBreakdown: hookCounts,
    formatBreakdown: formatCounts,
  };
}

export async function generateAnalyticsReport(
  input: GenerateAnalyticsReportInput,
): Promise<Uint8Array> {
  const data = await buildAnalyticsReportData(input);
  const { renderPdf } = await import('./renderer');
  return renderPdf(data);
}

function aggregate(
  rows: ReadonlyArray<Record<string, unknown>>,
  key: string,
): Array<{ hook: string; count: number; format: string }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = String(row[key] ?? 'unknown');
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({
    hook: name,
    format: name,
    count,
  }));
}
