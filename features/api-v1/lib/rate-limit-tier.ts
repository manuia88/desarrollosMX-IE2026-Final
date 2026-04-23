// Public REST API v1 — rate limit per-tier (ventana diaria 24h).
// Reutiliza RPC public.check_rate_limit (shared/lib/security/rate-limit.ts)
// pero envuelve con cuota dependiente del tier.
//
// Tiers:
//   free        100 calls/day  (anonymous key=null → IP-based)
//   starter     500 calls/day
//   pro         10K calls/day
//   enterprise  unlimited (bypass)

import { checkRateLimit, type RateLimitKey } from '@/shared/lib/security/rate-limit';
import { type ApiTier, type RateLimitOutcome, TIER_DAILY_QUOTA } from '../types';

const WINDOW_SEC_DAILY = 24 * 60 * 60;

export interface EnforceRateLimitParams {
  readonly tier: ApiTier;
  readonly apiKeyId: string | null;
  readonly ip: string;
  readonly endpoint: string;
}

function computeResetAt(now: number): string {
  return new Date(now + WINDOW_SEC_DAILY * 1000).toISOString();
}

export async function enforceRateLimitForTier(
  params: EnforceRateLimitParams,
): Promise<RateLimitOutcome> {
  const quota = TIER_DAILY_QUOTA[params.tier];
  const now = Date.now();

  // Enterprise = bypass total (no RPC call).
  if (quota === -1) {
    return {
      allowed: true,
      tier: params.tier,
      remaining: -1,
      reset_at: computeResetAt(now),
    };
  }

  const key: RateLimitKey = params.apiKeyId ? `user:apikey:${params.apiKeyId}` : `ip:${params.ip}`;

  const result = await checkRateLimit(key, params.endpoint, WINDOW_SEC_DAILY, quota);

  return {
    allowed: result.allowed,
    tier: params.tier,
    remaining: result.allowed ? Math.max(0, quota - 1) : 0,
    reset_at: computeResetAt(now),
  };
}
