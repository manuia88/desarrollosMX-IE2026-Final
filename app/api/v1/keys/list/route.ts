// Public REST API v1 — GET /api/v1/keys/list.
// Session-authenticated. RLS enforces profile_id = auth.uid() ownership.
// Never returns key_hash.

import { NextResponse } from 'next/server';
import { apiError, apiOptions, corsHeaders } from '@/features/api-v1/lib/responses';
import { listKeysDataSchema } from '@/features/api-v1/schemas/keys';
import { createClient } from '@/shared/lib/supabase/server';

export async function OPTIONS(): Promise<Response> {
  return apiOptions();
}

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiError('forbidden', 401, { message: 'Unauthorized — session required' });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, created_at, last_used_at, expires_at, revoked_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return apiError('internal_error', 500, { message: error.message });
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    key_prefix: row.key_prefix,
    scopes: Array.isArray(row.scopes)
      ? row.scopes.filter((s): s is string => typeof s === 'string')
      : [],
    created_at: row.created_at,
    last_used_at: row.last_used_at,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
  }));

  const validated = listKeysDataSchema.safeParse({ items });
  if (!validated.success) {
    return apiError('internal_error', 500, { details: validated.error.flatten() });
  }

  return NextResponse.json(
    { ok: true as const, data: validated.data },
    { status: 200, headers: corsHeaders() },
  );
}
