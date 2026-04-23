// Public REST API v1 — standardized JSON responses + CORS headers.
// Todos los endpoints /api/v1/* usan estas helpers para uniformidad.

import { NextResponse } from 'next/server';
import type {
  ApiErrorBody,
  ApiErrorCode,
  ApiSuccessBody,
  ApiTier,
  RateLimitOutcome,
} from '../types';

const CORS_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,x-dmx-api-key,authorization',
  'Access-Control-Max-Age': '86400',
});

export function corsHeaders(): Record<string, string> {
  return { ...CORS_HEADERS };
}

export function apiSuccess<T>(
  data: T,
  outcome: RateLimitOutcome,
  status = 200,
): NextResponse<ApiSuccessBody<T>> {
  const body: ApiSuccessBody<T> = {
    ok: true,
    data,
    tier: outcome.tier,
    rate_limit: {
      remaining: outcome.remaining,
      reset_at: outcome.reset_at,
    },
  };
  return NextResponse.json(body, { status, headers: corsHeaders() });
}

export function apiError(
  code: ApiErrorCode,
  status: number,
  extra?: Partial<Pick<ApiErrorBody, 'message' | 'details' | 'tier' | 'reset_at'>>,
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = {
    ok: false,
    error: code,
    ...(extra?.message !== undefined ? { message: extra.message } : {}),
    ...(extra?.details !== undefined ? { details: extra.details } : {}),
    ...(extra?.tier !== undefined ? { tier: extra.tier } : {}),
    ...(extra?.reset_at !== undefined ? { reset_at: extra.reset_at } : {}),
  };
  return NextResponse.json(body, { status, headers: corsHeaders() });
}

export function apiRateLimited(tier: ApiTier, resetAt: string): NextResponse<ApiErrorBody> {
  return apiError('rate_limited', 429, {
    tier,
    reset_at: resetAt,
    message: `Quota excedida para tier ${tier}. Considere upgrade o espere a ${resetAt}.`,
  });
}

export function apiOptions(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
