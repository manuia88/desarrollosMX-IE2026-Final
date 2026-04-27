// F14.F.5 Sprint 4 UPGRADE 6 LATERAL — DMX Studio weekly challenge launch cron.
// Schedule canon Hobby plan: 0 0 * * 1 (lunes 00:00 UTC).
// Auth: Authorization: Bearer ${CRON_SECRET} (canon BATCH 4 PR #38).
// Observability: ingest_runs INSERT fail-fast (memoria cron_observability_obligatorio)
// con source='biz_studio_challenge_launch' + try/finally + Sentry capture.
// Best-effort email broadcast a usuarios Studio activos (per-user errors swallow via Sentry).

import { NextResponse } from 'next/server';
import { seedWeeklyChallenge } from '@/features/dmx-studio/lib/community-challenges';
import { getStudioEmailProvider } from '@/features/dmx-studio/lib/resend/provider';
import {
  CHALLENGE_WEEK_LAUNCHED_SUBJECT,
  renderChallengeWeekLaunchedHtml,
} from '@/features/dmx-studio/lib/resend/templates/challenge-week-launched';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const maxDuration = 60;

const SOURCE = 'biz_studio_challenge_launch';
const COUNTRY_CODE = 'MX';
function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const received = request.headers.get('authorization');
  return received === `Bearer ${expected}`;
}

function mondayOfThisWeekUtc(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay();
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + offsetToMonday);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface StudioActiveUser {
  user_id: string;
}

interface ProfileLite {
  id: string;
  email: string;
  first_name: string | null;
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
      meta: { cron: 'studio-challenge-launch' },
    } as never)
    .select('id')
    .single();

  if (insertErr || !runRow) {
    sentry.captureException(insertErr ?? new Error('ingest_runs_insert_null'), {
      tags: { cron: 'studio-challenge-launch', stage: 'observability_insert' },
    });
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'observability_insert_failed' },
      { status: 500 },
    );
  }

  const runId = runRow.id;
  let challengeId: string | null = null;
  let emailsSent = 0;
  let emailsFailed = 0;
  let resultStatus: 'ok' | 'error' = 'ok';
  let resultError: string | null = null;

  try {
    const weekStart = mondayOfThisWeekUtc();
    const challenge = await seedWeeklyChallenge(supabase, weekStart);
    challengeId = challenge.id;

    const subsResp = await supabase
      .from('studio_subscriptions')
      .select('user_id')
      .in('status', ['active', 'trialing']);
    if (subsResp.error) {
      throw new Error(`subscriptions fetch failed: ${subsResp.error.message}`);
    }
    const activeUsers = (subsResp.data ?? []) as ReadonlyArray<StudioActiveUser>;
    const uniqueUserIds = Array.from(new Set(activeUsers.map((u) => u.user_id)));

    if (uniqueUserIds.length > 0) {
      const profilesResp = await supabase
        .from('profiles')
        .select('id, email, first_name')
        .in('id', uniqueUserIds);
      if (profilesResp.error) {
        throw new Error(`profiles fetch failed: ${profilesResp.error.message}`);
      }
      const profiles = (profilesResp.data ?? []) as ReadonlyArray<ProfileLite>;
      const provider = getStudioEmailProvider();

      for (const profile of profiles) {
        if (!profile.email) {
          continue;
        }
        try {
          const html = renderChallengeWeekLaunchedHtml({
            name: profile.first_name,
            challengeTitle: challenge.title,
            challengeDescription: challenge.description,
            weekStart: challenge.weekStart,
            rewardXp: challenge.rewardXp,
          });
          const result = await provider.send({
            to: profile.email,
            subject: CHALLENGE_WEEK_LAUNCHED_SUBJECT,
            html,
            tags: [
              { name: 'product', value: 'dmx-studio' },
              { name: 'studio_template', value: 'challenge_week_launched' },
            ],
          });
          if (result.accepted) {
            emailsSent += 1;
          } else {
            emailsFailed += 1;
          }
        } catch (perUserErr) {
          emailsFailed += 1;
          sentry.captureException(perUserErr, {
            tags: { cron: 'studio-challenge-launch', stage: 'email_send' },
            extra: { user_id: profile.id },
          });
        }
      }
    }
  } catch (err) {
    resultStatus = 'error';
    resultError = err instanceof Error ? err.message : 'unknown_error';
    sentry.captureException(err, {
      tags: { cron: 'studio-challenge-launch', stage: 'launch' },
    });
  } finally {
    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    await supabase
      .from('ingest_runs')
      .update({
        status: resultStatus,
        rows_inserted: challengeId ? 1 : 0,
        rows_updated: emailsSent,
        rows_skipped: emailsFailed,
        completed_at: completedAt,
        duration_ms: durationMs,
        error: resultError,
        meta: {
          cron: 'studio-challenge-launch',
          challenge_id: challengeId,
          emails_sent: emailsSent,
          emails_failed: emailsFailed,
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
    challenge_id: challengeId,
    emails_sent: emailsSent,
    emails_failed: emailsFailed,
  });
}
