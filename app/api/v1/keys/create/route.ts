// Public REST API v1 — POST /api/v1/keys/create.
// Session-authenticated (NOT api-key-authenticated). Calls RPC issue_api_key
// which returns raw_key ONCE. Never returns key_hash.

import { NextResponse } from 'next/server';
import { apiError, apiOptions, corsHeaders } from '@/features/api-v1/lib/responses';
import { createKeyDataSchema, createKeyInputSchema } from '@/features/api-v1/schemas/keys';
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

  const parsed = createKeyInputSchema.safeParse(rawBody);
  if (!parsed.success) {
    return apiError('invalid_payload', 400, { details: parsed.error.flatten() });
  }
  const input = parsed.data;

  const rpcArgs: {
    p_name: string;
    p_scopes: string[];
    p_expires_at?: string;
  } = {
    p_name: input.name,
    p_scopes: input.scopes,
  };
  if (input.expires_at !== undefined) {
    rpcArgs.p_expires_at = input.expires_at;
  }

  const { data, error } = await supabase.rpc('issue_api_key', rpcArgs);

  if (error) {
    return apiError('internal_error', 500, { message: error.message });
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.raw_key || !row?.api_key_id) {
    return apiError('internal_error', 500, { message: 'No key returned by RPC' });
  }

  const payload = {
    api_key_id: row.api_key_id,
    raw_key: row.raw_key,
    name: input.name,
    scopes: input.scopes,
    expires_at: input.expires_at ?? null,
  };

  const validated = createKeyDataSchema.safeParse(payload);
  if (!validated.success) {
    return apiError('internal_error', 500, { details: validated.error.flatten() });
  }

  // Session-authenticated response does not include a rate_limit field; use a
  // neutral envelope (no tier) because this is not an api-key-consumed route.
  return NextResponse.json(
    {
      ok: true as const,
      data: validated.data,
    },
    { status: 200, headers: corsHeaders() },
  );
}
