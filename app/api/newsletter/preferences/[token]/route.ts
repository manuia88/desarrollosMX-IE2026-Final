// BLOQUE 11.J.3 — REST endpoint for updating newsletter preferences via token.
// POST /api/newsletter/preferences/[token]
//
// Body: { preferences: NewsletterPreferences, token?: string }
// Validates: Zod updatePreferencesInput schema (token + preferences).
// Updates: newsletter_subscribers.preferences jsonb where token_hash matches
// unsubscribe_token_hash or confirm_token_hash.
//
// Next.js 16 note: no `dynamic`/`runtime` export (cacheComponents incompat).

import { NextResponse } from 'next/server';
import { updatePreferencesInput } from '@/features/newsletter/schemas/newsletter';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface RouteContext {
  readonly params: Promise<{ token: string }>;
}

async function hashTokenHex(token: string): Promise<string> {
  const enc = new TextEncoder().encode(token);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(buf);
  let out = '';
  for (const b of bytes) {
    out += b.toString(16).padStart(2, '0');
  }
  return out;
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const { token: routeToken } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const rawBody = body as { token?: string; preferences?: unknown };
  const parsed = updatePreferencesInput.safeParse({
    token: rawBody.token ?? routeToken,
    preferences: rawBody.preferences,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const tokenHash = await hashTokenHex(parsed.data.token);
  const supabase = createAdminClient();

  const sb = supabase as unknown as {
    from: (t: string) => {
      update: (patch: Record<string, unknown>) => {
        or: (filter: string) => Promise<{
          data: unknown;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const { error } = await sb
    .from('newsletter_subscribers')
    .update({ preferences: parsed.data.preferences })
    .or(`unsubscribe_token_hash.eq.${tokenHash},confirm_token_hash.eq.${tokenHash}`);
  if (error) {
    return NextResponse.json({ error: 'update_failed', detail: error.message }, { status: 500 });
  }

  // For browser form submissions, redirect to the saved indicator.
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const url = new URL(request.url);
    const origin = url.origin;
    return NextResponse.redirect(`${origin}/newsletter/preferences?saved=1`, { status: 303 });
  }

  return NextResponse.json({ ok: true });
}
