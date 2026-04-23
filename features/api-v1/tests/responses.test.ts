import { describe, expect, it } from 'vitest';
import {
  apiError,
  apiOptions,
  apiRateLimited,
  apiSuccess,
  corsHeaders,
  getClientIp,
} from '../lib/responses';
import type { RateLimitOutcome } from '../types';

const OUTCOME: RateLimitOutcome = {
  allowed: true,
  tier: 'free',
  remaining: 42,
  reset_at: '2026-12-31T00:00:00.000Z',
};

describe('corsHeaders', () => {
  it('returns a fresh object including CORS keys', () => {
    const h = corsHeaders();
    expect(h['Access-Control-Allow-Origin']).toBe('*');
    expect(h['Access-Control-Allow-Headers']).toContain('x-dmx-api-key');
    expect(h['Access-Control-Allow-Methods']).toContain('GET');
  });
});

describe('apiSuccess', () => {
  it('produces a valid success envelope with CORS headers', async () => {
    const res = apiSuccess({ hello: 'world' }, OUTCOME);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      data: { hello: 'world' },
      tier: 'free',
      rate_limit: { remaining: 42, reset_at: OUTCOME.reset_at },
    });
  });
});

describe('apiError', () => {
  it('produces standardized error body', async () => {
    const res = apiError('invalid_payload', 400, { message: 'bad' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('invalid_payload');
    expect(body.message).toBe('bad');
  });

  it('omits optional fields when not provided', async () => {
    const res = apiError('not_found', 404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('not_found');
    expect('message' in body).toBe(false);
  });
});

describe('apiRateLimited', () => {
  it('returns 429 with tier and reset_at', async () => {
    const res = apiRateLimited('pro', '2026-12-31T00:00:00.000Z');
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('rate_limited');
    expect(body.tier).toBe('pro');
    expect(body.reset_at).toBe('2026-12-31T00:00:00.000Z');
  });
});

describe('apiOptions', () => {
  it('returns 204 preflight with CORS', () => {
    const res = apiOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('getClientIp', () => {
  it('parses first x-forwarded-for entry', () => {
    const req = new Request('http://x/', {
      headers: { 'x-forwarded-for': '8.8.8.8, 1.1.1.1' },
    });
    expect(getClientIp(req)).toBe('8.8.8.8');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('http://x/', { headers: { 'x-real-ip': '2.2.2.2' } });
    expect(getClientIp(req)).toBe('2.2.2.2');
  });

  it('returns "unknown" when no headers', () => {
    const req = new Request('http://x/');
    expect(getClientIp(req)).toBe('unknown');
  });
});
