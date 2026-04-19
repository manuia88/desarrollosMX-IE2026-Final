import { NextResponse } from 'next/server';
import { persistCapture, verifyExtensionToken } from '@/features/market/lib/capture';
import { marketCaptureSchema } from '@/features/market/schemas/capture';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const RATE_WINDOW_SEC = 3600;
const RATE_MAX_CALLS = 500;

function unauthorized(reason: string) {
  return NextResponse.json({ ok: false, error: reason }, { status: 401 });
}

function badRequest(reason: string) {
  return NextResponse.json({ ok: false, error: reason }, { status: 400 });
}

function tooManyRequests() {
  return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
}

function serverError(reason: string) {
  return NextResponse.json({ ok: false, error: reason }, { status: 500 });
}

function extractBearer(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+([A-Za-z0-9._-]+)$/);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  const token = extractBearer(request);
  if (!token) return unauthorized('missing_bearer');

  const admin = createAdminClient();
  const profileId = await verifyExtensionToken(admin, token);
  if (!profileId) return unauthorized('invalid_token');

  const { data: rateOk, error: rateErr } = await admin.rpc('check_rate_limit_db', {
    p_user_id: profileId,
    p_endpoint: 'market.capture',
    p_window_sec: RATE_WINDOW_SEC,
    p_max_calls: RATE_MAX_CALLS,
  });
  if (rateErr) return serverError(rateErr.message);
  if (!rateOk) return tooManyRequests();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('invalid_json');
  }
  const parsed = marketCaptureSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('invalid_payload');
  }

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('country_code')
    .eq('id', profileId)
    .maybeSingle();
  if (profileErr) return serverError(profileErr.message);
  if (!profile) return unauthorized('profile_not_found');

  const result = await persistCapture(
    {
      supabase: admin,
      profileId,
      countryCode: profile.country_code,
    },
    parsed.data,
  );
  if (!result.ok) {
    return serverError(result.message);
  }

  return NextResponse.json({
    ok: true,
    market_price_id: String(result.marketPriceRowId),
    source: result.source,
    listing_id: result.listingId,
  });
}

export const runtime = 'nodejs';
