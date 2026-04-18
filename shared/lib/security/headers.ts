import type { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_HOST = SUPABASE_URL.replace(/^https?:\/\//, '');

export function buildCsp(nonce: string, isDev: boolean): string {
  const supabaseHttps = SUPABASE_HOST ? `https://${SUPABASE_HOST}` : '';
  const supabaseWss = SUPABASE_HOST ? `wss://${SUPABASE_HOST}` : '';

  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline' https://*.posthog.com https://*.sentry.io`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://*.posthog.com https://*.sentry.io`;

  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    supabaseHttps,
    'https://*.mapbox.com',
    'https://*.cloudinary.com',
  ]
    .filter(Boolean)
    .join(' ');

  const connectSrc = [
    "'self'",
    supabaseHttps,
    supabaseWss,
    'https://*.posthog.com',
    'https://*.sentry.io',
    'https://api.mapbox.com',
    'https://openexchangerates.org',
    'https://api.anthropic.com',
    'https://api.openai.com',
    'https://ai-gateway.vercel.sh',
  ]
    .filter(Boolean)
    .join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src ${imgSrc}`,
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
    'report-uri /api/security/csp-report',
  ].join('; ');
}

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

export function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
  isDev: boolean,
): NextResponse {
  response.headers.set('Content-Security-Policy', buildCsp(nonce, isDev));
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(self), payment=(self), interest-cohort=()',
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site');
  response.headers.set('x-nonce', nonce);
  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }
  return response;
}
