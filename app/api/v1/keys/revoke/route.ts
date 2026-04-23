// Public REST API v1 — POST /api/v1/keys/revoke.
// Session-authenticated. RLS enforces that user can only revoke own keys.

import { NextResponse } from 'next/server';
import { apiError, apiOptions, corsHeaders } from '@/features/api-v1/lib/responses';
import { revokeKeyDataSchema, revokeKeyInputSchema } from '@/features/api-v1/schemas/keys';
import { createClient } from '@/shared/lib/supabase/server';

export async function OPTIONS(): Promise<Response> {
  return apiOptions();
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiError('forbidden', 401, { message: 'Unauthorized — session required' });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return apiError('invalid_json', 400);
  }

  const parsed = revokeKeyInputSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError('invalid_payload', 400, { details: parsed.error.flatten() });
  }

  const revokedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('api_keys')
    .update({ revoked_at: revokedAt })
    .eq('id', parsed.data.api_key_id)
    .is('revoked_at', null)
    .select('id, revoked_at')
    .maybeSingle();

  if (error) {
    return apiError('internal_error', 500, { message: error.message });
  }
  if (!data) {
    return apiError('not_found', 404, { message: 'Key not found or already revoked' });
  }

  const validated = revokeKeyDataSchema.safeParse({
    api_key_id: data.id,
    revoked_at: data.revoked_at ?? revokedAt,
  });
  if (!validated.success) {
    return apiError('internal_error', 500, { details: validated.error.flatten() });
  }

  return NextResponse.json(
    { ok: true as const, data: validated.data },
    { status: 200, headers: corsHeaders() },
  );
}
