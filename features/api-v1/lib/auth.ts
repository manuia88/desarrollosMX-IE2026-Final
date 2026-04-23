// Public REST API v1 — API key extraction + verification + tier derivation.
// Verifica vía RPC public.verify_api_key (bcrypt match); deriva tier desde
// el array api_keys.scopes (convención 'tier:<name>').

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { API_TIERS, type ApiTier, type VerifiedApiKey } from '../types';

const API_KEY_HEADER = 'x-dmx-api-key';
const AUTH_BEARER_PREFIX = /^Bearer\s+(.+)$/i;

export function extractApiKey(request: Request): string | null {
  const direct = request.headers.get(API_KEY_HEADER);
  if (direct && direct.trim().length > 0) return direct.trim();

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const match = authHeader.match(AUTH_BEARER_PREFIX);
  return match?.[1]?.trim() ?? null;
}

export function deriveTierFromScopes(scopes: readonly string[] | null | undefined): ApiTier {
  if (!scopes) return 'free';
  for (const scope of scopes) {
    if (typeof scope !== 'string' || !scope.startsWith('tier:')) continue;
    const candidate = scope.slice('tier:'.length).trim().toLowerCase();
    if ((API_TIERS as readonly string[]).includes(candidate)) {
      return candidate as ApiTier;
    }
  }
  return 'free';
}

// Returns null when the key is absent, malformed, revoked, expired, or not found.
export async function verifyApiKey(rawKey: string | null): Promise<VerifiedApiKey | null> {
  if (!rawKey || rawKey.length < 12) return null;

  const admin = createAdminClient();

  const { data: verifyData, error: verifyError } = await admin.rpc('verify_api_key', {
    p_raw_key: rawKey,
  });

  if (verifyError || !verifyData) return null;
  const apiKeyId = typeof verifyData === 'string' ? verifyData : null;
  if (!apiKeyId) return null;

  const { data: row, error: rowError } = await admin
    .from('api_keys')
    .select('id, profile_id, scopes')
    .eq('id', apiKeyId)
    .maybeSingle();

  if (rowError || !row) return null;

  const scopes = Array.isArray(row.scopes)
    ? row.scopes.filter((s): s is string => typeof s === 'string')
    : [];
  const tier = deriveTierFromScopes(scopes);

  return {
    apiKeyId: row.id,
    profileId: row.profile_id,
    tier,
    scopes,
  };
}
