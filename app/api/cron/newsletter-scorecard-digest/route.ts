// BLOQUE 11.J.6 — Cron route: Scorecard Newsletter digests.
//
// Envía digests del Scorecard Nacional a suscriptores activos:
//   - mode=preview → busca reports con publish_date entre now+55d y now+65d
//     (ventana ~2m). Notifica antes de publicación para build anticipation.
//   - mode=post    → busca reports published_at en últimos 3 días que aún no
//     se hayan notificado (valida contra newsletter_deliveries.payload_summary
//     'report_id' + template 'scorecard-digest-post').
//
// Separado del cron /api/cron/dmx-indices-master para evitar merge conflicts
// con sesión CC paralela (SUB-AGENT A) que también extiende features de
// newsletter. Invocable independiente vía GitHub Actions con schedule daily.
//
// Auth: X-Cron-Secret contra env CRON_SECRET (mismo patrón que master).
// Next.js 16 cacheComponents: NO export const dynamic/runtime (rompe build).
// maxDuration OK — config Vercel Functions.

import { NextResponse } from 'next/server';
import {
  sendScorecardDigestPosts,
  sendScorecardDigestPreviews,
} from '@/features/newsletter/lib/scorecard-digest-sender';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export const maxDuration = 300;

type DigestMode = 'preview' | 'post' | 'both';

interface ReportCandidate {
  readonly report_id: string;
  readonly country_code: string;
  readonly published_at: string | null;
  readonly period_date: string;
}

function authorize(request: Request): boolean {
  const received = request.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET;
  if (!received || !expected) return false;
  if (received.length !== expected.length) return false;
  return received === expected;
}

function isDigestMode(value: string | null): value is DigestMode {
  return value === 'preview' || value === 'post' || value === 'both';
}

function addDaysIso(base: Date, days: number): string {
  const copy = new Date(base.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString().slice(0, 10);
}

// Preview window: reports cuyo publish_date (derivado desde period_date +
// ~30d post período) cae entre now+55d y now+65d. En H1 el publish_date
// explícito viene de data_snapshot.publish_date; si no, derivamos desde
// period_date + 30d. Simplificación defensiva — query filtra published_at
// IS NULL (no confundir con post-publish).
async function findPreviewCandidates(now: Date): Promise<readonly ReportCandidate[]> {
  const client = createAdminClient();
  // Ventana preview: publish_date objetivo ~2m adelante. Para el MVP
  // H1 seleccionamos reports NO publicados cuyo period_date+30d ∈ [now+55d, now+65d].
  const lowerPeriod = addDaysIso(now, 25); // 55-30
  const upperPeriod = addDaysIso(now, 35); // 65-30

  const { data, error } = await client
    .from('scorecard_national_reports')
    .select('report_id, country_code, published_at, period_date')
    .is('published_at', null)
    .gte('period_date', lowerPeriod)
    .lte('period_date', upperPeriod);

  if (error) throw new Error(`preview_candidates query failed: ${error.message}`);
  return (data ?? []) as unknown as readonly ReportCandidate[];
}

// Post window: reports published_at ∈ [now-3d, now], filtrar aquellos ya
// notificados vía newsletter_deliveries (template=scorecard-digest-post).
async function findPostCandidates(now: Date): Promise<readonly ReportCandidate[]> {
  const client = createAdminClient();
  const lower = new Date(now.getTime());
  lower.setUTCDate(lower.getUTCDate() - 3);
  const lowerIso = lower.toISOString();
  const upperIso = now.toISOString();

  const { data, error } = await client
    .from('scorecard_national_reports')
    .select('report_id, country_code, published_at, period_date')
    .gte('published_at', lowerIso)
    .lte('published_at', upperIso)
    .not('published_at', 'is', null);

  if (error) throw new Error(`post_candidates query failed: ${error.message}`);
  const candidates = (data ?? []) as unknown as readonly ReportCandidate[];
  if (candidates.length === 0) return [];

  // Filter out those already notified — best-effort check sobre deliveries
  // con payload_summary->>report_id match.
  // `newsletter_deliveries` aún no está en shared/types/database.ts
  // (pending `npm run db:types` post merge migration A). Narrow vía unknown.
  const alreadyNotified = new Set<string>();
  interface RawSelectBuilder
    extends PromiseLike<{
      readonly data: readonly unknown[] | null;
      readonly error: { message: string } | null;
    }> {
    readonly select: (cols: string) => RawSelectBuilder;
    readonly eq: (col: string, v: unknown) => RawSelectBuilder;
    readonly gte: (col: string, v: unknown) => RawSelectBuilder;
  }
  interface RawClient {
    readonly from: (table: string) => { readonly select: (cols: string) => RawSelectBuilder };
  }
  const raw = client as unknown as RawClient;
  const delivResp = await raw
    .from('newsletter_deliveries')
    .select('payload_summary')
    .eq('template', 'scorecard-digest-post')
    .gte('sent_at', lowerIso);

  for (const row of (delivResp.data ?? []) as unknown as ReadonlyArray<{
    payload_summary: unknown;
  }>) {
    const payload = row.payload_summary;
    if (payload && typeof payload === 'object' && payload !== null) {
      const reportId = (payload as { report_id?: unknown }).report_id;
      if (typeof reportId === 'string') alreadyNotified.add(reportId);
    }
  }

  return candidates.filter((c) => !alreadyNotified.has(c.report_id));
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  const url = new URL(request.url);
  const forcedRaw = url.searchParams.get('mode');
  const mode: DigestMode = isDigestMode(forcedRaw) ? forcedRaw : 'both';
  const now = new Date();

  const errors: Array<{ stage: string; message: string }> = [];
  const results: Array<{
    report_id: string;
    country_code: string;
    mode: 'preview' | 'post';
    sent: number;
    failed: number;
    skipped: number;
  }> = [];

  if (mode === 'preview' || mode === 'both') {
    try {
      const candidates = await findPreviewCandidates(now);
      for (const c of candidates) {
        try {
          const r = await sendScorecardDigestPreviews({
            reportId: c.report_id,
            countryCode: c.country_code,
          });
          results.push({
            report_id: c.report_id,
            country_code: c.country_code,
            mode: 'preview',
            sent: r.sent,
            failed: r.failed,
            skipped: r.skipped,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push({ stage: `preview:${c.report_id}`, message });
          console.error('[newsletter-scorecard-digest] preview send failed', {
            reportId: c.report_id,
            message,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: 'preview:query', message });
      console.error('[newsletter-scorecard-digest] preview query failed', { message });
    }
  }

  if (mode === 'post' || mode === 'both') {
    try {
      const candidates = await findPostCandidates(now);
      for (const c of candidates) {
        try {
          const r = await sendScorecardDigestPosts({
            reportId: c.report_id,
            countryCode: c.country_code,
          });
          results.push({
            report_id: c.report_id,
            country_code: c.country_code,
            mode: 'post',
            sent: r.sent,
            failed: r.failed,
            skipped: r.skipped,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push({ stage: `post:${c.report_id}`, message });
          console.error('[newsletter-scorecard-digest] post send failed', {
            reportId: c.report_id,
            message,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ stage: 'post:query', message });
      console.error('[newsletter-scorecard-digest] post query failed', { message });
    }
  }

  return NextResponse.json({
    dispatched: mode,
    results,
    errors,
    duration_ms: Date.now() - t0,
    utc_timestamp: now.toISOString(),
  });
}
