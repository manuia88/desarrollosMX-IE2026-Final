// FASE 11.J.10 — Unsubscribe 1-click (POST) + soft GET (returns JSON status).
//
// POST: procesa baja (single-use token via hash match). Idempotente — si
// token ya fue usado, 410 Gone; si subscriber ya unsubscribed, 200 ok.
// GET: devuelve metadata del token (para landing page render).

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getEmailProvider } from '@/features/newsletter/lib/email-provider';
import { asRaw } from '@/features/newsletter/lib/raw-supabase';
import { hashTokenForDb, verifyToken } from '@/features/newsletter/lib/tokens';
import { unsubscribeTokenInput } from '@/features/newsletter/schemas/newsletter';
import { renderUnsubscribeConfirm } from '@/features/newsletter/templates/unsubscribe-confirm';
import type { NewsletterLocale } from '@/features/newsletter/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface SubscriberRow {
  readonly id: string;
  readonly email: string;
  readonly status: string;
  readonly locale: NewsletterLocale;
  readonly unsubscribe_token_hash: string | null;
}

interface Ctx {
  readonly params: Promise<{ readonly token: string }>;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.desarrollosmx.com';
}

export async function GET(_request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { token } = await ctx.params;
  const verified = verifyToken(token, 'unsubscribe');
  if (!verified) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, email: verified.email });
}

export async function POST(request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { token } = await ctx.params;

  const verified = verifyToken(token, 'unsubscribe');
  if (!verified) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = unsubscribeTokenInput.safeParse({
    token,
    ...(typeof body === 'object' && body !== null && 'reason' in body
      ? { reason: (body as { reason?: string }).reason }
      : {}),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { reason } = parsed.data;

  const supabase = asRaw(createAdminClient());
  const providedHash = hashTokenForDb(token);

  const { data: subscriber } = await supabase
    .from('newsletter_subscribers')
    .select('id,email,status,locale,unsubscribe_token_hash')
    .eq('id', verified.subscriberId)
    .maybeSingle<SubscriberRow>();

  if (!subscriber) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  // Si el token ya fue invalidado → 410 Gone (token usado).
  if (subscriber.unsubscribe_token_hash === null) {
    // Idempotente: si ya unsubscribed, devolvemos 200 con already_unsubscribed.
    if (subscriber.status === 'unsubscribed') {
      return NextResponse.json({ ok: true, message: 'already_unsubscribed' });
    }
    return NextResponse.json({ ok: false, error: 'token_consumed' }, { status: 410 });
  }

  if (subscriber.unsubscribe_token_hash !== providedHash) {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 });
  }

  // Process baja.
  await supabase
    .from('newsletter_subscribers')
    .update({
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_token_hash: null, // invalidate.
      ...(reason ? { tags: [`unsub_reason:${reason.slice(0, 100)}`] } : {}),
    })
    .eq('id', subscriber.id);

  // Audit + send confirm email (best-effort).
  await supabase.from('newsletter_deliveries').insert({
    subscriber_id: subscriber.id,
    template: 'unsubscribe-confirm',
    subject: 'Baja confirmada — DesarrollosMX',
    status: 'queued',
    payload_summary: (reason
      ? { reason: reason.slice(0, 500) }
      : ({} as Record<string, unknown>)) as unknown as Record<string, unknown>,
  });

  const resubscribeUrl = `${siteUrl()}/${subscriber.locale}/newsletter/subscribe`;
  try {
    const rendered = renderUnsubscribeConfirm({
      locale: subscriber.locale,
      subscriberEmail: subscriber.email,
      resubscribeUrl,
    });
    await getEmailProvider().send({
      to: subscriber.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (err) {
    console.error('[unsubscribe] confirm email send failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ ok: true, message: 'unsubscribed' });
}
