import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export type RateLimitKey = `user:${string}` | `ip:${string}` | `global:${string}`;

export function getClientIp(request: Request | NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function ipKey(request: Request | NextRequest): RateLimitKey {
  return `ip:${getClientIp(request)}`;
}

export function userKey(userId: string): RateLimitKey {
  return `user:${userId}`;
}

export function globalKey(endpoint: string): RateLimitKey {
  return `global:${endpoint}`;
}

export type RateLimitResult = { allowed: boolean; error?: string };

export async function checkRateLimit(
  key: RateLimitKey,
  endpoint: string,
  windowSec: number,
  maxCalls: number,
): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_endpoint: endpoint,
    p_window_sec: windowSec,
    p_max_calls: maxCalls,
  });

  if (error) {
    return { allowed: false, error: error.message };
  }
  return { allowed: data === true };
}
