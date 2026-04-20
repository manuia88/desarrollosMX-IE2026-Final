// AVM MVP I01 — Rate limit free tier (5/mes) + bypass Pro/Enterprise.
// Ref: FASE_08 §BLOQUE 8.D.3 step 3 + §8.D.4.
//
// MVP implementación in-memory Map. Migración a tabla api_rate_limits
// documentada en FASE 23 (api_key management). Safe porque instancias Vercel
// Functions comparten contador solo dentro de la misma instancia — suficiente
// para MVP + smoke protection. Producción H2+ usa Upstash o DB counter.
//
// Bypass rules:
//   - api_key Pro/Enterprise (format `api_pro_*` o `api_ent_*`) → unlimited
//   - Sin api_key → 5 requests por (ip) ventana 30d rolling

export type TierName = 'free' | 'pro' | 'enterprise';

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly tier: TierName;
  readonly remaining: number;
  readonly reset_at: string;
}

export function classifyTierFromApiKey(apiKey: string | null): TierName {
  if (!apiKey) return 'free';
  if (apiKey.startsWith('api_ent_')) return 'enterprise';
  if (apiKey.startsWith('api_pro_')) return 'pro';
  return 'free';
}

const FREE_MONTHLY_QUOTA = 5;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CounterEntry {
  count: number;
  windowStart: number;
}

const COUNTERS = new Map<string, CounterEntry>();

// Utilizado por tests para reiniciar entre cases.
export function __resetRateLimit(): void {
  COUNTERS.clear();
}

export function enforceRateLimit(
  key: string,
  tier: TierName,
  now: number = Date.now(),
): RateLimitDecision {
  if (tier !== 'free') {
    return {
      allowed: true,
      tier,
      remaining: -1,
      reset_at: new Date(now + WINDOW_MS).toISOString(),
    };
  }

  const entry = COUNTERS.get(key);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    COUNTERS.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      tier: 'free',
      remaining: FREE_MONTHLY_QUOTA - 1,
      reset_at: new Date(now + WINDOW_MS).toISOString(),
    };
  }

  if (entry.count >= FREE_MONTHLY_QUOTA) {
    return {
      allowed: false,
      tier: 'free',
      remaining: 0,
      reset_at: new Date(entry.windowStart + WINDOW_MS).toISOString(),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    tier: 'free',
    remaining: FREE_MONTHLY_QUOTA - entry.count,
    reset_at: new Date(entry.windowStart + WINDOW_MS).toISOString(),
  };
}
