// Cron biz · ad-spend-optimizer-daily (B.4 FASE 15 ola 2 — M14 Marketing Dev).
// Reference: ADR-060 + 03.7 cron canon append v3.
// Auth: Authorization: Bearer ${CRON_SECRET}.
// Schedule: vercel.json `0 6 * * *` (6am UTC daily).
// Observability: ingest_runs INSERT fail-fast (memoria 23).
// Engine: shared/lib/marketing/optimizer/ad-spend-optimizer (heurística + Claude reasoning opcional).

import { NextResponse } from 'next/server';
import {
  type CampaignSnapshot,
  enrichWithClaudeReasoning,
  evaluateCampaigns,
} from '@/shared/lib/marketing/optimizer/ad-spend-optimizer';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import type { Json } from '@/shared/types/database';

export const maxDuration = 300;

const SOURCE = 'biz_ad_spend_optimizer_daily';
const COUNTRY_CODE = 'MX';
const RANGE_DAYS = 7;
const ASSUMED_REVENUE_PER_CONVERSION_MXN = 250_000;

interface CampaignRow {
  readonly id: string;
  readonly nombre: string;
  readonly desarrolladora_id: string;
  readonly status: string;
}

interface AnalyticsRow {
  readonly campaign_id: string;
  readonly channel: string;
  readonly impressions: number;
  readonly clicks: number;
  readonly spend_mxn: number;
  readonly leads: number;
  readonly conversions: number;
  readonly date: string;
}

function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get('authorization') === `Bearer ${expected}`;
}

export async function GET(request: Request): Promise<Response> {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const startedAt = new Date().toISOString();

  const { data: runRow, error: insertErr } = await supabase
    .from('ingest_runs')
    .insert({
      source: SOURCE,
      country_code: COUNTRY_CODE,
      status: 'started',
      rows_inserted: 0,
      rows_updated: 0,
      rows_skipped: 0,
      rows_dlq: 0,
      started_at: startedAt,
      triggered_by: 'cron',
      meta: { cron: 'ad-spend-optimizer' },
    } as never)
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'ad-spend-optimizer', stage: 'observability_insert' },
    });
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'observability_insert_failed' },
      { status: 500 },
    );
  }

  const runId = runRow.id as string;
  let resultStatus: 'ok' | 'error' = 'ok';
  let resultError: string | null = null;
  let campaignsProcessed = 0;
  let analyticsUpdated = 0;

  try {
    const { data: campaignsData, error: cErr } = await supabase
      .from('campaigns')
      .select('id, nombre, desarrolladora_id, status')
      .in('status', ['active', 'paused']);
    if (cErr) throw cErr;
    const campaigns = (campaignsData ?? []) as CampaignRow[];
    if (campaigns.length === 0) {
      resultStatus = 'ok';
      return NextResponse.json({ ok: true, run_id: runId, campaigns_processed: 0 });
    }

    const since = new Date();
    since.setDate(since.getDate() - RANGE_DAYS);
    const sinceStr = since.toISOString().slice(0, 10);

    const ids = campaigns.map((c) => c.id);
    const { data: analyticsData, error: aErr } = await supabase
      .from('campaign_analytics')
      .select('campaign_id, channel, impressions, clicks, spend_mxn, leads, conversions, date')
      .in('campaign_id', ids)
      .gte('date', sinceStr);
    if (aErr) throw aErr;
    const analytics = (analyticsData ?? []) as AnalyticsRow[];

    const aggregated = new Map<string, CampaignSnapshot>();
    for (const c of campaigns) {
      aggregated.set(c.id, {
        campaignId: c.id,
        campaignName: c.nombre,
        channel: 'all',
        spendMxn: 0,
        leads: 0,
        conversions: 0,
        revenueMxn: 0,
        impressions: 0,
        clicks: 0,
      });
    }
    for (const r of analytics) {
      const prev = aggregated.get(r.campaign_id);
      if (!prev) continue;
      aggregated.set(r.campaign_id, {
        ...prev,
        impressions: prev.impressions + (r.impressions ?? 0),
        clicks: prev.clicks + (r.clicks ?? 0),
        spendMxn: prev.spendMxn + Number(r.spend_mxn ?? 0),
        leads: prev.leads + (r.leads ?? 0),
        conversions: prev.conversions + (r.conversions ?? 0),
        revenueMxn:
          prev.revenueMxn + Number(r.conversions ?? 0) * ASSUMED_REVENUE_PER_CONVERSION_MXN,
      });
    }

    const snapshots = [...aggregated.values()];
    const verdicts = evaluateCampaigns({ campaigns: snapshots, mediaCplMxn: null });

    const today = new Date().toISOString().slice(0, 10);
    for (const verdict of verdicts) {
      campaignsProcessed += 1;
      const snap = aggregated.get(verdict.campaignId);
      if (!snap) continue;
      const reasoning = await enrichWithClaudeReasoning(verdict, snap);

      const payload = {
        campaign_id: verdict.campaignId,
        date: today,
        channel: 'all',
        impressions: snap.impressions,
        clicks: snap.clicks,
        spend_mxn: snap.spendMxn,
        leads: snap.leads,
        conversions: snap.conversions,
        ctr: verdict.ctr,
        cpl_mxn: verdict.cplMxn,
        cac_mxn: snap.conversions > 0 ? snap.spendMxn / snap.conversions : null,
        attribution_model: 'last_touch',
        attribution_score: {
          roi: verdict.roi,
          cpl_ratio: verdict.cplRatio,
        } as unknown as Json,
        recommended_action: verdict.action,
        ai_recommendation_reasoning: reasoning,
      };

      const { error: upsertErr } = await supabase.from('campaign_analytics').upsert(payload, {
        onConflict: 'campaign_id,date,channel',
      });
      if (upsertErr) {
        sentry.captureException(upsertErr, {
          tags: { cron: 'ad-spend-optimizer', stage: 'upsert_recommendation' },
        });
      } else {
        analyticsUpdated += 1;
      }
    }
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, { tags: { cron: 'ad-spend-optimizer', stage: 'evaluate_loop' } });
  } finally {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    await supabase
      .from('ingest_runs')
      .update({
        status: resultStatus,
        completed_at: completedAt,
        duration_ms: durationMs,
        rows_updated: analyticsUpdated,
        error: resultError,
        meta: {
          cron: 'ad-spend-optimizer',
          campaigns_processed: campaignsProcessed,
          range_days: RANGE_DAYS,
        },
      } as never)
      .eq('id', runId);
  }

  if (resultStatus === 'error') {
    return NextResponse.json(
      { ok: false, error: resultError ?? 'unknown_error', run_id: runId },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    run_id: runId,
    campaigns_processed: campaignsProcessed,
    analytics_updated: analyticsUpdated,
  });
}
