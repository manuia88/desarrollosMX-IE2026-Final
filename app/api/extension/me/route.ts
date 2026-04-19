import { NextResponse } from 'next/server';
import { verifyExtensionToken } from '@/features/market/lib/capture';
import { createAdminClient } from '@/shared/lib/supabase/admin';

function extractBearer(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+([A-Za-z0-9._-]+)$/);
  return match?.[1] ?? null;
}

export async function GET(request: Request) {
  const token = extractBearer(request);
  if (!token) {
    return NextResponse.json({ error: 'missing_bearer' }, { status: 401 });
  }

  const admin = createAdminClient();
  const profileId = await verifyExtensionToken(admin, token);
  if (!profileId) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('id', profileId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'profile_not_found' }, { status: 401 });
  }

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || null;

  return NextResponse.json({
    id: profile.id,
    email: profile.email,
    name,
  });
}
