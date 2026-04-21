// FASE 11.J — POST /api/newsletter/subscribe
//
// Public endpoint: alta + double opt-in (manda confirm email, requiere click
// para activar). LFPDPPP consent inline con checkbox (consentLfpdppp === true).
//
// Captcha placeholder: L-NN-CAPTCHA → FASE 13 botid integration (DeepMind's
// botid ya está instalado — integración con rate-limit viene en FASE 13).

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getEmailProvider } from '@/features/newsletter/lib/email-provider';
import { asRaw } from '@/features/newsletter/lib/raw-supabase';
import {
  hashTokenForDb,
  mintConfirmToken,
  mintUnsubscribeToken,
} from '@/features/newsletter/lib/tokens';
import { subscribeInput } from '@/features/newsletter/schemas/newsletter';
import { renderConfirmEmail } from '@/features/newsletter/templates/confirm-email';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface SubscriberRow {
  readonly id: string;
  readonly status: string;
  readonly email: string;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.desarrollosmx.com';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = subscribeInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = asRaw(createAdminClient());

  // Intenta ubicar subscriber existente (idempotente).
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id,status,email')
    .eq('email', input.email)
    .maybeSingle<SubscriberRow>();

  let subscriberId: string;

  if (existing) {
    subscriberId = existing.id;
    // Si ya está active, devolver success genérico (no leak info).
    if (existing.status === 'active') {
      return NextResponse.json({ ok: true, message: 'check_inbox' });
    }
    // Si está unsubscribed/bounced/complained → re-opt-in flow: reset a pending.
    await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'pending_confirmation',
        locale: input.locale,
        ...(input.preferences ? { preferences: input.preferences } : {}),
      })
      .eq('id', subscriberId);
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: input.email,
        locale: input.locale,
        status: 'pending_confirmation',
        preferences:
          (input.preferences as unknown as Record<string, unknown>) ??
          ({
            frequency: 'monthly',
            zone_scope_ids: [],
            sections: {
              pulse: true,
              migration: true,
              causal: true,
              alpha: false,
              scorecard: true,
              streaks: true,
            },
          } as unknown as Record<string, unknown>),
      })
      .select('id')
      .single<{ id: string }>();

    if (insertErr || !inserted) {
      // 500 con mensaje genérico — no leak DB errors.
      return NextResponse.json({ ok: false, error: 'subscribe_failed' }, { status: 500 });
    }
    subscriberId = inserted.id;
  }

  // Mint + store hashes.
  const confirmToken = mintConfirmToken(input.email, subscriberId);
  const unsubscribeToken = mintUnsubscribeToken(input.email, subscriberId);
  await supabase
    .from('newsletter_subscribers')
    .update({
      confirm_token_hash: hashTokenForDb(confirmToken),
      unsubscribe_token_hash: hashTokenForDb(unsubscribeToken),
    })
    .eq('id', subscriberId);

  // Send confirm email (via provider).
  const confirmUrl = `${siteUrl()}/api/newsletter/confirm/${encodeURIComponent(confirmToken)}`;
  const rendered = renderConfirmEmail({
    locale: input.locale,
    confirmUrl,
    subscriberEmail: input.email,
  });

  try {
    await getEmailProvider().send({
      to: input.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (err) {
    // Logging best-effort; no bloqueamos al user (ya está en DB como pending).
    console.error('[subscribe] confirm email send failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Siempre respondemos genérico (anti-enumeration).
  return NextResponse.json({ ok: true, message: 'check_inbox' });
}
