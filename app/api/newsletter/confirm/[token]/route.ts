// FASE 11.J — GET /api/newsletter/confirm/[token]
//
// Double opt-in: verifica confirm token, activa subscriber, redirect a
// welcome page con flag.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { asRaw } from '@/features/newsletter/lib/raw-supabase';
import { hashTokenForDb, verifyToken } from '@/features/newsletter/lib/tokens';
import type { NewsletterLocale } from '@/features/newsletter/types';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface SubscriberRow {
  readonly id: string;
  readonly status: string;
  readonly locale: NewsletterLocale;
  readonly confirm_token_hash: string | null;
}

interface Ctx {
  readonly params: Promise<{ readonly token: string }>;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.desarrollosmx.com';
}

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(`${siteUrl()}${path}`, { status: 302 });
}

export async function GET(_request: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { token } = await ctx.params;

  const verified = verifyToken(token, 'confirm');
  if (!verified) {
    return redirectTo('/es-MX/newsletter/invalid-token');
  }

  const supabase = asRaw(createAdminClient());
  const providedHash = hashTokenForDb(token);

  const { data: subscriber } = await supabase
    .from('newsletter_subscribers')
    .select('id,status,locale,confirm_token_hash')
    .eq('id', verified.subscriberId)
    .maybeSingle<SubscriberRow>();

  if (!subscriber) {
    return redirectTo('/es-MX/newsletter/invalid-token');
  }

  // Check hash match (single-use + tamper-proof).
  if (subscriber.confirm_token_hash !== providedHash) {
    return redirectTo('/es-MX/newsletter/invalid-token');
  }

  // Si ya está active y se hace click de nuevo, mostrar confirmed (idempotente).
  if (subscriber.status === 'active') {
    return redirectTo(`/${subscriber.locale}/welcome?nl=confirmed`);
  }

  // Activate.
  await supabase
    .from('newsletter_subscribers')
    .update({
      status: 'active',
      confirmed_at: new Date().toISOString(),
      confirm_token_hash: null, // invalidate single-use.
    })
    .eq('id', subscriber.id);

  return redirectTo(`/${subscriber.locale}/welcome?nl=confirmed`);
}
