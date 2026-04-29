// 15.X.5 API Enterprise REST — api_keys helpers + auth + rate limit
//
// Pricing: 100K requests/día por API key. Cuenta vía api_rate_limits con
// endpoint='enterprise:*' y window_start = bucket diario.

import { createHash, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiKeyCreated, ApiKeyRow } from '@/features/developer-moonshots/schemas';
import type { Database } from '@/shared/types/database';

type AdminClient = SupabaseClient<Database>;

const KEY_PREFIX = 'dmxe_';
const RATE_LIMIT_DAILY_MAX = 100_000;

function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

function generatePlaintextKey(): string {
  const random = randomBytes(28).toString('hex');
  return `${KEY_PREFIX}${random}`;
}

function rowToApiKey(row: Database['public']['Tables']['api_keys']['Row']): ApiKeyRow {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: row.scopes ?? [],
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

export async function createApiKey(
  supabase: AdminClient,
  args: { profileId: string; name: string; scopes: ReadonlyArray<string>; expiresAtIso?: string },
): Promise<ApiKeyCreated> {
  const plaintext = generatePlaintextKey();
  const keyHash = hashKey(plaintext);
  const keyPrefix = plaintext.slice(0, 12);

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      profile_id: args.profileId,
      name: args.name,
      scopes: [...args.scopes],
      key_hash: keyHash,
      key_prefix: keyPrefix,
      expires_at: args.expiresAtIso ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`api_keys insert failed: ${error?.message ?? 'unknown'}`);
  }

  return { ...rowToApiKey(data), plaintextKey: plaintext };
}

export async function listApiKeys(
  supabase: AdminClient,
  profileId: string,
): Promise<ReadonlyArray<ApiKeyRow>> {
  const { data } = await supabase
    .from('api_keys')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!data) return [];
  return data.map(rowToApiKey);
}

export async function revokeApiKey(
  supabase: AdminClient,
  args: { profileId: string; keyId: string },
): Promise<boolean> {
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', args.keyId)
    .eq('profile_id', args.profileId);
  return !error;
}

export type ApiKeyAuthResult =
  | { ok: true; profileId: string; scopes: ReadonlyArray<string>; keyId: string }
  | { ok: false; status: 401 | 403 | 429; message: string };

export async function authenticateApiKey(
  supabase: AdminClient,
  authHeader: string | null,
  requiredScope: string,
  endpoint: string,
): Promise<ApiKeyAuthResult> {
  if (!authHeader) {
    return { ok: false, status: 401, message: 'Missing Authorization header' };
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  const token = match?.[1];
  if (!token || !token.startsWith(KEY_PREFIX)) {
    return { ok: false, status: 401, message: 'Invalid bearer token format' };
  }

  const tokenHash = hashKey(token);

  const { data: keyRow, error } = await supabase
    .from('api_keys')
    .select('id, profile_id, scopes, revoked_at, expires_at')
    .eq('key_hash', tokenHash)
    .maybeSingle();

  if (error || !keyRow) {
    return { ok: false, status: 401, message: 'Invalid API key' };
  }
  if (keyRow.revoked_at) {
    return { ok: false, status: 401, message: 'API key revoked' };
  }
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return { ok: false, status: 401, message: 'API key expired' };
  }
  const scopes = keyRow.scopes ?? [];
  if (!scopes.includes(requiredScope)) {
    return { ok: false, status: 403, message: `Scope ${requiredScope} required` };
  }

  const allowed = await consumeRateLimit(supabase, keyRow.id, endpoint);
  if (!allowed) {
    return { ok: false, status: 429, message: 'Rate limit exceeded (100K/day)' };
  }

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id);

  return { ok: true, profileId: keyRow.profile_id, scopes, keyId: keyRow.id };
}

async function consumeRateLimit(
  supabase: AdminClient,
  keyId: string,
  endpoint: string,
): Promise<boolean> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const windowStart = today.toISOString();
  const rateKey = `key:${keyId}`;
  const endpointKey = `enterprise:${endpoint}`;

  const { data: existing } = await supabase
    .from('api_rate_limits')
    .select('count')
    .eq('key', rateKey)
    .eq('endpoint', endpointKey)
    .eq('window_start', windowStart)
    .maybeSingle();

  const currentCount = existing?.count ?? 0;
  if (currentCount >= RATE_LIMIT_DAILY_MAX) return false;

  await supabase.from('api_rate_limits').upsert(
    {
      key: rateKey,
      endpoint: endpointKey,
      window_start: windowStart,
      count: currentCount + 1,
    },
    { onConflict: 'key,endpoint,window_start' },
  );

  return true;
}
