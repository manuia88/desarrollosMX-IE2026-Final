import { NextResponse } from 'next/server';
import { type ApiKeyAuthResult, authenticateApiKey } from '@/shared/lib/moonshots/api-keys';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export type AuthenticatedRequest = {
  profileId: string;
  scopes: ReadonlyArray<string>;
  keyId: string;
  supabase: ReturnType<typeof createAdminClient>;
};

export async function withApiKey(
  request: Request,
  requiredScope: string,
  endpoint: string,
): Promise<{ ok: true; auth: AuthenticatedRequest } | { ok: false; response: Response }> {
  const supabase = createAdminClient();
  const result: ApiKeyAuthResult = await authenticateApiKey(
    supabase,
    request.headers.get('authorization'),
    requiredScope,
    endpoint,
  );

  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: result.message }, { status: result.status }),
    };
  }

  return {
    ok: true,
    auth: {
      profileId: result.profileId,
      scopes: result.scopes,
      keyId: result.keyId,
      supabase,
    },
  };
}

export function jsonError(message: string, status: number): Response {
  return NextResponse.json({ error: message }, { status });
}
