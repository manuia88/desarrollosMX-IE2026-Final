// Shared contracts for the Public REST API v1 (BLOQUE 11.L).
// Used by app/api/v1/* route handlers, features/api-v1/lib/* helpers,
// features/api-v1/tests/*, and the OpenAPI spec generator.
//
// Authentication: x-dmx-api-key header (or Authorization: Bearer).
// Tiers derived from api_keys.scopes entries like 'tier:pro'.
// Default tier when no key: 'free' (anonymous, IP-rate-limited).

export const API_TIERS = ['free', 'starter', 'pro', 'enterprise'] as const;
export type ApiTier = (typeof API_TIERS)[number];

// Daily quotas per tier (calls/day). -1 = unlimited.
export const TIER_DAILY_QUOTA: Readonly<Record<ApiTier, number>> = Object.freeze({
  free: 100,
  starter: 500,
  pro: 10_000,
  enterprise: -1,
});

export const API_ERROR_CODES = [
  'invalid_json',
  'invalid_payload',
  'invalid_api_key',
  'missing_api_key',
  'rate_limited',
  'not_found',
  'forbidden',
  'internal_error',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  readonly ok: false;
  readonly error: ApiErrorCode;
  readonly message?: string;
  readonly details?: unknown;
  readonly tier?: ApiTier;
  readonly reset_at?: string;
}

export interface ApiSuccessBody<T> {
  readonly ok: true;
  readonly data: T;
  readonly tier: ApiTier;
  readonly rate_limit: {
    readonly remaining: number;
    readonly reset_at: string;
  };
}

export type ApiResponseBody<T> = ApiSuccessBody<T> | ApiErrorBody;

export interface VerifiedApiKey {
  readonly apiKeyId: string;
  readonly profileId: string;
  readonly tier: ApiTier;
  readonly scopes: readonly string[];
}

export interface RateLimitOutcome {
  readonly allowed: boolean;
  readonly tier: ApiTier;
  readonly remaining: number;
  readonly reset_at: string;
}

export interface PaginationParams {
  readonly limit: number;
  readonly cursor: string | null;
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly next_cursor: string | null;
}
